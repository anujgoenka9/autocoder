"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SquareCodeIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const redirect = searchParams.get("redirect");
  const priceId = searchParams.get("priceId");
  const message = searchParams.get("message");
  const errorParam = searchParams.get("error");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data?.user) {
        // Force a page refresh to ensure middleware picks up the session
        window.location.href = redirect === 'checkout' && priceId ? `/pricing?priceId=${priceId}` :
                              redirect === 'pricing' && priceId ? `/pricing?priceId=${priceId}` :
                              redirect ? `/${redirect}` :
                              '/';
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <SquareCodeIcon className="h-12 w-12 text-ai-primary" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 shadow-lg rounded-lg border border-border">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-card-foreground"
              >
                Email
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={50}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-ai-primary focus:border-ai-primary focus:z-10 sm:text-sm bg-background"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-card-foreground"
              >
                Password
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-ai-primary focus:border-ai-primary focus:z-10 sm:text-sm bg-background"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {message && (
              <div className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-md border border-green-200">
                {message}
              </div>
            )}

            {(error || errorParam) && (
              <div className="text-destructive text-sm">{error || 'Authentication failed. Please try again.'}</div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  New to our platform?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/sign-up${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `${redirect ? '&' : '?'}priceId=${priceId}` : ''}`}
                className="w-full flex justify-center py-2 px-4 border border-border rounded-full shadow-sm text-sm font-medium text-card-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}