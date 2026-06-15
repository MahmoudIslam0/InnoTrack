"use client";
import React from "react";
import { Inbox } from "lucide-react";
import ApplicantCard from "./ApplicantCard";

type JoinRequest = {
  id: string;
  studentId?: string;
  fullName: string;
  department: string;
  skills?: string[];
};

export default function PendingRequestsList({ requests, onAccept, onReject }:{ requests: JoinRequest[]; onAccept:(id:string)=>void; onReject:(id:string)=>void }){
  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border text-center dashboard-surface">
        <div className="bg-muted/50 p-3 rounded-xl mb-3">
          <Inbox className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No pending requests</h3>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto py-2">
      {requests.map(r => (
        <ApplicantCard key={r.id} applicant={r} onAccept={onAccept} onReject={onReject} />
      ))}
    </div>
  );
}
