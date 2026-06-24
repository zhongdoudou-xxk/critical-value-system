import dotenv from 'dotenv';

dotenv.config();

export const wechatConfig = {
  corpId: process.env.WECOM_CORP_ID || process.env.WECHAT_CORP_ID || '',
  corpSecret: process.env.WECOM_CORP_SECRET || process.env.WECHAT_CORP_SECRET || '',
  agentId: parseInt(process.env.WECOM_AGENT_ID || process.env.WECHAT_AGENT_ID || '1000001'),
  tokenUrl: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
  sendUrl: 'https://qyapi.weixin.qq.com/cgi-bin/message/send'
};

export let accessToken = '';
export let tokenExpireTime = 0;

export function setAccessToken(token: string, expireIn: number): void {
  accessToken = token;
  tokenExpireTime = Date.now() + (expireIn - 60) * 1000;
}

export function isTokenValid(): boolean {
  return !!accessToken && Date.now() < tokenExpireTime;
}
