import sql from 'mssql';
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
  SendStatus
} from '../entities/CriticalValue';
import { getSqlServerConnection } from '../config/database';

export class CriticalValueRepository {
  async getPendingCriticalValues(): Promise<CriticalValueRecord[]> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('status', sql.NVarChar, CriticalValueStatus.Pending)
      .query(`SELECT * FROM critical_value_records WHERE Status = @status ORDER BY CreatedAt DESC`);
    return result.recordset.map(row => this.mapRowToCriticalValue(row));
  }

  async getCriticalValueById(id: bigint): Promise<CriticalValueRecord | null> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`SELECT * FROM critical_value_records WHERE Id = @id`);
    return result.recordset.length > 0 ? this.mapRowToCriticalValue(result.recordset[0]) : null;
  }

  async getCriticalValueByHl7Id(hl7MessageId: string): Promise<CriticalValueRecord | null> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('hl7MessageId', sql.NVarChar, hl7MessageId)
      .query(`SELECT * FROM critical_value_records WHERE Hl7MessageId = @hl7MessageId`);
    return result.recordset.length > 0 ? this.mapRowToCriticalValue(result.recordset[0]) : null;
  }

  async createCriticalValue(record: Omit<CriticalValueRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<bigint> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('hl7MessageId', sql.NVarChar, record.hl7MessageId)
      .input('sourceSystem', sql.Int, record.sourceSystem)
      .input('rawHl7Message', sql.NVarChar, record.rawHl7Message || null)
      .input('patientId', sql.NVarChar, record.patientId)
      .input('patientName', sql.NVarChar, record.patientName)
      .input('patientGender', sql.NVarChar, record.patientGender || null)
      .input('patientAge', sql.NVarChar, record.patientAge || null)
      .input('inpatientNo', sql.NVarChar, record.inpatientNo || null)
      .input('visitId', sql.NVarChar, record.visitId || null)
      .input('departmentId', sql.BigInt, record.departmentId)
      .input('departmentName', sql.NVarChar, record.departmentName)
      .input('wardBed', sql.NVarChar, record.wardBed || null)
      .input('attendingDoctorId', sql.BigInt, record.attendingDoctorId)
      .input('attendingDoctorName', sql.NVarChar, record.attendingDoctorName)
      .input('orderNo', sql.NVarChar, record.orderNo || null)
      .input('testName', sql.NVarChar, record.testName || null)
      .input('testItemName', sql.NVarChar, record.testItemName || null)
      .input('resultValue', sql.NVarChar, record.resultValue || null)
      .input('resultUnit', sql.NVarChar, record.resultUnit || null)
      .input('referenceRange', sql.NVarChar, record.referenceRange || null)
      .input('abnormalFlag', sql.NVarChar, record.abnormalFlag || null)
      .input('criticalDescription', sql.NVarChar, record.criticalDescription || null)
      .input('status', sql.NVarChar, record.status)
      .input('escalationLevel', sql.Int, record.escalationLevel)
      .input('testDatetime', sql.DateTime2, record.testDatetime || null)
      .query(`INSERT INTO critical_value_records 
        (Hl7MessageId, SourceSystem, RawHl7Message, PatientId, PatientName, PatientGender, 
         PatientAge, InpatientNo, VisitId, DepartmentId, DepartmentName, WardBed, 
         AttendingDoctorId, AttendingDoctorName, OrderNo, TestName, TestItemName, 
         ResultValue, ResultUnit, ReferenceRange, AbnormalFlag, CriticalDescription, 
         Status, EscalationLevel, TestDatetime)
        OUTPUT INSERTED.Id
        VALUES (@hl7MessageId, @sourceSystem, @rawHl7Message, @patientId, @patientName, @patientGender,
                @patientAge, @inpatientNo, @visitId, @departmentId, @departmentName, @wardBed,
                @attendingDoctorId, @attendingDoctorName, @orderNo, @testName, @testItemName,
                @resultValue, @resultUnit, @referenceRange, @abnormalFlag, @criticalDescription,
                @status, @escalationLevel, @testDatetime)`);
    return result.recordset[0].Id;
  }

  async updateStatus(id: bigint, status: CriticalValueStatus): Promise<void> {
    const pool = await getSqlServerConnection();
    await pool.request()
      .input('id', sql.BigInt, id)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE critical_value_records SET Status = @status, UpdatedAt = GETDATE() WHERE Id = @id`);
  }

  async updateEscalationLevel(id: bigint, level: number): Promise<void> {
    const pool = await getSqlServerConnection();
    await pool.request()
      .input('id', sql.BigInt, id)
      .input('level', sql.Int, level)
      .query(`UPDATE critical_value_records SET EscalationLevel = @level, UpdatedAt = GETDATE() WHERE Id = @id`);
  }

  async getDoctorByWeComUserId(weComUserId: string): Promise<DoctorInfo | null> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('weComUserId', sql.NVarChar, weComUserId)
      .query(`SELECT * FROM doctor_info WHERE WeComUserId = @weComUserId AND IsActive = 1`);
    return result.recordset.length > 0 ? this.mapRowToDoctor(result.recordset[0]) : null;
  }

  async getDoctorsByDepartmentId(departmentId: bigint): Promise<DoctorInfo[]> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('departmentId', sql.BigInt, departmentId)
      .query(`SELECT * FROM doctor_info WHERE DepartmentId = @departmentId AND IsActive = 1 ORDER BY IsDepartmentHead DESC`);
    return result.recordset.map(row => this.mapRowToDoctor(row));
  }

  async getDepartmentByHl7Code(hl7DeptCode: string): Promise<DepartmentInfo | null> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('hl7DeptCode', sql.NVarChar, hl7DeptCode)
      .query(`SELECT * FROM department_info WHERE Hl7DeptCode = @hl7DeptCode AND IsActive = 1`);
    return result.recordset.length > 0 ? this.mapRowToDepartment(result.recordset[0]) : null;
  }

  async createProcessingRecord(record: Omit<ProcessingRecord, 'id' | 'processingDatetime'>): Promise<void> {
    const pool = await getSqlServerConnection();
    await pool.request()
      .input('criticalValueId', sql.BigInt, record.criticalValueId)
      .input('doctorId', sql.BigInt, record.doctorId)
      .input('action', sql.Int, record.action)
      .input('comment', sql.NVarChar, record.comment || null)
      .query(`INSERT INTO processing_records (CriticalValueId, DoctorId, Action, Comment) 
              VALUES (@criticalValueId, @doctorId, @action, @comment)`);
  }

  async getProcessingRecords(criticalValueId: bigint): Promise<ProcessingRecord[]> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .input('criticalValueId', sql.BigInt, criticalValueId)
      .query(`SELECT * FROM processing_records WHERE CriticalValueId = @criticalValueId ORDER BY ProcessingDatetime DESC`);
    return result.recordset.map(row => this.mapRowToProcessingRecord(row));
  }

  async createNotificationLog(record: Omit<NotificationLog, 'id'>): Promise<void> {
    const pool = await getSqlServerConnection();
    await pool.request()
      .input('criticalValueId', sql.BigInt, record.criticalValueId)
      .input('targetDoctorId', sql.BigInt, record.targetDoctorId)
      .input('weComMsgId', sql.NVarChar, record.weComMsgId || null)
      .input('notificationType', sql.Int, record.notificationType)
      .input('sendStatus', sql.NVarChar, record.sendStatus)
      .input('readAt', sql.DateTime2, record.readAt || null)
      .query(`INSERT INTO notification_logs 
              (CriticalValueId, TargetDoctorId, WeComMsgId, NotificationType, SendStatus, ReadAt)
              VALUES (@criticalValueId, @targetDoctorId, @weComMsgId, @notificationType, @sendStatus, @readAt)`);
  }

  async updateNotificationStatus(id: bigint, status: SendStatus): Promise<void> {
    const pool = await getSqlServerConnection();
    await pool.request()
      .input('id', sql.BigInt, id)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE notification_logs SET SendStatus = @status WHERE Id = @id`);
  }

  async getUnprocessedCriticalValues(): Promise<CriticalValueRecord[]> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .query(`SELECT * FROM critical_value_records 
              WHERE Status IN ('${CriticalValueStatus.Pending}', '${CriticalValueStatus.Processed}') 
              ORDER BY CreatedAt DESC`);
    return result.recordset.map(row => this.mapRowToCriticalValue(row));
  }

  async getAdminDoctors(): Promise<DoctorInfo[]> {
    const pool = await getSqlServerConnection();
    const result = await pool.request()
      .query(`SELECT * FROM doctor_info WHERE Role = 'Admin' AND IsActive = 1`);
    return result.recordset.map(row => this.mapRowToDoctor(row));
  }

  private mapRowToCriticalValue(row: any): CriticalValueRecord {
    return {
      id: BigInt(row.Id),
      hl7MessageId: row.Hl7MessageId,
      sourceSystem: row.SourceSystem,
      rawHl7Message: row.RawHl7Message,
      patientId: row.PatientId,
      patientName: row.PatientName,
      patientGender: row.PatientGender,
      patientAge: row.PatientAge,
      inpatientNo: row.InpatientNo,
      visitId: row.VisitId,
      departmentId: BigInt(row.DepartmentId),
      departmentName: row.DepartmentName,
      wardBed: row.WardBed,
      attendingDoctorId: BigInt(row.AttendingDoctorId),
      attendingDoctorName: row.AttendingDoctorName,
      orderNo: row.OrderNo,
      testName: row.TestName,
      testItemName: row.TestItemName,
      resultValue: row.ResultValue,
      resultUnit: row.ResultUnit,
      referenceRange: row.ReferenceRange,
      abnormalFlag: row.AbnormalFlag,
      criticalDescription: row.CriticalDescription,
      status: row.Status as CriticalValueStatus,
      escalationLevel: row.EscalationLevel,
      testDatetime: row.TestDatetime ? new Date(row.TestDatetime) : undefined,
      createdAt: new Date(row.CreatedAt),
      updatedAt: new Date(row.UpdatedAt)
    };
  }

  private mapRowToDoctor(row: any): DoctorInfo {
    return {
      id: BigInt(row.Id),
      weComUserId: row.WeComUserId,
      weComUnionId: row.WeComUnionId,
      name: row.Name,
      employeeNo: row.EmployeeNo,
      mobile: row.Mobile,
      title: row.Title,
      departmentId: BigInt(row.DepartmentId),
      isDepartmentHead: row.IsDepartmentHead === 1,
      role: row.Role as DoctorRole,
      isActive: row.IsActive === 1,
      syncedAt: row.SyncedAt ? new Date(row.SyncedAt) : undefined
    };
  }

  private mapRowToDepartment(row: any): DepartmentInfo {
    return {
      id: BigInt(row.Id),
      weComDeptId: row.WeComDeptId,
      name: row.Name,
      parentId: row.ParentId ? BigInt(row.ParentId) : undefined,
      hl7DeptCode: row.Hl7DeptCode,
      wardCode: row.WardCode,
      isActive: row.IsActive === 1
    };
  }

  private mapRowToProcessingRecord(row: any): ProcessingRecord {
    return {
      id: BigInt(row.Id),
      criticalValueId: BigInt(row.CriticalValueId),
      doctorId: BigInt(row.DoctorId),
      action: row.Action as ProcessingAction,
      comment: row.Comment,
      processingDatetime: new Date(row.ProcessingDatetime)
    };
  }
}
