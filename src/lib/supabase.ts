import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Supabase client that can be imported and used anywhere in project
export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)