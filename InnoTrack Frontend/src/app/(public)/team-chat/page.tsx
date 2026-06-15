"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * /team-chat redirects to /teams (Overview tab).
 * The Teams page contains the full working chat workspace.
 */
export default function TeamChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teams");
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-154px)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );
}
