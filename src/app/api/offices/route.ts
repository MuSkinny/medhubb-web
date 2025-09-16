import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/offices - Get doctor's offices
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    // Validate required parameters
    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID richiesto" }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== doctorId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    console.log('Fetching offices for doctor:', doctorId);

    // Get doctor's offices with schedules
    const { data: offices, error } = await supabase
      .from('doctor_offices')
      .select(`
        id,
        name,
        address,
        city,
        postal_code,
        phone,
        email,
        notes,
        is_active,
        created_at,
        updated_at,
        doctor_office_schedules (
          id,
          day_of_week,
          start_time,
          end_time,
          slot_duration,
          is_active
        )
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching offices:', error);
      return NextResponse.json({
        error: 'Errore nel recupero degli ambulatori'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      offices: offices || [],
      count: offices?.length || 0
    });

  } catch (error) {
    console.error("Offices API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// POST /api/offices - Create new office
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, city, postal_code, phone, email, notes } = body;

    // Validate required fields
    if (!name || !address || !city) {
      return NextResponse.json({
        error: "Nome, indirizzo e città sono obbligatori"
      }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Creating office for doctor:', user.id);

    // Use secure function to create office
    const { data, error } = await supabase.rpc('manage_doctor_office', {
      p_name: name,
      p_address: address,
      p_city: city,
      p_office_id: null, // null = create new
      p_postal_code: postal_code || null,
      p_phone: phone || null,
      p_email: email || null,
      p_notes: notes || null
    });

    if (error) {
      console.error('Error creating office:', error);
      return NextResponse.json({
        error: 'Errore nella creazione dell\'ambulatorio'
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      office_id: data.office_id
    });

  } catch (error) {
    console.error("Create office API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// PUT /api/offices - Update existing office
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { office_id, name, address, city, postal_code, phone, email, notes } = body;

    // Validate required fields
    if (!office_id || !name || !address || !city) {
      return NextResponse.json({
        error: "Office ID, nome, indirizzo e città sono obbligatori"
      }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Updating office:', office_id, 'for doctor:', user.id);

    // Use secure function to update office
    const { data, error } = await supabase.rpc('manage_doctor_office', {
      p_name: name,
      p_address: address,
      p_city: city,
      p_office_id: office_id, // existing office ID
      p_postal_code: postal_code || null,
      p_phone: phone || null,
      p_email: email || null,
      p_notes: notes || null
    });

    if (error) {
      console.error('Error updating office:', error);
      return NextResponse.json({
        error: 'Errore nell\'aggiornamento dell\'ambulatorio'
      }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        error: data.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: data.message
    });

  } catch (error) {
    console.error("Update office API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// DELETE /api/offices - Deactivate office
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const officeId = searchParams.get('officeId');

    // Validate required parameters
    if (!officeId) {
      return NextResponse.json({ error: "Office ID richiesto" }, { status: 400 });
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    console.log('Deactivating office:', officeId, 'for doctor:', user.id);

    // Soft delete by setting is_active = false
    const { error } = await supabase
      .from('doctor_offices')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', officeId)
      .eq('doctor_id', user.id); // Ensure ownership

    if (error) {
      console.error('Error deactivating office:', error);
      return NextResponse.json({
        error: 'Errore nella disattivazione dell\'ambulatorio'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ambulatorio disattivato con successo'
    });

  } catch (error) {
    console.error("Delete office API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}