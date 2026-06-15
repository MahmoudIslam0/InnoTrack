"use client";

import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
      {children}
    </div>
  );
}

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return null; // Avoid rendering content while redirecting
  }

  return (
    <SidebarProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}

export function MainContentArea({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useSidebar();
  
  return (
    <main
      className={`pt-16 pb-20 md:pb-6 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
      }`}
    >
      {children}
    </main>
  );
}
