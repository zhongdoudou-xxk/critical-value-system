# 危急值闭环处理系统

基于企业微信的危急值闭环处理系统，实现危急值的自动推送、处理和结果回写。

## 功能特性

- Oracle数据库轮询，获取HIS系统产生的危急值
- 自动推送危急值到对应科室医生的企业微信
- 支持医生在移动端处理危急值
- 处理结果自动回写HIS系统
- 反向同步移动端处理状态

## 技术栈

- Node.js 20+
- TypeScript
- Express
- Oracle DB (oracledb)
- 企业微信API

## 环境要求

- Windows 10 / Windows Server 2016+
- Oracle Client (已安装并配置)
- Node.js 20+

## 安装步骤

1. 安装依赖
```bash
npm install
```

2. 复制配置文件并修改
```bash
copy .env.example .env
```

3. 配置`.env`文件中的数据库连接和企业微信信息

4. 构建项目
```bash
npm run build
```

5. 启动服务
```bash
npm start
```

## 配置说明

```env
# 服务器配置
PORT=3000

# Oracle数据库配置
ORACLE_HOST=10.1.253.31
ORACLE_PORT=1521
ORACLE_SERVICE=ORCL
ORACLE_USER=HIS_USER
ORACLE_PASSWORD=HIS_PASSWORD

# 企业微信配置
WECHAT_CORP_ID=your_corp_id
WECHAT_CORP_SECRET=your_corp_secret
WECHAT_AGENT_ID=1000001

# 轮询配置(毫秒)
POLLING_INTERVAL=30000
WRITEBACK_INTERVAL=30000
```

## API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/critical-values | GET | 获取所有危急值 |
| /api/critical-values/pending | GET | 获取待处理危急值 |
| /api/critical-values/handle | POST | 处理危急值 |
| /api/critical-values/:id/confirm | POST | 确认处理结果 |
| /api/critical-values/sync | POST | 移动端同步 |
| /health | GET | 健康检查 |

## 核心流程

1. **轮询阶段(30秒)**: 系统每30秒从Oracle视图轮询新的危急值
2. **推送阶段**: 通过企业微信推送至对应科室医生
3. **处理阶段**: 医生在移动端处理危急值
4. **回写阶段(30秒)**: 系统每30秒回写处理结果到HIS
5. **同步阶段**: 移动端标记已处理后自动反向同步

## 项目结构

```
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # REST控制器
│   ├── entities/        # 实体模型
│   ├── repositories/    # 数据访问层
│   ├── services/        # 业务服务层
│   ├── routes/          # 路由配置
│   └── server.ts        # 主服务入口
├── package.json
├── tsconfig.json
└── .env.example
```
