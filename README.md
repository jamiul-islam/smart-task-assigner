# Smart Task Manager

A web application for intelligent task management with automated workload balancing.

## Features

- Magic link authentication
- Team member management with capacity tracking (0-5 tasks)
- Task creation with priority levels and status tracking
- Smart auto-assignment to balance workload
- Automated task reassignment for overloaded members
- Real-time workload indicators with color coding
- Responsive dashboard with statistics

## Tech Stack
m
- Next.js 16 with App Router
- TypeScript
- Supabase (Auth + Database)
- Shadcn UI + Tailwind CSS
- Bun runtime

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run database migrations:
```bash
bunx supabase db push
```

4. Start development server:
```bash
bun run dev
```

## Usage

1. Navigate to `/login` and enter your email
2. Click the magic link sent to your email
3. Add team members with their task capacity
4. Create and assign tasks
5. Use "Auto-assign" for smart task distribution
6. Click "Reassign Tasks" to automatically balance workload

## License

MIT
