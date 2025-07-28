import Link from 'next/link';
import { HeartCrackIcon } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-background text-foreground">
      <div className="max-w-md space-y-8 p-8 text-center bg-card rounded-lg shadow-lg">
        <div className="flex justify-center">
          <HeartCrackIcon className="size-12 text-ai-primary" />
        </div>
        <h1 className="text-4xl font-bold text-ai-primary tracking-tight">
          Page Not Found
        </h1>
        <p className="text-base text-muted-foreground">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="inline-flex justify-center py-3 px-6 border border-border rounded-full shadow-sm text-sm font-medium text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
