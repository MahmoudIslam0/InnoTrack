"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { studentApi } from "@/lib/student-api";

export function HeroCard() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmitIdea = async () => {
    setIsChecking(true);
    try {
      const team = await studentApi.getMyTeam();
      if (!team) {
        toast.warning("You need to be in a team before submitting a project idea.", {
          description: "Join or create a team first, then come back to submit your idea.",
          action: {
            label: "Go to Teams",
            onClick: () => router.push("/teams"),
          },
        });
        router.push("/teams");
        return;
      }
      // Set the active tab so project-management opens on "New Idea"
      sessionStorage.setItem("projectManagementActiveTab", "submit-idea");
      router.push("/project-management");
    } catch {
      // If the API call fails, fall back to project-management directly
      sessionStorage.setItem("projectManagementActiveTab", "submit-idea");
      router.push("/project-management");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-card rounded-xl p-8 md:p-10 border border-border shadow-sm transition-all duration-300">
      {/* Background Decorative Elements */}
      
      

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
        {/* Left Content */}
        <div className="flex-1 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Submit or Improve Your Project Idea
            </h2>
          </div>

          <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
            Share your innovative graduation project idea and get instant
            feedback on originality. Our AI-powered system helps you avoid
            redundancy and ensures your project stands out.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Button
              onClick={handleSubmitIdea}
              disabled={isChecking}
              className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-300 w-full sm:w-auto text-base disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Sparkles className={`w-5 h-5 mr-2 ${isChecking ? "animate-spin" : "animate-pulse"}`} />
              {isChecking ? "Checking..." : "Submit Idea"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
