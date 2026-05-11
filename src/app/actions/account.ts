'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { profileSchema, passwordSchema, ProfileFormValues, PasswordFormValues } from '@/lib/validations/account.schema';
import { getUser } from '@/lib/auth';

export async function updateProfile(values: ProfileFormValues) {
 const user = await getUser();
 if (!user) return { success: false, error: 'Unauthorized' };

 const validated = profileSchema.safeParse(values);
 if (!validated.success) return { success: false, error: 'Invalid data' };

 const supabase = await createServerClient();
 
 const { error } = await supabase
  .from('users')
  .update({
   first_name: values.firstName,
   last_name: values.lastName,
   avatar_url: values.avatarUrl,
  })
  .eq('id', user.id);

 if (error) return { success: false, error: error.message };

 revalidatePath('/', 'layout');
 return { success: true };
}

export async function updatePassword(values: PasswordFormValues) {
 const user = await getUser();
 if (!user) return { success: false, error: 'Unauthorized' };

 const validated = passwordSchema.safeParse(values);
 if (!validated.success) return { success: false, error: 'Invalid data' };

 const supabase = await createServerClient();

 const { error } = await supabase.auth.updateUser({
  password: values.newPassword,
 });

 if (error) return { success: false, error: error.message };

 return { success: true };
}
