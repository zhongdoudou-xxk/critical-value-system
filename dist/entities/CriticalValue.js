"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendStatus = exports.NotificationType = exports.ProcessingAction = exports.DoctorRole = exports.CriticalValueStatus = exports.SourceSystem = void 0;
var SourceSystem;
(function (SourceSystem) {
    SourceSystem[SourceSystem["LIS"] = 0] = "LIS";
    SourceSystem[SourceSystem["PACS"] = 1] = "PACS";
    SourceSystem[SourceSystem["ECG"] = 2] = "ECG";
})(SourceSystem || (exports.SourceSystem = SourceSystem = {}));
var CriticalValueStatus;
(function (CriticalValueStatus) {
    CriticalValueStatus["Pending"] = "Pending";
    CriticalValueStatus["Processed"] = "Processed";
    CriticalValueStatus["Timeout"] = "Timeout";
    CriticalValueStatus["Closed"] = "Closed";
})(CriticalValueStatus || (exports.CriticalValueStatus = CriticalValueStatus = {}));
var DoctorRole;
(function (DoctorRole) {
    DoctorRole["Admin"] = "Admin";
    DoctorRole["Doctor"] = "Doctor";
})(DoctorRole || (exports.DoctorRole = DoctorRole = {}));
var ProcessingAction;
(function (ProcessingAction) {
    ProcessingAction[ProcessingAction["Acknowledge"] = 0] = "Acknowledge";
    ProcessingAction[ProcessingAction["Handle"] = 1] = "Handle";
    ProcessingAction[ProcessingAction["Transfer"] = 2] = "Transfer";
    ProcessingAction[ProcessingAction["Close"] = 3] = "Close";
})(ProcessingAction || (exports.ProcessingAction = ProcessingAction = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType[NotificationType["First"] = 0] = "First";
    NotificationType[NotificationType["Escalation"] = 1] = "Escalation";
    NotificationType[NotificationType["Reminder"] = 2] = "Reminder";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var SendStatus;
(function (SendStatus) {
    SendStatus["Pending"] = "Pending";
    SendStatus["Sent"] = "Sent";
    SendStatus["Failed"] = "Failed";
    SendStatus["Read"] = "Read";
})(SendStatus || (exports.SendStatus = SendStatus = {}));
