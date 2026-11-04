/*
 * Legătura cu baza de date online (Supabase → Project Settings → API).
 * Cât timp câmpurile sunt goale, site-ul merge în modul demo: datele stau doar în browser.
 * Cheia „anon” este publică prin natura ei; accesul la date este controlat de regulile din supabase/schema.sql.
 */
window.MC = window.MC || {};
MC.CONFIG = {
  supabaseUrl: '',      // ex.: https://abcdefgh.supabase.co
  supabaseAnonKey: ''   // cheia „anon public”
};
