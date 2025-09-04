// src/app/api/weekly-assignments/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { type TablesInsert } from '@/types/supabase';

type AssignmentInsert = TablesInsert<'weekly_assignments'>;

// GET a specific week's assignments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get('week_start_date');

  if (!weekStartDate) {
    return NextResponse.json({ error: 'week_start_date is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 7);

  try {
    const { data, error } = await supabase
      .from('weekly_assignments')
      .select('*, weekly_assignment_assistants(worker_id)') // Fetch assistants
      .gte('assignment_date', weekStartDate)
      .lt('assignment_date', endDate.toISOString().split('T')[0])
      .order('assignment_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch assignments', details: errorMessage }, { status: 500 });
  }
}


// POST a new assignment with multiple assistants
export async function POST(request: Request) {
  try {
    const { assistant_ids, ...newAssignment } = await request.json();

    if (!newAssignment.truck_id || !newAssignment.assignment_date || newAssignment.start_hour === undefined) {
        return NextResponse.json({ error: 'Missing required fields for assignment' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Insert the main assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('weekly_assignments')
      .insert(newAssignment as AssignmentInsert)
      .select()
      .single();

    if (assignmentError) throw assignmentError;

    // 2. If there are assistants, link them in the junction table
    if (assistant_ids && assistant_ids.length > 0) {
        const assistantLinks = assistant_ids.map((worker_id: number) => ({
            assignment_id: assignmentData.id,
            worker_id: worker_id,
        }));
        const { error: assistantError } = await supabase.from('weekly_assignment_assistants').insert(assistantLinks);
        if (assistantError) throw assistantError;
    }

    // Return the created assignment
    const { data: finalData } = await supabase.from('weekly_assignments').select('*, weekly_assignment_assistants(worker_id)').eq('id', assignmentData.id).single();

    return NextResponse.json(finalData, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create assignment', details: errorMessage }, { status: 500 });
  }
}


// PUT (update) an assignment and its assistants
export async function PUT(request: Request) {
    try {
        const { assistant_ids, ...assignmentToUpdate } = await request.json();
        const { id, ...updateData } = assignmentToUpdate;

        if (!id) {
            return NextResponse.json({ error: 'Assignment ID is required for update' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Update the main assignment details
        const { data, error: updateError } = await supabase
            .from('weekly_assignments')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        if (!data) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

        // 2. Delete existing assistant links
        const { error: deleteError } = await supabase.from('weekly_assignment_assistants').delete().eq('assignment_id', id);
        if (deleteError) throw deleteError;

        // 3. Insert new assistant links if any
        if (assistant_ids && assistant_ids.length > 0) {
            const assistantLinks = assistant_ids.map((worker_id: number) => ({
                assignment_id: id,
                worker_id: worker_id,
            }));
            const { error: insertError } = await supabase.from('weekly_assignment_assistants').insert(assistantLinks);
            if (insertError) throw insertError;
        }
        
        // Return the updated assignment
        const { data: finalData } = await supabase.from('weekly_assignments').select('*, weekly_assignment_assistants(worker_id)').eq('id', id).single();

        return NextResponse.json(finalData);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: 'Failed to update assignment', details: errorMessage }, { status: 500 });
    }
}

// DELETE an assignment (no changes needed due to `ON DELETE CASCADE`)
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
        }
        
        const supabase = await createClient();
        const { error } = await supabase.from('weekly_assignments').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Assignment deleted successfully' }, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: `Failed to delete assignment: ${errorMessage}`}, { status: 500 });
    }
}