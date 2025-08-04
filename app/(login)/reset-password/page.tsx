import { Suspense } from 'react';
import { ResetPasswordOTPForm } from '@/components/reset-password-otp-form';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordOTPForm />
    </Suspense>
  );
} 