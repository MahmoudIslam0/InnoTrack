"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  teamName: string;
  supervisor?: { name: string; avatar?: string } | null;
  status?: string;
  isLeader?: boolean;
  onManage?: () => void;
}

export default function TeamHeader({ teamName, supervisor, status, isLeader, onManage }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold">{teamName}</h2>
        <div className="flex items-center gap-3 mt-2">
          {status && <Badge variant="secondary">{status}</Badge>}
          {supervisor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-primary/90 font-semibold">{supervisor.name.split(" ").map(n=>n[0]).join("")}</div>
              <div>{supervisor.name}</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isLeader && (
          <Button onClick={onManage} variant="outline">Manage Team</Button>
        )}
      </div>
    </div>
  );
}
