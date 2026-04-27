import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://mhhkdqixhfbtaicpyxll.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const userId = '03eb38cd-7b2b-4ab0-9fbf-ab00fd24a0d3';
  const newPassword = 'ibrase@2026';
  
  console.log(`Resetting password for user ID: ${userId}`);
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );
  
  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Password reset successfully!');
    console.log('User:', data.user.email);
  }
}

resetPassword();
