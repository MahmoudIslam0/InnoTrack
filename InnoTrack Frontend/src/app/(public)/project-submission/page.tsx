"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import {
  Save,
  Send,
  TrendingUp,
  AlertCircle,
  Bot,
  Upload,
  FileText,
  Edit2,
  Trash2,
  Info,
  X,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { LookupItem, MyTeamDto, ProjectDraftDto, formatPercent, normalizeOriginalityPercent, readPagedData, studentApi } from "@/lib/student-api";

interface StoredTeam {
  id: string;
  name: string;
  leaderId?: string;
  members?: string[];
}

const similarProjects = [
  {
    id: "1",
    title: "Indoor Navigation Using Bluetooth Beacons",
    similarity: 45,
  },
  { id: "2", title: "AR Campus Guide Application", similarity: 38 },
  { id: "3", title: "University Wayfinding System", similarity: 32 },
];

function ProjectSubmissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editId = searchParams.get("edit");
  const editMode = searchParams.get("mode");
  const draftId = searchParams.get("draft");
  const isViewOnly = editMode === "view";
  const isDetailsOnly = editMode === "details-only";
  const isEditing = Boolean(editId) || Boolean(draftId);

  const [originalityScore, setOriginalityScore] = useState(0);
  const [hasRunSimilarityCheck, setHasRunSimilarityCheck] = useState(false);
  const [formHashAtLastCheck, setFormHashAtLastCheck] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [domains, setDomains] = useState<LookupItem[]>([]);
  const [technologies, setTechnologies] = useState<LookupItem[]>([]);
  const [similarProjects, setSimilarProjects] = useState<
    { id?: number | null; title: string; similarity: number }[]
  >([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    studentNames: "",
    year: "2026",
    category: "",
    technologies: "",
    abstract: "",
    description: "",
    problemStatement: "",
    proposedSolution: "",
    objectives: "",
  });
  const [techInput, setTechInput] = useState("");

  // Teams (client-side) and selected team
  const [teams, setTeams] = useState<StoredTeam[]>([]);
  const [myTeam, setMyTeam] = useState<MyTeamDto | null>(null);
  const [currentProject, setCurrentProject] = useState<{ status?: string | null } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || teams[0] || null;
  const lockAllFields = isViewOnly;
  const blocksNewSubmission = Boolean(currentProject && !isEditing);
  const technologyTokens = useMemo(
    () => formData.technologies
      .split(",")
      .map((tech) => tech.trim())
      .filter(Boolean),
    [formData.technologies],
  );
  const currentTechnologyQuery = techInput.trim().toLowerCase();
  const technologySuggestions = useMemo(() => {
    if (!currentTechnologyQuery || lockAllFields) return [];
    const selected = new Set(technologyTokens.map((tech) => tech.toLowerCase()));
    return technologies
      .filter((technology) =>
        technology.name.toLowerCase().includes(currentTechnologyQuery)
        && !selected.has(technology.name.toLowerCase()),
      )
      .slice(0, 6);
  }, [currentTechnologyQuery, lockAllFields, technologies, technologyTokens]);
  const selectedDomain = domains.find((item) => item.name === formData.category);
  const missingRequiredFields = [
    !selectedTeam ? "team" : "",
    !formData.title.trim() ? "project title" : "",
    !formData.studentNames.trim() ? "student names" : "",
    !formData.year.trim() ? "year" : "",
    !selectedDomain ? "category" : "",
    technologyTokens.length === 0 ? "technologies" : "",
    !formData.abstract.trim() ? "abstract" : "",
    !formData.description.trim() ? "detailed description" : "",
    !formData.problemStatement.trim() ? "problem statement" : "",
    !formData.proposedSolution.trim() ? "proposed solution" : "",
    !formData.objectives.trim() ? "objectives" : "",
  ].filter(Boolean);
  const submitLockReason = (() => {
    if (isDetailsOnly) return "";
    if (blocksNewSubmission) return "Your team already has an active or submitted project.";
    if (missingRequiredFields.length > 0) return `Complete ${missingRequiredFields.join(", ")} before sending to a supervisor.`;
    if (formData.abstract.trim().split(/\s+/).filter(Boolean).length < 120) return "Abstract must be at least 120 words.";
    if (formData.description.trim().split(/\s+/).filter(Boolean).length < 150) return "Detailed description must be at least 150 words.";
    if (!hasRunSimilarityCheck) return "Run the similarity check before sending to a supervisor.";
    if (originalityScore < 40) return "Project originality must be at least 40% before sending to a supervisor.";
    return "";
  })();

  const handleLoadDraft = (draft: ProjectDraftDto) => {
    setFormData({
      title: draft.title,
      studentNames: draft.studentNames || "",
      year: String(draft.year),
      category: draft.domain,
      technologies: draft.technologies.join(", "),
      abstract: draft.abstract,
      description: draft.description,
      problemStatement: draft.problemStatement || "",
      proposedSolution: draft.proposedSolution || "",
      objectives: draft.objectives || "",
    });
    setOriginalityScore(normalizeOriginalityPercent(draft.originalityScore));
    setHasRunSimilarityCheck(typeof draft.originalityScore === "number");
    setSelectedDraftId(String(draft.id));
    toast.success(`Draft "${draft.title}" loaded`);
  };

  // Restore state from sessionStorage on mount if no specific ID is provided
  useEffect(() => {
    // Issue 1 & 4: Removed sessionStorage restoration so drafts are strictly tied to the backend.
  }, [editId, draftId]);

  // Save state to sessionStorage when it changes
  // Issue 1 & 4: Removed sessionStorage saving so drafts are strictly tied to the backend.


  // Pre-fill form when editing an approved project or loading a draft
  useEffect(() => {
    if (initialized) return;

    if (editId && isDetailsOnly) {
      studentApi
        .getProject(editId)
        .then((project) => {
          setFormData({
            title: project.title,
            studentNames: project.students.map((student) => student.name).join(", "),
            year: project.academicYear,
            category: project.domain,
            technologies: project.technologies.join(", "),
            abstract: project.abstract,
            description: project.description,
            problemStatement: project.problemStatement || "",
            proposedSolution: project.proposedSolution || "",
            objectives: project.objectives || "",
          });
          setOriginalityScore(normalizeOriginalityPercent(project.originalityScore));
          setHasRunSimilarityCheck(typeof project.originalityScore === "number");
        })
        .catch((error: unknown) => {
          toast.error(getErrorMessage(error, "Could not load project details."));
        })
        .finally(() => setInitialized(true));
    } else if (editId || draftId) {
      const id = editId || draftId;
      if (id) {
        studentApi
          .getDraft(id)
          .then(handleLoadDraft)
          .catch((error: unknown) => {
            toast.error(getErrorMessage(error, "Could not load draft."));
          })
          .finally(() => setInitialized(true));
      }
    }
  }, [editId, draftId, isDetailsOnly, initialized]);
  useEffect(() => {
    let ignore = false;

    Promise.allSettled([
      studentApi.getMyTeam(),
      studentApi.getMyProject(),
      studentApi.getDomains(),
      studentApi.getTechnologies(),
    ]).then(([teamResult, projectResult, domainsResult, technologiesResult]) => {
      if (ignore) return;

      if (teamResult.status === "fulfilled" && teamResult.value) {
        const team = teamResult.value;
        setMyTeam(team);
        setTeams([{ id: String(team.id), name: team.name }]);
        setSelectedTeamId(String(team.id));
        setFormData((current) => ({
          ...current,
          studentNames: team.members.map((member) => member.fullName).join(", "),
        }));
      }
      if (projectResult.status === "fulfilled") setCurrentProject(projectResult.value);

      if (domainsResult.status === "fulfilled") setDomains(readPagedData(domainsResult.value));
      if (technologiesResult.status === "fulfilled") setTechnologies(readPagedData(technologiesResult.value));

      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  // Load teams from localStorage and pre-fill teamId from query
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem("teams") || "[]";
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTeams(parsed);
          if (!searchParams.get("teamId") && parsed.length > 0) {
            setSelectedTeamId(parsed[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to parse teams from localStorage", e);
      }
      const tid = searchParams.get("teamId");
      if (tid) setSelectedTeamId(tid);
    });
  }, [searchParams]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTechnologySuggestion = (name: string) => {
    const parts = formData.technologies.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.includes(name)) {
      parts.push(name);
      handleInputChange("technologies", parts.join(", "));
    }
    setTechInput("");
  };

  const removeTechnology = (name: string) => {
    const parts = formData.technologies.split(",").map((p) => p.trim()).filter(Boolean);
    handleInputChange("technologies", parts.filter((p) => p !== name).join(", "));
  };

  const handleRunSimilarityCheck = async () => {
    if (!formData.title.trim() || !formData.abstract.trim() || !formData.description.trim()) {
      toast.error("Add a title, abstract, and description before running similarity check.");
      return;
    }

    setIsChecking(true);
    try {
      const result = await studentApi.runSimilarityCheck({
        title: formData.title,
        abstract: formData.abstract,
        description: formData.description,
      });
      const score = normalizeOriginalityPercent(result.originalityScore);
      setOriginalityScore(score);
      setSimilarProjects(result.similarProjects || []);
      setHasRunSimilarityCheck(true);
      setFormHashAtLastCheck(JSON.stringify({
        title: formData.title,
        abstract: formData.abstract,
        description: formData.description,
      }));
      toast.success(`Similarity check completed. Score: ${score}%`);

      // Attempt to auto-save draft with the new score
      try {
        const payload = await buildDraftPayload();
        payload.originalityScore = score; // Override with the newly generated score
        if (selectedDraftId) {
          await studentApi.updateDraft(selectedDraftId, payload);
        } else {
          const saved = await studentApi.saveDraft(payload);
          setSelectedDraftId(String(saved.id));
          sessionStorage.setItem("projectSubmissionId", String(saved.id));
        }
        toast.success("Draft auto-saved with new originality score!");
      } catch (e) {
        // If it fails (e.g., missing domain/tech), just silently ignore or log it,
        // because the user might just be testing the score before filling the rest of the form.
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Similarity check failed."));
    } finally {
      setIsChecking(false);
    }
  };

  const buildDraftPayload = async () => {
    if (!selectedDomain) {
      throw new Error("Please select a project domain.");
    }
    if (technologyTokens.length === 0) {
      throw new Error("Add at least one technology.");
    }

    const resolvedTechnologies: LookupItem[] = [];
    const knownTechnologies = [...technologies];

    for (const technologyName of technologyTokens) {
      const existing = knownTechnologies.find(
        (technology) => technology.name.toLowerCase() === technologyName.toLowerCase(),
      );

      if (existing) {
        resolvedTechnologies.push(existing);
      } else {
        throw new Error(`Technology '${technologyName}' is not recognized. Please choose from the available suggestions.`);
      }
    }

    setTechnologies(knownTechnologies);

    return {
      title: formData.title,
      studentNames: formData.studentNames,
      year: Number(formData.year),
      abstract: formData.abstract,
      description: formData.description,
      domainId: selectedDomain.id,
      technologyIds: [...new Set(resolvedTechnologies.map((technology) => technology.id))],
      problemStatement: formData.problemStatement || null,
      proposedSolution: formData.proposedSolution || null,
      objectives: formData.objectives || null,
      originalityScore: originalityScore > 0 ? originalityScore : null,
    };
  };

  const saveDraft = async () => {
    if (!formData.title) {
      throw new Error("Please enter a project title to save as draft");
    }
    const payload = await buildDraftPayload();
    if (selectedDraftId) {
      await studentApi.updateDraft(selectedDraftId, payload);
      return { id: Number(selectedDraftId), title: formData.title };
    }
    const saved = await studentApi.saveDraft(payload);
    setSelectedDraftId(String(saved.id));
    sessionStorage.setItem("projectSubmissionId", String(saved.id));
    return saved;
  };

  const handleClearForm = () => {
    setFormData({
      title: "",
      studentNames: myTeam ? myTeam.members.map((m) => m.fullName).join(", ") : "",
      year: "2026",
      category: "",
      technologies: "",
      abstract: "",
      description: "",
      problemStatement: "",
      proposedSolution: "",
      objectives: "",
    });
    setOriginalityScore(0);
    setHasRunSimilarityCheck(false);
    setSelectedDraftId(null);
    setUploadedFile(null);
    toast.success("Form cleared successfully.");
  };

  const handleSaveDraft = async () => {
    if (blocksNewSubmission) {
      toast.error("Your team already has an active or submitted project.");
      return;
    }
    setIsSaving(true);
    try {
      await saveDraft();
      toast.success("Draft saved successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not save draft."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitToSupervisor = async () => {
    if (submitLockReason) {
      toast.error(submitLockReason);
      return;
    }
    if (!selectedTeam) {
      toast.error("Please create a team before submitting the project.");
      return;
    }
    
    const currentHash = JSON.stringify({
      title: formData.title,
      abstract: formData.abstract,
      description: formData.description,
    });
    
    if (currentHash !== formHashAtLastCheck) {
      toast.error("Project details have changed. Please rerun the originality test before submitting.");
      return;
    }

    if (isDetailsOnly) {
      setIsSubmitting(true);
      try {
        const payload = await buildDraftPayload();
        if (editId) {
          await studentApi.updateProjectDetails(editId, payload);
          toast.success("Project details updated successfully.");
          router.push("/project-management");
        } else {
          toast.error("No project ID found to update.");
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Could not update project details."));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    setIsSubmitting(true);
    try {
      const saved = await saveDraft();
      sessionStorage.setItem("projectSubmissionId", String(saved.id));
      // Store the current page URL so the supervisor page can navigate back to it
      sessionStorage.setItem("supervisorReturnUrl", window.location.pathname + window.location.search);
      router.push("/project-submission/supervisor");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not prepare submission."));
      setIsSubmitting(false);
    }
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
      processUploadedPDF(file);
    } else {
      toast.error("Please upload a valid PDF file");
    }
  };

  const processUploadedPDF = async (file: File) => {
    setIsProcessingPDF(true);
    toast.info("Extracting data from PDF...");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setFormData({
      title: "Smart Campus Navigation System",
      studentNames: "John Smith, Sarah Ahmed",
      year: "2026",
      category: "",
      technologies: "React Native, ARKit, Firebase, TensorFlow",
      abstract:
        "This project proposes an AI-powered indoor navigation application using Augmented Reality (AR) technology to assist students in finding classrooms, laboratories, and facilities within the university campus. The system leverages machine learning algorithms to provide optimal routes and real-time guidance.",
      description:
        "The Smart Campus Navigation System is designed to address the challenges faced by students, especially new ones, in navigating large university campuses. By integrating AR technology with indoor positioning systems, the application provides an intuitive and interactive wayfinding experience.",
      problemStatement:
        "Students, particularly freshmen and visitors, often struggle to locate specific buildings, rooms, and facilities on large university campuses. Traditional signage and maps are static and may not provide the most efficient routes, leading to time wastage and frustration.",
      proposedSolution:
        "Develop a mobile application that uses AR overlays to guide users to their destinations. The app will integrate with indoor positioning systems using WiFi triangulation and Bluetooth beacons to provide accurate location tracking. Machine learning algorithms will optimize route suggestions based on real-time data such as crowd density and accessibility requirements.",
      objectives:
        "1. Develop an AR-based navigation interface for mobile devices\n2. Implement indoor positioning using WiFi and Bluetooth technologies\n3. Create a database of campus buildings and facilities\n4. Integrate machine learning for route optimization\n5. Ensure accessibility features for users with disabilities",
    });

    setIsProcessingPDF(false);
    toast.success("Project details extracted successfully");
  };

  const handleDeleteDraft = (draftId: string) => {
    toast.success("Draft deleted successfully");
  };

  if (!true) {
    return (
      <div className="p-4 md:p-8 max-w-350 mx-auto">
        <div className="bg-card text-card-foreground rounded-2xl p-12 border border-border shadow-sm text-center backdrop-blur-xl">
          <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-3">
            Authentication Required
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You need to be logged in to submit a project proposal. Please sign
            in or create an account to continue.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-350 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-3 -ml-3 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/project-management")}
        >
          ← Back to Project Management
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-foreground tracking-tight">
              {isViewOnly ? "View Draft" : isDetailsOnly ? "Edit Project Details" : isEditing ? "Edit Draft" : "Project Submission"}
            </h1>
            {!isViewOnly && !isDetailsOnly && (
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 shrink-0 border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400 rounded-lg"
                onClick={handleClearForm}
                disabled={isSaving || isSubmitting || isLoading}
                title="Clear Form"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            {isDetailsOnly
              ? "Update the editable details of your approved project"
              : isViewOnly
                ? "Review this team draft without changing it"
              : isEditing
                ? "Continue working on your saved draft"
              : "Submit your graduation project proposal"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-[600px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Details-only mode banner */}
      {isDetailsOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 mb-6">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Limited Editing Mode
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              This project has been approved. You can edit the title, description, technologies, and objectives. Other proposal fields are locked.
            </p>
          </div>
        </div>
      )}

 



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Project Details Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-sm transition-all hover:shadow-md">
            <h3 className="text-xl font-semibold mb-6 pb-2 border-b border-border/50">
              Project Details
            </h3>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="team">Team *</Label>
                {teams.length === 0 ? (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">No teams found. Create a team in Teams first.</p>
                    <Button variant="link" onClick={() => router.push('/teams')}>Create Team</Button>
                  </div>
                ) : (
                  <div
                    id="team"
                    className="flex min-h-12 w-full items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground"
                  >
                    {selectedTeam?.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">This submission is attached to your current team.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Smart Campus Navigation System"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className={lockAllFields ? "h-12 bg-muted text-muted-foreground text-lg" : "h-12 bg-background/50 focus:bg-background text-lg"}
                    disabled={lockAllFields}
                  />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="studentNames">Student Names *</Label>
                <Input
                  id="studentNames"
                  placeholder="e.g., John Smith, Sarah Ahmed"
                  value={formData.studentNames}
                  onChange={(e) =>
                    handleInputChange("studentNames", e.target.value)
                  }
                  className={isDetailsOnly || lockAllFields ? "bg-muted text-muted-foreground" : "bg-background/50 focus:bg-background"}
                  disabled={isDetailsOnly || lockAllFields}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    value={formData.year}
                    disabled
                    className="h-12 rounded-xl bg-muted text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="flex items-center gap-2">
                    Category
                  </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(event) => handleInputChange("category", event.target.value)}
                  disabled={isDetailsOnly || lockAllFields}
                  className="h-12 w-full rounded-xl border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Select a domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.name}>{domain.name}</option>
                  ))}
                </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="technologies">Technologies *</Label>
                <div 
                  className={`flex flex-wrap items-center gap-2 min-h-12 p-2 rounded-xl border border-border shadow-sm transition-all duration-200 ${lockAllFields ? "bg-muted text-muted-foreground" : "bg-background/50 focus-within:ring-1 focus-within:ring-primary/50 focus-within:bg-background"}`}
                >
                  {technologyTokens.map((tech) => (
                    <div key={tech} className="flex items-center gap-1 bg-primary/10 text-primary dark:text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20">
                      {tech}
                      {!lockAllFields && (
                        <button type="button" onClick={() => removeTechnology(tech)} className="hover:text-indigo-800 dark:hover:text-primary ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!lockAllFields && (
                    <input
                      id="technologies"
                      type="text"
                      autoComplete="off"
                      placeholder={technologyTokens.length === 0 ? "e.g., React, Python, TensorFlow..." : ""}
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const match = technologies.find(t => t.name.toLowerCase() === techInput.trim().toLowerCase());
                          if (match) {
                            handleTechnologySuggestion(match.name);
                          } else if (techInput.trim()) {
                            toast.error("Please select a technology from the suggestions.");
                          }
                        }
                      }}
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
                    />
                  )}
                </div>
                {!lockAllFields && technologySuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {technologySuggestions.map((technology) => (
                      <button
                        key={technology.id}
                        type="button"
                        onClick={() => handleTechnologySuggestion(technology.name)}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
                      >
                        {technology.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Use commas between technologies. Please choose from the available suggestions.
                </p>
              </div>
            </div>
          </div>

          {/* Project Description Card */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-sm transition-all hover:shadow-md">
            <h3 className="text-xl font-semibold mb-6 pb-2 border-b border-border/50">
              Project Description
            </h3>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="abstract" className="flex flex-wrap items-center gap-2">
                    Abstract *
                    <span className="text-xs text-muted-foreground/80 font-normal">
                      (Minimum 120 words. AI-generated summary available after similarity check)
                    </span>
                  </Label>
                  <span className={`text-xs ${formData.abstract.trim().split(/\s+/).filter(Boolean).length < 120 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}`}>
                    {formData.abstract.trim().split(/\s+/).filter(Boolean).length} / 120 words minimum
                  </span>
                </div>
                <Textarea
                  id="abstract"
                  placeholder="Brief summary of your project (Minimum 120 words)"
                  value={formData.abstract}
                  onChange={(e) =>
                    handleInputChange("abstract", e.target.value)
                  }
                  className={isDetailsOnly || lockAllFields ? "min-h-[120px] bg-muted text-muted-foreground resize-y" : "min-h-[120px] bg-background/50 focus:bg-background resize-y"}
                  disabled={isDetailsOnly || lockAllFields}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <span className={`text-xs ${formData.description.trim().split(/\s+/).filter(Boolean).length < 150 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}`}>
                    {formData.description.trim().split(/\s+/).filter(Boolean).length} / 150 words minimum
                  </span>
                </div>
                <Textarea
                  id="description"
                  placeholder="Comprehensive description of your project (Minimum 150 words)"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className={lockAllFields ? "min-h-[160px] bg-muted text-muted-foreground resize-y" : "min-h-[160px] bg-background/50 focus:bg-background resize-y"}
                  disabled={lockAllFields}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="problemStatement">Problem Statement *</Label>
                <Textarea
                  id="problemStatement"
                  placeholder="What problem does your project solve?"
                  value={formData.problemStatement}
                  onChange={(e) =>
                    handleInputChange("problemStatement", e.target.value)
                  }
                  className={isDetailsOnly || lockAllFields ? "min-h-[120px] bg-muted text-muted-foreground resize-y" : "min-h-[120px] bg-background/50 focus:bg-background resize-y"}
                  disabled={isDetailsOnly || lockAllFields}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proposedSolution">Proposed Solution *</Label>
                <Textarea
                  id="proposedSolution"
                  placeholder="How will your project solve the problem?"
                  value={formData.proposedSolution}
                  onChange={(e) =>
                    handleInputChange("proposedSolution", e.target.value)
                  }
                  className={isDetailsOnly || lockAllFields ? "min-h-[160px] bg-muted text-muted-foreground resize-y" : "min-h-[160px] bg-background/50 focus:bg-background resize-y"}
                  disabled={isDetailsOnly || lockAllFields}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="objectives">Objectives *</Label>
                <Textarea
                  id="objectives"
                  placeholder="List the main objectives of your project"
                  value={formData.objectives}
                  onChange={(e) =>
                    handleInputChange("objectives", e.target.value)
                  }
                  className={lockAllFields ? "min-h-[120px] bg-muted text-muted-foreground resize-y" : "min-h-[120px] bg-background/50 focus:bg-background resize-y"}
                  disabled={lockAllFields}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isViewOnly ? (
          <div className="space-y-3 pt-4">
            {submitLockReason && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                {submitLockReason}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              {!isDetailsOnly && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isSubmitting || isLoading}
                  >
                    {isSaving ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Draft
                  </Button>
                </>
              )}
              <Button
                onClick={handleSubmitToSupervisor}
                className="flex-1 h-12 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                disabled={Boolean(submitLockReason) || isSubmitting || isSaving}
              >
                {isSubmitting ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isDetailsOnly ? "Update Project Details" : "Submit to Supervisor"}
              </Button>
            </div>
          </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Draft is view-only for team members. The team leader can resume editing.
            </div>
          )}

          {originalityScore > 0 && originalityScore < 40 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-4 animate-in slide-in-from-bottom-4">
              <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                  Auto Rejected
                </p>
                <p className="text-sm text-red-800/80 dark:text-red-400/80 mt-1">
                  Project originality must be at least 40% before sending to a supervisor. Please revise your project idea to improve originality.
                </p>
              </div>
            </div>
          )}
          {originalityScore >= 40 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-start gap-4 animate-in slide-in-from-bottom-4">
              <div className="bg-yellow-500/20 p-2 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                  Manual Review
                </p>
                <p className="text-sm text-yellow-800/80 dark:text-yellow-400/80 mt-1">
                  Your project originality score meets the minimum threshold. It will be sent to a supervisor for manual review.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - 1 column */}
        <div className="lg:col-span-1 space-y-8">
          {/* Originality Score */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-sm text-center">
            <h3 className="text-lg font-semibold mb-6">
              Originality Score
            </h3>

            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-md">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="currentColor"
                    className="text-muted/30"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke={originalityScore >= 80 ? "#10B981" : originalityScore >= 40 ? "#EAB308" : originalityScore > 0 ? "#EF4444" : "#6366f1"}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 72}`}
                    strokeDashoffset={`${2 * Math.PI * 72 * (1 - (originalityScore ?? 0) / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold tracking-tighter">
                    {originalityScore}%
                  </span>
                </div>
              </div>
              {hasRunSimilarityCheck && (
                <p className="text-xs text-muted-foreground mt-4">
                  Last checked: Just now
                </p>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={handleRunSimilarityCheck}
              disabled={isViewOnly || isChecking}
            >
              {isChecking ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Run Similarity Check
            </Button>
          </div>

          {/* Similar Projects */}
          <div className="bg-card text-card-foreground rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">
              Similar Projects
            </h3>

            {!hasRunSimilarityCheck || similarProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
                <FolderKanban className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Run the originality check to view similar projects.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {similarProjects.map((project) => (
                  <div
                    key={project.id || project.title}
                    className="p-4 bg-background/50 rounded-xl border border-border/50 hover:border-border transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm font-medium flex-1 leading-snug">
                        {project.title}
                      </p>
                      <Badge variant="secondary" className="text-xs font-semibold bg-accent">
                        {formatPercent(project.similarity, 0)}%
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-primary dark:text-primary hover:bg-primary/10 h-8"
                      asChild
                    >
                      <Link href={project.id ? `/projects/${project.id}` : "/projects"}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
        </>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProjectSubmission() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-muted-foreground">Loading...</div></div>}>
      <ProjectSubmissionPage />
    </Suspense>
  );
}
