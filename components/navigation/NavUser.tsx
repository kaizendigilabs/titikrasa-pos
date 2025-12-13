'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconLogout } from '@tabler/icons-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { getInitials } from '@/lib/utils/get-initials';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-12 px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg grayscale">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="rounded-lg"
        side={isMobile ? 'bottom' : 'bottom'}
        align="end"
        sideOffset={4}
      >
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
  );
}
