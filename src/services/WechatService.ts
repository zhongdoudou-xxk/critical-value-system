import axios from 'axios';
import { wechatConfig, accessToken, setAccessToken, isTokenValid } from '../config/wechat';
import { CriticalValueRecord } from '../entities/CriticalValue';

export class WechatService {
  async sendTextMessage(toUser: string, message: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${wechatConfig.sendUrl}?access_token=${token}`,
        {
          touser: toUser,
          agentid: wechatConfig.agentId,
          msgtype: 'text',
          text: {
            content: message
          },
          safe: 0
        }
      );

      console.log('[企业微信] 发送消息结果:', response.data);
      return response.data;
    } catch (error) {
      console.error('[企业微信] 发送消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { errcode: -1, errmsg: errorMessage };
    }
  }

  async getAccessToken(): Promise<string> {
    if (isTokenValid()) {
      return accessToken;
    }

    try {
      const response = await axios.get(wechatConfig.tokenUrl, {
        params: {
          corpid: wechatConfig.corpId,
          corpsecret: wechatConfig.corpSecret
        }
      });

      if (response.data.errcode === 0) {
        setAccessToken(response.data.access_token, response.data.expires_in);
        return response.data.access_token;
      } else {
        throw new Error(`获取企业微信Token失败: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('获取企业微信Token异常:', error);
      throw error;
    }
  }

  async sendCriticalValue(toUser: string, criticalValue: CriticalValueRecord): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const message = this.buildCriticalValueMessage(criticalValue);
      
      const response = await axios.post(
        `${wechatConfig.sendUrl}?access_token=${token}`,
        {
          touser: toUser,
          agentid: wechatConfig.agentId,
          msgtype: 'text',
          text: {
            content: message
          },
          safe: 0
        }
      );

      return response.data.errcode === 0;
    } catch (error) {
      console.error('发送企业微信消息失败:', error);
      return false;
    }
  }

  async sendEscalation(toUser: string, criticalValue: CriticalValueRecord, level: number): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const levelText = level === 1 ? '一级升级' : '二级升级';
      const message = `【危急值${levelText}】\n\n` +
        `患者姓名: ${criticalValue.patientName}\n` +
        `患者ID: ${criticalValue.patientId}\n` +
        `科室: ${criticalValue.departmentName}\n` +
        `检验项目: ${criticalValue.testItemName || criticalValue.testName}\n` +
        `结果值: ${criticalValue.resultValue} ${criticalValue.resultUnit}\n` +
        `参考范围: ${criticalValue.referenceRange || '-'}\n` +
        `报告时间: ${criticalValue.createdAt.toLocaleString()}\n\n` +
        `该危急值已超过15分钟未处理，请立即关注！`;
      
      const response = await axios.post(
        `${wechatConfig.sendUrl}?access_token=${token}`,
        {
          touser: toUser,
          agentid: wechatConfig.agentId,
          msgtype: 'text',
          text: {
            content: message
          },
          safe: 0
        }
      );

      return response.data.errcode === 0;
    } catch (error) {
      console.error('发送升级通知失败:', error);
      return false;
    }
  }

  async sendHandleResult(toUser: string, criticalValue: CriticalValueRecord): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const message = `【危急值处理结果】\n\n` +
        `患者姓名: ${criticalValue.patientName}\n` +
        `检验项目: ${criticalValue.testItemName || criticalValue.testName}\n` +
        `处理状态: 已处理\n` +
        `处理时间: ${new Date().toLocaleString()}`;
      
      const response = await axios.post(
        `${wechatConfig.sendUrl}?access_token=${token}`,
        {
          touser: toUser,
          agentid: wechatConfig.agentId,
          msgtype: 'text',
          text: {
            content: message
          },
          safe: 0
        }
      );

      return response.data.errcode === 0;
    } catch (error) {
      console.error('发送处理结果失败:', error);
      return false;
    }
  }

  private buildCriticalValueMessage(criticalValue: CriticalValueRecord): string {
    return `【危急值提醒】\n\n` +
      `患者姓名: ${criticalValue.patientName}\n` +
      `患者ID: ${criticalValue.patientId}\n` +
      `性别: ${criticalValue.patientGender || '-'}\n` +
      `年龄: ${criticalValue.patientAge || '-'}\n` +
      `科室: ${criticalValue.departmentName}\n` +
      `床号: ${criticalValue.wardBed || '-'}\n` +
      `医生: ${criticalValue.attendingDoctorName}\n` +
      `检验名称: ${criticalValue.testName || '-'}\n` +
      `检验项目: ${criticalValue.testItemName || '-'}\n` +
      `结果值: ${criticalValue.resultValue || '-'} ${criticalValue.resultUnit || ''}\n` +
      `参考范围: ${criticalValue.referenceRange || '-'}\n` +
      `异常标记: ${criticalValue.abnormalFlag || '-'}\n` +
      `危急值描述: ${criticalValue.criticalDescription || '-'}\n` +
      `报告时间: ${criticalValue.createdAt.toLocaleString()}\n\n` +
      `请及时处理并回复处理结果。`;
  }
}
