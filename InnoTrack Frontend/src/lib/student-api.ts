import { api } from "@/lib/api";

export type PagedResult<T> = {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
};

export type LookupItem = {
  id: number;
  name: string;
  description?: string | null;
};

export type ProjectCatalogItemDto = {
  id: number;
  title: string;
  domain: string;
  status: string;
  year: number;
  teamId: number | null;
  supervisor?: string | null;
  students: string[];
  technologies: string[];
  originalityScore?: number | null;
  acceptsJoinRequests: boolean;
};

export type ProjectCatalogDetailDto = {
  id: number;
  title: string;
  domain: string;
  status: string;
  academicYear: string;
  supervisor?: string | null;
  technologies: string[];
  originalityScore?: number | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  updatedAt?: string | null;
  description: string;
  abstract: string;
  problemStatement?: string | null;
  proposedSolution?: string | null;
  objectives?: string | null;
  students: {
    name: string;
    role: string;
    department: string;
    profilePictureUrl?: string | null;
  }[];
};

export type MyProjectDto = {
  projectId?: number | null;
  title?: string | null;
  status?: string | null;
  domainName?: string | null;
  originalityScore?: number | null;
  joinCode?: string | null;
  technologies?: string[] | null;
  members?: { name: string; role: string }[] | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  supervisorName?: string | null;
  teamName?: string | null;
};

export type ProjectDraftDto = {
  id: number;
  title: string;
  studentNames?: string | null;
  year: number;
  domain: string;
  domainId: number;
  originalityScore?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  canEdit: boolean;
  technologies: string[];
  technologyIds: number[];
  abstract: string;
  description: string;
  problemStatement?: string | null;
  proposedSolution?: string | null;
  objectives?: string | null;
};

export type MyTeamDto = {
  id: number;
  name: string;
  projectId?: number | null;
  projectTitle?: string | null;
  joinCode: string;
  isLeader: boolean;
  supervisorName?: string | null;
  projectTechnologies?: string[] | null;
  members: {
    id: number;
    fullName: string;
    role: string;
    email: string;
    profilePictureUrl?: string | null;
    skills: string[];
  }[];
};

export type PendingJoinRequestDto = {
  id: number;
  studentId: number;
  studentName: string;
  department: string;
  gpa?: number | null;
  skills: string[];
  requestedAt: string;
  message?: string | null;
};

export type SupervisorDto = {
  id: number;
  fullName: string;
  departmentName: string;
  email: string;
  currentTeamLoad: number;
  maxTeamLoad: number;
  isAvailable: boolean;
  isActive: boolean;
};

export type SimilarityCheckResponse = {
  originalityScore: number;
  similarProjects: {
    id?: number | null;
    title: string;
    similarity: number;
  }[];
};

export type ChatMemberDto = {
  id: number;
  fullName: string;
  role: string;
  initials: string;
  profilePictureUrl?: string | null;
  lastOnlineAt?: string | null;
};

export type ChatMessageDetailDto = {
  id: number;
  authorId: number;
  authorName: string;
  content: string;
  sentAt: string;
  isEdited?: boolean;
  isDeletedForAll?: boolean;
  isPinned?: boolean;
  parentMessageId?: number | null;
  reactions?: { userId: number; emoji: string }[];
  attachment?: {
    fileName: string;
    originalName: string;
    contentType: string;
    fileSize: number;
  };
};

export type TeamChatDto = {
  chatId: number;
  projectTitle?: string;
  members: ChatMemberDto[];
  messages: ChatMessageDetailDto[];
};

export type SaveDraftPayload = {
  title: string;
  studentNames: string;
  year: number;
  abstract: string;
  description: string;
  domainId: number;
  technologyIds: number[];
  problemStatement?: string | null;
  proposedSolution?: string | null;
  objectives?: string | null;
  originalityScore?: number | null;
};

export type SubmitProjectPayload = {
  supervisorId: number;
  departmentId: number;
  teamMembers: string;
  message: string;
};

export type ProjectCatalogFilters = {
  pageNumber?: number;
  year?: number;
  status?: string;
  search?: string;
  domainId?: number;
  supervisorId?: number;
  technologyId?: number;
  minOriginalityScore?: number;
  maxOriginalityScore?: number;
  isCurrentAcademicYear?: boolean;
};

export function normalizeStatusTone(status?: string) {
  const value = (status || "").toLowerCase().replace(/_/g, " ");
  if (value.includes("draft")) return "draft";
  if (value.includes("complete")) return "completed";
  if (value.includes("submit") || value.includes("review")) return "submitted";
  if (value.includes("approve") || value.includes("progress")) return "in-progress";
  if (value.includes("reject")) return "rejected";
  return "in-progress";
}

export function formatStatus(status?: string) {
  const value = (status || "In Progress").replace(/_/g, " ");
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeOriginalityPercent(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  const percent = score > 0 && score <= 1 ? score * 100 : score;
  return Math.round(percent);
}

export function normalizePercentValue(score?: number | null) {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return score > 0 && score <= 1 ? score * 100 : score;
}

export function formatPercent(score?: number | null, maximumFractionDigits = 2) {
  return normalizePercentValue(score).toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

export function readPagedData<T>(result: PagedResult<T> | T[]): T[] {
  return Array.isArray(result) ? result : result.data || [];
}

export const studentApi = {
  getCurrentOriginalityWidget: () =>
    api.get("/api/Dashboard/student/current-originality-widget") as Promise<{
      currentProjectOriginality?: number | null;
      projectTitle?: string | null;
    }>,

  getProjectStatusWidget: () =>
    api.get("/api/Dashboard/student/project-status-widget") as Promise<{
      projectStatus?: string | null;
      statusDescription?: string | null;
    }>,

  getMostOriginalProjects: (thisYearOnly: boolean, limit = 4) =>
    api.get("/api/Dashboard/most-original", {
      params: { thisYearOnly: String(thisYearOnly), limit },
    }) as Promise<
      {
        id: number;
        domain: string;
        originalityScore: number;
        title: string;
        abstract: string;
        year: number;
        status: string;
      }[]
    >,

  getTrendingTechnologies: () =>
    api.get("/api/Dashboard/trending-technologies") as Promise<
      { name: string; count: number }[]
    >,

  getProjects: (filters: ProjectCatalogFilters = {}, pageSize = 50) => {
    const params: Record<string, string | number> = { pageSize };
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params[key] = typeof value === "boolean" ? String(value) : value;
      }
    });

    return api.get("/api/projects", { params }) as Promise<PagedResult<ProjectCatalogItemDto>>;
  },

  getProject: (id: string | number) =>
    api.get(`/api/projects/${id}`) as Promise<ProjectCatalogDetailDto>,

  getMyProject: () => api.get("/api/projects/me") as Promise<MyProjectDto | null>,

  getMyDrafts: () => api.get("/api/projects/drafts") as Promise<ProjectDraftDto[]>,

  getDraft: (draftId: string | number) =>
    api.get(`/api/projects/drafts/${draftId}`) as Promise<ProjectDraftDto>,

  getTabsCount: () =>
    api.get("/api/projects/tabs-count") as Promise<{
      thisYearCount: number;
      oldProjectsCount: number;
    }>,

  getSupervisors: (departmentId?: number) => {
    const params = departmentId ? { departmentId } : undefined;
    return api.get("/api/projects/supervisors", { params }) as Promise<SupervisorDto[]>;
  },

  getDepartments: () =>
    api.get("/api/Departments", { params: { pageSize: 200 } }) as Promise<
      PagedResult<LookupItem>
    >,

  getDomains: () =>
    api.get("/api/Domains", { params: { pageSize: 200 } }) as Promise<
      PagedResult<LookupItem>
    >,

  getTechnologies: () =>
    api.get("/api/Technologies", { params: { pageSize: 200 } }) as Promise<
      PagedResult<LookupItem>
    >,

  createTechnology: (name: string) =>
    api.post("/api/Technologies", { name }) as Promise<LookupItem>,

  getMyTeam: () => api.get("/api/Teams/me") as Promise<MyTeamDto | null>,

  createTeam: (name: string, maxSize = 5) =>
    api.post("/api/Teams/create", { name, maxSize }) as Promise<MyTeamDto>,

  joinByCode: (joinCode: string) =>
    api.post("/api/Teams/join-by-code", { joinCode }),

  requestToJoin: (teamId: number, message?: string) =>
    api.post("/api/Teams/join-request", { teamId, message }),

  getPendingJoinRequests: () =>
    api.get("/api/Teams/me/join-requests") as Promise<PendingJoinRequestDto[]>,

  handleJoinRequest: (requestId: number, accept: boolean, feedbackMessage?: string) =>
    api.post(`/api/Teams/me/requests/${requestId}/handle`, {
      requestId,
      accept,
      feedbackMessage,
    }),

  generateJoinCode: () =>
    api.post("/api/Teams/me/join-code/generate") as Promise<{
      joinCode?: string;
      expiresAt?: string;
    }>,

  inviteByEmail: (email: string) => api.post("/api/Teams/me/invite", { email }),

  runSimilarityCheck: (payload: {
    title: string;
    abstract: string;
    description: string;
  }) =>
    api.post("/api/projects/similarity-check", payload) as Promise<SimilarityCheckResponse>,

  saveDraft: (payload: SaveDraftPayload) =>
    api.post("/api/projects/drafts", payload) as Promise<{
      id: number;
      title: string;
      savedAt: string;
    }>,

  updateDraft: (draftId: string | number, payload: SaveDraftPayload) =>
    api.put(`/api/projects/drafts/${draftId}`, payload),

  deleteDraft: (draftId: string | number) => api.delete(`/api/projects/drafts/${draftId}`),

  updateProjectDetails: (projectId: string | number, payload: Partial<SaveDraftPayload>) =>
    api.patch(`/api/projects/${projectId}/details`, payload),

  submitProject: (projectId: string | number, payload: SubmitProjectPayload) =>
    api.post(`/api/Projects/${projectId}/submit`, payload),

  recallSubmission: (projectId: string | number) =>
    api.delete(`/api/projects/${projectId}/submission`),

  abandonProject: (projectId: string | number, reason: string) =>
    api.post(`/api/projects/${projectId}/abandon`, { reason }),

  renameTeam: (name: string) =>
    api.patch("/api/Teams/me/rename", { name }),

  removeMember: (memberId: number) =>
    api.delete(`/api/Teams/me/members/${memberId}`),

  leaveTeam: () => api.delete("/api/Teams/me/leave"),

  getTeamChat: () => api.get("/api/teams/me/chat") as Promise<TeamChatDto>,

  sendChatMessage: (content: string) =>
    api.post("/api/teams/me/chat/messages", { content }) as Promise<{
      id: number;
      chatRoomId: number;
      senderId: number;
      content: string;
      sentAt: string;
    }>,

  uploadChatFile: (teamId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}/api/teams/me/chat/teams/${teamId}/chat/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : ""}`,
        },
        body: formData,
      }
    ).then(async (res) => {
      if (!res.ok) {
        let text = "";
        try { text = await res.text(); } catch {}
        try { 
            const data = JSON.parse(text); 
            text = data.title || data.detail || data.message || text; 
        } catch {}
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const respText = await res.text();
      try { return respText ? JSON.parse(respText) : {}; } catch { return { text: respText }; }
    });
  },

  downloadChatFile: async (fileName: string) => {
    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}/api/teams/me/chat/files/${fileName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : ""}`,
        },
      }
    ).then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
      }
      return res.blob();
    });
  },

  downloadOriginalityReport: async (projectId: string | number) => {
    return fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}/api/Projects/${projectId}/originality-report/pdf`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : ""}`,
        },
      }
    ).then(async (res) => {
      if (!res.ok) {
        let text = "";
        try { text = await res.text(); } catch {}
        try { 
            const data = JSON.parse(text); 
            text = data.title || data.detail || data.message || text; 
        } catch {}
        throw new Error(text || `Download failed (${res.status})`);
      }
      return res.blob();
    });
  },
};
