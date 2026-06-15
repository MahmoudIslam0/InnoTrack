"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Calendar, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCatalogCard, StatusTone } from "@/app/_components/DashboardUI";
import { SearchLoader, AnimatedList, AnimatedItem } from "@/components/ui/animated-loaders";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ProjectCatalogItemDto,
  LookupItem,
  ProjectCatalogFilters,
  normalizeOriginalityPercent,
  normalizeStatusTone,
  readPagedData,
  studentApi,
} from "@/lib/student-api";

interface Project {
  id: string;
  title: string;
  year: number;
  category: string;
  supervisor: string;
  status: string;
  technologies: string[];
  students: string[];
  originality: number;
}

const PROJECTS_PAGE_SIZE = 9;

export default function ProfessorProjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [thisYearProjects, setThisYearProjects] = useState<Project[]>([]);
  const [oldProjects, setOldProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [oldPage, setOldPage] = useState(1);
  const [currentTotalPages, setCurrentTotalPages] = useState(1);
  const [oldTotalPages, setOldTotalPages] = useState(1);
  const [currentTotalRecords, setCurrentTotalRecords] = useState(0);
  const [oldTotalRecords, setOldTotalRecords] = useState(0);
  const [domains, setDomains] = useState<LookupItem[]>([]);
  const [technologies, setTechnologies] = useState<LookupItem[]>([]);
  const [supervisors, setSupervisors] = useState<{ id: number; fullName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [filterSupervisor, setFilterSupervisor] = useState<string>("");
  const [filterTechnology, setFilterTechnology] = useState<string>("");
  const [filterMinOriginality, setFilterMinOriginality] = useState<string>("");
  const [filterMaxOriginality, setFilterMaxOriginality] = useState<string>("");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("projectsActiveTab") || "current";
    }
    return "current";
  });

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([
      studentApi.getDomains(),
      studentApi.getTechnologies(),
      studentApi.getSupervisors(),
    ]).then(([domainsResult, technologiesResult, supervisorsResult]) => {
      if (ignore) return;

      if (domainsResult.status === "fulfilled") setDomains(readPagedData(domainsResult.value));
      if (technologiesResult.status === "fulfilled") setTechnologies(readPagedData(technologiesResult.value));
      if (supervisorsResult.status === "fulfilled") setSupervisors(supervisorsResult.value);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const catalogFilters = useMemo<ProjectCatalogFilters>(() => {
    const domain = domains.find((item) => item.name === filterDomain);
    const technology = technologies.find((item) => item.name === filterTechnology);
    const supervisor = supervisors.find((item) => item.fullName === filterSupervisor);
    const year = Number(filterYear);
    const minOriginalityScore = Number(filterMinOriginality);
    const maxOriginalityScore = Number(filterMaxOriginality);

    return {
      search: searchQuery.trim() || undefined,
      year: Number.isFinite(year) && year > 0 ? year : undefined,
      domainId: domain?.id,
      technologyId: technology?.id,
      supervisorId: supervisor?.id,
      minOriginalityScore: Number.isFinite(minOriginalityScore) && filterMinOriginality !== ""
        ? minOriginalityScore
        : undefined,
      maxOriginalityScore: Number.isFinite(maxOriginalityScore) && filterMaxOriginality !== ""
        ? maxOriginalityScore
        : undefined,
    };
  }, [
    domains,
    filterDomain,
    filterMinOriginality,
    filterMaxOriginality,
    filterSupervisor,
    filterTechnology,
    filterYear,
    searchQuery,
    supervisors,
    technologies,
  ]);

  useEffect(() => {
    let ignore = false;

    Promise.allSettled([
      studentApi.getProjects({ ...catalogFilters, isCurrentAcademicYear: true, pageNumber: currentPage }, PROJECTS_PAGE_SIZE),
      studentApi.getProjects({ ...catalogFilters, isCurrentAcademicYear: false, pageNumber: oldPage }, PROJECTS_PAGE_SIZE),
    ]).then(([currentProjectsResult, oldProjectsResult]) => {
      if (ignore) return;

      if (currentProjectsResult.status === "fulfilled") {
        const mappedCurrent = currentProjectsResult.value.data.map(mapProject);
        setThisYearProjects(mappedCurrent);
        setCurrentTotalPages(Math.max(1, currentProjectsResult.value.totalPages || 1));
        setCurrentTotalRecords(currentProjectsResult.value.totalRecords || mappedCurrent.length);
      } else {
        toast.error("Could not load this year's projects.");
      }

      if (oldProjectsResult.status === "fulfilled") {
        const mappedOld = oldProjectsResult.value.data.map(mapProject);
        setOldProjects(mappedOld);
        setOldTotalPages(Math.max(1, oldProjectsResult.value.totalPages || 1));
        setOldTotalRecords(oldProjectsResult.value.totalRecords || mappedOld.length);
      } else {
        toast.error("Could not load old projects.");
      }

      setAllProjects([
        ...(currentProjectsResult.status === "fulfilled" ? currentProjectsResult.value.data.map(mapProject) : []),
        ...(oldProjectsResult.status === "fulfilled" ? oldProjectsResult.value.data.map(mapProject) : []),
      ]);
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [catalogFilters, currentPage, oldPage]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("projectsActiveTab", value);
    }
  };

  // Extract unique values for filter dropdowns
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear, 2026);
  const uniqueYears = Array.from({ length: maxYear - 2020 + 1 }, (_, i) => maxYear - i);
  const uniqueDomains = useMemo(
    () => domains.length ? domains.map((domain) => domain.name).sort() : Array.from(new Set(allProjects.map(p => p.category))).sort(),
    [domains, allProjects],
  );
  const uniqueSupervisors = useMemo(
    () => supervisors.length ? supervisors.map((supervisor) => supervisor.fullName).sort() : Array.from(new Set(allProjects.map(p => p.supervisor))).sort(),
    [supervisors, allProjects],
  );
  const uniqueTechnologies = useMemo(
    () => technologies.length ? technologies.map((technology) => technology.name).sort() : Array.from(new Set(allProjects.flatMap(p => p.technologies))).sort(),
    [technologies, allProjects],
  );

  const hasActiveFilters = filterYear || filterDomain || filterSupervisor || filterTechnology || filterMinOriginality || filterMaxOriginality;

  const clearAllFilters = () => {
    setFilterYear("");
    setFilterDomain("");
    setFilterSupervisor("");
    setFilterTechnology("");
    setFilterMinOriginality("");
    setFilterMaxOriginality("");
    setCurrentPage(1);
    setOldPage(1);
  };

  const getStatusTone = (status: string): StatusTone => normalizeStatusTone(status) as StatusTone;

  return (
    <div className="dashboard-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Projects</h1>
        <p className="text-muted-foreground">Browse and search graduation projects</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              setOldPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-colors text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-8">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Advanced Filters</h3>
                <p className="text-sm text-muted-foreground">Refine your project search</p>
              </div>
              <div className="flex items-center gap-4">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary dark:text-primary dark:hover:text-primary/70 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
                {/* Slider Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {showFilters ? "Hide" : "Show"}
                  </span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${showFilters
                      ? "bg-primary hover:bg-primary"
                      : "bg-muted hover:bg-muted/80"
                      }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${showFilters ? "translate-x-7" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-in fade-in duration-300">
                {/* Year Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setCurrentPage(1);
                      setOldPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground font-medium"
                  >
                    <option value="">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Domain Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Domain</label>
                  <select
                    value={filterDomain}
                    onChange={(e) => {
                      setFilterDomain(e.target.value);
                      setCurrentPage(1);
                      setOldPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground font-medium"
                  >
                    <option value="">All Domains</option>
                    {uniqueDomains.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>

                {/* Supervisor Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Supervisor</label>
                  <select
                    value={filterSupervisor}
                    onChange={(e) => {
                      setFilterSupervisor(e.target.value);
                      setCurrentPage(1);
                      setOldPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground font-medium"
                  >
                    <option value="">All Supervisors</option>
                    {uniqueSupervisors.map(supervisor => (
                      <option key={supervisor} value={supervisor}>{supervisor}</option>
                    ))}
                  </select>
                </div>

                {/* Technology Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Technology</label>
                  <select
                    value={filterTechnology}
                    onChange={(e) => {
                      setFilterTechnology(e.target.value);
                      setCurrentPage(1);
                      setOldPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground font-medium"
                  >
                    <option value="">All Technologies</option>
                    {uniqueTechnologies.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>

                {/* Min Originality Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Min Originality</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filterMinOriginality}
                      onChange={(e) => {
                        setFilterMinOriginality(e.target.value);
                        setCurrentPage(1);
                        setOldPage(1);
                      }}
                      placeholder="0"
                      className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground font-medium"
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold pointer-events-none">%</span>
                  </div>
                </div>

                {/* Max Originality Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Max Originality</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filterMaxOriginality}
                      onChange={(e) => {
                        setFilterMaxOriginality(e.target.value);
                        setCurrentPage(1);
                        setOldPage(1);
                      }}
                      placeholder="100"
                      className="w-full pl-3.5 pr-12 py-2.5 text-sm bg-background border border-border/50 rounded-lg hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground font-medium"
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {isLoading ? (
        <SearchLoader text="Discovering projects..." />
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid !h-auto items-stretch w-full max-w-[440px] grid-cols-2 rounded-xl border border-border bg-muted/40 !p-1">
                <TabsTrigger
                  value="current"
                  className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <Calendar className="w-4 h-4" />
                  <span>This Year</span>
                  <span className="ml-1 px-2 py-0.5 bg-primary/20 text-primary dark:text-primary/70 rounded-md text-xs font-bold">
                    {currentTotalRecords}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="old"
                  className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
                >
                  <Archive className="w-4 h-4" />
                  <span>Old Projects</span>
                  <span className="ml-1 px-2 py-0.5 bg-primary/20 text-primary dark:text-primary/70 rounded-md text-xs font-bold">
                    {oldTotalRecords}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="current">
              <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thisYearProjects.map((project) => (
                  <AnimatedItem key={project.id}>
                    <ProjectCatalogCard
                      project={{
                        id: project.id,
                        title: project.title,
                        category: project.category,
                        status: getStatusTone(project.status),
                        year: project.year,
                        supervisor: project.supervisor,
                        students: project.students,
                        technologies: project.technologies,
                        originality: project.originality,
                      }}
                      href={`/professor/projects/${project.id}`}
                    />
                  </AnimatedItem>
                ))}
              </AnimatedList>
              {thisYearProjects.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No projects found</p>
                </div>
              )}
              <div className="mt-8">
                <PaginationControls
                  page={currentPage}
                  totalPages={currentTotalPages}
                  totalRecords={currentTotalRecords}
                  onPageChange={setCurrentPage}
                />
              </div>
            </TabsContent>

            <TabsContent value="old">
              <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {oldProjects.map((project) => (
                  <AnimatedItem key={project.id}>
                    <ProjectCatalogCard
                      project={{
                        id: project.id,
                        title: project.title,
                        category: project.category,
                        status: getStatusTone(project.status),
                        year: project.year,
                        supervisor: project.supervisor,
                        students: project.students,
                        technologies: project.technologies,
                        originality: project.originality,
                      }}
                      href={`/professor/projects/${project.id}`}
                    />
                  </AnimatedItem>
                ))}
              </AnimatedList>
              {oldProjects.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No projects found</p>
                </div>
              )}
              <div className="mt-8">
                <PaginationControls
                  page={oldPage}
                  totalPages={oldTotalPages}
                  totalRecords={oldTotalRecords}
                  onPageChange={setOldPage}
                />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function mapProject(project: ProjectCatalogItemDto): Project {
  return {
    id: String(project.id),
    title: project.title,
    year: project.year,
    category: project.domain,
    supervisor: project.supervisor || "Not assigned",
    status: project.status,
    technologies: project.technologies || [],
    students: project.students || [],
    originality: normalizeOriginalityPercent(project.originalityScore),
  };
}

function PaginationControls({
  page,
  totalPages,
  totalRecords,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}) {
  if (totalRecords <= PROJECTS_PAGE_SIZE && totalPages <= 1) return null;

  const start = totalRecords === 0 ? 0 : (page - 1) * PROJECTS_PAGE_SIZE + 1;
  const end = Math.min(page * PROJECTS_PAGE_SIZE, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {totalRecords} projects
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <span className="min-w-24 text-center text-sm font-medium text-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
