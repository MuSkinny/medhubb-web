import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from "@/lib/middleware/auth";
import { withRateLimit, adminRateLimit } from "@/lib/middleware/rateLimit";

async function getPendingDoctorsHandler(): Promise<NextResponse> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("doctors")
      .select("id, email, first_name, last_name, order_number, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });

  } catch (error) {
    console.error("Get pending doctors error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// Esporta con middleware di autenticazione admin e rate limiting
export const GET = withRateLimit(
  adminRateLimit,
  withAdminAuth(getPendingDoctorsHandler)
);
