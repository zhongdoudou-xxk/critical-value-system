"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = exports.pollingConfig = void 0;
__exportStar(require("./database"), exports);
__exportStar(require("./wechat"), exports);
exports.pollingConfig = {
    interval: parseInt(process.env.POLLING_INTERVAL || '30000'),
    writebackInterval: parseInt(process.env.WRITEBACK_INTERVAL || '30000'),
    escalationInterval: parseInt(process.env.ESCALATION_INTERVAL || '900000')
};
exports.serverConfig = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
};
