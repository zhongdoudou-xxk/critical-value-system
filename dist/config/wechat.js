"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenExpireTime = exports.accessToken = exports.wechatConfig = void 0;
exports.setAccessToken = setAccessToken;
exports.isTokenValid = isTokenValid;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.wechatConfig = {
    corpId: process.env.WECOM_CORP_ID || process.env.WECHAT_CORP_ID || '',
    corpSecret: process.env.WECOM_CORP_SECRET || process.env.WECHAT_CORP_SECRET || '',
    agentId: parseInt(process.env.WECOM_AGENT_ID || process.env.WECHAT_AGENT_ID || '1000001'),
    tokenUrl: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
    sendUrl: 'https://qyapi.weixin.qq.com/cgi-bin/message/send'
};
exports.accessToken = '';
exports.tokenExpireTime = 0;
function setAccessToken(token, expireIn) {
    exports.accessToken = token;
    exports.tokenExpireTime = Date.now() + (expireIn - 60) * 1000;
}
function isTokenValid() {
    return !!exports.accessToken && Date.now() < exports.tokenExpireTime;
}
