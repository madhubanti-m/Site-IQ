import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jzffnkvcoyiigqkjxmbq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xpsO1K_IEp404s4pH_GmGA_QRiX0IFY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
