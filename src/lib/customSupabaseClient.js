import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asnevyxhgnxtegfkbivb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbmV2eXhoZ254dGVnZmtiaXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTAzMDUsImV4cCI6MjA3NjI4NjMwNX0.iGTpsV-MBNWqlY-WikSWBlvSK5Gx0PGoZLufOikLHO8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);