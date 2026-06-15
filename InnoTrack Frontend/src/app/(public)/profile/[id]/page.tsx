"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  BookOpen,
  Award,
  GraduationCap,
  Building2,
  Star,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ProfileData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  departmentName: string;
  gpa: number | null;
  graduationYear: number;
  hasTeam: boolean;
  skills: string[];
  profilePictureUrl?: string | null;
  profileBannerColor?: string | null;
}

export default function OtherStudentProfile() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/api/Students/${id}`);
        if (data) {
          setProfile(data);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">
          Loading profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Profile Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            Could not load the requested student profile.
          </p>
          <Button
            onClick={() => router.back()}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const first = profile.firstName?.charAt(0) || "";
    const last = profile.lastName?.charAt(0) || "";
    return (
      `${first}${last}`.toUpperCase() ||
      profile.email?.charAt(0).toUpperCase() ||
      "S"
    );
  };
  const initials = getInitials();
  const gpaColor =
    (profile.gpa ?? 0) >= 3.5
      ? "text-emerald-500"
      : (profile.gpa ?? 0) >= 2.5
        ? "text-primary"
        : "text-amber-500";

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="-ml-3 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Student Profile
              </h1>
            </div>
          </div>
        </div>

        {/* ─── Hero Card ─── */}
        <div className="rounded-3xl border border-border/60 bg-card shadow-sm relative">
          {/* Banner */}
          <div
            className="h-28 md:h-36 rounded-t-3xl relative"
            style={{ backgroundColor: profile.profileBannerColor || "#4f46e5" }}
          >
            <div
              className="absolute inset-0 rounded-t-3xl overflow-hidden opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            ></div>

            {/* Avatar */}
            <div className="absolute -bottom-12 md:-bottom-14 left-6 md:left-8 w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-xl ring-4 ring-card z-20 overflow-hidden">
              {profile.profilePictureUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${profile.profilePictureUrl}`}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          </div>

          {/* User Details Section */}
          <div className="px-6 md:px-8 pb-6 md:pb-8 pt-16 md:pt-20 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary/90 dark:text-primary px-3 py-1 text-xs font-semibold rounded-full border border-primary/20"
                >
                  {profile.departmentName}
                </Badge>
                {profile.hasTeam && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-semibold rounded-full border border-emerald-500/20"
                  >
                    Team Assigned
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-muted-foreground text-sm font-medium">
                {profile.email}
              </p>
            </div>

            {/* Stats Strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    Department
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profile.departmentName}
                  </p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    GPA
                  </p>
                  <p className={`text-sm font-semibold ${gpaColor}`}>
                    {profile.gpa !== null ? profile.gpa.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    Graduation Year
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {profile.graduationYear}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Two-column info grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-primary" />
              </span>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium">
                  {profile.firstName} {profile.lastName}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email Address
                </Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-purple-500" />
              </span>
              Academic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Department
                </Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium">
                  {profile.departmentName}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  GPA
                </Label>
                <div
                  className={`px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm font-semibold ${gpaColor}`}
                >
                  {profile.gpa !== null ? profile.gpa.toFixed(2) : "Not Set"}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Graduation Year
                </Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {profile.graduationYear}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Skills Card ─── */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-amber-500" />
            </span>
            Skills &amp; Expertise
          </h3>

          <div className="flex flex-wrap gap-2.5 min-h-[44px] items-center">
            {profile.skills && profile.skills.length > 0 ? (
              profile.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary dark:text-primary px-3.5 py-1.5 rounded-full text-sm font-medium border border-primary/20"
                >
                  <Star className="w-3 h-3 shrink-0" />
                  {skill}
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground italic">
                No skills listed yet.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder for Label to avoid importing from unneeded files if it's simpler
function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return <label className={className}>{children}</label>;
}
