CREATE DATABASE CriticalValueSystem
GO

USE CriticalValueSystem
GO

-- 科室信息表
CREATE TABLE department_info (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    WeComDeptId NVARCHAR(64),
    Name NVARCHAR(128) NOT NULL,
    ParentId BIGINT,
    Hl7DeptCode NVARCHAR(32),
    WardCode NVARCHAR(32),
    IsActive BIT DEFAULT 1
)
GO

-- 医生信息表
CREATE TABLE doctor_info (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    WeComUserId NVARCHAR(128) UNIQUE NOT NULL,
    WeComUnionId NVARCHAR(128),
    Name NVARCHAR(64) NOT NULL,
    EmployeeNo NVARCHAR(32),
    Mobile NVARCHAR(20),
    Title NVARCHAR(64),
    DepartmentId BIGINT FOREIGN KEY REFERENCES department_info(Id),
    IsDepartmentHead BIT DEFAULT 0,
    Role NVARCHAR(16) DEFAULT 'Doctor',
    IsActive BIT DEFAULT 1,
    SyncedAt DATETIME2
)
GO

-- 危急值记录表
CREATE TABLE critical_value_records (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    Hl7MessageId NVARCHAR(64) UNIQUE NOT NULL,
    SourceSystem INT DEFAULT 0,
    RawHl7Message NVARCHAR(MAX),
    PatientId NVARCHAR(64) NOT NULL,
    PatientName NVARCHAR(128) NOT NULL,
    PatientGender NVARCHAR(4),
    PatientAge NVARCHAR(16),
    InpatientNo NVARCHAR(64),
    VisitId NVARCHAR(64),
    DepartmentId BIGINT FOREIGN KEY REFERENCES department_info(Id),
    DepartmentName NVARCHAR(128),
    WardBed NVARCHAR(32),
    AttendingDoctorId BIGINT FOREIGN KEY REFERENCES doctor_info(Id),
    AttendingDoctorName NVARCHAR(64),
    OrderNo NVARCHAR(64),
    TestName NVARCHAR(256),
    TestItemName NVARCHAR(256),
    ResultValue NVARCHAR(128),
    ResultUnit NVARCHAR(32),
    ReferenceRange NVARCHAR(128),
    AbnormalFlag NVARCHAR(16),
    CriticalDescription NVARCHAR(MAX),
    Status NVARCHAR(32) DEFAULT 'Pending',
    EscalationLevel INT DEFAULT 0,
    TestDatetime DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
)
GO

-- 处理记录表
CREATE TABLE processing_records (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    CriticalValueId BIGINT FOREIGN KEY REFERENCES critical_value_records(Id),
    DoctorId BIGINT FOREIGN KEY REFERENCES doctor_info(Id),
    Action INT NOT NULL,
    Comment NVARCHAR(2000),
    ProcessingDatetime DATETIME2 DEFAULT GETDATE()
)
GO

-- 通知日志表
CREATE TABLE notification_logs (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    CriticalValueId BIGINT FOREIGN KEY REFERENCES critical_value_records(Id),
    TargetDoctorId BIGINT FOREIGN KEY REFERENCES doctor_info(Id),
    WeComMsgId NVARCHAR(128),
    NotificationType INT DEFAULT 0,
    SendStatus NVARCHAR(32) DEFAULT 'Pending',
    ReadAt DATETIME2
)
GO

-- 推送规则表
CREATE TABLE push_rules (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    DepartmentId BIGINT FOREIGN KEY REFERENCES department_info(Id),
    Priority INT DEFAULT 0,
    EscalationMinutes INT DEFAULT 15,
    MaxEscalationLevel INT DEFAULT 2,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
)
GO

-- HL7消息日志表
CREATE TABLE hl7_message_log (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    Hl7MessageId NVARCHAR(64),
    MessageType NVARCHAR(32),
    MessageContent NVARCHAR(MAX),
    SourceSystem INT,
    ParseStatus NVARCHAR(32),
    ErrorMessage NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETDATE()
)
GO

-- 审计日志表
CREATE TABLE audit_logs (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    ActionType NVARCHAR(64),
    TargetType NVARCHAR(64),
    TargetId BIGINT,
    OperatorId BIGINT,
    OperatorName NVARCHAR(64),
    ActionDetail NVARCHAR(MAX),
    IpAddress NVARCHAR(64),
    CreatedAt DATETIME2 DEFAULT GETDATE()
)
GO

-- 创建索引
CREATE INDEX IX_critical_value_records_Hl7MessageId ON critical_value_records(Hl7MessageId)
GO
CREATE INDEX IX_critical_value_records_Status ON critical_value_records(Status)
GO
CREATE INDEX IX_critical_value_records_DepartmentId ON critical_value_records(DepartmentId)
GO
CREATE INDEX IX_critical_value_records_AttendingDoctorId ON critical_value_records(AttendingDoctorId)
GO
CREATE INDEX IX_doctor_info_WeComUserId ON doctor_info(WeComUserId)
GO
CREATE INDEX IX_department_info_Hl7DeptCode ON department_info(Hl7DeptCode)
GO
CREATE INDEX IX_processing_records_CriticalValueId ON processing_records(CriticalValueId)
GO
CREATE INDEX IX_notification_logs_CriticalValueId ON notification_logs(CriticalValueId)
GO

-- 添加示例数据
INSERT INTO department_info (Name, Hl7DeptCode, IsActive) VALUES
('急诊科', 'EMER', 1),
('心内科', 'CARD', 1),
('呼吸内科', 'RESP', 1),
('神经内科', 'NEUR', 1),
('ICU', 'ICU', 1)
GO

INSERT INTO doctor_info (WeComUserId, Name, EmployeeNo, DepartmentId, Role, IsActive) VALUES
('wx_user_001', '张医生', 'D001', 1, 'Doctor', 1),
('wx_user_002', '李医生', 'D002', 2, 'Doctor', 1),
('wx_user_003', '王主任', 'D003', 1, 'Admin', 1)
GO

PRINT '数据库初始化完成'
GO
