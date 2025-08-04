"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SquareCodeIcon, Loader2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function EmailChangeOTPForm() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newEmail, setNewEmail] = useState("");
  const [oldEmail, setOldEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get emails from localStorage
    const storedNewEmail = localStorage.getItem("change_email_new");
    const storedOldEmail = localStorage.getItem("change_email_old");
    setNewEmail(storedNewEmail || "");
    setOldEmail(storedOldEmail || "");
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste event - if value is longer than 1 character, it's likely a paste
    if (value.length > 1) {
      const pastedValue = value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
      const newOtp = [...otp];
      
      // Fill the OTP array with pasted digits
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedValue[i] || '';
      }
      
      setOtp(newOtp);
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedValue.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    
    // Handle single character input
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: otpCode,
        type: "email_change"
      });

      if (error) throw error;

      if (data?.user) {
        setIsSuccess(true);
        // Clear stored emails
        localStorage.removeItem("change_email_new");
        localStorage.removeItem("change_email_old");
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/account-settings?message=Email address changed successfully!");
        }, 2000);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Email change verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "email_change",
        email: newEmail
      });

      if (error) throw error;

      setResendCountdown(60); // 60 second cooldown
      setOtp(["", "", "", "", "", ""]);
      setError(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-3">
              <Mail className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Email Changed Successfully!
          </h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-6 shadow-lg rounded-lg border border-border text-center">
            <p className="text-muted-foreground mb-6">
              Your email address has been successfully changed to <strong>{newEmail}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to account settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-ai-primary/10 rounded-full p-3">
            <Mail className="h-12 w-12 text-ai-primary" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Confirm Email Change
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the verification code sent to <strong>{newEmail}</strong>
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-6 shadow-lg rounded-lg border border-border">
          <form className="space-y-6" onSubmit={handleVerifyOTP}>
            <div>
              <Label className="block text-sm font-medium text-card-foreground mb-4 text-center">
                Enter the verification code
              </Label>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold border-2 border-border focus:border-ai-primary focus:ring-ai-primary rounded-lg"
                    placeholder=""
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary"
              disabled={isLoading || otp.join("").length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Confirm Email Change'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive the code?
            </p>
            <Button
              onClick={handleResendCode}
              disabled={resendCountdown > 0 || isLoading}
              variant="outline"
              className="text-sm border-border hover:bg-accent"
            >
              {resendCountdown > 0 
                ? `Resend in ${resendCountdown}s` 
                : 'Resend code'
              }
            </Button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  Need help?
                </span>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/account-settings"
                className="w-full flex justify-center py-2 px-4 border border-border rounded-full shadow-sm text-sm font-medium text-card-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ai-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Account Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 