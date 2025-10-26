import { redirect } from 'next/navigation';

import { ProfileForm } from './ProfileForm';
import { requireActor } from '@/features/users/server';
import { AppError, ERR } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

type UserProfilePageProps = {
  params: { id: string };
};

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  try {
    const actor = await requireActor();
    const { id: targetId } = await params;

    const isSelf = actor.user.id === targetId;
    if (!isSelf && !actor.roles.isAdmin) {
      redirect(
        '/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource',
      );
    }

    const { data, error } = await actor.supabase
      .from('profiles')
      .select('user_id, name, email, phone, avatar')
      .eq('user_id', targetId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw ERR.NOT_FOUND;
    }

    const initialProfile = {
      name: data.name ?? actor.user.email ?? 'User',
      email: data.email ?? actor.user.email ?? '',
      phone: data.phone ?? '',
      avatar: data.avatar ?? null,
    };

    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            Update your personal information and change your password.
          </p>
        </div>
        <ProfileForm userId={targetId} initialProfile={initialProfile} />
      </div>
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      error.statusCode === ERR.FORBIDDEN.statusCode
    ) {
      redirect(
        '/dashboard?status=forbidden&message=You%20do%20not%20have%20permission%20to%20access%20this%20resource',
      );
    }

    console.error('[USER_PROFILE_PAGE_ERROR]', error);
    redirect('/dashboard');
  }
}
