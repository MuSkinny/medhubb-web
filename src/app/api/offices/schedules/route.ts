import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// GET /api/offices/schedules - Get office schedules
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const officeId = searchParams.get('officeId');
    const doctorId = searchParams.get('doctorId');

    // Validate required parameters
    if (!officeId && !doctorId) {
      return NextResponse.json({ error: "Office ID o Doctor ID richiesto" }, { status: 400 });
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

    console.log('Fetching schedules for office:', officeId, 'doctor:', doctorId);

    // Build query based on provided parameters
    let query = supabase
      .from('doctor_office_schedules')
      .select(`
        id,
        office_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration,
        is_active,
        doctor_offices (
          id,
          name,
          address,
          city
        )
      `)
      .eq('is_active', true)
      .order('day_of_week');

    if (officeId) {
      query = query.eq('office_id', officeId);
    }

    if (doctorId) {
      // Ensure user can only access their own schedules
      if (user.id !== doctorId) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
      }
      query = query.eq('doctor_id', doctorId);
    } else {
      // If no doctorId specified, use authenticated user
      query = query.eq('doctor_id', user.id);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({
        error: 'Errore nel recupero degli orari'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedules: schedules || [],
      count: schedules?.length || 0
    });

  } catch (error) {
    console.error("Office schedules API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// POST /api/offices/schedules - Create or update office schedule
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { office_id, day_of_week, start_time, end_time, slot_duration } = body;

    // Validate required fields
    if (!office_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json({
        error: "Office ID, giorno della settimana, orario inizio e fine sono obbligatori"
      }, { status: 400 });
    }

    // Validate day_of_week range
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({
        error: "Giorno della settimana deve essere tra 0 (Domenica) e 6 (Sabato)"
      }, { status: 400 });
    }

    // Validate slot_duration
    const duration = slot_duration || 30;
    if (duration < 15 || duration > 120) {
      return NextResponse.json({
        error: "Durata slot deve essere tra 15 e 120 minuti"
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

    console.log('Setting schedule for office:', office_id, 'day:', day_of_week);

    // Use secure function to set schedule
    const { data, error } = await supabase.rpc('set_office_schedule', {
      p_office_id: office_id,
      p_day_of_week: day_of_week,
      p_start_time: start_time,
      p_end_time: end_time,
      p_slot_duration: duration
    });

    if (error) {
      console.error('Error setting office schedule:', error);
      return NextResponse.json({
        error: 'Errore nell\'impostazione degli orari'
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
    console.error("Set schedule API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

// DELETE /api/offices/schedules - Remove office schedule for a day
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const officeId = searchParams.get('officeId');
    const dayOfWeek = searchParams.get('dayOfWeek');

    // Validate required parameters
    if (!officeId || dayOfWeek === null) {
      return NextResponse.json({ error: "Office ID e giorno della settimana sono richiesti" }, { status: 400 });
    }

    const day = parseInt(dayOfWeek);
    if (day < 0 || day > 6) {
      return NextResponse.json({
        error: "Giorno della settimana deve essere tra 0 e 6"
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

    console.log('Removing schedule for office:', officeId, 'day:', day);

    // Soft delete by setting is_active = false
    const { error } = await supabase
      .from('doctor_office_schedules')
      .update({ is_active: false })
      .eq('office_id', officeId)
      .eq('doctor_id', user.id) // Ensure ownership
      .eq('day_of_week', day);

    if (error) {
      console.error('Error removing schedule:', error);
      return NextResponse.json({
        error: 'Errore nella rimozione dell\'orario'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Orario rimosso con successo'
    });

  } catch (error) {
    console.error("Remove schedule API error:", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}