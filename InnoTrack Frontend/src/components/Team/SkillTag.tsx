"use client";
import React from "react";

export default function SkillTag({ skill }:{ skill:string }){
  return <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-primary">{skill}</span>;
}
