"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Priority = "Low" | "Medium" | "High";
type Status = "Todo" | "Done";

interface Task {
  id: string;
  user_id: string;
  title: string;
  assigned_member_id: string | null;
  priority: Priority;
  status: Status;
  created_at: string;
}

interface TaskWithMember extends Task {
  member_name: string | null;
  member_capacity: number | null;
}

interface CreateTaskParams {
  title: string;
  memberId: string | null;
  priority: Priority;
  status: Status;
}

interface UpdateTaskParams {
  title?: string;
  assigned_member_id?: string | null;
  priority?: Priority;
  status?: Status;
}

export async function createTask(params: CreateTaskParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: params.title,
        assigned_member_id: params.memberId,
        priority: params.priority,
        status: params.status,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export async function getTasks() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        member:members!assigned_member_id (
          name,
          capacity
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Transform the data to flatten member info
    const tasksWithMember: TaskWithMember[] = (data || []).map((task: any) => ({
      ...task,
      member_name: task.member?.name || null,
      member_capacity: task.member?.capacity || null,
      member: undefined, // Remove nested object
    }));

    return { success: true, data: tasksWithMember };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    };
  }
}

export async function updateTask(id: string, updates: UpdateTaskParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

export async function deleteTask(id: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

export async function autoAssignTask() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all members
    const { data: allMembers, error: fetchError } = await supabase
      .from("members")
      .select("id, name, capacity")
      .eq("user_id", user.id);

    if (fetchError || !allMembers || allMembers.length === 0) {
      return { success: false, error: "No members available" };
    }

    // Calculate workload for each member
    const membersWithWorkload = await Promise.all(
      allMembers.map(async (member) => {
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("assigned_member_id", member.id)
          .eq("status", "Todo");

        return {
          ...member,
          workload: count || 0,
        };
      })
    );

    // Sort by workload (ascending) and return the first one
    membersWithWorkload.sort((a, b) => a.workload - b.workload);
    const leastLoadedMember = membersWithWorkload[0];

    if (!leastLoadedMember) {
      return { success: false, error: "No members available" };
    }

    return {
      success: true,
      data: {
        id: leastLoadedMember.id,
        name: leastLoadedMember.name,
        capacity: leastLoadedMember.capacity,
        workload: leastLoadedMember.workload,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to auto-assign task",
    };
  }
}

export async function reassignTasks() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Step 1: Get all members with workload
    const { data: allMembers, error: fetchError } = await supabase
      .from("members")
      .select("id, name, capacity")
      .eq("user_id", user.id);

    if (fetchError || !allMembers || allMembers.length === 0) {
      return { success: false, error: "No members available" };
    }

    // Calculate workload for each member
    const membersWithWorkload = await Promise.all(
      allMembers.map(async (member) => {
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("assigned_member_id", member.id)
          .eq("status", "Todo");

        return {
          id: member.id,
          name: member.name,
          capacity: member.capacity,
          workload: count || 0,
        };
      })
    );

    // Step 2: Identify overloaded members (workload > capacity)
    const overloaded = membersWithWorkload.filter(
      (m) => m.workload > m.capacity
    );

    // Step 3: Identify available members (workload < capacity)
    const available = membersWithWorkload
      .filter((m) => m.workload < m.capacity)
      .sort((a, b) => a.workload - b.workload);

    if (overloaded.length === 0) {
      return { success: true, data: { reassignedCount: 0 } };
    }

    if (available.length === 0) {
      return {
        success: false,
        error: "No available members to reassign tasks to",
      };
    }

    let reassignedCount = 0;

    // Step 4: For each overloaded member, reassign tasks
    for (const overloadedMember of overloaded) {
      // Get Low/Medium priority Todo tasks for this member
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, priority")
        .eq("assigned_member_id", overloadedMember.id)
        .eq("status", "Todo")
        .in("priority", ["Low", "Medium"])
        .order("priority", { ascending: true }); // Low priority first

      if (tasksError || !tasks) continue;

      // Calculate how many tasks need to be moved
      const excessCount = overloadedMember.workload - overloadedMember.capacity;
      const tasksToMove = tasks.slice(0, excessCount);

      // Move tasks to available members
      for (const task of tasksToMove) {
        // Find an available member with capacity
        const targetMember = available.find((m) => m.workload < m.capacity);

        if (!targetMember) break; // No more available members

        // Update task assignment
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ assigned_member_id: targetMember.id })
          .eq("id", task.id)
          .eq("user_id", user.id);

        if (!updateError) {
          targetMember.workload++;
          reassignedCount++;
        }
      }
    }

    revalidatePath("/");
    return { success: true, data: { reassignedCount } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reassign tasks",
    };
  }
}
