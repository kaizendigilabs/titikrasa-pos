
import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { id } = await params;

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    // Check if it's a system category (optional safety check, but RLS/logic should handle it too)
    // For now, simple delete. DB constraint should prevent if used? 
    // Usually we want soft delete or check usage. But for MVP, hard delete is requested implicitly.
    // However, we must ensure IS_SYSTEM is not deleted.
    
    // Safety check first
  const { data: category } = await supabase.from('cash_flow_categories').select('is_system').eq('id', id).single();
  if (category?.is_system) {
      return NextResponse.json({ error: "Cannot delete system category" }, { status: 400 });
  }

  const { error } = await supabase
    .from("cash_flow_categories")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
