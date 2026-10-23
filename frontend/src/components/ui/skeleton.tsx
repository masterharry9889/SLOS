import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
}

export function Skeleton({
  className,
  variant = "rectangular",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full rounded",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-md",
    card: "h-48 w-full rounded-xl border border-border p-4",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-muted/70 dark:bg-muted/40",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
