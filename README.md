# AutoCoder

This is an AI-powered code generation SaaS application built with **Next.js** that allows users to create and modify Next.js projects using natural language. It includes authentication, Stripe integration for payments, and a dashboard for managing AI-generated code projects.

**Demo: [https://www.autocodingai.space/](https://www.autocodingai.space/)**

## Features

- **AI Code Generation**: Intelligent agent that can create and modify Next.js projects using natural language
- **Project Management**: Dashboard for managing AI-generated code projects with CRUD operations
- **Team Collaboration**: Basic RBAC with Owner and Member roles for team-based development
- **Subscription Management**: Stripe integration with Customer Portal for managing AI usage plans
- **Authentication**: Email/password authentication with JWTs stored to cookies
- **Security**: Global middleware to protect logged-in routes and local middleware for Server Actions
- **Marketing**: Landing page with animated Terminal element showcasing AI capabilities
- **Pricing**: Transparent pricing page connected to Stripe Checkout for AI usage plans

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database and Auth**: [Supabase](https://supabase.com//)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)
- **AI Agent**: [LangGraph](https://www.langchain.com/langgraph) 
- **LLM Observability**: [LangSmith](https://www.langchain.com/langsmith)
- **Sandbox**: [E2B](https://e2b.dev/)
- **API**: [FastAPI](https://fastapi.tiangolo.com/)

## Getting Started

```bash
git clone https://github.com/anujgoenka9/autocoder
cd autocoder
pnpm install
```

## Running Locally

[Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

Use the included setup script to create your `.env` file:

```bash
pnpm db:setup
```

Set up your Python agent API keys in your `.env` file:

```bash
# Add these to your .env file
OPENROUTER_API_KEY=your_openrouter_api_key_here
E2B_API_KEY=your_e2b_api_key_here
```

To get these API keys:
- **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai/) and get your API key
- **E2B**: Sign up at [e2b.dev](https://e2b.dev/) and get your API key

Run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create the following default user for testing AutoCoder:

- User: `test@test.com`
- Password: `admin123`

You can also create new users through the `/sign-up` route to start generating AI-powered code projects.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see AutoCoder in action. You can start by creating a new project and using natural language to generate Next.js code!

You can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.
6. `OPENROUTER_API_KEY`: Your OpenRouter API key for the AI agent.
7. `E2B_API_KEY`: Your E2B API key for code execution sandbox.
8. `VERCEL_URL`: This is automatically set by Vercel during deployment.

