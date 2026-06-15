"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Timer } from "lucide-react";

export default function JoinCodeWidget({ teamId }:{ teamId?:string }){
  const [code, setCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let t:any;
    if (countdown > 0) {
      t = setTimeout(()=> setCountdown(countdown-1), 1000);
    } else if (countdown === 0 && code) {
      setCode(null);
    }
    return ()=> clearTimeout(t);
  }, [countdown, code]);

  const generate = () => {
    const c = Math.floor(100000 + Math.random()*900000).toString();
    setCode(c);
    setCountdown(60*10); // 10 minutes
  };

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    // small visual feedback could be added
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border/50">
      <h4 className="font-semibold mb-2">Join Code</h4>
      {code ? (
        <div className="flex items-center justify-between gap-2">
          <div className="font-bold tracking-widest text-xl">{code}</div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground flex items-center gap-1"><Timer className="w-4 h-4" /> {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</div>
            <Button size="sm" onClick={copy}><Copy className="w-4 h-4" /></Button>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={generate}>Generate Code</Button>
      )}
    </div>
  );
}
