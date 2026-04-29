import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    // Fetch top 5 volunteers from the profiles table
    // TODO: Later upgrade this logic to fetch the *nearest* volunteers based on location coordinates.
    const { data: volunteers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'volunteer')
      .limit(5);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, volunteers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
