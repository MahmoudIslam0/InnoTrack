"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { studentApi } from "@/lib/student-api";

interface Technology {
  name: string;
  count: number;
  category: string;
}

export function TrendingTechnologies() {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    studentApi
      .getTrendingTechnologies()
      .then((items) => {
        if (ignore) return;
        setTechnologies(items.map((item) => ({ ...item, category: "Technology" })));
      })
      .catch(() => {
        if (!ignore) setTechnologies([]);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section>
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Trending Technologies
      </h3>

      <div className="bg-card text-card-foreground rounded-xl p-6 border border-border shadow-sm">
        <div className="flex flex-wrap gap-3">
          {isLoading && ["w-24", "w-32", "w-20", "w-28", "w-36", "w-24"].map((width, idx) => (
            <div key={idx} className={`h-10 ${width} animate-pulse rounded-xl bg-muted/60`} />
          ))}
          {!isLoading && technologies.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-2 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl transition-all duration-300"
            >
              <span className="font-medium text-foreground transition-colors">
                {tech.name}
              </span>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary dark:text-primary text-xs border-transparent"
              >
                {tech.count}
              </Badge>
            </div>
          ))}
          {!isLoading && technologies.length === 0 && (
            <p className="text-sm text-muted-foreground">No trending technologies available yet.</p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pro Tip:</span> These
            technologies are currently being used by the highest number of
            approved graduation projects.
          </p>
        </div>
      </div>
    </section>
  );
}
