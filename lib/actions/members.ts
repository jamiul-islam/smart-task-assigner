'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface Member {
  id: string;
  user_id: string;
  name: string;
  capacity: number;
  created_at: string | null;
}

export interface MemberWithWorkload extends Member {
  workload: number;
}

export async function createMember(
  name: string,
  capacity: number
): Promise<Result<Member>> {
  try {
    // Validate capacity
    if (capacity < 0 || capacity > 5) {
      return { success: false, error: 'Capacity must be between 0 and 5' };
    }

    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Insert member
    const { data, error } = await supabase
      .from('members')
      .insert({
        user_id: user.id,
        name: name.trim(),
        capacity
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Failed to create member' };
  }
}

export async function getMembers(): Promise<Result<Member[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch members' };
  }
}

export async function deleteMember(id: string): Promise<Result<void>> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete member' };
  }
}

export async function getMemberWorkload(memberId: string): Promise<Result<number>> {
  try {
    const supabase = await createClient();
    
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_member_id', memberId)
      .eq('status', 'Todo');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: count || 0 };
  } catch (error) {
    return { success: false, error: 'Failed to get workload' };
  }
}

export async function getMembersWithWorkload(): Promise<Result<MemberWithWorkload[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get members with workload using a join query
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        tasks!tasks_assigned_member_id_fkey(id, status)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // Calculate workload for each member
    const membersWithWorkload: MemberWithWorkload[] = (data || []).map((member: any) => {
      const workload = member.tasks?.filter((t: any) => t.status === 'Todo').length || 0;
      const { tasks, ...memberData } = member;
      return {
        ...memberData,
        workload
      };
    });

    return { success: true, data: membersWithWorkload };
  } catch (error) {
    return { success: false, error: 'Failed to fetch members with workload' };
  }
}
