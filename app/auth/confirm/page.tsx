'use client';

import { SquareCodeIcon, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'Check your email to confirm your account';

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <SquareCodeIcon className="h-12 w-12 text-ai-primary" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Check Your Email
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 shadow-lg rounded-lg border border-border text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-ai-primary/10 rounded-full p-4">
              <Mail className="h-8 w-8 text-ai-primary" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Confirm Your Account
          </h3>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {message}
          </p>
          
          <p className="text-sm text-muted-foreground mb-8">
            Click the confirmation link in your email to complete your registration. 
            Once confirmed, you'll be automatically signed in.
          </p>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Didn't receive an email? Check your spam folder or try signing up again.
            </p>
            
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-border hover:bg-accent"
            >
              <Link href="/sign-in" className="flex items-center justify-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}