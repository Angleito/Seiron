# Migration Guide: Vite to Next.js

## Overview

This guide outlines the complete migration process from the existing Vite-based frontend to a Next.js-based application for the Sei Portfolio AI project.

## Pre-Migration Checklist

### ✅ Backup Current Setup
- [ ] Create full backup of existing codebase
- [ ] Export current environment variables
- [ ] Document current API endpoints and routes
- [ ] Backup database schema and data
- [ ] Create rollback plan

### ✅ Environment Assessment  
- [ ] Review current Vite configuration
- [ ] Identify Vite-specific plugins and dependencies
- [ ] Map existing routes and components
- [ ] Document current build process
- [ ] Assess current deployment pipeline

## Step-by-Step Migration Process

### Phase 1: Project Structure Migration

#### 1.1 Move Frontend Files to Root
```bash
# Current Structure (Vite)
frontend/
├── src/
├── public/
├── index.html
├── vite.config.ts
└── package.json

# New Structure (Next.js)
├── app/           # App Router directory
├── components/    # Moved from frontend/components
├── hooks/         # Moved from frontend/hooks
├── lib/           # Moved from frontend/lib
├── public/        # Merged with frontend/public
└── styles/        # Moved from frontend/styles
```

#### 1.2 File Migration Commands
```bash
# Move key directories to root
mv frontend/components ./
mv frontend/hooks ./
mv frontend/lib ./
mv frontend/styles ./
mv frontend/types ./

# Merge public directories
cp -r frontend/public/* public/

# Move app-specific files
mv frontend/src/pages app/
mv frontend/src/components app/components/
```

### Phase 2: Configuration Migration

#### 2.1 Next.js Configuration
Replace `vite.config.ts` with `next.config.js`:

```javascript
// Before: vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite-specific config
})

// After: next.config.js  
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Next.js-specific config
}
module.exports = nextConfig
```

#### 2.2 Environment Variables Migration
```bash
# Vite format (VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_PRIVY_APP_ID=your_app_id

# Next.js format (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id
```

#### 2.3 Import Path Updates
```typescript
// Before: Vite with path aliases
import { Component } from '@/components/Component'

// After: Next.js (update tsconfig.json paths)
import { Component } from '@/components/Component'
// Or relative imports
import { Component } from '../components/Component'
```

### Phase 3: Component and Route Migration

#### 3.1 Page Component Migration
```typescript
// Before: Vite React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// After: Next.js App Router
// app/page.tsx
export default function HomePage() {
  return <div>Home Page</div>
}

// app/chat/page.tsx
export default function ChatPage() {
  return <div>Chat Page</div>
}
```

#### 3.2 API Routes Migration
```typescript
// Before: Vite proxy to backend
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})

// After: Next.js API routes
// app/api/chat/route.ts
export async function POST(request: Request) {
  const data = await request.json()
  // API logic here
  return Response.json({ result: data })
}
```

### Phase 4: Dependency Migration

#### 4.1 Package.json Updates
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.30",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "eslint-config-next": "14.2.30"
  }
}
```

#### 4.2 Remove Vite Dependencies
```bash
# Remove Vite-specific packages
npm uninstall vite @vitejs/plugin-react vite-tsconfig-paths

# Install Next.js dependencies  
npm install next@latest react@latest react-dom@latest
npm install -D eslint-config-next
```

### Phase 5: Build System Migration

#### 5.1 Deployment Configuration
```json
// Before: Vercel with Vite
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist"
}

// After: Vercel with Next.js
{
  "framework": "nextjs", 
  "buildCommand": "next build",
  "outputDirectory": ".next"
}
```

#### 5.2 Docker Configuration Updates
```dockerfile
# Before: Multi-stage with frontend/backend separation
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# After: Single Next.js application
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
```

## Database Migration

### Current State Assessment
```bash
# Check current database connections
grep -r "DATABASE_URL\|SUPABASE" --include="*.ts" --include="*.js" .

# Verify current schema
supabase db dump --schema-only > current_schema.sql
```

### Migration Requirements

#### No Schema Changes Required
The database schema remains the same as both Vite and Next.js applications use the same backend services:

- Supabase tables: `users`, `chat_sessions`, `messages`, `portfolios`
- Redis/KV storage for sessions and caching
- Same authentication flow with Privy

#### Connection String Updates
```typescript
// Ensure environment variables are properly prefixed
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Environment Variable Mapping

### Complete Variable Migration Map

| Vite Variable | Next.js Variable | Notes |
|---------------|------------------|-------|
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | Client-side access |
| `VITE_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side access |
| `VITE_PRIVY_APP_ID` | `NEXT_PUBLIC_PRIVY_APP_ID` | Client-side access |
| `VITE_BACKEND_URL` | `NEXT_PUBLIC_BACKEND_URL` | Client-side access |
| `VITE_ELEVENLABS_VOICE_ID` | `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | Client-side access |
| Server-side only vars | No prefix change | `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` |

### Migration Script
```bash
#!/bin/bash
# create-env-migration.sh

echo "Migrating environment variables..."

# Read current .env and convert VITE_ to NEXT_PUBLIC_
sed 's/^VITE_/NEXT_PUBLIC_/g' .env > .env.next

# Manual review required for server-side only variables
echo "Review .env.next and remove NEXT_PUBLIC_ prefix from server-side only variables"
echo "Server-side only: ELEVENLABS_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc."
```

## Testing Checklist

### ✅ Functionality Tests
- [ ] **Authentication Flow**
  - [ ] Privy wallet connection works
  - [ ] User sessions persist correctly
  - [ ] Logout functionality works
  
- [ ] **Chat Interface**  
  - [ ] Chat messages send and receive
  - [ ] Message history loads correctly
  - [ ] Real-time updates work
  - [ ] Voice features functional
  
- [ ] **Portfolio Features**
  - [ ] Portfolio data loads correctly
  - [ ] Sei network integration works
  - [ ] Transaction history displays
  - [ ] Balance calculations accurate

- [ ] **API Integration**
  - [ ] All API endpoints respond correctly
  - [ ] Error handling works properly
  - [ ] Rate limiting functions
  - [ ] Authentication middleware works

### ✅ Performance Tests
- [ ] **Page Load Times**
  - [ ] Initial page load < 3 seconds
  - [ ] Subsequent navigation < 1 second
  - [ ] Static assets load quickly
  
- [ ] **Bundle Size**
  - [ ] Main bundle < 1MB
  - [ ] Code splitting working
  - [ ] Unused code eliminated
  
- [ ] **Core Web Vitals**
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms  
  - [ ] CLS < 0.1

### ✅ Security Tests
- [ ] **Environment Variables**
  - [ ] No secrets in client bundle
  - [ ] Server-side variables protected
  - [ ] CORS properly configured
  
- [ ] **Content Security Policy**
  - [ ] CSP headers present
  - [ ] No unsafe-inline in production
  - [ ] External resources whitelisted
  
- [ ] **Authentication Security**
  - [ ] JWT tokens properly validated
  - [ ] Session handling secure
  - [ ] API routes protected

### ✅ Cross-Browser Compatibility
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest) 
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### ✅ Mobile Responsiveness
- [ ] Layout adapts to mobile screens
- [ ] Touch interactions work correctly
- [ ] Performance acceptable on mobile
- [ ] Voice features work on mobile

## Deployment Testing

### Staging Deployment
```bash
# Deploy to preview environment
vercel --target preview

# Run automated tests against preview
npm run test:e2e -- --baseUrl=https://preview-url.vercel.app
```

### Production Deployment
```bash
# Deploy to production
vercel --prod

# Post-deployment verification
curl -f https://your-app.vercel.app/api/health
npm run test:production
```

## Rollback Plan

### If Migration Fails

1. **Immediate Rollback**
   ```bash
   # Restore Vercel to previous deployment
   vercel rollback
   
   # Revert DNS if necessary
   # Update environment variables back to Vite format
   ```

2. **Code Rollback**
   ```bash
   # Revert to pre-migration commit
   git reset --hard <pre-migration-commit>
   
   # Restore frontend directory structure
   git checkout HEAD~1 -- frontend/
   ```

3. **Database Rollback**
   ```bash
   # Database schema unchanged - no rollback needed
   # Verify connections work with reverted code
   ```

## Post-Migration Cleanup

### Remove Vite Artifacts
```bash
# Remove old files
rm -rf frontend/dist
rm frontend/vite.config.ts
rm frontend/index.html

# Clean up unused dependencies
npm uninstall vite @vitejs/plugin-react
npm prune

# Update documentation
git rm frontend/README.md
git add .
git commit -m "Complete Vite to Next.js migration cleanup"
```

### Update Documentation
- [ ] Update README.md with Next.js instructions
- [ ] Update deployment documentation  
- [ ] Update development setup guide
- [ ] Archive old Vite-specific docs

## Monitoring and Validation

### Post-Migration Monitoring
```typescript
// Add monitoring to key functions
import { track } from './lib/analytics'

export default function HomePage() {
  useEffect(() => {
    track('page_migration_success', { page: 'home' })
  }, [])
  
  return <div>Home Page</div>
}
```

### Success Metrics
- [ ] Zero critical bugs in first 48 hours
- [ ] Page load times improved or maintained
- [ ] User retention unchanged
- [ ] All integrations working correctly
- [ ] Performance metrics meet targets

## Support and Troubleshooting

### Common Issues

1. **Import Resolution Errors**
   ```bash
   # Fix: Update tsconfig.json paths
   # Ensure all imports use correct aliases
   ```

2. **Environment Variable Issues**
   ```bash
   # Fix: Verify NEXT_PUBLIC_ prefix for client-side vars
   # Check Vercel environment variable settings
   ```

3. **API Route Problems**
   ```bash
   # Fix: Update API route format to App Router
   # Verify middleware configuration
   ```

4. **Static Asset Loading**
   ```bash
   # Fix: Move assets to public/ directory
   # Update import paths for assets
   ```

### Getting Help
- Next.js Documentation: https://nextjs.org/docs
- Vercel Deployment Guide: https://vercel.com/docs
- Community Support: https://github.com/vercel/next.js/discussions

---

**Migration Timeline**: 2-3 days for full migration and testing
**Recommended Approach**: Parallel development with feature parity validation
**Risk Level**: Medium (well-documented migration path)