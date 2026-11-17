// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgxjlplomzyktaumrovi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xd8Anc2KXl0Gx_kgtK50mQ_HeI0no4C';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);