import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, description, latitude, longitude, user_id, rescue_requirements, priority, summary, risk_level, required_volunteers, required_skills, required_resources, estimated_people, image_url, is_verified, is_fake, confidence } = body;

    console.log('[API] Creating request for user:', user_id);

    // Validate required fields
    if (!category || !description || latitude === undefined || longitude === undefined || !user_id) {
      console.error('[API] Validation failed: Missing fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          category,
          description,
          latitude,
          longitude,
          user_id,
          rescue_requirements,
          priority: priority || 'Medium',
          summary: summary || description.substring(0, 100),
          risk_level: risk_level || 'Low',
          required_volunteers: required_volunteers || 4,
          required_skills: required_skills || [],
          required_resources: required_resources || [],
          estimated_people: estimated_people || 1,
          image_url: image_url || null,
          is_verified: is_verified || false,
          is_fake: is_fake || false,
          confidence: confidence || 1.0,
          volunteer_count: 0,
          status: 'waiting'
        },
      ])
      .select();

    if (error) {
      console.error('[API] Supabase Insert Error:', error.message, error.details);
      return NextResponse.json({ success: false, error: `Database error: ${error.message}` }, { status: 400 });
    }

    console.log('[API] Request created successfully:', data[0].id);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Internal Crash:', error.message);
    return NextResponse.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Missing id or action' }, { status: 400 });
    }

    let updateData = {};
    
    if (action === 'volunteer') {
      // Get current count to check limit
      const { data: current } = await supabase.from('requests').select('volunteer_count, required_volunteers, status').eq('id', id).single();
      if (current && current.volunteer_count >= (current.required_volunteers || 4)) {
        return NextResponse.json({ success: false, error: 'Volunteer limit reached' }, { status: 400 });
      }
      
      const newCount = (current?.volunteer_count || 0) + 1;
      const reqVols = current?.required_volunteers || 4;
      
      let newStatus = current?.status;
      if (newCount >= reqVols) {
        newStatus = 'in_progress';
      } else if (newCount > 0 && current?.status === 'waiting') {
        newStatus = 'assigned';
      }

      const { data: updated, error: updateError } = await supabase
        .from('requests')
        .update({ volunteer_count: newCount, status: newStatus })
        .eq('id', id)
        .select();
      
      if (updateError) throw updateError;
      return NextResponse.json({ success: true, data: updated[0] });
    }

    if (action === 'complete') {
      const { data, error } = await supabase
        .from('requests')
        .update({ status: 'completed' })
        .eq('id', id)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, data: data[0] });
    }

    if (action === 'fulfill_resource') {
      const { item, user_id, user_name } = body;
      const { data: current } = await supabase.from('requests').select('fulfilled_resources').eq('id', id).single();
      
      const fulfilled = current?.fulfilled_resources || [];
      if (fulfilled.some((r: any) => r.item === item)) {
         return NextResponse.json({ success: false, error: 'Resource already fulfilled' }, { status: 400 });
      }

      fulfilled.push({ item, user_id, user_name });

      const { data, error } = await supabase
        .from('requests')
        .update({ fulfilled_resources: fulfilled })
        .eq('id', id)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, data: data[0] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
