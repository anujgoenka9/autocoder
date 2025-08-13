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
- **Agent API Deployment**: [Railway](https://railway.app/) or **AWS ECS (Bedrock AgentCore)** (separate service)
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

2b. **AI Agent API (AWS Bedrock AgentCore on ECS Fargate)**

   This project includes an AgentCore-compatible entrypoint at `Coding Agent API/agentcore_entrypoint.py` and a dedicated Dockerfile at `Coding Agent API/Dockerfile.agentcore`. Deploying via AWS ECR + ECS Fargate lets you run the AgentCore runtime behind an ALB with health checks.

   - Build and push image to ECR (uses `Dockerfile.agentcore`):
     ```bash
     ACCOUNT_ID="123456789012"
     REGION="us-east-1"
     REPO="autocoder-agentcore"
     TAG="v1"

     aws ecr create-repository --repository-name "$REPO" --region "$REGION" || true
     aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

     # Build from the folder using the AgentCore Dockerfile
     docker build -f "Coding Agent API/Dockerfile.agentcore" -t "$REPO:$TAG" "Coding Agent API"
     docker tag "$REPO:$TAG" "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO:$TAG"
     docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO:$TAG"
     ```

   - IAM
     - Ensure `ecsTaskExecutionRole` exists with policy `AmazonECSTaskExecutionRolePolicy`.
     - If using Secrets Manager, allow `secretsmanager:GetSecretValue` on your secrets (via task role or execution role as appropriate).

   - Logs
     - Create a CloudWatch Logs group, e.g. `/ecs/agentcore` in your region.

   - Task definition (Fargate)
     - CPU/memory: start with 0.5 vCPU (512) and 1 GB (1024)
     - Network mode: `awsvpc`
     - Container port: `8000`
     - Env/secrets: set `OPENROUTER_API_KEY`, `E2B_API_KEY` (prefer Secrets Manager)
     - Logs: `awslogs` to `/ecs/agentcore`
     - Image: use your ECR image URI

     Example (adjust ARNs/region/image/secrets):
     ```json
     {
       "family": "agentcore-task",
       "networkMode": "awsvpc",
       "requiresCompatibilities": ["FARGATE"],
       "cpu": "512",
       "memory": "1024",
       "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
       "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
       "containerDefinitions": [
         {
           "name": "agentcore",
           "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/autocoder-agentcore:v1",
           "portMappings": [
             { "containerPort": 8000, "hostPort": 8000, "protocol": "tcp" }
           ],
           "environment": [
             { "name": "PYTHONUNBUFFERED", "value": "1" }
           ],
           "secrets": [
             {
               "name": "OPENROUTER_API_KEY",
               "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:openrouter_api_key_abc"
             },
             {
               "name": "E2B_API_KEY",
               "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:e2b_api_key_xyz"
             }
           ],
           "logConfiguration": {
             "logDriver": "awslogs",
             "options": {
               "awslogs-group": "/ecs/agentcore",
               "awslogs-region": "us-east-1",
               "awslogs-stream-prefix": "ecs"
             }
           },
           "essential": true
         }
       ]
     }
     ```

   - Cluster and service
     - Create an ECS cluster (Fargate)
     - Create a service:
       - Desired count: 1
       - Launch type: Fargate
       - VPC/subnets: choose at least two subnets
       - Security group: allow inbound from the ALB security group; egress to the internet
       - Assign public IP: yes (only if you skip ALB and want public access directly)

   - Load balancer (recommended)
     - Application Load Balancer with listener HTTP 80 (and HTTPS 443 if using ACM cert)
     - Target group: protocol HTTP, port 8000, health check path `/ping`, success codes `200`, health check port "traffic-port"
     - Register the ECS service to that target group

   - DNS (optional but recommended)
     - Point your domain to the ALB using a Route 53 alias A/AAAA record

   - Test
     ```bash
     # Replace with your ALB DNS name or domain
     BASE_URL="http://your-alb-dns-name"

     # Health check
     curl -s "$BASE_URL/ping"

     # Invoke the AgentCore entrypoint
     curl -s -X POST "$BASE_URL/api/agent" \
       -H 'Content-Type: application/json' \
       -d '{
             "user_id": "alice_123",
             "project_id": "todo_app_v1",
             "task": "Create a simple React todo app with add/delete functionality",
             "model": "google/gemini-2.5-flash"
           }'
     ```

   - Notes/gotchas
     - The container listens on `0.0.0.0:8000` and serves `/api/agent`, `/invocations`, and `/ping`.
     - If health checks fail: verify the target group path `/ping`, success code `200`, and port set to "traffic-port".
     - Ensure security groups allow ALB → service traffic.
     - Check CloudWatch logs for startup errors or missing env vars.
     - Prefer Secrets Manager for API keys; avoid plaintext env vars.
     - If you skip the ALB, you can assign a public IP on the service ENI and allow inbound 8000; however, ALB is recommended for stability, health checks, and HTTPS.

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