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

async function renameUser() {
  const userId = '3a07cb43-f0f5-4970-9ca9-2615f94f3c10';
  const newEmail = 'ibrase01@gmail.com';
  
  console.log(`Renaming user ${userId} to ${newEmail}`);
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { 
      email: newEmail,
      email_confirm: true 
    }
  );
  
  if (error) {
    console.error('Error renaming user:', error);
  } else {
    console.log('User renamed successfully!');
    console.log('New Email:', data.user.email);
  }
}

renameUser();
