import { Suspense } from 'react';
import { OTPConfirmationForm } from '@/components/otp-confirmation-form';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <OTPConfirmationForm />
    </Suspense>
  );
} 