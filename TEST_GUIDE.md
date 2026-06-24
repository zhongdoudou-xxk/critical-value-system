# 危急值闭环处理系统 - 测试调试指南

## 一、环境准备

### 1.1 安装依赖
```bash
npm install
```

### 1.2 创建环境配置文件
```bash
copy .env.example .env
```

编辑 `.env` 文件：
```ini
# 服务器配置
PORT=3000

# SQL Server配置（必须）
SQL_SERVER_HOST=localhost
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=CriticalValueSystem
SQL_SERVER_USER=sa
SQL_SERVER_PASSWORD=your_password
SQL_SERVER_ENCRYPT=false
SQL_SERVER_TRUST_CERT=true

# Oracle配置（测试可暂时不配置）
ORACLE_HOST=196.57.57.242
ORACLE_PORT=1521
ORACLE_SERVICE=halodb
ORACLE_USER=his3interface
ORACLE_PASSWORD=his3interface

# 企业微信配置（测试可暂时不配置）
WECHAT_CORP_ID=your_corp_id
WECHAT_CORP_SECRET=your_corp_secret
WECHAT_AGENT_ID=1000001

# 轮询配置（测试时可缩短）
POLLING_INTERVAL=10000
WRITEBACK_INTERVAL=10000
ESCALATION_INTERVAL=300000
```

### 1.3 初始化数据库
在 SQL Server 中执行 `database/init.sql`：
```sql
-- 使用 SQL Server Management Studio 或 sqlcmd 执行
sqlcmd -S localhost -U sa -P your_password -i database/init.sql
```

## 二、测试方法

### 2.1 运行开发服务器

**方式一：使用 ts-node 直接运行（推荐调试）**
```bash
npm run dev
```

**方式二：构建后运行**
```bash
npm run build
npm start
```

### 2.2 健康检查
```bash
curl http://localhost:3000/health
```
预期响应：
```json
{"status":"ok","timestamp":"2026-06-23T10:30:00.000Z"}
```

### 2.3 API 接口测试

#### 2.3.1 获取危急值列表
```bash
curl http://localhost:3000/api/critical-values
```

#### 2.3.2 获取待处理危急值
```bash
curl http://localhost:3000/api/critical-values/pending
```

#### 2.3.3 创建测试危急值
```bash
curl -X POST http://localhost:3000/api/critical-values \
  -H "Content-Type: application/json" \
  -d '{
    "hl7MessageId": "TEST_PUSH_001",
    "sourceSystem": 0,
    "patientId": "P001",
    "patientName": "张三",
    "patientGender": "男",
    "patientAge": "35",
    "departmentId": 1,
    "departmentName": "急诊科",
    "attendingDoctorId": 1,
    "attendingDoctorName": "张医生",
    "testName": "血常规",
    "testItemName": "白细胞计数",
    "resultValue": "25.5",
    "resultUnit": "×10^9/L",
    "referenceRange": "4-10",
    "abnormalFlag": "H",
    "criticalDescription": "白细胞严重升高，提示严重感染",
    "status": "Pending",
    "escalationLevel": 0
  }'
```

#### 2.3.4 处理危急值
```bash
curl -X POST http://localhost:3000/api/critical-values/handle \
  -H "Content-Type: application/json" \
  -d '{
    "criticalValueId": 1,
    "doctorId": 1,
    "action": 3,
    "comment": "已处理，患者已转入ICU"
  }'
```

#### 2.3.5 移动端同步
```bash
curl -X POST http://localhost:3000/api/critical-values/sync \
  -H "Content-Type: application/json" \
  -d '{
    "hl7MessageId": "TEST_PUSH_001",
    "weComUserId": "wx_user_001",
    "action": 3,
    "comment": "移动端处理完成"
  }'
```

## 三、单元测试

### 3.1 运行测试
```bash
npm test
```

### 3.2 测试覆盖范围
- 数据库连接测试
- 危急值CRUD测试
- 企业微信推送测试（模拟）
- 轮询服务测试

## 四、调试技巧

### 4.1 使用 Node.js 调试器

**方式一：VS Code 调试**

创建 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Critical Value System",
      "program": "${workspaceFolder}/src/server.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "cwd": "${workspaceFolder}",
      "env": {
        "PORT": "3000",
        "SQL_SERVER_HOST": "localhost"
      },
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

**方式二：命令行调试**
```bash
node --inspect -r ts-node/register src/server.ts
```

### 4.2 日志调试

在代码中添加调试日志：
```typescript
console.log('[DEBUG] 危急值数据:', JSON.stringify(criticalValue, null, 2));
console.error('[ERROR] 推送失败:', error);
```

### 4.3 断点调试

推荐在以下位置设置断点：
1. `PollingService.ts:pollCriticalValues` - 轮询逻辑
2. `WechatService.ts:sendCriticalValue` - 微信推送
3. `CriticalValueRepository.ts` - 数据库操作

## 五、集成测试

### 5.1 测试场景

| 场景 | 描述 | 验证方法 |
|------|------|----------|
| 危急值推送 | Oracle → SQL Server → 微信 | 检查日志和数据库状态 |
| 升级通知 | 15分钟未处理自动升级 | 修改时间阈值测试 |
| 结果回写 | 处理结果回写Oracle | 检查Oracle表状态 |
| 移动端同步 | 移动端→服务端→Oracle | 调用sync接口 |

### 5.2 测试数据准备

在 `database/init.sql` 中已包含示例数据：
- 5个科室：急诊科、心内科、呼吸内科、神经内科、ICU
- 3个医生：张医生、李医生、王主任

### 5.3 手动测试步骤

1. **启动服务**
   ```bash
   npm run dev
   ```

2. **创建测试危急值**
   ```bash
   curl -X POST http://localhost:3000/api/critical-values \
     -H "Content-Type: application/json" \
     -d '{
       "hl7MessageId": "TEST_001",
       "sourceSystem": 0,
       "patientId": "P001",
       "patientName": "测试患者",
       "departmentId": 1,
       "departmentName": "急诊科",
       "attendingDoctorId": 1,
       "attendingDoctorName": "张医生",
       "testItemName": "血压",
       "resultValue": "220/130",
       "referenceRange": "90-140/60-90",
       "status": "Pending",
       "escalationLevel": 0
     }'
   ```

3. **检查轮询日志**
   观察控制台输出，确认：
   - 危急值被发现
   - 推送状态更新
   - 通知日志记录

4. **验证数据库**
   ```sql
   SELECT * FROM critical_value_records WHERE Hl7MessageId = 'TEST_001';
   SELECT * FROM processing_records WHERE CriticalValueId = 1;
   SELECT * FROM notification_logs WHERE CriticalValueId = 1;
   ```

## 六、常见问题排查

### 6.1 数据库连接失败

**问题**：启动时报错 "Connection failed"

**排查步骤**：
1. 检查 SQL Server 是否运行
2. 验证连接参数（端口、用户名、密码）
3. 检查防火墙设置
4. 确保 SQL Server 允许远程连接

### 6.2 Oracle 连接失败

**问题**：启动时 Oracle 连接池初始化失败

**排查步骤**：
1. 检查网络连通性：`telnet 196.57.57.242 1521`
2. 验证 Oracle 客户端安装
3. 检查 TNS 配置
4. 确认账号密码正确

### 6.3 企业微信推送失败

**问题**：日志显示推送失败

**排查步骤**：
1. 检查企业微信配置（CorpID、CorpSecret、AgentID）
2. 验证网络能访问企业微信 API
3. 检查权限配置
4. 查看企业微信错误码

### 6.4 轮询不工作

**问题**：控制台没有轮询日志

**排查步骤**：
1. 检查 POLLING_INTERVAL 配置
2. 验证数据库连接正常
3. 检查是否有待处理的危急值
4. 查看错误日志

## 七、性能测试

### 7.1 压力测试

使用 Apache Bench 测试 API 性能：
```bash
# 测试获取危急值接口
ab -n 100 -c 10 http://localhost:3000/api/critical-values

# 测试创建危急值接口
ab -n 100 -c 10 -p test_data.json -T application/json http://localhost:3000/api/critical-values
```

### 7.2 预期指标

| 指标 | 预期值 |
|------|--------|
| API响应时间 | < 500ms |
| 轮询周期 | 30秒 |
| 消息推送延迟 | < 1秒 |
| 并发连接数 | 10+ |

## 八、测试工具推荐

| 工具 | 用途 |
|------|------|
| Postman | API测试 |
| curl | 命令行测试 |
| Apache Bench | 性能测试 |
| VS Code Debugger | 代码调试 |
| SQL Server Profiler | 数据库性能分析 |

---

## 附录：测试数据模板

### 创建危急值请求体
```json
{
  "hl7MessageId": "ORACLE_PUSH_123456",
  "sourceSystem": 0,
  "rawHl7Message": "",
  "patientId": "P12345",
  "patientName": "患者姓名",
  "patientGender": "男",
  "patientAge": "45",
  "inpatientNo": "IN20260623001",
  "visitId": "VIS20260623001",
  "departmentId": 1,
  "departmentName": "急诊科",
  "wardBed": "1床",
  "attendingDoctorId": 1,
  "attendingDoctorName": "张医生",
  "orderNo": "O20260623001",
  "testName": "血常规",
  "testItemName": "白细胞计数",
  "resultValue": "30.5",
  "resultUnit": "×10^9/L",
  "referenceRange": "4-10",
  "abnormalFlag": "H",
  "criticalDescription": "危急值：白细胞严重升高",
  "status": "Pending",
  "escalationLevel": 0,
  "testDatetime": "2026-06-23T10:30:00"
}
```

### 处理危急值请求体
```json
{
  "criticalValueId": 1,
  "doctorId": 1,
  "action": 3,
  "comment": "患者已转入ICU，正在进一步治疗"
}
```
