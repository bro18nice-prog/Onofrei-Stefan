/*
 * Legătura cu baza de date online (Supabase → Project Settings → API).
 * Cât timp câmpurile sunt goale, site-ul merge în modul demo: datele stau doar în browser.
 * Cheia „anon” este publică prin natura ei; accesul la date este controlat de regulile din supabase/schema.sql.
 */
window.MC = window.MC || {};
MC.CONFIG = {
  supabaseUrl: 'https://bywgiyyqwyrbvyfuqtcx.supabase.co',
  // cheia publică pentru notificările pe telefon (perechea privată stă doar în baza de date, în Vault)
  vapidPublicKey: 'BCOsYgXtZY_7UsNZQBLbTeuxmWJgkL85rhi5UTnBpbtdi5gxMwgu7SFAgShKGrUWDGmAhVZThxXmLzoTXxekk2s',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5d2dpeXlxd3lyYnZ5ZnVxdGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTkxODYsImV4cCI6MjEwOTM3NTE4Nn0.lwOWEw0o8_K4EJL90ncCYtY7zR6NQW63Ep2WpxQBq0U'
};
