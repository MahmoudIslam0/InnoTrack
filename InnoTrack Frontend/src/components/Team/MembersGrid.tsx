"use client";
import React from "react";
import MemberCard from "./MemberCard";

export default function MembersGrid({ members, isLeaderView, onRemove }:{ members: {id?: number; name:string;role?:"Leader" | "Member" | string; profilePictureUrl?: string | null;}[]; isLeaderView?:boolean; onRemove?:(name:string, id?:number)=>void }){
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {members.map(m => (
        <MemberCard key={m.name} member={m} isLeaderView={isLeaderView} onRemove={onRemove} />
      ))}
    </div>
  );
}
