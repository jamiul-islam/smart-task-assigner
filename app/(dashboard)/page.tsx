import { getCurrentUser, signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { DashboardStats } from '@/components/dashboard-stats'
import { MembersSection } from '@/components/members-section'
import { TasksSection } from '@/components/tasks-section'

export default async function DashboardPage() {
  const result = await getCurrentUser()

  if (!result.success || !result.data) {
    redirect('/login')
  }

  const user = result.data

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Smart Task Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Logged in as: {user.email}
            </p>
          </div>
          <form action={signOut}>
            <Button variant="outline">Sign Out</Button>
          </form>
        </div>

        <div className="space-y-6">
          <DashboardStats />
          <MembersSection />
          <TasksSection />
        </div>
      </div>
    </div>
  )
}
