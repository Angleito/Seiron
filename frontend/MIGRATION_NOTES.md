# Next.js to Vite Migration Notes

## Completed Tasks

1. ✅ Converted all page.tsx files from app directory to standard React components in src/pages:
   - `/` → HomePage.tsx
   - `/dashboard` → DashboardPage.tsx  
   - `/demo` → DemoPage.tsx
   - `/dragon-demo` → DragonDemoPage.tsx
   - `/dragon-showcase` → DragonShowcasePage.tsx
   - `/voice-test` → VoiceTestPage.tsx
   - `/agent-test` → AgentTestPage.tsx
   - `/animation-demo` → AnimationDemoPage.tsx (newly converted)

2. ✅ Updated router configuration to include all pages

3. ✅ Removed 'use client' directives from all components

4. ✅ Moved globals.css from app/ to src/styles/

5. ✅ Updated imports to use proper aliasing

6. ✅ Copied favicon.ico to public directory

7. ✅ Updated vite.config.ts to point @ alias to src directory

## Remaining Tasks

### API Route Migration
The file `app/api/chat/route.ts` contains a Next.js API route that needs to be moved to a separate backend service since Vite doesn't support API routes. This endpoint:
- Handles chat messages and parses user intents
- Communicates with an orchestrator service
- Formats agent responses for the chat interface

**Options:**
1. Move to the existing backend service (if one exists)
2. Create a new Express/Fastify server for frontend API endpoints
3. Use a serverless function platform (Vercel Functions, Netlify Functions, etc.)

### Clean Up
Once the API route is migrated, the entire `app` directory can be removed as all content has been migrated to the Vite structure.

## File Structure After Migration

```
frontend/
├── src/
│   ├── pages/          # All page components
│   ├── layouts/        # Layout components
│   ├── styles/         # Global styles
│   ├── router.tsx      # React Router configuration
│   └── main.tsx        # Application entry point
├── public/             # Static assets
│   ├── favicon.ico
│   └── fonts/
└── index.html          # HTML entry point
```