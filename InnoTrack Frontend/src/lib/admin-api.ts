import { api } from "./api";

// --- Students ---
export interface AdminStudentDto {
  id: string;
  fullName: string;
  email: string;
  departmentName: string;
  gpa: number;
  isActive: boolean;
  isDeleted: boolean;
  teamId?: string;
  teamName?: string;
  isTeamLeader?: boolean;
  createdAt: string;
}

export interface AdminStudentDetailDto extends AdminStudentDto {
  skills: string[];
  lastLogin: string;
}

// --- Professors ---
export interface AdminProfessorDto {
  id: string;
  fullName: string;
  email: string;
  departmentId: number;
  departmentName: string;
  maxTeamLoad: number;
  currentTeamLoad: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProvisionProfessorDto {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  departmentId: number;
  maxTeamLoad: number;
}

export interface UpdateProfessorAdminDto {
  firstName?: string;
  lastName?: string;
  departmentId?: number;
  maxTeamLoad?: number;
  isActive?: boolean;
}

// --- Teams ---
export interface AdminTeamDto {
  id: string;
  name: string;
  memberCount: number;
  supervisorName?: string;
  supervisorId?: string;
  supervisorIsActive?: boolean;
  projectId?: string;
  projectStatus?: string;
  createdAt: string;
}

// --- Projects ---
export interface AdminProjectDto {
  id: string;
  title: string;
  domainName: string;
  teamName: string;
  supervisorName?: string;
  status: string;
  originalityScore?: number;
  createdAt: string;
  isStuck?: boolean; // Inferred or from API
}

export interface AdminProjectDetailDto extends AdminProjectDto {
  abstract: string;
  technologies: string[];
  studentMembers: { id: string; fullName: string; isLeader: boolean }[];
  showcaseOriginalityEligible: boolean;
  isShowcased: boolean;
}

// --- Academic Years ---
export interface AcademicYearDto {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// --- Audit Logs ---
export interface AuditLogDto {
  id: number;
  userId: string;
  userFullName: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const adminApi = {
  // --- Dashboard ---
  getDashboard: () => api.get("/api/Admin/dashboard"),

  // --- Students ---
  getStudents: (params?: any): Promise<PaginatedResult<AdminStudentDto>> => 
    api.get("/api/Admin/students", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
  getStudentById: (id: string): Promise<AdminStudentDetailDto> => 
    api.get(`/api/Admin/students/${id}`),
  deleteStudent: (id: string) => 
    api.delete(`/api/Admin/students/${id}`),
  updateStudentStatus: (id: string, isActive: boolean) => 
    api.patch(`/api/Admin/students/${id}/status`, { isActive }),
  resetStudentPassword: (id: string, newPassword?: string) => 
    api.patch(`/api/Admin/students/${id}/reset-password`, { newPassword }),

  // --- Professors ---
  getProfessors: (params?: any): Promise<PaginatedResult<AdminProfessorDto>> => 
    api.get("/api/Admin/professors", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
  getProfessorById: (id: string): Promise<AdminProfessorDto> => 
    api.get(`/api/Admin/professors/${id}`),
  provisionProfessor: (data: ProvisionProfessorDto) => 
    api.post("/api/Admin/professors", data),
  updateProfessor: (id: string, data: UpdateProfessorAdminDto) => 
    api.put(`/api/Admin/professors/${id}`, data),
  updateProfessorStatus: (id: string, isActive: boolean) => 
    api.patch(`/api/Admin/professors/${id}/status`, { isActive }),
  resetProfessorPassword: (id: string, newPassword?: string) => 
    api.patch(`/api/Admin/professors/${id}/reset-password`, { newPassword }),
  deleteProfessor: (id: string) => 
    api.delete(`/api/Admin/professors/${id}`),

  // --- Teams ---
  getTeams: (params?: any): Promise<PaginatedResult<AdminTeamDto>> => 
    api.get("/api/Admin/teams", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
  assignSupervisor: (teamId: string, professorId: string) => 
    api.patch(`/api/Admin/teams/${teamId}/assign-supervisor`, { professorId }),
  removeSupervisor: (teamId: string) => 
    api.patch(`/api/Admin/teams/${teamId}/remove-supervisor`),
  deleteTeam: (id: string) => 
    api.delete(`/api/Admin/teams/${id}`),

  // --- Projects ---
  getProjects: (params?: any): Promise<PaginatedResult<AdminProjectDto>> => 
    api.get("/api/Admin/projects", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
  getProjectById: (id: string): Promise<AdminProjectDetailDto> => 
    api.get(`/api/Admin/projects/${id}`),
  overrideProjectStatus: (id: string, status: string, auditReason: string) => 
    api.patch(`/api/Admin/projects/${id}/override-status`, { status, auditReason }),
  reassignSupervisor: (projectId: string, professorId: string) => 
    api.patch(`/api/Admin/projects/${projectId}/reassign-supervisor`, { professorId }),
  toggleShowcase: (id: string, isShowcased: boolean) => 
    api.patch(`/api/Admin/projects/${id}/toggle-showcase`, { isShowcased }),
  resetStuckProjects: () => 
    api.post("/api/Admin/quick-actions/reset-stuck-projects"),

  // --- Quick Actions ---
  closeAcademicYear: () => 
    api.post("/api/Admin/quick-actions/close-academic-year"),
  forceLogoutAll: () => 
    api.post("/api/Admin/quick-actions/force-logout-all"),
  openAcademicYear: (id: number) => 
    api.post(`/api/Admin/quick-actions/open-academic-year/${id}`),

  // --- Academic Years ---
  getAcademicYears: (params?: any): Promise<PaginatedResult<AcademicYearDto>> => 
    api.get("/api/Admin/academic-years", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
  getActiveAcademicYear: (): Promise<AcademicYearDto> => 
    api.get("/api/Admin/academic-years/active"),
  createAcademicYear: (data: Partial<AcademicYearDto>) => 
    api.post("/api/Admin/academic-years", data),
  updateAcademicYear: (id: number, data: Partial<AcademicYearDto>) => 
    api.put(`/api/Admin/academic-years/${id}`, data),
  activateAcademicYear: (id: number) => 
    api.patch(`/api/Admin/academic-years/${id}/activate`),
  deleteAcademicYear: (id: number) => 
    api.delete(`/api/Admin/academic-years/${id}`),

  // --- Audit Logs ---
  getAuditLogs: (params?: any): Promise<PaginatedResult<AuditLogDto>> => 
    api.get("/api/Admin/audit-logs", { params }).then((res: any) => ({
      items: res.data || res.items || [],
      totalCount: res.totalRecords || res.totalCount || 0,
      pageNumber: res.pageNumber || 1,
      pageSize: res.pageSize || 10,
      totalPages: res.totalPages || 0,
      hasNextPage: res.pageNumber < res.totalPages,
      hasPreviousPage: res.pageNumber > 1,
    })),
};
