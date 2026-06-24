import { 
  CriticalValueRecord, 
  CriticalValueStatus, 
  DoctorInfo, 
  DoctorRole,
  DepartmentInfo,
  ProcessingRecord,
  ProcessingAction,
  NotificationLog,
  NotificationType,
  SendStatus,
  SourceSystem
} from '../entities/CriticalValue';

let criticalValueRecords: CriticalValueRecord[] = [];
let doctorInfoList: DoctorInfo[] = [];
let departmentInfoList: DepartmentInfo[] = [];
let processingRecords: ProcessingRecord[] = [];
let notificationLogs: NotificationLog[] = [];

let cvIdCounter = 1;
let prIdCounter = 1;
let nlIdCounter = 1;

export class MockRepository {
  async init(): Promise<void> {
    departmentInfoList = [
      { id: BigInt(1), name: '急诊科', hl7DeptCode: 'EMER', isActive: true },
      { id: BigInt(2), name: '心内科', hl7DeptCode: 'CARD', isActive: true },
      { id: BigInt(3), name: '呼吸内科', hl7DeptCode: 'RESP', isActive: true },
      { id: BigInt(4), name: '神经内科', hl7DeptCode: 'NEUR', isActive: true },
      { id: BigInt(5), name: 'ICU', hl7DeptCode: 'ICU', isActive: true }
    ];

    doctorInfoList = [
      { id: BigInt(1), weComUserId: 'wx_user_001', name: '张医生', departmentId: BigInt(1), isDepartmentHead: false, role: DoctorRole.Doctor, isActive: true },
      { id: BigInt(2), weComUserId: 'wx_user_002', name: '李医生', departmentId: BigInt(2), isDepartmentHead: false, role: DoctorRole.Doctor, isActive: true },
      { id: BigInt(3), weComUserId: 'wx_user_003', name: '王主任', departmentId: BigInt(1), isDepartmentHead: true, role: DoctorRole.Admin, isActive: true }
    ];

    console.log('Mock数据库初始化完成，已加载示例数据');
  }

  async getPendingCriticalValues(): Promise<CriticalValueRecord[]> {
    return criticalValueRecords.filter(cv => cv.status === CriticalValueStatus.Pending);
  }

  async getCriticalValueById(id: bigint): Promise<CriticalValueRecord | null> {
    return criticalValueRecords.find(cv => cv.id === id) || null;
  }

  async getCriticalValueByHl7Id(hl7MessageId: string): Promise<CriticalValueRecord | null> {
    return criticalValueRecords.find(cv => cv.hl7MessageId === hl7MessageId) || null;
  }

  async createCriticalValue(record: Omit<CriticalValueRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint> {
    console.log('[DEBUG] createCriticalValue called with:', JSON.stringify(record, null, 2));
    const now = new Date();
    const newRecord: CriticalValueRecord = {
      ...record,
      id: BigInt(cvIdCounter++),
      createdAt: now,
      updatedAt: now
    };
    criticalValueRecords.push(newRecord);
    console.log('[DEBUG] Critical value created:', newRecord.id);
    return newRecord.id;
  }

  async updateStatus(id: bigint, status: CriticalValueStatus): Promise<void> {
    const index = criticalValueRecords.findIndex(cv => cv.id === id);
    if (index !== -1) {
      criticalValueRecords[index].status = status;
      criticalValueRecords[index].updatedAt = new Date();
    }
  }

  async updateEscalationLevel(id: bigint, level: number): Promise<void> {
    const index = criticalValueRecords.findIndex(cv => cv.id === id);
    if (index !== -1) {
      criticalValueRecords[index].escalationLevel = level;
      criticalValueRecords[index].updatedAt = new Date();
    }
  }

  async getDoctorByWeComUserId(weComUserId: string): Promise<DoctorInfo | null> {
    return doctorInfoList.find(d => d.weComUserId === weComUserId) || null;
  }

  async getDoctorsByDepartmentId(departmentId: bigint): Promise<DoctorInfo[]> {
    return doctorInfoList.filter(d => d.departmentId === departmentId && d.isActive);
  }

  async getDepartmentByHl7Code(hl7DeptCode: string): Promise<DepartmentInfo | null> {
    return departmentInfoList.find(d => d.hl7DeptCode === hl7DeptCode) || null;
  }

  async createProcessingRecord(record: Omit<ProcessingRecord, 'id' | 'processingDatetime'>): Promise<void> {
    const newRecord: ProcessingRecord = {
      ...record,
      id: BigInt(prIdCounter++),
      processingDatetime: new Date()
    };
    processingRecords.push(newRecord);
  }

  async getProcessingRecords(criticalValueId: bigint): Promise<ProcessingRecord[]> {
    return processingRecords.filter(pr => pr.criticalValueId === criticalValueId);
  }

  async createNotificationLog(record: Omit<NotificationLog, 'id'>): Promise<void> {
    const newRecord: NotificationLog = {
      ...record,
      id: BigInt(nlIdCounter++)
    };
    notificationLogs.push(newRecord);
  }

  async updateNotificationStatus(id: bigint, status: SendStatus): Promise<void> {
    const index = notificationLogs.findIndex(nl => nl.id === id);
    if (index !== -1) {
      notificationLogs[index].sendStatus = status;
    }
  }

  async getUnprocessedCriticalValues(): Promise<CriticalValueRecord[]> {
    return criticalValueRecords.filter(cv => 
      cv.status === CriticalValueStatus.Pending || cv.status === CriticalValueStatus.Processed
    );
  }

  async getAdminDoctors(): Promise<DoctorInfo[]> {
    return doctorInfoList.filter(d => d.role === 'Admin' && d.isActive);
  }

  getAllCriticalValues(): CriticalValueRecord[] {
    return criticalValueRecords;
  }

  getAllDoctors(): DoctorInfo[] {
    return doctorInfoList;
  }

  getAllDepartments(): DepartmentInfo[] {
    return departmentInfoList;
  }
}
