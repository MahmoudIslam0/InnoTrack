"use client";

import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  ClipboardList,
  Users,
  MessageSquare,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/contexts/SidebarContext";

interface SidebarProps {
  activeItem?: string;
  variant?: "student" | "professor" | "admin";
}

const studentMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/projects" },
  { id: "project-management", label: "Project Management", icon: ClipboardList, path: "/project-management" },
  { id: "teams", label: "Teams", icon: Users, path: "/teams" },
  { id: "innochat", label: "InnoChat", icon: Bot, path: "/innochat" },
];

const professorMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/professor/dashboard" },
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/professor/projects" },
  { id: "project-management", label: "Project Management", icon: ClipboardList, path: "/professor/project-management" },
  { id: "teams", label: "Teams", icon: Users, path: "/professor/teams" },
];

const adminMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { id: "students", label: "Students", icon: Users, path: "/admin/students" },
  { id: "professors", label: "Professors", icon: ClipboardList, path: "/admin/professors" },
  { id: "teams", label: "Teams", icon: Users, path: "/admin/teams" },
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/admin/projects" },
  { id: "academic-years", label: "Academic Years", icon: Calendar, path: "/admin/academic-years" },
  { id: "audit-logs", label: "Audit Logs", icon: ShieldAlert, path: "/admin/audit-logs" },
];

export function SidebarContent({ activeItem, variant = "student" }: SidebarProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useSidebar();
  const menuItems = variant === "admin" ? adminMenuItems : variant === "professor" ? professorMenuItems : studentMenuItems;
  const subtitle = variant === "admin" ? "System Administration" : variant === "professor" ? "Professor Workspace" : "Student Workspace";

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border/50">
        <div className="flex items-center">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl flex items-center justify-center">
            <Image
              src="/logo-light.png"
              alt="InnoTrack Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain dark:hidden mix-blend-multiply"
            />
            <Image
              src="/logo-dark.png"
              alt="InnoTrack Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain hidden dark:block mix-blend-screen"
            />
          </div>
          <div className={`overflow-hidden transition-all duration-500 ease-in-out whitespace-nowrap ${isSidebarCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
            <h1 className="text-lg font-bold text-foreground leading-none tracking-tight">
              InnoTrack
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeItem === item.id ||
              pathname === item.path ||
              (item.path !== "/dashboard" && pathname.startsWith(`${item.path}/`));

            return (
              <li key={item.id}>
                <Link
                  href={item.path}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`
                    w-full flex items-center h-11 rounded-xl text-sm font-medium transition-all duration-200 group overflow-hidden
                    ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] border border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center justify-center w-12 shrink-0 h-full">
                    <Icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? "text-primary" : "group-hover:text-accent-foreground"}`} />
                  </div>
                  <span className={`overflow-hidden transition-all duration-500 ease-in-out whitespace-nowrap ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      
    </div>
  );
}

export function Sidebar({ variant = "student" }: SidebarProps) {
  const { isSidebarCollapsed } = useSidebar();
  const pathname = usePathname();
  const currentVariant = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/professor") ? "professor" : "student";
  
  return (
    <aside 
      className={`fixed left-0 top-0 h-screen ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-background/70 backdrop-blur-2xl border-r border-border/50 hidden md:flex flex-col z-20 shadow-[8px_0_30px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-500 ease-in-out`}
    >
      <SidebarContent variant={currentVariant} />
    </aside>
  );
}
