import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfmoluhhmzblnzlnefqw.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW9sdWhobXpibG56bG5lZnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA2MzksImV4cCI6MjEwNTkyNjYzOX0.h24L0N_tzbouCl6NR3yw0ljvxr-vIF8GscpeLTl3fqc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);