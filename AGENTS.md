<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - Pichangas App

## Build/Lint/Test Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Linting
```bash
npm run lint         # Run ESLint
```

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth/DB**: Supabase (@supabase/supabase-js, @supabase/ssr)
- **Icons**: Lucide React

## Code Style Guidelines

### File Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── login/        # Login page
│   ├── dashboard/    # Main dashboard
│   ├── partido/     # Match pages (nuevo, [id])
│   └── mis-estadisticas/
├── components/       # Reusable React components
├── lib/              # Utilities (supabase client)
└── types/            # TypeScript interfaces
```

### Naming Conventions
- **Components**: PascalCase (e.g., `AuthProvider.tsx`)
- **Files**: kebab-case (e.g., `supabase.ts`)
- **Interfaces**: PascalCase (e.g., `Profile`, `Partido`)

### Imports
```typescript
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { Profile, Partido } from '@/types';
```

### Components
- Use `'use client'` directive for client-side components
- Prefer functional components with hooks

### UI/UX
- Responsive design with Tailwind (mobile-first)
- Use green color scheme (green-500 to green-700 for primary actions)
- Loading states with spinner animations

### Routes
- `/` - Redirects to /login
- `/login` - Login with Google OAuth
- `/dashboard` - Main dashboard (protected)
- `/partido/nuevo` - Create new match
- `/partido/[id]` - Match details
- `/mis-estadisticas` - User statistics