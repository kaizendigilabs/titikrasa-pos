'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconDotsVertical, IconLogout } from '@tabler/icons-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { getInitials } from '@/lib/utils/get-initials';
import Link from 'next/link';

export default function NavUser({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string;
  };
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isLogoutPending, startLogoutTransition] = React.useTransition();

  const handleLogout = React.useCallback(() => {
    startLogoutTransition(async () => {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
        });
        const payload = await response.json();

        if (!response.ok || payload.error) {
          const message =
            payload.error?.message ?? 'Failed to sign out. Please try again.';
          toast.error(message);
          return;
        }

        toast.success('Signed out');
        router.replace('/login');
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred while logging out.';
        toast.error(message);
      }
    });
  }, [router]);

  return (
    <SidebarMenu suppressHydrationWarning>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <Link href={`/dashboard/users/${user.id}`} className="flex items-center gap-2 px-1 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground rounded-t-lg">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLogoutPending}
              className="gap-2"
            >
              <IconLogout className="size-4" />
              {isLogoutPending ? 'Logging out...' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
