import React from "react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/navigation/AppSidebar";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createServerClient } from "@/lib/supabase/server";
import { UserProfileProvider } from "@/lib/hooks/use-user-profile";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, avatar, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const sidebarUser = {
    id: user.id,
    name: profile?.name ?? user.email ?? "User",
    email: profile?.email ?? user.email ?? "",
    phone: profile?.phone ?? null,
    avatar: profile?.avatar ?? undefined,
  };

  return (
    <UserProfileProvider
      value={{
        userId: user.id,
        displayName: sidebarUser.name,
        email: sidebarUser.email,
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 60)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
        defaultOpen
      >
        <AppSidebar variant="inset" user={sidebarUser} />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </UserProfileProvider>
  );
}
