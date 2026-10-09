import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfmoluhhmzblnzlnefqw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW9sdWhobXpibG56bG5lZnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA2MzksImV4cCI6MjEwNTkyNjYzOX0.h24L0N_tzbouCl6NR3yw0ljvxr-vIF8GscpeLTl3fqc';

const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("pedidos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const nuevoPedido = await request.json();

    const { data, error } = await supabaseServer
      .from("pedidos")
      .insert([nuevoPedido])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, estado, escaneado_por, tiempo_inicio, duracion_segundos } = await request.json();

    const { error } = await supabaseServer
      .from("pedidos")
      .update({
        estado,
        escaneado_por,
        tiempo_inicio,
        duracion_segundos
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}