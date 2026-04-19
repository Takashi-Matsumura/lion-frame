"use client";

import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface SidebarUserSectionProps {
  session: Session;
  language: string;
  mustChangePassword: boolean;
}

const isGuest = (session: Session) => session.user.role === "GUEST";

export function SidebarUserSection({
  session,
  language,
  mustChangePassword,
}: SidebarUserSectionProps) {
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const handleSignOut = useCallback(() => {
    setSigningOut(true);
    signOut({ redirectTo: "/login" });
  }, []);

  return (
    <>
    {signingOut && (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">
          {t("Signing out...", "サインアウト中...")}
        </p>
      </div>
    )}
    <SidebarFooter className="p-2 border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent"
              >
                <Avatar className="size-8">
                  <AvatarImage src={session.user.image || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {session.user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              side="right"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="flex items-center gap-3 p-2">
                <Avatar className="size-10">
                  <AvatarImage src={session.user.image || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {session.user.name}
                  </span>
                  <RoleBadge role={session.user.role} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href={isGuest(session) ? "/guest-profile" : "/profile"} className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    {t("Profile", "プロフィール")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  {theme === "dark"
                    ? t("Light Mode", "ライトモード")
                    : t("Dark Mode", "ダークモード")}
                </DropdownMenuItem>
                {!isGuest(session) && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer relative">
                      <Settings className="mr-2 size-4" />
                      {t("Settings", "設定")}
                      {mustChangePassword && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 size-2 bg-destructive rounded-full" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 size-4" />
                {t("Sign Out", "サインアウト")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    </>
  );
}
