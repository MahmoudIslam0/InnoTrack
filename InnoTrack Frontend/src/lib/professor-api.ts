import { api } from "./api";

export const professorApi = {
  getPendingProjects: (pageNumber = 1, pageSize = 20) =>
    api.get("/api/Professor/projects/pending", { params: { pageNumber, pageSize } }),

  reviewProject: (projectId: string | number, approve: boolean) =>
    api.post(`/api/Professor/projects/${projectId}/review`, { approve }),

  addFeedback: (projectId: string | number, content: string) =>
    api.post(`/api/Professor/projects/${projectId}/feedback`, { content }),

  getSupervisedProjects: () =>
    api.get("/api/Professor/projects"),

  getSupervisedTeams: () =>
    api.get("/api/Professor/teams"),

  getFeedbackHistory: () =>
    api.get("/api/Professor/feedback"),

  getTeamChat: (teamId: string | number) =>
    api.get(`/api/Professor/teams/${teamId}/chat`),

  sendChatMessage: (teamId: string | number, content: string) =>
    api.post(`/api/Professor/teams/${teamId}/chat/messages`, { content }),

  cancelSupervision: (projectId: string | number) =>
    api.post(`/api/Professor/projects/${projectId}/cancel-supervision`),

  getDashboard: () =>
    api.get("/api/Professor/dashboard"),

  getProjectDetails: (projectId: string | number) =>
    api.get(`/api/Professor/projects/${projectId}`) as Promise<{
      id: number;
      title: string;
      abstract: string;
      description: string;
      problemStatement?: string;
      proposedSolution?: string;
      objectives?: string[];
      status: string;
      progressPercent: number;
      originalityScore?: number;
      teamName: string;
      domainName: string;
      academicYearName: string;
      teamMembers: any[];
      technologies: string[];
      createdAt: string;
      submittedAt?: string;
      feedbackHistory: any[];
      hasOriginalityReport: boolean;
      proposalDepartment?: string;
      proposalMessage?: string;
    }>,

  requestRevision: (projectId: string | number, reason: string) =>
    api.post(`/api/Professor/projects/${projectId}/request-revision`, { reason }),

  getProjectLogs: (projectId: string | number) =>
    api.get(`/api/Projects/${projectId}/logs`),

  toggleProjectMute: (projectId: string | number) =>
    api.post(`/api/Projects/${projectId}/mute`),
};
