"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticalValueController = void 0;
const CriticalValueRepository_1 = require("../repositories/CriticalValueRepository");
const WechatService_1 = require("../services/WechatService");
const CriticalValue_1 = require("../entities/CriticalValue");
class CriticalValueController {
    constructor() {
        this.criticalValueRepository = new CriticalValueRepository_1.CriticalValueRepository();
        this.wechatService = new WechatService_1.WechatService();
    }
    async getAllCriticalValues(req, res) {
        try {
            const pending = await this.criticalValueRepository.getPendingCriticalValues();
            const processed = await this.criticalValueRepository.getUnprocessedCriticalValues();
            res.json({ pending, processed });
        }
        catch (error) {
            res.status(500).json({ error: '获取危急值列表失败' });
        }
    }
    async getPendingCriticalValues(req, res) {
        try {
            const values = await this.criticalValueRepository.getPendingCriticalValues();
            res.json(values);
        }
        catch (error) {
            res.status(500).json({ error: '获取待处理危急值失败' });
        }
    }
    async getCriticalValueById(req, res) {
        try {
            const id = BigInt(req.params.id);
            const value = await this.criticalValueRepository.getCriticalValueById(id);
            if (value) {
                res.json(value);
            }
            else {
                res.status(404).json({ error: '危急值不存在' });
            }
        }
        catch (error) {
            res.status(500).json({ error: '获取危急值失败' });
        }
    }
    async handleCriticalValue(req, res) {
        try {
            const { criticalValueId, doctorId, action, comment } = req.body;
            if (!criticalValueId || !doctorId || action === undefined) {
                res.status(400).json({ error: '缺少必要参数' });
                return;
            }
            await this.criticalValueRepository.createProcessingRecord({
                criticalValueId: BigInt(criticalValueId),
                doctorId: BigInt(doctorId),
                action,
                comment
            });
            if (action === CriticalValue_1.ProcessingAction.Close) {
                await this.criticalValueRepository.updateStatus(BigInt(criticalValueId), CriticalValue_1.CriticalValueStatus.Closed);
            }
            res.json({ success: true, message: '处理成功' });
        }
        catch (error) {
            res.status(500).json({ error: '处理危急值失败' });
        }
    }
    async syncFromMobile(req, res) {
        try {
            const { hl7MessageId, weComUserId, action, comment } = req.body;
            if (!hl7MessageId || !weComUserId || action === undefined) {
                res.status(400).json({ error: '缺少必要参数' });
                return;
            }
            const criticalValue = await this.criticalValueRepository.getCriticalValueByHl7Id(hl7MessageId);
            if (!criticalValue) {
                res.status(404).json({ error: '危急值记录不存在' });
                return;
            }
            const doctor = await this.criticalValueRepository.getDoctorByWeComUserId(weComUserId);
            if (!doctor) {
                res.status(404).json({ error: '医生信息不存在' });
                return;
            }
            await this.criticalValueRepository.createProcessingRecord({
                criticalValueId: criticalValue.id,
                doctorId: doctor.id,
                action,
                comment
            });
            if (action === CriticalValue_1.ProcessingAction.Close) {
                await this.criticalValueRepository.updateStatus(criticalValue.id, CriticalValue_1.CriticalValueStatus.Closed);
            }
            res.json({ success: true, message: '移动端同步成功' });
        }
        catch (error) {
            res.status(500).json({ error: '移动端同步失败' });
        }
    }
    async createCriticalValue(req, res) {
        try {
            const record = req.body;
            const id = await this.criticalValueRepository.createCriticalValue(record);
            res.json({ success: true, id, message: '危急值记录创建成功' });
        }
        catch (error) {
            res.status(500).json({ error: '创建危急值记录失败' });
        }
    }
    async getDoctorsByDepartment(req, res) {
        try {
            const departmentId = BigInt(req.params.departmentId);
            const doctors = await this.criticalValueRepository.getDoctorsByDepartmentId(departmentId);
            res.json(doctors);
        }
        catch (error) {
            res.status(500).json({ error: '获取科室医生失败' });
        }
    }
}
exports.CriticalValueController = CriticalValueController;
