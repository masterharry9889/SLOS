"use client";

import React, { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface SortableItemContextValue {
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
}

export const SortableItemContext = createContext<SortableItemContextValue | null>(null);

export function useSortableHandle() {
  const context = useContext(SortableItemContext);
  if (!context) {
    throw new Error("useSortableHandle must be used within a SortableItem");
  }
  return context;
}

export interface SortableItemProps {
  id: string;
  data?: Record<string, any>;
  children: React.ReactNode | ((context: SortableItemContextValue) => React.ReactNode);
  className?: string;
  disabled?: boolean;
}

export function SortableItem({
  id,
  data,
  children,
  className,
  disabled = false,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const contextValue: SortableItemContextValue = {
    attributes,
    listeners,
    setActivatorNodeRef,
    isDragging,
  };

  return (
    <SortableItemContext.Provider value={contextValue}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative transition-[transform,shadow,opacity]",
          isDragging && "opacity-40 z-30 pointer-events-none scale-[0.99]",
          className
        )}
      >
        {typeof children === "function" ? children(contextValue) : children}
      </div>
    </SortableItemContext.Provider>
  );
}

export interface SortableHandleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export function SortableHandle({
  children,
  className,
  ...props
}: SortableHandleProps) {
  const { attributes, listeners, setActivatorNodeRef } = useSortableHandle();

  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className={cn(
        "touch-none inline-flex items-center justify-center p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/80 cursor-grab active:cursor-grabbing transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
