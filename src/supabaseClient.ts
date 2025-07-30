// src/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csupzvsprttoiwiwazvt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdXB6dnNwcnR0b2l3aXdhenZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MzQ4NzUsImV4cCI6MjA2OTIxMDg3NX0.3lJ8SjQ6JVOLfkVAPcUbdUvZnE4qm0CMSQQoHG2oPgM';
export const supabase = createClient(supabaseUrl, supabaseKey);