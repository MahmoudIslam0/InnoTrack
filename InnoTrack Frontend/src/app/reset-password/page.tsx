"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email") || "";

  const { resetPassword, verifyResetCode } = useAuth();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !token) {
      setError("Please provide both your email and the reset code.");
      return;
    }
    
    setIsLoading(true);
    try {
      await verifyResetCode({ email, token });
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!newPassword || !confirmPassword) {
      setError("Please fill out both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordRules = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword)
    ];

    if (!passwordRules.every(Boolean)) {
      setError("Please ensure your new password meets all requirements.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ email, token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The code might be invalid or expired.");
      // Go back to step 1 if the code was likely wrong
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRules = [
    { label: "At least 8 characters", test: newPassword.length >= 8 },
    { label: "Uppercase letter", test: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", test: /[a-z]/.test(newPassword) },
    { label: "Number", test: /[0-9]/.test(newPassword) },
    { label: "Special character", test: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const strengthScore = passwordRules.filter((rule) => rule.test).length;
  const strengthColor =
    strengthScore === 0
      ? "bg-muted"
      : strengthScore <= 2
      ? "bg-red-500"
      : strengthScore <= 4
      ? "bg-yellow-500"
      : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 p-8 sm:p-10">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center -mb-4 relative w-28 h-28">
              <Image
                src="/logo-light.png"
                alt="InnoTrack Logo"
                fill
                className="drop-shadow-xl mix-blend-multiply object-contain dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="InnoTrack Logo"
                fill
                className="drop-shadow-xl mix-blend-screen object-contain hidden dark:block"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              Reset Password
            </h1>
            <p className="text-muted-foreground font-medium">
              {step === 1 ? "Enter the code sent to your email" : "Create a new secure password"}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                Password has been reset successfully. Redirecting to login...
              </p>
            </div>
          )}

          {/* Forms */}
          {!success && (
            <div className="relative">
              {/* STEP 1: Code Verification */}
              {step === 1 && (
                <form onSubmit={handleNextStep} className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@fci.bu.edu.eg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-indigo-500/50 transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Reset Code</Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="Enter the 6-digit code"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-indigo-500/50 transition-all duration-200 shadow-sm font-medium tracking-widest text-center placeholder:tracking-normal placeholder:font-normal"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base transition-all duration-200 shadow-lg shadow-indigo-500/25"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <>
                        Continue to New Password
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: New Password */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="h-12 pr-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-indigo-500/50 transition-all duration-200 shadow-sm font-medium tracking-widest placeholder:tracking-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-500 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-12 pr-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-indigo-500/50 transition-all duration-200 shadow-sm font-medium tracking-widest placeholder:tracking-normal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-500 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <div className="mt-2 p-4 bg-muted/40 rounded-xl border border-border/50 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
                              level <= strengthScore ? strengthColor : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                        {passwordRules.map((rule, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[12px] font-medium">
                            {rule.test ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                            )}
                            <span className={rule.test ? "text-foreground" : "text-muted-foreground"}>
                              {rule.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-12 px-4 rounded-xl border-border/50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base transition-all duration-200 shadow-lg shadow-indigo-500/25"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Resetting...</span>
                        </div>
                      ) : (
                        "Confirm Password"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Back to Login Link */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-medium text-muted-foreground/60 mt-8">
          InnoTrack – Graduation Project Redundancy Reduction System
        </p>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
