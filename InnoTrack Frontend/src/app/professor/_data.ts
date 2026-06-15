export type ProjectStatus = "draft" | "in-progress" | "submitted" | "completed";
export type DecisionType =
  | "Proposal Approved"
  | "Proposal Rejected"
  | "Submission Accepted"
  | "Submission Rejected";
export type NotificationType = "Project Update" | "Member Joined" | "Feedback Alert";

export interface Student {
  id: string;
  name: string;
  role: "Leader" | "Member";
  gpa: number;
  skills: string[];
  email: string;
}

export interface SimilarProject {
  title: string;
  similarity: number;
  reason: string;
}

export interface Project {
  id: string;
  title: string;
  team: string;
  description: string;
  abstract: string;
  domain: string;
  technologies: string[];
  status: ProjectStatus;
  originalityScore: number;
  submittedAt: string;
  progress: number;
  problemStatement?: string;
  proposedSolution?: string;
  objectives?: string[];
  similarProjects: SimilarProject[];
}

export interface Team {
  id: string;
  name: string;
  projectId: string;
  joinCode: string;
  progress: number;
  members: Student[];
}

export interface Feedback {
  id: string;
  projectId: string;
  projectTitle: string;
  team: string;
  decision: DecisionType;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  author: string;
  role: "Professor" | "Student";
  content: string;
  timestamp: string;
}

export interface SharedFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export interface TeamChat {
  id: string;
  teamId: string;
  unreadCount: number;
  messages: ChatMessage[];
  files: SharedFile[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
}

export const professorProfile = {
  name: "Dr. Leila Hassan",
  department: "Computer Science",
  specialization: "Artificial Intelligence and Software Engineering",
  email: "leila.hassan@innotech.edu",
  office: "B-214",
  profilePicture: "LH",
};

export const projects: Project[] = [
  {
    id: "p1",
    title: "Smart Campus Navigation System",
    team: "Nova Path",
    description:
      "Mobile indoor navigation with AR overlays, crowd-aware routing, and campus facility search.",
    abstract:
      "The project helps students and visitors find classrooms, laboratories, and services across campus using augmented reality directions and indoor positioning.",
    domain: "IoT & Mobile",
    technologies: ["React Native", "ARKit", "Firebase", "TensorFlow"],
    status: "in-progress",
    originalityScore: 68,
    submittedAt: "2026-04-29",
    progress: 28,
    similarProjects: [
      {
        title: "Indoor Navigation Using Bluetooth Beacons",
        similarity: 45,
        reason:
          "Comparable indoor positioning method and campus wayfinding scope.",
      },
      {
        title: "AR Campus Guide Application",
        similarity: 38,
        reason: "Uses AR overlays for facility discovery and route guidance.",
      },
    ],
  },
  {
    id: "p2",
    title: "Automated Exam Proctoring",
    team: "Vision Guard",
    description:
      "Computer vision system that detects exam anomalies and prepares review summaries for instructors.",
    abstract:
      "A supervised proctoring assistant analyzes video streams, identifies suspicious movement patterns, and produces evidence-based review notes.",
    domain: "AI & Computer Vision",
    technologies: ["Python", "OpenCV", "YOLOv8", "Django"],
    status: "in-progress",
    originalityScore: 82,
    submittedAt: "2026-04-21",
    progress: 64,
    similarProjects: [
      {
        title: "Online Exam Integrity Monitor",
        similarity: 29,
        reason: "Same domain, but this proposal adds richer instructor reports.",
      },
    ],
  },
  {
    id: "p3",
    title: "AI-Powered Learning Assistant",
    team: "Prompt Lab",
    description:
      "Personalized study assistant that summarizes lectures, generates quizzes, and recommends learning paths.",
    abstract:
      "The assistant turns uploaded learning material into revision plans and targeted practice questions based on each student's weak areas.",
    domain: "NLP & Education",
    technologies: ["Next.js", "Node.js", "PostgreSQL", "Embeddings"],
    status: "submitted",
    originalityScore: 91,
    submittedAt: "2026-04-26",
    progress: 88,
    similarProjects: [
      {
        title: "Lecture Summarization Bot",
        similarity: 24,
        reason: "Overlaps in summarization, but differs in adaptive planning.",
      },
    ],
  },
  {
    id: "p4",
    title: "Mental Health Support Chatbot",
    team: "Care Loop",
    description:
      "Guided support chatbot that routes students to campus wellness resources based on conversation intent.",
    abstract:
      "A conversational tool supports early wellness triage and recommends university-approved resources while tracking escalation signals.",
    domain: "NLP & Healthcare",
    technologies: ["React", "FastAPI", "MongoDB", "LLM Guardrails"],
    status: "in-progress",
    originalityScore: 56,
    submittedAt: "2026-04-30",
    progress: 16,
    similarProjects: [
      {
        title: "Student Wellness Chat Assistant",
        similarity: 57,
        reason:
          "High overlap in target users, chat workflow, and wellness resource routing.",
      },
      {
        title: "Campus Counseling Recommendation Bot",
        similarity: 41,
        reason: "Shares counseling recommendation and intake methodology.",
      },
    ],
  },
];

export const teams: Team[] = [
  {
    id: "t1",
    name: "Nova Path",
    projectId: "p1",
    joinCode: "NOVA-26",
    progress: 28,
    members: [
      {
        id: "s1",
        name: "John Smith",
        role: "Leader",
        gpa: 3.72,
        skills: ["React Native", "UX", "Firebase"],
        email: "john.smith@innotech.edu",
      },
      {
        id: "s2",
        name: "Sarah Ahmed",
        role: "Member",
        gpa: 3.88,
        skills: ["ARKit", "TensorFlow", "Testing"],
        email: "sarah.ahmed@innotech.edu",
      },
    ],
  },
  {
    id: "t2",
    name: "Vision Guard",
    projectId: "p2",
    joinCode: "VISION-11",
    progress: 64,
    members: [
      {
        id: "s3",
        name: "Mohammed Ali",
        role: "Leader",
        gpa: 3.63,
        skills: ["Python", "OpenCV", "Model Evaluation"],
        email: "mohammed.ali@innotech.edu",
      },
      {
        id: "s4",
        name: "Noor Hassan",
        role: "Member",
        gpa: 3.79,
        skills: ["Django", "Data Labeling", "Computer Vision"],
        email: "noor.hassan@innotech.edu",
      },
    ],
  },
  {
    id: "t3",
    name: "Prompt Lab",
    projectId: "p3",
    joinCode: "PROMPT-8",
    progress: 88,
    members: [
      {
        id: "s5",
        name: "Amira Saleh",
        role: "Leader",
        gpa: 3.91,
        skills: ["Next.js", "NLP", "Prompting"],
        email: "amira.saleh@innotech.edu",
      },
      {
        id: "s6",
        name: "Karim Zaki",
        role: "Member",
        gpa: 3.55,
        skills: ["PostgreSQL", "APIs", "Documentation"],
        email: "karim.zaki@innotech.edu",
      },
    ],
  },
];

export const feedbackHistory: Feedback[] = [
  {
    id: "f1",
    projectId: "p3",
    projectTitle: "AI-Powered Learning Assistant",
    team: "Prompt Lab",
    decision: "Submission Accepted",
    content:
      "Final submission accepted. The adaptive quiz flow is complete; add deployment notes before archiving.",
    createdAt: "2026-04-30 14:20",
  },
  {
    id: "f2",
    projectId: "p1",
    projectTitle: "Smart Campus Navigation System",
    team: "Nova Path",
    decision: "Proposal Rejected",
    content:
      "Revise the proposal to separate accessible routing from fastest-path routing and reduce overlap with prior AR campus guide work.",
    createdAt: "2026-04-29 11:05",
  },
  {
    id: "f3",
    projectId: "p2",
    projectTitle: "Automated Exam Proctoring",
    team: "Vision Guard",
    decision: "Proposal Approved",
    content:
      "Proposal approved. Continue with model evaluation and instructor review workflow.",
    createdAt: "2026-04-24 09:45",
  },
];

export const teamChats: TeamChat[] = [
  {
    id: "c1",
    teamId: "t1",
    unreadCount: 2,
    messages: [
      {
        id: "m1",
        author: "John Smith",
        role: "Student",
        content:
          "We updated the proposal abstract and added the campus accessibility route use case.",
        timestamp: "10:12 AM",
      },
      {
        id: "m2",
        author: "Dr. Leila Hassan",
        role: "Professor",
        content:
          "Good. Please attach the similarity notes before requesting another proposal decision.",
        timestamp: "10:26 AM",
      },
    ],
    files: [
      {
        id: "file1",
        name: "proposal-revision.pdf",
        type: "PDF",
        size: "1.8 MB",
        uploadedAt: "Today",
      },
      {
        id: "file2",
        name: "similarity-summary.xlsx",
        type: "Spreadsheet",
        size: "420 KB",
        uploadedAt: "Yesterday",
      },
    ],
  },
  {
    id: "c2",
    teamId: "t2",
    unreadCount: 0,
    messages: [
      {
        id: "m3",
        author: "Noor Hassan",
        role: "Student",
        content:
          "The false-positive review screen is ready for your inspection.",
        timestamp: "Yesterday",
      },
      {
        id: "m4",
        author: "Dr. Leila Hassan",
        role: "Professor",
        content: "Send the test cases and I will review the flow this week.",
        timestamp: "Yesterday",
      },
    ],
    files: [
      {
        id: "file3",
        name: "evaluation-plan.docx",
        type: "Document",
        size: "760 KB",
        uploadedAt: "Yesterday",
      },
    ],
  },
  {
    id: "c3",
    teamId: "t3",
    unreadCount: 1,
    messages: [
      {
        id: "m5",
        author: "Amira Saleh",
        role: "Student",
        content:
          "We submitted the final package and included the privacy appendix.",
        timestamp: "Mon",
      },
      {
        id: "m6",
        author: "Dr. Leila Hassan",
        role: "Professor",
        content:
          "Received. I will attach my accept or reject decision through the submission review.",
        timestamp: "Mon",
      },
    ],
    files: [
      {
        id: "file4",
        name: "final-report.pdf",
        type: "PDF",
        size: "4.2 MB",
        uploadedAt: "Mon",
      },
      {
        id: "file5",
        name: "demo-video.mp4",
        type: "Video",
        size: "36 MB",
        uploadedAt: "Mon",
      },
    ],
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "Project Update",
    title: "Proposal waiting for approval",
    message: "Nova Path submitted Smart Campus Navigation System for review.",
    timestamp: "12 minutes ago",
    unread: true,
  },
  {
    id: "n2",
    type: "Member Joined",
    title: "New member joined team",
    message: "Youssef Mahmoud has joined Vision Guard via join code.",
    timestamp: "1 hour ago",
    unread: true,
  },
  {
    id: "n3",
    type: "Feedback Alert",
    title: "Feedback viewed by students",
    message: "Prompt Lab marked your documentation feedback as read.",
    timestamp: "Yesterday",
    unread: false,
  },
  {
    id: "n4",
    type: "Project Update",
    title: "Low originality flag",
    message: "Care Loop has a 56% originality score and requires review.",
    timestamp: "Yesterday",
    unread: false,
  },
];
