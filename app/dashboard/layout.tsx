import React from 'react';
import { AppSidebar } from '@/components/navigation/AppSidebar';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Fetch user profile data from supabase
  const profile = {};

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 60)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
      defaultOpen={true}
    >
      <AppSidebar variant="inset" user={profile} />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
