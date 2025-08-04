"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SquareCodeIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const redirect = searchParams.get("redirect");
  const priceId = searchParams.get("priceId");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim() || email.split('@')[0], // Use name or fallback to email prefix
          },
        },
      });
      if (error) throw error;
      
      if (data?.user && !data?.user?.email_confirmed_at) {
        // Store email for OTP verification
        localStorage.setItem("signup_email", email);
        // User needs to confirm email with OTP
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        // User is confirmed, redirect appropriately
        if (redirect === 'checkout' && priceId) {
          router.push(`/pricing?priceId=${priceId}`);
        } else if (redirect === 'pricing' && priceId) {
          router.push(`/pricing?priceId=${priceId}`);
        } else if (redirect) {
          router.push(`/${redirect}`);
        } else {
          router.push("/");
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
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
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 shadow-lg rounded-lg border border-border">
          <form className="space-y-6" onSubmit={handleSignUp}>
            <div>
              <Label
                htmlFor="name"
                className="block text-sm font-medium text-card-foreground"
              >
                Full Name
              </Label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-ai-primary focus:border-ai-primary focus:z-10 sm:text-sm bg-background"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
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

            <div>
              <Label
                htmlFor="repeat-password"
                className="block text-sm font-medium text-card-foreground"
              >
                Repeat Password
              </Label>
              <div className="mt-1">
                <Input
                  id="repeat-password"
                  name="repeatPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="appearance-none rounded-full relative block w-full px-3 py-2 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-ai-primary focus:border-ai-primary focus:z-10 sm:text-sm bg-background"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Creating account...
                  </>
                ) : (
                  'Sign up'
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
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/sign-in${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `${redirect ? '&' : '?'}priceId=${priceId}` : ''}`}
                className="w-full flex justify-center py-2 px-4 border border-border rounded-full shadow-sm text-sm font-medium text-card-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary transition-colors"
              >
                Sign in to existing account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}