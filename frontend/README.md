This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Hackathon Deployment

### Quick Deploy (Production)

```bash
# One-command deployment
./scripts/hackathon-deploy.sh
```

### Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# MCP Servers
MCP_HIVE_URL=https://your-hive-server.com
MCP_SEI_URL=https://your-sei-server.com
MCP_PORTFOLIO_URL=https://your-portfolio-server.com
HIVE_INTELLIGENCE_API_KEY=your_key
SEI_API_KEY=your_key
PORTFOLIO_API_KEY=your_key

# Other Services
OPENAI_API_KEY=sk-your_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
```

See `HACKATHON_MCP_SETUP.md` for detailed setup guide.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Deployment trigger Sat Jul  5 19:21:11 PDT 2025
