import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("Test Approve - Starting");

    const body = await req.json();
    console.log("Test Approve - Body:", body);

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    // Simula successo senza toccare il database
    console.log("Test Approve - Would approve doctor ID:", id);

    return NextResponse.json({
      success: true,
      message: "Test approve completed",
      doctorId: id
    });

  } catch (error) {
    console.error("Test Approve - Error:", error);
    return NextResponse.json(
      { error: "Errore nel test", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}