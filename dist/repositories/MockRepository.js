"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockRepository = void 0;
const CriticalValue_1 = require("../entities/CriticalValue");
let criticalValueRecords = [];
let doctorInfoList = [];
let departmentInfoList = [];
let processingRecords = [];
let notificationLogs = [];
let cvIdCounter = 1;
let prIdCounter = 1;
let nlIdCounter = 1;
class MockRepository {
    async init() {
        departmentInfoList = [
            { id: BigInt(1), name: '急诊科', hl7DeptCode: 'EMER', isActive: true },
            { id: BigInt(2), name: '心内科', hl7DeptCode: 'CARD', isActive: true },
            { id: BigInt(3), name: '呼吸内科', hl7DeptCode: 'RESP', isActive: true },
            { id: BigInt(4), name: '神经内科', hl7DeptCode: 'NEUR', isActive: true },
            { id: BigInt(5), name: 'ICU', hl7DeptCode: 'ICU', isActive: true }
        ];
        doctorInfoList = [
            { id: BigInt(1), weComUserId: 'wx_user_001', name: '张医生', departmentId: BigInt(1), isDepartmentHead: false, role: CriticalValue_1.DoctorRole.Doctor, isActive: true },
            { id: BigInt(2), weComUserId: 'wx_user_002', name: '李医生', departmentId: BigInt(2), isDepartmentHead: false, role: CriticalValue_1.DoctorRole.Doctor, isActive: true },
            { id: BigInt(3), weComUserId: 'wx_user_003', name: '王主任', departmentId: BigInt(1), isDepartmentHead: true, role: CriticalValue_1.DoctorRole.Admin, isActive: true }
        ];
        console.log('Mock数据库初始化完成，已加载示例数据');
    }
    async getPendingCriticalValues() {
        return criticalValueRecords.filter(cv => cv.status === CriticalValue_1.CriticalValueStatus.Pending);
    }
    async getCriticalValueById(id) {
        return criticalValueRecords.find(cv => cv.id === id) || null;
    }
    async getCriticalValueByHl7Id(hl7MessageId) {
        return criticalValueRecords.find(cv => cv.hl7MessageId === hl7MessageId) || null;
    }
    async createCriticalValue(record) {
        console.log('[DEBUG] createCriticalValue called with:', JSON.stringify(record, null, 2));
        const now = new Date();
        const newRecord = {
            ...record,
            id: BigInt(cvIdCounter++),
            createdAt: now,
            updatedAt: now
        };
        criticalValueRecords.push(newRecord);
        console.log('[DEBUG] Critical value created:', newRecord.id);
        return newRecord.id;
    }
    async updateStatus(id, status) {
        const index = criticalValueRecords.findIndex(cv => cv.id === id);
        if (index !== -1) {
            criticalValueRecords[index].status = status;
            criticalValueRecords[index].updatedAt = new Date();
        }
    }
    async updateEscalationLevel(id, level) {
        const index = criticalValueRecords.findIndex(cv => cv.id === id);
        if (index !== -1) {
            criticalValueRecords[index].escalationLevel = level;
            criticalValueRecords[index].updatedAt = new Date();
        }
    }
    async getDoctorByWeComUserId(weComUserId) {
        return doctorInfoList.find(d => d.weComUserId === weComUserId) || null;
    }
    async getDoctorsByDepartmentId(departmentId) {
        return doctorInfoList.filter(d => d.departmentId === departmentId && d.isActive);
    }
    async getDepartmentByHl7Code(hl7DeptCode) {
        return departmentInfoList.find(d => d.hl7DeptCode === hl7DeptCode) || null;
    }
    async createProcessingRecord(record) {
        const newRecord = {
            ...record,
            id: BigInt(prIdCounter++),
            processingDatetime: new Date()
        };
        processingRecords.push(newRecord);
    }
    async getProcessingRecords(criticalValueId) {
        return processingRecords.filter(pr => pr.criticalValueId === criticalValueId);
    }
    async createNotificationLog(record) {
        const newRecord = {
            ...record,
            id: BigInt(nlIdCounter++)
        };
        notificationLogs.push(newRecord);
    }
    async updateNotificationStatus(id, status) {
        const index = notificationLogs.findIndex(nl => nl.id === id);
        if (index !== -1) {
            notificationLogs[index].sendStatus = status;
        }
    }
    async getUnprocessedCriticalValues() {
        return criticalValueRecords.filter(cv => cv.status === CriticalValue_1.CriticalValueStatus.Pending || cv.status === CriticalValue_1.CriticalValueStatus.Processed);
    }
    async getAdminDoctors() {
        return doctorInfoList.filter(d => d.role === 'Admin' && d.isActive);
    }
    getAllCriticalValues() {
        return criticalValueRecords;
    }
    getAllDoctors() {
        return doctorInfoList;
    }
    getAllDepartments() {
        return departmentInfoList;
    }
}
exports.MockRepository = MockRepository;
