"use client";

import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/ui/animated-loaders";
import { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <PageTransition key={pathname}>{children}</PageTransition>;
}

