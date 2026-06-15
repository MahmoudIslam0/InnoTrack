"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignalRChatWidget({ teamId }:{ teamId?:string }){
  const [messages, setMessages] = useState<{id:string, author:string, text:string}[]>([]);
  const [text, setText] = useState("");

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(`chat_${teamId}`) || "[]";
      setMessages(JSON.parse(raw));
    }catch(e){ }
  },[teamId]);

  const send = () =>{
    if(!text.trim()) return;
    const m = { id: Date.now().toString(), author: 'Me', text };
    const next = [...messages, m];
    setMessages(next);
    localStorage.setItem(`chat_${teamId}`, JSON.stringify(next));
    setText("");
  };

  return (
    <div className="bg-card p-3 rounded-xl border border-border/50 flex flex-col h-72">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map(m=> (
          <div key={m.id} className="mb-2"><strong className="text-sm">{m.author}</strong>: <span className="text-sm text-muted-foreground">{m.text}</span></div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 rounded-md px-3 py-2 border border-border/50" placeholder="Message" />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}
