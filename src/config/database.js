const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY devem estar configurados no arquivo .env');
}

// Cliente para operações normais (usa anon key)
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente para operações de storage (usa service role key se disponível)
const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
module.exports.storage = supabaseStorage;
