import { DataTable as UsersTable } from '@/components/shared/DataTable';
import { userColumns } from '@/app/dashboard/users/columns';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  // TODO: Fetch users data from supabase
  const users = [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/** Users Table */}
          <div className="px-4 lg:px-6">
            <UsersTable
              data={users}
              columns={userColumns}
              filterColumnId="name"
              pageSize={20}
              toolbarChildren={<Button size="sm">Add user</Button>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
