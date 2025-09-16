import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    // Verifica password dal server (sicuro)
    const adminPassword = process.env.ADMIN_MASTER_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_MASTER_PASSWORD not set in environment");
      return NextResponse.json(
        { error: "Configurazione admin non trovata" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Password non corretta" },
        { status: 401 }
      );
    }

    // Usa la password admin come token per semplicità
    const adminToken = adminPassword;

    return NextResponse.json({
      success: true,
      token: adminToken,
      expires: Date.now() + (2 * 60 * 60 * 1000), // 2 ore
      message: "Login admin effettuato con successo"
    });

  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}