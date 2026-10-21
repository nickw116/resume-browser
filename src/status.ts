export const STATUS_LABEL: Record<string, string> = {
  PENDING: "待筛选",
  ACCEPTED: "待面试",
  DECLINED: "初筛未通过",
  PASSED: "已通过",
  FAILED: "面试未通过",
  ONBOARDED: "已入职",
  ONBOARD_DECLINED: "放弃入职",
  TALENT_POOL: "人才库",
};

export const STATUS_TAG: Record<string, "info" | "primary" | "success" | "warning" | "danger"> = {
  PENDING: "info",
  ACCEPTED: "primary",
  DECLINED: "danger",
  PASSED: "success",
  FAILED: "danger",
  ONBOARDED: "success",
  ONBOARD_DECLINED: "warning",
  TALENT_POOL: "info",
};

export const INTERVIEW_METHOD_LABEL: Record<string, string> = {
  VIDEO: "线上",
  PHONE: "电话",
  ONSITE: "现场",
};

export const REQUIREMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "待确认",
  RECRUITING: "招聘中",
  CLOSED: "已关闭",
  DONE: "已完成",
};

export const REQUIREMENT_STATUS_TAG: Record<string, "info" | "primary" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  RECRUITING: "primary",
  CLOSED: "info",
  DONE: "success",
};

export const URGENCY_LABEL: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export const URGENCY_TAG: Record<string, "info" | "primary" | "success" | "warning" | "danger"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
};
