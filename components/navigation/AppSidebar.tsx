"use client";

import * as React from "react";
import { IconCoffee } from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import NavMenu from "../navigation/NavMenu";
import NavUser from "../navigation/NavUser";
import Link from "next/link";
import { STORE_NAME } from "@/lib/constants/app";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu suppressHydrationWarning>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <IconCoffee className="size-5!" />
                <span className="text-base font-semibold">{STORE_NAME}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMenu />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
