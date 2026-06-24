"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CriticalValueRepository_1 = require("../repositories/CriticalValueRepository");
const CriticalValue_1 = require("../entities/CriticalValue");
describe('CriticalValueRepository', () => {
    let repository;
    beforeAll(() => {
        repository = new CriticalValueRepository_1.CriticalValueRepository();
    });
    describe('createCriticalValue', () => {
        it('should create a critical value record', async () => {
            const record = {
                hl7MessageId: `TEST_${Date.now()}`,
                sourceSystem: CriticalValue_1.SourceSystem.LIS,
                patientId: 'TEST_PATIENT_001',
                patientName: '测试患者',
                departmentId: BigInt(1),
                departmentName: '急诊科',
                attendingDoctorId: BigInt(1),
                attendingDoctorName: '张医生',
                status: CriticalValue_1.CriticalValueStatus.Pending,
                escalationLevel: 0
            };
            const id = await repository.createCriticalValue(record);
            expect(typeof id).toBe('bigint');
            expect(id).toBeGreaterThan(0);
        });
    });
    describe('getPendingCriticalValues', () => {
        it('should return pending critical values', async () => {
            const values = await repository.getPendingCriticalValues();
            expect(Array.isArray(values)).toBe(true);
        });
    });
    describe('updateStatus', () => {
        it('should update critical value status', async () => {
            const record = {
                hl7MessageId: `TEST_UPDATE_${Date.now()}`,
                sourceSystem: CriticalValue_1.SourceSystem.LIS,
                patientId: 'TEST_PATIENT_002',
                patientName: '测试患者2',
                departmentId: BigInt(1),
                departmentName: '急诊科',
                attendingDoctorId: BigInt(1),
                attendingDoctorName: '张医生',
                status: CriticalValue_1.CriticalValueStatus.Pending,
                escalationLevel: 0
            };
            const id = await repository.createCriticalValue(record);
            await repository.updateStatus(id, CriticalValue_1.CriticalValueStatus.Processed);
            const updated = await repository.getCriticalValueById(id);
            expect(updated?.status).toBe(CriticalValue_1.CriticalValueStatus.Processed);
        });
    });
    describe('getCriticalValueByHl7Id', () => {
        it('should return critical value by HL7 message ID', async () => {
            const hl7Id = `TEST_HL7_${Date.now()}`;
            const record = {
                hl7MessageId: hl7Id,
                sourceSystem: CriticalValue_1.SourceSystem.LIS,
                patientId: 'TEST_PATIENT_003',
                patientName: '测试患者3',
                departmentId: BigInt(1),
                departmentName: '急诊科',
                attendingDoctorId: BigInt(1),
                attendingDoctorName: '张医生',
                status: CriticalValue_1.CriticalValueStatus.Pending,
                escalationLevel: 0
            };
            await repository.createCriticalValue(record);
            const found = await repository.getCriticalValueByHl7Id(hl7Id);
            expect(found).not.toBeNull();
            expect(found?.hl7MessageId).toBe(hl7Id);
        });
    });
});
