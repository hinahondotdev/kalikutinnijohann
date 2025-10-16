// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// replace these with your actual values from Supabase project settings
const SUPABASE_URL = "https://qqksytpofkppluxjrywk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxa3N5dHBvZmtwcGx1eGpyeXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NDU0MTUsImV4cCI6MjA3MzIyMTQxNX0.GVxyFLbksFzuRbizN7ck5AWtpRlRqlJompQfXm3wJLE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
