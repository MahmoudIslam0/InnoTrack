"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Compass, Users, Activity, Layers, Loader2 } from "lucide-react";

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GlowingSpinner({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6 dashboard-surface bg-transparent shadow-none border-none">
      <div className="relative flex items-center justify-center w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary/50 dark:border-primary/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-b-2 border-l-2 border-blue-400/50 dark:border-blue-300/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <div className="bg-primary/10 dark:bg-primary/10 p-4 rounded-full relative z-10 backdrop-blur-md">
          <Icon className="w-8 h-8 text-primary dark:text-primary" />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        className="text-muted-foreground font-medium text-sm uppercase tracking-widest"
      >
        {text}
      </motion.p>
    </div>
  );
}

export function SearchLoader({ text = "Discovering projects..." }: { text?: string }) {
  return <GlowingSpinner icon={Compass} text={text} />;
}

export function TeamLoader({ text = "Finding team data..." }: { text?: string }) {
  return <GlowingSpinner icon={Users} text={text} />;
}

export function ActionLoader({ text = "Processing..." }: { text?: string }) {
  return <GlowingSpinner icon={Activity} text={text} />;
}

export function AnimatedList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
