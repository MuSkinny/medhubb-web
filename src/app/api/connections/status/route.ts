import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  console.log('=== CONNECTION STATUS API CALLED ===');
  try {
    console.log('Step 1: Parsing URL');
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    console.log('Patient ID from URL:', patientId);

    if (!patientId) {
      console.log('Step 1 FAILED: No patient ID');
      return NextResponse.json({ error: "Patient ID richiesto" }, { status: 400 });
    }

    console.log('Step 2: Setting up secure Supabase client');

    // Ottieni token di autenticazione dall'header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Step 2 FAILED: No authorization token');
      return NextResponse.json({ error: "Token di autorizzazione richiesto" }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verifica autenticazione e autorizzazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Step 2 FAILED: Invalid token', authError);
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }

    if (user.id !== patientId) {
      console.log('Step 2 FAILED: User not authorized for this patient');
      return NextResponse.json({ error: "Non autorizzato per questo paziente" }, { status: 403 });
    }

    console.log('Step 2 SUCCESS: Secure client created for user:', user.id);

    console.log('Step 3: Checking connection status for patient:', patientId);

    console.log('Step 3: Checking patient connections (using RLS)');

    // Usa la view sicura (RLS filtra automaticamente)
    const { data: statusData, error } = await supabase
      .from('patient_connection_status')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    console.log('Step 3 RESULT - Status query:', { statusData, error });

    // Nessun record = unconnected
    if (error && error.code === 'PGRST116') {
      console.log('No connection found - patient is unconnected');
      return NextResponse.json({
        success: true,
        status: 'unconnected',
        connection: null,
        pendingRequest: null
      });
    }

    if (error) {
      console.error('Status query error:', error);
      return NextResponse.json({
        error: 'Errore nel controllo dello status',
        debug: error
      }, { status: 500 });
    }

    // Status da view (più completo)
    if (!statusData || statusData.status === 'unconnected') {
      return NextResponse.json({
        success: true,
        status: 'unconnected',
        connection: null,
        pendingRequest: null
      });
    }

    if (statusData.status === 'connected') {
      return NextResponse.json({
        success: true,
        status: 'connected',
        connection: {
          doctorId: statusData.doctor_id,
          doctorName: `${statusData.doctor_first_name} ${statusData.doctor_last_name}`,
          doctorFirstName: statusData.doctor_first_name,
          doctorLastName: statusData.doctor_last_name,
          linkedAt: statusData.connected_at
        },
        pendingRequest: null
      });
    }

    if (statusData.status === 'pending') {
      return NextResponse.json({
        success: true,
        status: 'pending',
        connection: null,
        pendingRequest: {
          id: statusData.connection_id,
          doctorId: statusData.doctor_id,
          message: statusData.message,
          createdAt: statusData.requested_at,
          doctors: {
            first_name: statusData.doctor_first_name,
            last_name: statusData.doctor_last_name,
            specialization: ''
          }
        }
      });
    }

    console.log('Status query result:', { statusData, error });

    if (error && 'code' in error && (error as {code: string}).code !== 'PGRST116') {
      console.error('Error fetching connection:', error);
      return NextResponse.json({
        error: 'Errore nel controllo dello status'
      }, { status: 500 });
    }

    // Nessun record o status unconnected
    if (!statusData || statusData.status === 'unconnected') {
      return NextResponse.json({
        success: true,
        status: 'unconnected',
        connection: null,
        pendingRequest: null
      });
    }

    // Collegamento attivo
    if (statusData.status === 'connected') {
      return NextResponse.json({
        success: true,
        status: 'connected',
        connection: {
          doctorId: statusData.doctor_id,
          doctorName: `${statusData.doctor_first_name} ${statusData.doctor_last_name}`,
          doctorFirstName: statusData.doctor_first_name,
          doctorLastName: statusData.doctor_last_name,
          linkedAt: statusData.connected_at
        },
        pendingRequest: null
      });
    }

    // Richiesta pending
    if (statusData.status === 'pending') {
      return NextResponse.json({
        success: true,
        status: 'pending',
        connection: null,
        pendingRequest: {
          id: statusData.connection_id,
          doctorId: statusData.doctor_id,
          message: statusData.message,
          createdAt: statusData.requested_at,
          doctors: {
            first_name: statusData.doctor_first_name,
            last_name: statusData.doctor_last_name,
            specialization: ''
          }
        }
      });
    }

    // Default fallback
    return NextResponse.json({
      success: true,
      status: 'unconnected',
      connection: null,
      pendingRequest: null
    });

  } catch (error) {
    console.error("Connection status API error:", error);
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: 'Unknown error' };

    return NextResponse.json({
      error: "Errore server",
      debug: errorDetails
    }, { status: 500 });
  }
}