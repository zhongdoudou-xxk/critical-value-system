import { CriticalValueRepository } from '../repositories/CriticalValueRepository';
import { OracleRepository, OracleCriticalValue } from '../repositories/OracleRepository';
import { WechatService } from './WechatService';
import { CriticalValueStatus, CriticalValueRecord, DoctorInfo, ProcessingAction, NotificationType, SendStatus, SourceSystem } from '../entities/CriticalValue';
import { pollingConfig } from '../config';

export class PollingService {
  private criticalValueRepository: CriticalValueRepository;
  private oracleRepository: OracleRepository;
  private wechatService: WechatService;
  private pollingTimer: NodeJS.Timeout | null = null;
  private writebackTimer: NodeJS.Timeout | null = null;
  private escalationTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.criticalValueRepository = new CriticalValueRepository();
    this.oracleRepository = new OracleRepository();
    this.wechatService = new WechatService();
  }

  async start(): Promise<void> {
    console.log('启动危急值轮询服务...');
    await this.oracleRepository.initPool();
    this.startPolling();
    this.startWriteback();
    this.startEscalation();
  }

  stop(): void {
    console.log('停止危急值轮询服务...');
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.writebackTimer) clearInterval(this.writebackTimer);
    if (this.escalationTimer) clearInterval(this.escalationTimer);
  }

  private startPolling(): void {
    this.pollingTimer = setInterval(async () => {
      await this.pollCriticalValues();
    }, pollingConfig.interval);
    this.pollCriticalValues();
  }

  private startWriteback(): void {
    this.writebackTimer = setInterval(async () => {
      await this.writebackResults();
    }, pollingConfig.writebackInterval);
    this.writebackResults();
  }

  private startEscalation(): void {
    this.escalationTimer = setInterval(async () => {
      await this.checkEscalation();
    }, pollingConfig.escalationInterval || 900000);
  }

  private async pollCriticalValues(): Promise<void> {
    try {
      console.log('开始从Oracle轮询危急值...');
      const oracleValues = await this.oracleRepository.getUnsentCriticalValues();
      
      for (const oracleValue of oracleValues) {
        const existingRecord = await this.criticalValueRepository.getCriticalValueByHl7Id(`ORACLE_PUSH_${oracleValue.XH}`);
        
        if (!existingRecord) {
          const department = await this.criticalValueRepository.getDepartmentByHl7Code(oracleValue.DEPARTMENT_ID);
          if (!department) {
            console.warn(`未找到科室映射: ${oracleValue.DEPARTMENT_ID}`);
            continue;
          }

          const localId = await this.criticalValueRepository.createCriticalValue({
            hl7MessageId: `ORACLE_PUSH_${oracleValue.XH}`,
            sourceSystem: SourceSystem.LIS,
            rawHl7Message: JSON.stringify(oracleValue),
            patientId: oracleValue.PATIENT_ID,
            patientName: oracleValue.PATIENT_NAME,
            patientGender: oracleValue.PATIENT_GENDER,
            patientAge: oracleValue.PATIENT_AGE,
            inpatientNo: oracleValue.INPATIENT_NO,
            visitId: oracleValue.VISIT_ID,
            departmentId: department.id,
            departmentName: oracleValue.DEPARTMENT_NAME,
            wardBed: oracleValue.WARD_BED,
            attendingDoctorId: BigInt(1),
            attendingDoctorName: oracleValue.ATTENDING_DOCTOR_NAME,
            orderNo: oracleValue.ORDER_NO,
            testName: oracleValue.TEST_NAME,
            testItemName: oracleValue.TEST_ITEM_NAME,
            resultValue: oracleValue.RESULT_VALUE,
            resultUnit: oracleValue.RESULT_UNIT,
            referenceRange: oracleValue.REFERENCE_RANGE,
            abnormalFlag: oracleValue.ABNORMAL_FLAG,
            criticalDescription: oracleValue.CRITICAL_DESCRIPTION,
            status: CriticalValueStatus.Pending,
            escalationLevel: 0,
            testDatetime: oracleValue.TEST_DATETIME
          });

          await this.oracleRepository.updateSendFlag(oracleValue.XH);
          console.log(`从Oracle同步危急值: ${oracleValue.XH} -> 本地ID: ${localId}`);
        }
      }

      await this.processPendingValues();
    } catch (error) {
      console.error('轮询危急值异常:', error);
    }
  }

  private async processPendingValues(): Promise<void> {
    const pendingValues = await this.criticalValueRepository.getPendingCriticalValues();
    
    for (const value of pendingValues) {
      const doctors = await this.criticalValueRepository.getDoctorsByDepartmentId(value.departmentId);
      
      if (doctors.length > 0) {
        const primaryDoctor = doctors[0];
        const success = await this.wechatService.sendCriticalValue(primaryDoctor.weComUserId, value);
        
        if (success) {
          await this.criticalValueRepository.updateStatus(value.id, CriticalValueStatus.Processed);
          await this.criticalValueRepository.createProcessingRecord({
            criticalValueId: value.id,
            doctorId: primaryDoctor.id,
            action: ProcessingAction.Acknowledge,
            comment: '已推送至企业微信'
          });
          await this.criticalValueRepository.createNotificationLog({
            criticalValueId: value.id,
            targetDoctorId: primaryDoctor.id,
            notificationType: NotificationType.First,
            sendStatus: SendStatus.Sent
          });
          console.log(`危急值 ${value.id} 已推送至医生 ${primaryDoctor.name}`);
        } else {
          console.error(`危急值 ${value.id} 推送失败`);
        }
      } else {
        console.warn(`科室 ${value.departmentName} 未配置医生`);
      }
    }
  }

  private async writebackResults(): Promise<void> {
    try {
      console.log('开始回写处理结果到Oracle...');
      const processedValues = await this.criticalValueRepository.getUnprocessedCriticalValues();
      
      for (const value of processedValues) {
        const records = await this.criticalValueRepository.getProcessingRecords(value.id);
        const hasCloseAction = records.some(r => r.action === ProcessingAction.Close);
        
        if (hasCloseAction && value.status !== CriticalValueStatus.Closed) {
          await this.criticalValueRepository.updateStatus(value.id, CriticalValueStatus.Closed);
          
          if (value.hl7MessageId.startsWith('ORACLE_PUSH_')) {
            const xh = value.hl7MessageId.replace('ORACLE_PUSH_', '');
            await this.oracleRepository.updateHandleResult(xh, '已处理');
          }
          
          console.log(`危急值 ${value.id} 已关闭并回写Oracle`);
        }
      }
    } catch (error) {
      console.error('回写处理结果异常:', error);
    }
  }

  private async checkEscalation(): Promise<void> {
    try {
      console.log('检查升级通知...');
      const processedValues = await this.criticalValueRepository.getUnprocessedCriticalValues();
      
      for (const value of processedValues) {
        const timeDiff = Date.now() - value.createdAt.getTime();
        const escalationMinutes = 15;
        
        if (timeDiff > escalationMinutes * 60 * 1000 && value.escalationLevel < 2) {
          const doctors = await this.criticalValueRepository.getDoctorsByDepartmentId(value.departmentId);
          const headDoctor = doctors.find(d => d.isDepartmentHead);
          
          if (headDoctor && value.escalationLevel === 0) {
            await this.sendEscalation(value, headDoctor, 1);
          } else if (value.escalationLevel === 1) {
            const adminDoctors = await this.getAdminDoctors();
            if (adminDoctors.length > 0) {
              await this.sendEscalation(value, adminDoctors[0], 2);
            }
          }
        }
      }
    } catch (error) {
      console.error('检查升级通知异常:', error);
    }
  }

  private async sendEscalation(value: CriticalValueRecord, doctor: DoctorInfo, level: number): Promise<void> {
    const success = await this.wechatService.sendEscalation(doctor.weComUserId, value, level);
    if (success) {
      await this.criticalValueRepository.updateEscalationLevel(value.id, level);
      await this.criticalValueRepository.createNotificationLog({
        criticalValueId: value.id,
        targetDoctorId: doctor.id,
        notificationType: NotificationType.Escalation,
        sendStatus: SendStatus.Sent
      });
      console.log(`危急值 ${value.id} 已升级至 ${level} 级，通知医生 ${doctor.name}`);
    }
  }

  private async getAdminDoctors(): Promise<DoctorInfo[]> {
    return this.criticalValueRepository.getAdminDoctors();
  }
}
