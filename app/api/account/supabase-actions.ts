'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

// Update account information (name, email)
const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export async function updateAccount(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'Not authenticated' };
    }

    // Validate form data
    const result = updateAccountSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    const { name, email } = result.data;

    // Update in Supabase Auth if email changed
    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email,
        data: { full_name: name }
      });
      
      if (emailError) {
        return { error: emailError.message };
      }
    } else {
      // Just update the metadata if email is the same
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: name }
      });
      
      if (metaError) {
        return { error: metaError.message };
      }
    }

    // Update in our database
    await db
      .update(users)
      .set({ 
        name, 
        email,
        updatedAt: new Date() 
      })
      .where(eq(users.id, user.id));

    revalidatePath('/account-settings');
    
    return { 
      success: true, 
      message: email !== user.email 
        ? 'Account updated! Please check your email to confirm the new address.'
        : 'Account updated successfully!' 
    };

  } catch (error) {
    console.error('Account update error:', error);
    return { error: 'Failed to update account. Please try again.' };
  }
}

// Update password
const updatePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function updatePassword(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'Not authenticated' };
    }

    // Validate form data
    const result = updatePasswordSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    const { newPassword } = result.data;

    // Update password in Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, message: 'Password updated successfully!' };

  } catch (error) {
    console.error('Password update error:', error);
    return { error: 'Failed to update password. Please try again.' };
  }
}

// Delete account
const deleteAccountSchema = z.object({
  confirmText: z.string().refine((val) => val === 'DELETE', {
    message: 'Please type DELETE to confirm'
  })
});

export async function deleteAccount(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: 'Not authenticated' };
    }

    // Validate confirmation
    const result = deleteAccountSchema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    // Soft delete in our database first
    await db
      .update(users)
      .set({ 
        deletedAt: new Date(),
        email: `${user.email}-deleted-${Date.now()}` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    // Sign out the user (Supabase doesn't allow client-side user deletion)
    // Note: The user account will remain in Supabase Auth but be marked deleted in our DB
    await supabase.auth.signOut();

    return { success: true, message: 'Account deleted successfully.' };

  } catch (error) {
    console.error('Account deletion error:', error);
    return { error: 'Failed to delete account. Please try again.' };
  }
}