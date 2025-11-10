import { redirect } from 'next/navigation';

import { UsersTable } from './data-table';
import {
  ensureAdminOrManager,
  getUsersTableBootstrap,
  requireActor,
} from '@/features/users/server';
import { AppError, ERR } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export default async function UsersPage() {
  let actor: Awaited<ReturnType<typeof requireActor>> | null = null;
  let bootstrap: Awaited<ReturnType<typeof getUsersTableBootstrap>> | null =
    null;

  try {
    actor = await requireActor();
    ensureAdminOrManager(actor.roles);
    bootstrap = await getUsersTableBootstrap(actor, { pageSize: PAGE_SIZE });
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        '/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource'
      );
    }
    console.error('[USERS_PAGE_ERROR]', error);
    redirect('/dashboard');
  }

  if (!actor || !bootstrap) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage Users & Permissions
        </p>
      </div>
      <UsersTable
        initialUsers={bootstrap.initialUsers}
        initialMeta={bootstrap.initialMeta}
        initialRoles={bootstrap.initialRoles}
        currentUserId={actor.user.id}
        canManage={actor.roles.isAdmin}
      />
    </div>
  );
}
