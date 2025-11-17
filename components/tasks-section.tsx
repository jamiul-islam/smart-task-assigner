'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  autoAssignTask,
} from '@/lib/actions/tasks';
import { getMembersWithWorkload, type MemberWithWorkload } from '@/lib/actions/members';
import { toast } from 'sonner';

type Priority = 'Low' | 'Medium' | 'High';
type Status = 'Todo' | 'Done';

interface TaskWithMember {
  id: string;
  title: string;
  assigned_member_id: string | null;
  priority: Priority;
  status: Status;
  member_name: string | null;
  member_capacity: number | null;
}

export function TasksSection() {
  const [tasks, setTasks] = useState<TaskWithMember[]>([]);
  const [members, setMembers] = useState<MemberWithWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithMember | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<Status>('Todo');
  const [submitting, setSubmitting] = useState(false);
  const [showOverloadWarning, setShowOverloadWarning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [tasksResult, membersResult] = await Promise.all([
      getTasks(),
      getMembersWithWorkload(),
    ]);

    if (tasksResult.success && tasksResult.data) {
      setTasks(tasksResult.data);
    } else {
      toast.error(tasksResult.error || 'Failed to load tasks');
    }

    if (membersResult.success) {
      setMembers(membersResult.data);
    } else {
      toast.error(membersResult.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Check if selected member is overloaded
    if (selectedMemberId) {
      const member = members.find((m) => m.id === selectedMemberId);
      if (member && member.workload >= member.capacity) {
        setShowOverloadWarning(true);
      } else {
        setShowOverloadWarning(false);
      }
    } else {
      setShowOverloadWarning(false);
    }
  }, [selectedMemberId, members]);

  const resetForm = () => {
    setTitle('');
    setSelectedMemberId('');
    setPriority('Medium');
    setStatus('Todo');
    setEditingTask(null);
    setShowOverloadWarning(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (task: TaskWithMember) => {
    setEditingTask(task);
    setTitle(task.title);
    setSelectedMemberId(task.assigned_member_id || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDialogOpen(true);
  };

  const handleAutoAssign = async () => {
    const result = await autoAssignTask();
    if (result.success && result.data) {
      setSelectedMemberId(result.data.id);
      toast.success(`Auto-assigned to ${result.data.name}`);
    } else {
      toast.error(result.error || 'Failed to auto-assign');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingTask) {
      // Update existing task
      const result = await updateTask(editingTask.id, {
        title,
        assigned_member_id: selectedMemberId || null,
        priority,
        status,
      });

      if (result.success) {
        toast.success('Task updated successfully');
        setDialogOpen(false);
        resetForm();
        loadData();
      } else {
        toast.error(result.error);
      }
    } else {
      // Create new task
      const result = await createTask({
        title,
        memberId: selectedMemberId || null,
        priority,
        status,
      });

      if (result.success) {
        toast.success('Task created successfully');
        setDialogOpen(false);
        resetForm();
        loadData();
      } else {
        toast.error(result.error);
      }
    }

    setSubmitting(false);
  };

  const handleDeleteTask = async (id: string, taskTitle: string) => {
    const result = await deleteTask(id);

    if (result.success) {
      toast.success(`"${taskTitle}" deleted successfully`);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusToggle = async (task: TaskWithMember) => {
    const newStatus: Status = task.status === 'Todo' ? 'Done' : 'Todo';
    const result = await updateTask(task.id, { status: newStatus });

    if (result.success) {
      toast.success(`Task marked as ${newStatus}`);
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? 'Edit Task' : 'Add Task'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTask
                      ? 'Update task details below.'
                      : 'Create a new task and assign it to a team member.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="member">Assign to</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoAssign}
                      >
                        Auto-assign
                      </Button>
                    </div>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger id="member">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.workload}/{member.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showOverloadWarning && (
                      <p className="text-sm text-destructive">
                        ⚠️ Warning: This member is at or over capacity
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(val) => setPriority(val as Priority)}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(val) => setStatus(val as Status)}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? editingTask
                        ? 'Updating...'
                        : 'Creating...'
                      : editingTask
                      ? 'Update Task'
                      : 'Create Task'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Create your first task to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={task.status === 'Done'}
                    onCheckedChange={() => handleStatusToggle(task)}
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${task.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.member_name || 'Unassigned'}
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(task)}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{task.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteTask(task.id, task.title)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
