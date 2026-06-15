"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail,
  BookOpen,
  Award,
  LogOut,
  Pencil,
  Save,
  Eye,
  EyeOff,
  GraduationCap,
  Building2,
  Star,
  TrendingUp,
  KeyRound,
  X,
  Trash2,
  Camera,
} from "lucide-react";
import { ImageCropperDialog } from "@/app/_components/ImageCropperDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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

export default function StudentProfile() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editGpa, setEditGpa] = useState("0.0");
  const [editBannerColor, setEditBannerColor] = useState("#4f46e5");
  const skillInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setSelectedImageSrc(reader.result?.toString() || null);
      setIsCropperOpen(true);
    });
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProfilePictureUpload = async (croppedImageBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", croppedImageBlob, "profile.jpg");

    try {
      setIsUploadingPhoto(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}/api/Users/me/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to upload profile picture");
      }

      toast.success("Profile picture updated successfully");
      setIsCropperOpen(false);
      setSelectedImageSrc(null);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile picture");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteProfilePicture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}/api/Users/me/profile-picture`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to delete profile picture");
      }

      toast.success("Profile picture removed");
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete profile picture");
    }
  };

  // Change Password State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Show Password States
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.get("/api/Students/me");
      if (data) {
        setProfile(data);
        setEditGpa(data.gpa !== null ? data.gpa.toString() : "0.0");
        setEditSkills(data.skills ?? []);
        setEditBannerColor(data.profileBannerColor || "#4f46e5");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (editSkills.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      toast.error("Skill already added.");
      return;
    }
    setEditSkills((prev) => [...prev, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setEditSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    if (!profile) return;
    const parsedGpa = parseFloat(editGpa);
    if (isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 4) {
      toast.error("GPA must be a number between 0.0 and 4.0");
      return;
    }
    try {
      await api.patch("/api/Students/me/profile", {
        gpa: parsedGpa,
        skills: editSkills,
        profileBannerColor: editBannerColor,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile changes");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditGpa(profile.gpa !== null ? profile.gpa.toString() : "0.0");
      setEditSkills(profile.skills ?? []);
      setEditBannerColor(profile.profileBannerColor || "#4f46e5");
    }
    setSkillInput("");
    setIsEditing(false);
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.put("/api/Users/change-password", {
        oldPassword,
        newPassword,
      });
      toast.success("Password changed successfully.");
      setIsPasswordModalOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-muted-foreground mt-4 font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">Please log in with a student account to access this profile.</p>
          <Button onClick={() => router.push("/login")} className="w-full bg-primary hover:bg-primary/90 text-white">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const first = profile.firstName?.charAt(0) || "";
    const last = profile.lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || profile.email?.charAt(0).toUpperCase() || "S";
  };
  const initials = getInitials();
  const gpaColor = (profile.gpa ?? 0) >= 3.5
    ? "text-emerald-500"
    : (profile.gpa ?? 0) >= 2.5
      ? "text-primary"
      : "text-amber-500";

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your personal information and preferences</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 h-10 gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel} className="rounded-xl h-10 gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ─── Hero Card ─── */}
        <div className="rounded-3xl border border-border/60 bg-card shadow-sm relative">
          {/* Banner */}
          <div 
            className="h-28 md:h-36 rounded-t-3xl relative transition-colors duration-300" 
            style={{ backgroundColor: isEditing ? editBannerColor : (profile.profileBannerColor || "#4f46e5") }}
          >
            <div className="absolute inset-0 rounded-t-3xl overflow-hidden opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            
            {isEditing && (
              <div className="absolute top-4 right-4 z-20">
                <label className="cursor-pointer bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full flex items-center justify-center transition-colors shadow-sm" title="Change Banner Color">
                  <Pencil className="w-4 h-4" />
                  <input
                    type="color"
                    value={editBannerColor}
                    onChange={(e) => setEditBannerColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            )}
            
            {/* Avatar - Absolutely positioned relative to the banner to perfectly overlap without margin clipping */}
            <div 
              className="absolute -bottom-12 md:-bottom-14 left-6 md:left-8 w-24 h-24 md:w-28 md:h-28 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-xl ring-4 ring-card z-20 group overflow-hidden"
            >
              {profile.profilePictureUrl ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${profile.profilePictureUrl}`}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-full h-full object-cover group-hover:brightness-50 transition-all"
                />
              ) : (
                <span className="group-hover:opacity-20 transition-opacity">{initials}</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Upload new photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                {profile.profilePictureUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteProfilePicture}
                    className="p-2 hover:bg-red-500/40 rounded-full transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* User Details Section */}
          <div className="px-6 md:px-8 pb-6 md:pb-8 pt-16 md:pt-20 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary/90 dark:text-primary px-3 py-1 text-xs font-semibold rounded-full border border-primary/20">
                  {profile.departmentName}
                </Badge>
                {profile.hasTeam && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-semibold rounded-full border border-emerald-500/20">
                    Team Assigned
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-muted-foreground text-sm font-medium">{profile.email}</p>
            </div>

            {/* Stats Strip */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Department</p>
                  <p className="text-sm font-semibold text-foreground truncate">{profile.departmentName}</p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">GPA</p>
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
                  <p className="text-xs text-muted-foreground font-medium">Graduation Year</p>
                  <p className="text-sm font-semibold text-foreground">{profile.graduationYear}</p>
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
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium">
                  {profile.firstName} {profile.lastName}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Address</Label>
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
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Department</Label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm text-foreground font-medium">
                  {profile.departmentName}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GPA</Label>
                {isEditing ? (
                  <Input
                    value={editGpa}
                    onChange={(e) => setEditGpa(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    className="h-10 rounded-xl border-primary focus-visible:ring-primary"
                  />
                ) : (
                  <div className={`px-3.5 py-2.5 rounded-xl bg-muted/40 text-sm font-semibold ${gpaColor}`}>
                    {profile.gpa !== null ? profile.gpa.toFixed(2) : "Not Set"}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Graduation Year</Label>
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

          {isEditing ? (
            <div className="space-y-3">
              {/* Chip Input */}
              <div
                className="flex flex-wrap items-center gap-2 min-h-12 p-2 rounded-xl border border-border bg-background/50 focus-within:ring-1 focus-within:ring-primary/50 focus-within:bg-background transition-all duration-200 cursor-text"
                onClick={() => skillInputRef.current?.focus()}
              >
                {editSkills.map((skill) => (
                  <div
                    key={skill}
                    className="flex items-center gap-1 bg-primary/10 text-primary dark:text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary/20 hover:text-indigo-800 dark:hover:text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <input
                  ref={skillInputRef}
                  type="text"
                  autoComplete="off"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSkill(skillInput);
                    } else if (e.key === "Backspace" && !skillInput && editSkills.length > 0) {
                      setEditSkills((prev) => prev.slice(0, -1));
                    }
                  }}
                  placeholder={editSkills.length === 0 ? "Type a skill and press Enter..." : ""}
                  className="flex-1 min-w-[140px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Type a skill and press <kbd className="px-1 py-0.5 rounded border border-border text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 rounded border border-border text-xs">,</kbd> to add it. Press <kbd className="px-1 py-0.5 rounded border border-border text-xs">Backspace</kbd> to remove the last one.
              </p>
            </div>
          ) : (
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
                  No skills listed yet. Click <strong className="text-foreground not-italic">Edit Profile</strong> to add some!
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Actions Strip ─── */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-border/40">
          <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto text-foreground rounded-xl gap-2 h-10 border-border/60"
              >
                <KeyRound className="w-4 h-4" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Update your account password securely.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary text-white hover:bg-primary/90" disabled={isChangingPassword}>
                    {isChangingPassword ? "Saving..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={handleLogoutClick}
            className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:text-red-500 dark:hover:bg-red-950/30 dark:hover:border-red-800 rounded-xl gap-2 h-10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {selectedImageSrc && (
          <ImageCropperDialog
            isOpen={isCropperOpen}
            onClose={() => {
              setIsCropperOpen(false);
              setSelectedImageSrc(null);
            }}
            imageSrc={selectedImageSrc}
            onCropComplete={handleProfilePictureUpload}
            isUploading={isUploadingPhoto}
          />
        )}

      </div>
    </div>
  );
}
