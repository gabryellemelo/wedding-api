import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY devem estar configurados no arquivo .env');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

const supabaseStorage: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

export default supabase;
export { supabaseStorage };

