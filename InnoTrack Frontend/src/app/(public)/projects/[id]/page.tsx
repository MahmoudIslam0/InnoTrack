"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Users,
  BookOpen,
  Code,
  CheckCircle,
  Clock,
  Award,
  Download,
  Presentation,
  MessageSquare,
  FileText,
  Target,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCatalogDetailDto, formatStatus, normalizeOriginalityPercent, studentApi } from "@/lib/student-api";

interface Project {
  id: string;
  title: string;
  year: number;
  category: string;
  supervisor: string;
  status: string;
  technologies: string[];
  students: { name: string; role: "Leader" | "Member"; major?: string; department?: string; profilePictureUrl?: string | null }[];
  description?: string;
  abstract?: string;
  problemStatement?: string;
  proposedSolution?: string;
  objectives?: string[];
  dateSubmitted?: string;
  dateApproved?: string;
  originalityScore?: number;
}

const allProjects: Project[] = [
  {
    id: "1",
    title: "Smart Campus Navigation System",
    year: 2026,
    category: "IoT & Mobile",
    supervisor: "Dr. Ahmed Hassan",
    status: "In Progress",
    technologies: ["React Native", "ARKit", "Firebase"],
    students: [
      { name: "John Smith", role: "Leader", major: "Software Engineering", department: "Computer Science" },
      { name: "Sarah Ahmed", role: "Member", major: "AI", department: "Computer Science" },
    ],
    description: "Mobile indoor navigation with AR overlays, crowd-aware routing, and campus facility search. The system provides real-time guidance using Bluetooth beacon positioning.",
    abstract:
      "A mobile application that provides real-time indoor navigation for university campus buildings using augmented reality and Bluetooth beacons. The system helps students, visitors, and staff navigate complex campus buildings efficiently.",
    problemStatement:
      "Students and visitors often struggle to find specific rooms, offices, or facilities within large university buildings, leading to time wastage and frustration. Traditional maps and signage are often confusing or outdated.",
    proposedSolution:
      "Develop a mobile AR application that overlays directional arrows and information on the camera view, guiding users to their destination. The system uses Bluetooth beacons for accurate indoor positioning and provides turn-by-turn navigation.",
    objectives: [
      "Implement accurate indoor positioning using Bluetooth Low Energy (BLE) beacons",
      "Develop an intuitive AR interface for navigation visualization",
      "Create a comprehensive database of campus locations and points of interest",
      "Integrate with university timetable system for automatic classroom navigation",
      "Ensure accessibility features for users with disabilities",
    ],
    dateSubmitted: "2026-02-15",
    dateApproved: "2026-02-20",
    originalityScore: 85,
  },
  {
    id: "2",
    title: "Automated Exam Proctoring",
    year: 2026,
    category: "AI & Computer Vision",
    supervisor: "Dr. Fatima Ali",
    status: "In Progress",
    technologies: ["Python", "OpenCV", "YOLOv8"],
    students: [
      { name: "Mohammed Ali", role: "Leader", major: "Computer Vision", department: "Computer Science" },
      { name: "Noor Hassan", role: "Member", major: "Software Engineering", department: "Computer Science" },
    ],
    description: "Computer vision system that detects exam anomalies and prepares review summaries for instructors. Analyzes video streams and identifies suspicious movement patterns.",
    abstract:
      "An AI-powered system that monitors online exams and detects suspicious behavior using computer vision and machine learning techniques. The system provides real-time alerts to proctors and generates detailed reports.",
    problemStatement:
      "With the rise of online education, maintaining academic integrity during remote examinations has become challenging. Manual proctoring is time-consuming and may not detect all forms of cheating.",
    proposedSolution:
      "Develop an automated proctoring system using computer vision to detect unusual behaviors such as multiple people in frame, looking away from screen, and suspicious objects. The system uses deep learning models for real-time analysis.",
    objectives: [
      "Implement face detection and recognition to verify student identity",
      "Develop behavior analysis algorithms to detect suspicious activities",
      "Create a dashboard for proctors to monitor multiple exams simultaneously",
      "Generate automated reports with flagged incidents and timestamps",
      "Ensure student privacy and data security compliance",
    ],
    dateSubmitted: "2026-02-10",
    dateApproved: "2026-02-18",
    originalityScore: 78,
  },
  {
    id: "3",
    title: "Blockchain-Based Degree Verification",
    year: 2025,
    category: "Blockchain",
    supervisor: "Dr. Omar Khalil",
    status: "Completed",
    technologies: ["Ethereum", "Solidity", "React"],
    students: [
      { name: "Layla Ibrahim", role: "Leader", major: "Cybersecurity", department: "Information Systems" },
      { name: "Youssef Mahmoud", role: "Member", major: "Software Engineering", department: "Computer Science" },
    ],
    description: "Decentralized platform for issuing and verifying academic credentials using smart contracts on Ethereum. Each certificate has a unique hash for instant verification by employers.",
    abstract:
      "A decentralized platform for issuing and verifying academic credentials using blockchain technology. The system ensures tamper-proof storage of degree information and allows instant verification by employers or other institutions.",
    problemStatement:
      "Traditional degree verification processes are slow, costly, and vulnerable to fraud. Employers and institutions often struggle to verify the authenticity of academic credentials.",
    proposedSolution:
      "Create a blockchain-based system where universities can issue digital certificates stored on the Ethereum blockchain. Each certificate has a unique hash that can be verified instantly by anyone with the certificate number.",
    objectives: [
      "Design and deploy smart contracts for certificate issuance and verification",
      "Develop a web portal for universities to issue digital certificates",
      "Create a public verification interface for employers and institutions",
      "Implement IPFS for storing certificate metadata",
      "Ensure compliance with data protection regulations",
    ],
    dateSubmitted: "2025-01-20",
    dateApproved: "2025-02-05",
    originalityScore: 92,
  },
  {
    id: "4",
    title: "Mental Health Support Chatbot",
    year: 2025,
    category: "NLP & Healthcare",
    supervisor: "Dr. Huda Nasser",
    status: "Completed",
    technologies: ["GPT-4", "Node.js", "MongoDB"],
    students: [
      { name: "Amira Saleh", role: "Leader", major: "AI", department: "Computer Science" },
      { name: "Karim Zaki", role: "Member", major: "Data Science", department: "Computer Science" },
    ],
    description: "Conversational tool supporting early wellness triage and connecting students to university-approved counseling resources, with intent-based escalation detection.",
    abstract:
      "An AI-powered chatbot that provides mental health support and resources to university students. The system uses natural language processing to understand user concerns and provide appropriate guidance and referrals.",
    problemStatement:
      "Many university students struggle with mental health issues but hesitate to seek help due to stigma or lack of access to counseling services. Traditional mental health support systems are often overburdened.",
    proposedSolution:
      "Develop an intelligent chatbot using GPT-4 that can engage in empathetic conversations, provide coping strategies, and connect students with appropriate resources or professional help when needed.",
    objectives: [
      "Implement natural language understanding for mental health conversations",
      "Create a knowledge base of coping strategies and mental health resources",
      "Develop crisis detection algorithms to identify users needing immediate help",
      "Integrate with university counseling services for seamless referrals",
      "Ensure user privacy and data confidentiality",
    ],
    dateSubmitted: "2025-03-10",
    dateApproved: "2025-03-22",
    originalityScore: 88,
  },
  {
    id: "5",
    title: "E-Commerce Recommendation Engine",
    year: 2024,
    category: "Machine Learning",
    supervisor: "Dr. Tariq Ahmed",
    status: "Completed",
    technologies: ["Python", "TensorFlow", "Flask"],
    students: [
      { name: "Dina Farouk", role: "Leader", major: "Data Science", department: "Computer Science" },
      { name: "Hassan Omar", role: "Member", major: "Software Engineering", department: "Computer Science" },
    ],
    description: "Hybrid recommendation engine combining collaborative filtering, content-based filtering, and deep learning to deliver personalized product suggestions at scale.",
    abstract:
      "A sophisticated recommendation system for e-commerce platforms that uses collaborative filtering and deep learning to provide personalized product suggestions. The system analyzes user behavior and preferences to improve shopping experience.",
    problemStatement:
      "E-commerce customers are often overwhelmed by product choices and struggle to find items that match their preferences. Traditional recommendation systems lack personalization and accuracy.",
    proposedSolution:
      "Build a hybrid recommendation engine that combines collaborative filtering, content-based filtering, and deep learning techniques to provide highly personalized product recommendations based on user behavior, preferences, and browsing history.",
    objectives: [
      "Implement collaborative filtering algorithms for user-based recommendations",
      "Develop content-based filtering using product features and descriptions",
      "Create deep learning models for pattern recognition in user behavior",
      "Design a real-time recommendation API for integration with e-commerce platforms",
      "Optimize system performance for handling large-scale data",
    ],
    dateSubmitted: "2024-09-15",
    dateApproved: "2024-09-28",
    originalityScore: 75,
  },
];

function getStatusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "Approved":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "In Progress":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function ProjectDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [apiProject, setApiProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    studentApi
      .getProject(id)
      .then((project) => {
        if (!ignore) setApiProject(mapProjectDetail(project));
      })
      .catch(() => {
        if (!ignore) setApiProject(null);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const project = apiProject || (!isLoading ? allProjects.find((p) => p.id === id) : null);

  if (isLoading) {
    return (
      <div className="dashboard-page flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="dashboard-page flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Project Not Found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 -ml-3 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
              {project.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                {project.category}
              </Badge>
              <Badge
                variant="secondary"
                className={getStatusClasses(project.status)}
              >
                {project.status}
              </Badge>
            </div>
          </div>
          {project.originalityScore !== undefined && (
            <div className="flex flex-col items-center justify-center bg-card border border-border shadow-sm rounded-2xl px-6 py-3 shrink-0">
              <span className="text-3xl font-bold text-primary">{project.originalityScore}%</span>
              <span className="text-[11px] text-muted-foreground font-medium mt-1">Originality Score</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-8">

          {/* Abstract (First as requested) */}
          {project.abstract && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Abstract
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                {project.abstract}
              </p>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Project Description
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            </div>
          )}

          {/* Problem Statement */}
          {project.problemStatement && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Problem Statement
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {project.problemStatement}
              </p>
            </div>
          )}

          {/* Proposed Solution */}
          {project.proposedSolution && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Proposed Solution
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {project.proposedSolution}
              </p>
            </div>
          )}

          {/* Objectives */}
          {project.objectives && project.objectives.length > 0 && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Objectives
              </h2>
              <ul className="space-y-4">
                {project.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed flex-1">
                      {objective}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technologies */}
          {project.technologies && project.technologies.length > 0 && (
            <div className="bg-card text-card-foreground rounded-xl p-6 md:p-8 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Technologies Used
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 bg-muted text-foreground text-sm rounded-lg font-medium border border-border/50"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1 space-y-8">
          
          {/* Team Members (Moved to Top) */}
          <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members
            </h3>

            <div className="space-y-4">
              {project.students.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  {student.profilePictureUrl ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${student.profilePictureUrl}`}
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold border border-primary/20">
                      {(() => {
                        const parts = student.name.trim().split(" ");
                        return parts.length > 1
                          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          : (parts[0][0] || "").toUpperCase();
                      })()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student.role}
                      {student.major && ` • ${student.major}`}
                      {student.department && ` • ${student.department}`}
                    </p>
                  </div>
                  {student.role === "Leader" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 border-primary/20 text-primary">
                      Leader
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-5">
              Project Information
            </h3>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Academic Year
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{project.year}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Supervisor
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {project.supervisor}
                  </p>
                </div>
              </div>

              {project.dateSubmitted && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Date Submitted
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(project.dateSubmitted).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                  </div>
                </div>
              )}

              {project.dateApproved && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-500">
                      Date Approved
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {new Date(project.dateApproved).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function mapProjectDetail(project: ProjectCatalogDetailDto): Project {
  const parsedYear = Number.parseInt(project.academicYear, 10);

  return {
    id: String(project.id),
    title: project.title,
    year: Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear(),
    category: project.domain,
    supervisor: project.supervisor || "Not assigned",
    status: formatStatus(project.status),
    technologies: project.technologies || [],
    students: (project.students || []).map((student) => ({
      name: student.name,
      role: student.role.toLowerCase().includes("leader") ? "Leader" : "Member",
      department: student.department,
      profilePictureUrl: student.profilePictureUrl || undefined,
    })),
    description: project.description,
    abstract: project.abstract,
    problemStatement: project.problemStatement || undefined,
    proposedSolution: project.proposedSolution || undefined,
    objectives: project.objectives
      ? project.objectives
          .split(/\r?\n/)
          .map((item) => item.replace(/^\d+[\).]\s*/, "").trim())
          .filter(Boolean)
      : [],
    dateSubmitted: project.submittedAt || undefined,
    dateApproved: project.approvedAt || undefined,
    originalityScore: project.originalityScore ? normalizeOriginalityPercent(project.originalityScore) : undefined,
  };
}
