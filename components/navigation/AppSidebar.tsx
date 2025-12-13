"use client";

import * as React from "react";
import { IconCoffee } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";

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
import { STORE_NAME } from "@/lib/constants/app";
import { useSettings } from "@/features/settings/hooks";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { data: settings, isLoading } = useSettings();
  
  const storeName = settings?.storeProfile?.name || STORE_NAME;
  const logoUrl = settings?.storeProfile?.logoUrl;

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
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={storeName}
                        width={20}
                        height={20}
                        unoptimized
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <IconCoffee className="size-5!" />
                    )}
                    <span className="text-base font-semibold">{storeName}</span>
                  </>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMenu />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
