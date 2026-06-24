export * from './database';
export * from './wechat';

export const pollingConfig = {
  interval: parseInt(process.env.POLLING_INTERVAL || '30000'),
  writebackInterval: parseInt(process.env.WRITEBACK_INTERVAL || '30000'),
  escalationInterval: parseInt(process.env.ESCALATION_INTERVAL || '900000')
};

export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0'
};
