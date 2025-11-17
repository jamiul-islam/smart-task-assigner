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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createMember,
  deleteMember,
  getMembersWithWorkload,
  type MemberWithWorkload,
} from '@/lib/actions/members';
import { reassignTasks } from '@/lib/actions/tasks';
import { toast } from 'sonner';

export function MembersSection() {
  const [members, setMembers] = useState<MemberWithWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    const result = await getMembersWithWorkload();
    if (result.success) {
      setMembers(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const capacityNum = parseInt(capacity);
    const result = await createMember(name, capacityNum);

    if (result.success) {
      toast.success('Member added successfully');
      setDialogOpen(false);
      setName('');
      setCapacity('3');
      loadMembers();
    } else {
      toast.error(result.error);
    }

    setSubmitting(false);
  };

  const handleDeleteMember = async (id: string, memberName: string) => {
    const result = await deleteMember(id);

    if (result.success) {
      toast.success(`${memberName} deleted successfully`);
      loadMembers();
    } else {
      toast.error(result.error);
    }
  };

  const getWorkloadColor = (workload: number, capacity: number) => {
    if (workload < capacity) return 'default'; // green
    if (workload === capacity) return 'secondary'; // yellow
    return 'destructive'; // red
  };

  const getWorkloadBadgeVariant = (workload: number, capacity: number) => {
    if (workload < capacity) return 'default';
    if (workload === capacity) return 'secondary';
    return 'destructive';
  };

  const handleReassignTasks = async () => {
    setReassigning(true);
    const result = await reassignTasks();

    if (result.success && result.data) {
      const count = result.data.reassignedCount;
      if (count === 0) {
        toast.info('No tasks needed reassignment');
      } else {
        toast.success(`Reassigned ${count} task${count === 1 ? '' : 's'}`);
      }
      loadMembers();
    } else {
      toast.error(result.error || 'Failed to reassign tasks');
    }

    setReassigning(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <Skeleton className="h-9 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Team Members</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReassignTasks}
              disabled={reassigning || members.length === 0}
            >
              {reassigning ? 'Reassigning...' : 'Reassign Tasks'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add Member</Button>
              </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddMember}>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Add a new team member with their task capacity (0-5).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter member name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity (0-5)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="0"
                      max="5"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members yet. Add your first member to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{member.name}</span>
                  <Badge variant={getWorkloadBadgeVariant(member.workload, member.capacity)}>
                    {member.workload}/{member.capacity}
                  </Badge>
                </div>
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
                        This will permanently delete {member.name} and unassign all their tasks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteMember(member.id, member.name)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
