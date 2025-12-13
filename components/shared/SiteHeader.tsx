"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/shared/Breadcrumbs";
import { useUserProfile } from "@/lib/hooks/use-user-profile";

import NavUser from "../navigation/NavUser";

interface SiteHeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const profile = useUserProfile();

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    paths.forEach((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      let label = path
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      if (index === paths.length - 1 && profile && path === profile.userId) {
        label = profile.displayName;
      }

      breadcrumbs.push({
        label,
        href: index === paths.length - 1 ? undefined : href,
      });
    });

    return breadcrumbs;
  };

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) py-6 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) bg-background">
      <div className="flex w-full items-center gap-1 px-4 lg:px-6 lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumbs items={getBreadcrumbs()} />
        <div className="ml-auto flex items-center gap-2">
          {user && <NavUser user={user} />}
        </div>
      </div>
    </header>
  );
}
