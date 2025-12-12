
import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const search = searchParams.get("search");
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Query Builder
  let query = supabase
    .from("cash_flows")
    .select(
      "*, cash_flow_categories!inner(*)",
      { count: "exact" }
    );

  // Apply Filters
  if (type && type !== "all") {
    query = query.eq("cash_flow_categories.type", type as any);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }

  if (search) {
    query = query.ilike("description", `%${search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("date", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Summary Calculation (Separate Query for Aggregation) ---
  // Note: Supabase doesn't support aggregate functions well in standard SDK without .rpc or distinct query.
  // We'll run a separate query to sum based on effectively the same filters (minus pagination).
  
  let summaryQuery = supabase
    .from("cash_flows")
    .select("amount, cash_flow_categories!inner(type)");

  // Re-apply filters for summary (copy-paste logic, ideally refactored but okay for route handler)
  if (type && type !== "all") {
    summaryQuery = summaryQuery.eq("cash_flow_categories.type", type as any);
  }
  if (categoryId) summaryQuery = summaryQuery.eq("category_id", categoryId);
  if (startDate) summaryQuery = summaryQuery.gte("date", startDate);
  if (endDate) summaryQuery = summaryQuery.lte("date", endDate);
  if (search) summaryQuery = summaryQuery.ilike("description", `%${search}%`);

  const { data: summaryData, error: summaryError } = await summaryQuery;

  let total_in = 0;
  let total_out = 0;

  if (!summaryError && summaryData) {
    summaryData.forEach((row: any) => {
        const amt = Number(row.amount);
        if (row.cash_flow_categories?.type === 'in') {
            total_in += amt;
        } else if (row.cash_flow_categories?.type === 'out') {
            total_out += amt;
        }
    });
  }

  return NextResponse.json({
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        total: count || 0,
      },
      summary: {
        total_in,
        total_out,
      }
    },
  });
}

export async function POST(request: NextRequest) {
    const supabase = await createServerClient();
    const body = await request.json();
    
    // Add validation if needed, but client usually sends valid data or DB constrained.
    // For now simple insert.
    // Assuming body matches the schema mostly.
    
    // We need to inject created_by from session.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('cash_flows')
        .insert({
            ...body,
            created_by: user.id
        })
        .select()
        .single();
    
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}
