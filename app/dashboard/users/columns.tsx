import { ColumnDef } from "@tanstack/react-table";
import { DataTableHelpers, RowActions } from "@/components/shared/DataTable";

// TODO: Define Columns according to data model

type User = { id: string; name: string; email: string; role: string, status: string };

export const userColumns: ColumnDef<User>[] = [
  DataTableHelpers.selection<User>(),
  { accessorKey: "name",  header: DataTableHelpers.sortableHeader("Name") },
  { accessorKey: "email", header: DataTableHelpers.sortableHeader("Email") },
  { accessorKey: "role", header: DataTableHelpers.sortableHeader("Role") },
  { accessorKey: "status", header: DataTableHelpers.sortableHeader("Status") },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <RowActions
        onView={() => console.log("view", row.original)}
        onEdit={() => console.log("edit", row.original)}
        onDelete={() => console.log("delete", row.original)}
      />
    ),
  },
];
