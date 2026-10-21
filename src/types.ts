export type Role = "admin" | "fahr" | "manager" | "hr";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "管理员",
  fahr: "项目管理员",
  manager: "用人部门",
  hr: "客户HR",
};

export const ROLE_TAG: Record<Role, "warning" | "primary" | "success" | "info"> = {
  admin: "warning",
  fahr: "primary",
  manager: "success",
  hr: "info",
};

export interface StoreNode {
  id: number;
  name: string;
  managerName?: string;
  managerPhone?: string;
  address?: string;
  enabled?: boolean;
  _count?: { candidates: number };
}

export interface RequirementRow {
  id: number;
  storeId: number;
  title: string;
  headcount: number;
  urgency: string;
  expectedDate: string;
  startDate: string;
  endDate: string;
  description: string;
  salary: string;
  status: string;
  createdAt: string;
  store: StoreNode & {
    city: { id: number; name: string; brand: { id: number; name: string } };
  };
  creator: { username: string } | null;
  _count: { recommendations: number };
}

export interface UserInfo {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
}

export interface CityNode {
  id: number;
  name: string;
  stores: StoreNode[];
}

export interface BrandNode {
  id: number;
  name: string;
  cities: CityNode[];
}

export interface WorkExperience {
  id: number;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface InterviewSlot {
  id: number;
  startAt: string;
  endAt: string;
}

export interface CandidateRow {
  id: number;
  name: string;
  gender: "MALE" | "FEMALE";
  age: number | null;
  phone: string;
  photo: string;
  remark: string;
  status: string;
  published: boolean;
  acceptedSlotId: number | null;
  interviewMethod: string;
  interviewLocation: string;
  interviewer: string;
  interviewScore: number | null;
  interviewComment: string;
  plannedOnboardDate: string;
  actualOnboardDate: string;
  declineReason: string;
  updatedAt: string;
  store: {
    id: number;
    name: string;
    city: { id: number; name: string; brand: { id: number; name: string } };
  };
  workExperiences: WorkExperience[];
  interviewSlots: InterviewSlot[];
}
