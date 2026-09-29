"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
  speed?: number;
}

export function Marquee({
  children,
  pauseOnHover = true,
  direction = "left",
  speed = 35,
  className,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--gap:1.5rem] [gap:var(--gap)] select-none",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 justify-around [gap:var(--gap)] min-w-full animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          direction === "right" && "[animation-direction:reverse]"
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 justify-around [gap:var(--gap)] min-w-full animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          direction === "right" && "[animation-direction:reverse]"
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
    </div>
  );
}
