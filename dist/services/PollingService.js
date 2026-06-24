"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingService = void 0;
const CriticalValueRepository_1 = require("../repositories/CriticalValueRepository");
const OracleRepository_1 = require("../repositories/OracleRepository");
const WechatService_1 = require("./WechatService");
const CriticalValue_1 = require("../entities/CriticalValue");
const config_1 = require("../config");
class PollingService {
    constructor() {
        this.pollingTimer = null;
        this.writebackTimer = null;
        this.escalationTimer = null;
        this.criticalValueRepository = new CriticalValueRepository_1.CriticalValueRepository();
        this.oracleRepository = new OracleRepository_1.OracleRepository();
        this.wechatService = new WechatService_1.WechatService();
    }
    async start() {
        console.log('启动危急值轮询服务...');
        await this.oracleRepository.initPool();
        this.startPolling();
        this.startWriteback();
        this.startEscalation();
    }
    stop() {
        console.log('停止危急值轮询服务...');
        if (this.pollingTimer)
            clearInterval(this.pollingTimer);
        if (this.writebackTimer)
            clearInterval(this.writebackTimer);
        if (this.escalationTimer)
            clearInterval(this.escalationTimer);
    }
    startPolling() {
        this.pollingTimer = setInterval(async () => {
            await this.pollCriticalValues();
        }, config_1.pollingConfig.interval);
        this.pollCriticalValues();
    }
    startWriteback() {
        this.writebackTimer = setInterval(async () => {
            await this.writebackResults();
        }, config_1.pollingConfig.writebackInterval);
        this.writebackResults();
    }
    startEscalation() {
        this.escalationTimer = setInterval(async () => {
            await this.checkEscalation();
        }, config_1.pollingConfig.escalationInterval || 900000);
    }
    async pollCriticalValues() {
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
                        sourceSystem: CriticalValue_1.SourceSystem.LIS,
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
                        status: CriticalValue_1.CriticalValueStatus.Pending,
                        escalationLevel: 0,
                        testDatetime: oracleValue.TEST_DATETIME
                    });
                    await this.oracleRepository.updateSendFlag(oracleValue.XH);
                    console.log(`从Oracle同步危急值: ${oracleValue.XH} -> 本地ID: ${localId}`);
                }
            }
            await this.processPendingValues();
        }
        catch (error) {
            console.error('轮询危急值异常:', error);
        }
    }
    async processPendingValues() {
        const pendingValues = await this.criticalValueRepository.getPendingCriticalValues();
        for (const value of pendingValues) {
            const doctors = await this.criticalValueRepository.getDoctorsByDepartmentId(value.departmentId);
            if (doctors.length > 0) {
                const primaryDoctor = doctors[0];
                const success = await this.wechatService.sendCriticalValue(primaryDoctor.weComUserId, value);
                if (success) {
                    await this.criticalValueRepository.updateStatus(value.id, CriticalValue_1.CriticalValueStatus.Processed);
                    await this.criticalValueRepository.createProcessingRecord({
                        criticalValueId: value.id,
                        doctorId: primaryDoctor.id,
                        action: CriticalValue_1.ProcessingAction.Acknowledge,
                        comment: '已推送至企业微信'
                    });
                    await this.criticalValueRepository.createNotificationLog({
                        criticalValueId: value.id,
                        targetDoctorId: primaryDoctor.id,
                        notificationType: CriticalValue_1.NotificationType.First,
                        sendStatus: CriticalValue_1.SendStatus.Sent
                    });
                    console.log(`危急值 ${value.id} 已推送至医生 ${primaryDoctor.name}`);
                }
                else {
                    console.error(`危急值 ${value.id} 推送失败`);
                }
            }
            else {
                console.warn(`科室 ${value.departmentName} 未配置医生`);
            }
        }
    }
    async writebackResults() {
        try {
            console.log('开始回写处理结果到Oracle...');
            const processedValues = await this.criticalValueRepository.getUnprocessedCriticalValues();
            for (const value of processedValues) {
                const records = await this.criticalValueRepository.getProcessingRecords(value.id);
                const hasCloseAction = records.some(r => r.action === CriticalValue_1.ProcessingAction.Close);
                if (hasCloseAction && value.status !== CriticalValue_1.CriticalValueStatus.Closed) {
                    await this.criticalValueRepository.updateStatus(value.id, CriticalValue_1.CriticalValueStatus.Closed);
                    if (value.hl7MessageId.startsWith('ORACLE_PUSH_')) {
                        const xh = value.hl7MessageId.replace('ORACLE_PUSH_', '');
                        await this.oracleRepository.updateHandleResult(xh, '已处理');
                    }
                    console.log(`危急值 ${value.id} 已关闭并回写Oracle`);
                }
            }
        }
        catch (error) {
            console.error('回写处理结果异常:', error);
        }
    }
    async checkEscalation() {
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
                    }
                    else if (value.escalationLevel === 1) {
                        const adminDoctors = await this.getAdminDoctors();
                        if (adminDoctors.length > 0) {
                            await this.sendEscalation(value, adminDoctors[0], 2);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('检查升级通知异常:', error);
        }
    }
    async sendEscalation(value, doctor, level) {
        const success = await this.wechatService.sendEscalation(doctor.weComUserId, value, level);
        if (success) {
            await this.criticalValueRepository.updateEscalationLevel(value.id, level);
            await this.criticalValueRepository.createNotificationLog({
                criticalValueId: value.id,
                targetDoctorId: doctor.id,
                notificationType: CriticalValue_1.NotificationType.Escalation,
                sendStatus: CriticalValue_1.SendStatus.Sent
            });
            console.log(`危急值 ${value.id} 已升级至 ${level} 级，通知医生 ${doctor.name}`);
        }
    }
    async getAdminDoctors() {
        return this.criticalValueRepository.getAdminDoctors();
    }
}
exports.PollingService = PollingService;
