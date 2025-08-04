import { Suspense } from 'react';
import { EmailChangeOTPForm } from '@/components/email-change-otp-form';

export default function ChangeEmailPage() {
  return (
    <Suspense>
      <EmailChangeOTPForm />
    </Suspense>
  );
} 