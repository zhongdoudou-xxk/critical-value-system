"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticalValueRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const CriticalValue_1 = require("../entities/CriticalValue");
const database_1 = require("../config/database");
class CriticalValueRepository {
    async getPendingCriticalValues() {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('status', mssql_1.default.NVarChar, CriticalValue_1.CriticalValueStatus.Pending)
            .query(`SELECT * FROM critical_value_records WHERE Status = @status ORDER BY CreatedAt DESC`);
        return result.recordset.map(row => this.mapRowToCriticalValue(row));
    }
    async getCriticalValueById(id) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('id', mssql_1.default.BigInt, id)
            .query(`SELECT * FROM critical_value_records WHERE Id = @id`);
        return result.recordset.length > 0 ? this.mapRowToCriticalValue(result.recordset[0]) : null;
    }
    async getCriticalValueByHl7Id(hl7MessageId) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('hl7MessageId', mssql_1.default.NVarChar, hl7MessageId)
            .query(`SELECT * FROM critical_value_records WHERE Hl7MessageId = @hl7MessageId`);
        return result.recordset.length > 0 ? this.mapRowToCriticalValue(result.recordset[0]) : null;
    }
    async createCriticalValue(record) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('hl7MessageId', mssql_1.default.NVarChar, record.hl7MessageId)
            .input('sourceSystem', mssql_1.default.Int, record.sourceSystem)
            .input('rawHl7Message', mssql_1.default.NVarChar, record.rawHl7Message || null)
            .input('patientId', mssql_1.default.NVarChar, record.patientId)
            .input('patientName', mssql_1.default.NVarChar, record.patientName)
            .input('patientGender', mssql_1.default.NVarChar, record.patientGender || null)
            .input('patientAge', mssql_1.default.NVarChar, record.patientAge || null)
            .input('inpatientNo', mssql_1.default.NVarChar, record.inpatientNo || null)
            .input('visitId', mssql_1.default.NVarChar, record.visitId || null)
            .input('departmentId', mssql_1.default.BigInt, record.departmentId)
            .input('departmentName', mssql_1.default.NVarChar, record.departmentName)
            .input('wardBed', mssql_1.default.NVarChar, record.wardBed || null)
            .input('attendingDoctorId', mssql_1.default.BigInt, record.attendingDoctorId)
            .input('attendingDoctorName', mssql_1.default.NVarChar, record.attendingDoctorName)
            .input('orderNo', mssql_1.default.NVarChar, record.orderNo || null)
            .input('testName', mssql_1.default.NVarChar, record.testName || null)
            .input('testItemName', mssql_1.default.NVarChar, record.testItemName || null)
            .input('resultValue', mssql_1.default.NVarChar, record.resultValue || null)
            .input('resultUnit', mssql_1.default.NVarChar, record.resultUnit || null)
            .input('referenceRange', mssql_1.default.NVarChar, record.referenceRange || null)
            .input('abnormalFlag', mssql_1.default.NVarChar, record.abnormalFlag || null)
            .input('criticalDescription', mssql_1.default.NVarChar, record.criticalDescription || null)
            .input('status', mssql_1.default.NVarChar, record.status)
            .input('escalationLevel', mssql_1.default.Int, record.escalationLevel)
            .input('testDatetime', mssql_1.default.DateTime2, record.testDatetime || null)
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
    async updateStatus(id, status) {
        const pool = await (0, database_1.getSqlServerConnection)();
        await pool.request()
            .input('id', mssql_1.default.BigInt, id)
            .input('status', mssql_1.default.NVarChar, status)
            .query(`UPDATE critical_value_records SET Status = @status, UpdatedAt = GETDATE() WHERE Id = @id`);
    }
    async updateEscalationLevel(id, level) {
        const pool = await (0, database_1.getSqlServerConnection)();
        await pool.request()
            .input('id', mssql_1.default.BigInt, id)
            .input('level', mssql_1.default.Int, level)
            .query(`UPDATE critical_value_records SET EscalationLevel = @level, UpdatedAt = GETDATE() WHERE Id = @id`);
    }
    async getDoctorByWeComUserId(weComUserId) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('weComUserId', mssql_1.default.NVarChar, weComUserId)
            .query(`SELECT * FROM doctor_info WHERE WeComUserId = @weComUserId AND IsActive = 1`);
        return result.recordset.length > 0 ? this.mapRowToDoctor(result.recordset[0]) : null;
    }
    async getDoctorsByDepartmentId(departmentId) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('departmentId', mssql_1.default.BigInt, departmentId)
            .query(`SELECT * FROM doctor_info WHERE DepartmentId = @departmentId AND IsActive = 1 ORDER BY IsDepartmentHead DESC`);
        return result.recordset.map(row => this.mapRowToDoctor(row));
    }
    async getDepartmentByHl7Code(hl7DeptCode) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('hl7DeptCode', mssql_1.default.NVarChar, hl7DeptCode)
            .query(`SELECT * FROM department_info WHERE Hl7DeptCode = @hl7DeptCode AND IsActive = 1`);
        return result.recordset.length > 0 ? this.mapRowToDepartment(result.recordset[0]) : null;
    }
    async createProcessingRecord(record) {
        const pool = await (0, database_1.getSqlServerConnection)();
        await pool.request()
            .input('criticalValueId', mssql_1.default.BigInt, record.criticalValueId)
            .input('doctorId', mssql_1.default.BigInt, record.doctorId)
            .input('action', mssql_1.default.Int, record.action)
            .input('comment', mssql_1.default.NVarChar, record.comment || null)
            .query(`INSERT INTO processing_records (CriticalValueId, DoctorId, Action, Comment) 
              VALUES (@criticalValueId, @doctorId, @action, @comment)`);
    }
    async getProcessingRecords(criticalValueId) {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .input('criticalValueId', mssql_1.default.BigInt, criticalValueId)
            .query(`SELECT * FROM processing_records WHERE CriticalValueId = @criticalValueId ORDER BY ProcessingDatetime DESC`);
        return result.recordset.map(row => this.mapRowToProcessingRecord(row));
    }
    async createNotificationLog(record) {
        const pool = await (0, database_1.getSqlServerConnection)();
        await pool.request()
            .input('criticalValueId', mssql_1.default.BigInt, record.criticalValueId)
            .input('targetDoctorId', mssql_1.default.BigInt, record.targetDoctorId)
            .input('weComMsgId', mssql_1.default.NVarChar, record.weComMsgId || null)
            .input('notificationType', mssql_1.default.Int, record.notificationType)
            .input('sendStatus', mssql_1.default.NVarChar, record.sendStatus)
            .input('readAt', mssql_1.default.DateTime2, record.readAt || null)
            .query(`INSERT INTO notification_logs 
              (CriticalValueId, TargetDoctorId, WeComMsgId, NotificationType, SendStatus, ReadAt)
              VALUES (@criticalValueId, @targetDoctorId, @weComMsgId, @notificationType, @sendStatus, @readAt)`);
    }
    async updateNotificationStatus(id, status) {
        const pool = await (0, database_1.getSqlServerConnection)();
        await pool.request()
            .input('id', mssql_1.default.BigInt, id)
            .input('status', mssql_1.default.NVarChar, status)
            .query(`UPDATE notification_logs SET SendStatus = @status WHERE Id = @id`);
    }
    async getUnprocessedCriticalValues() {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .query(`SELECT * FROM critical_value_records 
              WHERE Status IN ('${CriticalValue_1.CriticalValueStatus.Pending}', '${CriticalValue_1.CriticalValueStatus.Processed}') 
              ORDER BY CreatedAt DESC`);
        return result.recordset.map(row => this.mapRowToCriticalValue(row));
    }
    async getAdminDoctors() {
        const pool = await (0, database_1.getSqlServerConnection)();
        const result = await pool.request()
            .query(`SELECT * FROM doctor_info WHERE Role = 'Admin' AND IsActive = 1`);
        return result.recordset.map(row => this.mapRowToDoctor(row));
    }
    mapRowToCriticalValue(row) {
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
            status: row.Status,
            escalationLevel: row.EscalationLevel,
            testDatetime: row.TestDatetime ? new Date(row.TestDatetime) : undefined,
            createdAt: new Date(row.CreatedAt),
            updatedAt: new Date(row.UpdatedAt)
        };
    }
    mapRowToDoctor(row) {
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
            role: row.Role,
            isActive: row.IsActive === 1,
            syncedAt: row.SyncedAt ? new Date(row.SyncedAt) : undefined
        };
    }
    mapRowToDepartment(row) {
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
    mapRowToProcessingRecord(row) {
        return {
            id: BigInt(row.Id),
            criticalValueId: BigInt(row.CriticalValueId),
            doctorId: BigInt(row.DoctorId),
            action: row.Action,
            comment: row.Comment,
            processingDatetime: new Date(row.ProcessingDatetime)
        };
    }
}
exports.CriticalValueRepository = CriticalValueRepository;
