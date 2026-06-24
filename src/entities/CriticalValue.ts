export interface CriticalValueRecord {
  id: bigint;
  hl7MessageId: string;
  sourceSystem: SourceSystem;
  rawHl7Message?: string;
  patientId: string;
  patientName: string;
  patientGender?: string;
  patientAge?: string;
  inpatientNo?: string;
  visitId?: string;
  departmentId: bigint;
  departmentName: string;
  wardBed?: string;
  attendingDoctorId: bigint;
  attendingDoctorName: string;
  orderNo?: string;
  testName?: string;
  testItemName?: string;
  resultValue?: string;
  resultUnit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  criticalDescription?: string;
  status: CriticalValueStatus;
  escalationLevel: number;
  testDatetime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorInfo {
  id: bigint;
  weComUserId: string;
  weComUnionId?: string;
  name: string;
  employeeNo?: string;
  mobile?: string;
  title?: string;
  departmentId: bigint;
  isDepartmentHead: boolean;
  role: DoctorRole;
  isActive: boolean;
  syncedAt?: Date;
}

export interface DepartmentInfo {
  id: bigint;
  weComDeptId?: string;
  name: string;
  parentId?: bigint;
  hl7DeptCode?: string;
  wardCode?: string;
  isActive: boolean;
}

export interface ProcessingRecord {
  id: bigint;
  criticalValueId: bigint;
  doctorId: bigint;
  action: ProcessingAction;
  comment?: string;
  processingDatetime: Date;
}

export interface NotificationLog {
  id: bigint;
  criticalValueId: bigint;
  targetDoctorId: bigint;
  weComMsgId?: string;
  notificationType: NotificationType;
  sendStatus: SendStatus;
  readAt?: Date;
}

export enum SourceSystem {
  LIS = 0,
  PACS = 1,
  ECG = 2
}

export enum CriticalValueStatus {
  Pending = 'Pending',
  Processed = 'Processed',
  Timeout = 'Timeout',
  Closed = 'Closed'
}

export enum DoctorRole {
  Admin = 'Admin',
  Doctor = 'Doctor'
}

export enum ProcessingAction {
  Acknowledge = 0,
  Handle = 1,
  Transfer = 2,
  Close = 3
}

export enum NotificationType {
  First = 0,
  Escalation = 1,
  Reminder = 2
}

export enum SendStatus {
  Pending = 'Pending',
  Sent = 'Sent',
  Failed = 'Failed',
  Read = 'Read'
}
