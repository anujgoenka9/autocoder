# AutoCoder

An AI-powered code generation SaaS application built with **Next.js** that allows users to create and modify Next.js projects using natural language. The application features a sophisticated AI agent that can generate, modify, and execute code in real-time sandbox environments.

**Demo: [https://www.autocodingai.space/](https://www.autocodingai.space/)**

## Tech Stack

### Frontend & Framework
- **Framework**: [Next.js 15](https://nextjs.org/) with App Router and Turbopack
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI primitives
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with custom animations
- **State Management**: [SWR](https://swr.vercel.app/) for client-side data fetching
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend & Database
- **Database**: [PostgreSQL](https://www.postgresql.org/) via Supabase
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with type-safe queries
- **Authentication**: [Supabase Auth](https://supabase.com/auth) with SSR support
- **Pub/Sub**: [Redis](https://redis.io/) for real-time SSE connections
- **Payments**: [Stripe](https://stripe.com/) with webhooks for subscription management

### AI & Code Execution
- **AI Agent**: Custom LangGraph-based agent deployed as separate FastAPI service
- **LLM**: Multiple AI models via OpenRouter (Google Gemini, Anthropic Claude, OpenAI GPT, MoonshotAI Kimi, Qwen)
- **Code Sandbox**: [E2B](https://e2b.dev/) for isolated code execution environments
- **Agent Observability**: [LangSmith](https://www.langchain.com/langsmith) (optional)
- **Streaming**: Real-time streaming responses via Server-Sent Events

### Infrastructure & Deployment
- **Frontend Deployment**: [Vercel](https://vercel.com/)
- **Agent API Deployment**: [Railway](https://railway.app/) (separate service)
- **Database Hosting**: [Supabase](https://supabase.com/)
- **Redis Hosting**: [Upstash](https://upstash.com/) or similar
- **Environment**: Node.js 18+ with pnpm package manager

## Architecture Overview

### Frontend Architecture
- **App Router**: Next.js 15 App Router with route groups for authentication and dashboard
- **Server Components**: Hybrid approach with server and client components
- **Middleware**: Global middleware for authentication and route protection
- **API Routes**: RESTful API routes for chat, projects, payments, and webhooks
- **Real-time**: SSE connections for live project updates and collaboration

### Backend Architecture
- **Database Schema**: Users, Projects, Messages, and Fragments with proper relations
- **Authentication Flow**: Supabase Auth with JWT cookies and SSR support
- **Credit System**: Pay-per-use system with monthly allocations and billing cycles
- **Payment Integration**: Stripe Checkout with webhook handling for subscriptions
- **File Management**: JSON-based file storage with real-time preview capabilities

### AI Agent Architecture
- **Separate Service**: FastAPI-based agent deployed independently
- **LangGraph Workflow**: State-based workflow with tool execution
- **Sandbox Integration**: E2B sandbox for isolated code execution
- **Streaming**: Real-time streaming of agent execution and code generation
- **Session Management**: Persistent project sessions across conversations

## Getting Started

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/anujgoenka9/autocoder
cd autocoder
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
# Copy the example environment file
cp .env.example .env

# Populate the required environment variables in .env
```

### Development

1. **Start the development server**
```bash
pnpm dev
```

2. **Set up the AI Agent API (separate service)**
```bash
# Navigate to the AI agent directory
cd "Coding Agent API"

# Build the Docker image
docker build -t autocoder-agent .

# Run the container
docker run -p 8000:8000 autocoder-agent
```

3. **Access the application**
   - Frontend: http://localhost:3000
   - AI Agent API: http://localhost:8000

### Production Deployment

1. **Frontend (Vercel)**
   - Connect your GitHub repository to Vercel
   - Set all environment variables in Vercel dashboard
   - Deploy automatically on push to main branch

2. **AI Agent API (Railway)**
   - Deploy the `Coding Agent API/` directory to Railway
   - Set environment variables for the agent service
   - Update `NEXT_PUBLIC_AGENT_API_BASE_URL` in frontend

3. **Database (Supabase)**
   - Create a new Supabase project
   - Run database migrations: `pnpm db:migrate`
   - Set up authentication providers

4. **Redis (Upstash)**
   - Create a Redis instance
   - Update `REDIS_URL` in environment variables

## Project Structure

```
saas-starter/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Protected dashboard routes
│   ├── (login)/                 # Authentication routes
│   ├── api/                     # API routes
│   │   ├── chat/               # Chat and AI interactions
│   │   ├── projects/           # Project management
│   │   ├── stripe/             # Payment processing
│   │   └── user/               # User management
│   └── layout.tsx              # Root layout
├── components/                  # React components
│   ├── ui/                     # shadcn/ui components
│   ├── ChatInterface.tsx       # Main chat interface
│   ├── PreviewPanel.tsx        # Code preview panel
│   └── ...                     # Other components
├── lib/                        # Utility libraries
│   ├── db/                     # Database configuration
│   ├── supabase/               # Supabase client
│   ├── payments/               # Stripe integration
│   └── utils/                  # Utility functions
├── hooks/                      # Custom React hooks
├── Coding Agent API/           # Separate AI agent service
│   ├── main.py                # FastAPI application
│   ├── utils/                 # Agent utilities
│   └── requirements.txt       # Python dependencies
└── ...                        # Configuration files
```

## Key Features Explained

### AI Code Generation
The application uses a sophisticated AI agent built with LangGraph that can:
- Understand natural language requirements
- Generate Next.js code in real-time
- Execute code in isolated sandbox environments
- Maintain project context across conversations
- Stream responses for better user experience
- **Multi-Model Support**: Choose from various AI models including:

**Available AI Models:**
- **Google**: gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro
- **Anthropic**: claude-sonnet-4, claude-3.7-sonnet, claude-3.5-haiku
- **OpenAI**: gpt-4.1-nano, gpt-4.1-mini, gpt-4.1, o3
- **MoonshotAI**: kimi-k2
- **Qwen**: qwen3-coder

Users can select their preferred AI model from a dropdown menu in the chat interface, allowing them to choose the best model for their specific coding needs.

### Real-time Collaboration
- Server-Sent Events (SSE) for live project updates
- Redis-based connection management
- Real-time code preview and file management
- Collaborative project editing

### Credit System
- Pay-per-use model for AI operations
- Monthly credit allocations for subscribers
- Automatic credit deduction for AI interactions
- Billing cycle management via Stripe webhooks

### Security
- Supabase Auth with JWT cookies
- Global middleware for route protection
- Server-side authentication validation
- Secure API routes with proper authorization

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.