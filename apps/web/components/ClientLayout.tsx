"use client";

import type { Session } from "next-auth";
import { useEffect, useRef, useState } from "react";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import type { AppMenu } from "@/types/module";
import { AppSidebar } from "./AppSidebar";

interface ClientLayoutProps {
  session: Session | null;
  userPermissions?: string[];
  language?: string;
  accessibleMenus?: AppMenu[];
  groupedMenus?: Record<string, AppMenu[]>;
  menuGroups?: Array<{
    id: string;
    name: string;
    nameJa: string;
    color?: string;
  }>;
  mustChangePassword?: boolean;
  children: React.ReactNode;
}

function ResizeHandle() {
  const { width, setWidth, isModalOpen } = useSidebarStore();
  const { open } = useSidebar();
  const isResizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      setWidth(e.clientX);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  if (!open || isModalOpen) return null;

  return (
    <div
      className="group/resize fixed top-0 w-3 h-full cursor-col-resize z-10"
      style={{ left: `${width - 6}px` }}
      title="Drag to resize"
      onMouseDown={handleMouseDown}
    >
      <div
        className={`w-0.5 h-full mx-auto bg-primary transition-opacity duration-200 ${
          isResizing ? "opacity-100" : "opacity-0 group-hover/resize:opacity-100"
        }`}
      />
    </div>
  );
}

export function ClientLayout({
  session,
  language = "en",
  accessibleMenus = [],
  groupedMenus = {},
  menuGroups = [],
  mustChangePassword = false,
  children,
}: ClientLayoutProps) {
  if (!session) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar
        session={session}
        accessibleMenus={accessibleMenus}
        groupedMenus={groupedMenus}
        menuGroups={menuGroups}
        language={language}
        mustChangePassword={mustChangePassword}
      />
      <ResizeHandle />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
