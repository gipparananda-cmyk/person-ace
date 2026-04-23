export type Role = "ADMIN" | "HR" | "EMPLOYEE";
export type EmployeeStatus = "ACTIVE" | "RESIGNED";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface Department { id: string; name: string }
export interface Position { id: string; name: string }

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  joinDate: string;
  status: EmployeeStatus;
  department: Department;
  position: Position;
  user: User;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string | null;
  employee?: { id: string; fullName: string; employeeId?: string };
  createdAt?: string;
  updatedAt?: string;
}