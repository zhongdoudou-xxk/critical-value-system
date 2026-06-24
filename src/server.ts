import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as crypto from 'crypto';
import { CriticalValueStatus, ProcessingAction } from './entities/CriticalValue';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const useMock = process.env.USE_MOCK === 'true';

if (useMock) {
  console.log('使用Mock数据库模式启动...');
  startMockServer();
} else {
  console.log('使用真实数据库模式启动...');
  startRealServer();
}

function serializeBigInt(obj: any): any {
  if (typeof obj === 'bigint') {
    return Number(obj);
  } else if (obj instanceof Array) {
    return obj.map(item => serializeBigInt(item));
  } else if (obj instanceof Object) {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

async function startMockServer() {
  const { MockRepository } = await import('./repositories/MockRepository');
  const mockRepo = new MockRepository();
  await mockRepo.init();

  app.get('/api/critical-values', async (req, res) => {
    const pending = await mockRepo.getPendingCriticalValues();
    const processed = await mockRepo.getUnprocessedCriticalValues();
    res.json({ pending: serializeBigInt(pending), processed: serializeBigInt(processed) });
  });

  app.get('/api/critical-values/pending', async (req, res) => {
    const values = await mockRepo.getPendingCriticalValues();
    res.json(serializeBigInt(values));
  });

  app.get('/api/critical-values/:id', async (req, res) => {
    const id = BigInt(req.params.id);
    const value = await mockRepo.getCriticalValueById(id);
    if (value) {
      res.json(serializeBigInt(value));
    } else {
      res.status(404).json({ error: '危急值不存在' });
    }
  });

  app.post('/api/critical-values', async (req, res) => {
    try {
      const record = req.body;
      const id = await mockRepo.createCriticalValue(record);
      res.json({ success: true, id: Number(id), message: '危急值记录创建成功' });
    } catch (error) {
      console.error('Error creating critical value:', error);
      res.status(500).json({ error: '创建危急值记录失败' });
    }
  });

  app.post('/api/critical-values/handle', async (req, res) => {
    const { criticalValueId, doctorId, action, comment } = req.body;
    if (!criticalValueId || !doctorId || action === undefined) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }

    await mockRepo.createProcessingRecord({
      criticalValueId: BigInt(criticalValueId),
      doctorId: BigInt(doctorId),
      action,
      comment
    });

    if (action === ProcessingAction.Close) {
      await mockRepo.updateStatus(BigInt(criticalValueId), CriticalValueStatus.Closed);
    }

    res.json({ success: true, message: '处理成功' });
  });

  app.post('/api/critical-values/sync', async (req, res) => {
    const { hl7MessageId, weComUserId, action, comment } = req.body;
    if (!hl7MessageId || !weComUserId || action === undefined) {
      res.status(400).json({ error: '缺少必要参数' });
      return;
    }

    const criticalValue = await mockRepo.getCriticalValueByHl7Id(hl7MessageId);
    if (!criticalValue) {
      res.status(404).json({ error: '危急值记录不存在' });
      return;
    }

    const doctor = await mockRepo.getDoctorByWeComUserId(weComUserId);
    if (!doctor) {
      res.status(404).json({ error: '医生信息不存在' });
      return;
    }

    await mockRepo.createProcessingRecord({
      criticalValueId: criticalValue.id,
      doctorId: doctor.id,
      action,
      comment
    });

    if (action === ProcessingAction.Close) {
      await mockRepo.updateStatus(criticalValue.id, CriticalValueStatus.Closed);
    }

    res.json({ success: true, message: '移动端同步成功' });
  });

  app.get('/api/doctors/department/:departmentId', async (req, res) => {
    const departmentId = BigInt(req.params.departmentId);
    const doctors = await mockRepo.getDoctorsByDepartmentId(departmentId);
    res.json(serializeBigInt(doctors));
  });

  app.post('/api/test-wechat-message', async (req, res) => {
    try {
      const { weComUserId, message } = req.body;
      
      if (!weComUserId || !message) {
        return res.status(400).json({ error: '缺少参数：weComUserId 和 message' });
      }
      
      console.log(`[测试] 准备向用户 ${weComUserId} 发送消息: ${message}`);
      
      // 导入 WechatService 并调用真正的企业微信 API
      const { WechatService } = await import('./services/WechatService');
      const wechatService = new WechatService();
      const result = await wechatService.sendTextMessage(weComUserId, message);
      
      if (result.errcode === 0) {
        res.json({ 
          success: true, 
          message: '消息发送成功',
          details: {
            weComUserId,
            message,
            corpId: process.env.WECOM_CORP_ID,
            agentId: process.env.WECOM_AGENT_ID,
            wechatResult: result
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: '企业微信消息发送失败',
          details: result
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      res.status(500).json({ error: '发送消息失败', details: errorMessage });
    }
  });

  const WECHAT_TOKEN = process.env.WECHAT_TOKEN || 'criticalvalue';

function validateSignature(signature: string, timestamp: string, nonce: string): boolean {
  const arr = [WECHAT_TOKEN, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1');
  const hash = sha1.update(str).digest('hex');
  return hash === signature;
}

app.get('/api/wechat/callback', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query;
    
    console.log(`[企业微信] 验证回调地址, signature: ${signature}, timestamp: ${timestamp}, nonce: ${nonce}, echostr: ${echostr}`);
    
    if (!signature || !timestamp || !nonce || !echostr) {
      return res.status(400).send('缺少参数');
    }
    
    if (validateSignature(signature as string, timestamp as string, nonce as string)) {
      res.send(echostr);
    } else {
      res.status(403).send('签名验证失败');
    }
  });

  app.post('/api/wechat/callback', (req, res) => {
    const { signature, timestamp, nonce } = req.query;
    
    console.log('[企业微信] 收到消息回调:', JSON.stringify(req.body));
    
    if (!signature || !timestamp || !nonce) {
      return res.status(400).send('缺少参数');
    }
    
    if (!validateSignature(signature as string, timestamp as string, nonce as string)) {
      return res.status(403).send('签名验证失败');
    }
    
    res.json({ errcode: 0, errmsg: 'success' });
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`危急值闭环处理系统(Mock模式)启动成功，端口: ${port}`);
    console.log(`健康检查: http://0.0.0.0:${port}/health`);
  });
}

async function startRealServer() {
  try {
    const { initSqlServerPool } = await import('./config/database');
    const { PollingService } = await import('./services/PollingService');
    const routes = await import('./routes');

    await initSqlServerPool();
    
    const pollingService = new PollingService();
    await pollingService.start();
    
    app.use('/api', routes.default);

    app.listen(port, '0.0.0.0', () => {
      console.log(`危急值闭环处理系统启动成功，端口: ${port}`);
      console.log(`健康检查: http://0.0.0.0:${port}/health`);
    });
  } catch (error) {
    console.error('系统启动失败:', error);
    console.log('尝试使用Mock模式启动...');
    startMockServer();
  }
}
