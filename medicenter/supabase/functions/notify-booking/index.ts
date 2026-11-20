// Medicenter: trimite o notificare pe telefoanele personalului când vine o cerere nouă de pe site.
// Apelată de baza de date (declanșatorul bookings_notify) cu { id } al programării.
// Trimite o singură dată, doar pentru cereri noi (în așteptare, din ultimele 10 minute), fără numele pacientului.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SERVICES: Record<string, string> = {"k01":"Kinetoterapie individuală","k02":"Kinetoterapie de grup","k03":"Kinetoterapie pentru afecțiuni neurologice","k04":"Reeducare posturală globală (RPG)","k05":"Terapia Schroth","k06":"Evaluare posturală / Schroth","k07":"Recuperare articulație temporo-mandibulară (ATM)","k08":"Kinesio taping (local / regional)","k09":"Bandaj compresiv multistrat pentru limfedem","k16":"Recuperarea planșeului pelvin / diastazei abdominale","k10":"Pachet reeducare posturală globală (RPG) / Schroth – 10 ședințe","k11":"Pachet kinetoterapie de grup – 10 ședințe","k12":"Pachet kinetoterapie bebeluși – 10 ședințe","k13":"Pachet gimnastică prenatală – 10 ședințe","k14":"Pachet kinetoterapie de grup + masaj terapeutic – 10 ședințe","k15":"Pachet recuperare ATM – 10 ședințe","m01":"Masaj reflexogen","m02":"Pachet masaj reflexogen – 10 ședințe","m03":"Reflexoterapie generală","m04":"Reflexoterapie – 2 zone","m05":"Masaj general","m06":"Masaj terapeutic","m07":"Masaj segmentar","m08":"Masaj prenatal","m09":"Masaj bebeluși","m10":"Masaj de detensionare miofascială / trigger point","m11":"Drenaj limfatic mecanic","m12":"Drenaj limfatic manual (local / general)","f01":"Curenți","f02":"Laserterapie","f03":"Magnetoterapie","f04":"Terapie cu ultrasunete","f05":"Terapia Tecar","f06":"Terapia Deep Oscillation","f07":"Pachet fizioterapie – 4 proceduri (curenți, ultrasunete, magnetoterapie, laserterapie)","f08":"Pachet Tecar + 3 proceduri fizioterapie – 10 ședințe","f09":"Pachet Deep Oscillation + 2 proceduri fizioterapie – 10 ședințe","f10":"Pachet Deep Oscillation + 3 proceduri fizioterapie – 10 ședințe","n01":"Consultație neurologie pediatrică","n02":"Consultație psihiatrie pediatrică","n03":"Consultație psihiatrie","n04":"Control neurologie pediatrică","n14":"Control psihiatrie / psihiatrie pediatrică","n12":"EEG (electroencefalogramă)","n13":"EEG (electroencefalogramă) prelungit","n05":"Brainmap (scanare) cu interpretare","n06":"Antrenament neuronal (neurofeedback)","n07":"Antrenament neuronal (neurofeedback)","n08":"Pachet neurofeedback – 10 ședințe","n09":"Pachet neurofeedback – 20 ședințe","n10":"Pachet neurofeedback – 10 ședințe","n11":"Pachet neurofeedback – 20 ședințe"};
const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  let id = '';
  try { id = String((await req.json()).id || ''); } catch { /* corp invalid */ }
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'bad id' }, 400);

  // marchează cererea ca anunțată (o singură dată) și ia doar ce trebuie pentru mesaj
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: b, error } = await sb.from('bookings')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id).is('notified_at', null).eq('status', 'pending').gte('created_at', since)
    .select('service_id, date, hour, child_name').maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!b) return json({ sent: 0, reason: 'not new' });

  const { data: cfg } = await sb.rpc('push_config');
  if (!cfg || !cfg.public || !cfg.private) return json({ error: 'no keys' }, 500);
  webpush.setVapidDetails('https://medicenter.bro18nice.workers.dev', cfg.public, cfg.private);

  const d = new Date(b.date + 'T12:00:00');
  const when = DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ora ' + String(b.hour).padStart(2, '0') + ':00';
  const payload = JSON.stringify({
    title: 'Cerere nouă de programare',
    body: (SERVICES[b.service_id] || 'Programare') + (b.child_name ? ' (copil)' : '') + ' · ' + when,
    url: 'agenda.html#admin'
  });

  const { data: subs } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth');
  let sent = 0, removed = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: 'high' });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint); removed++; }
    }
  }
  return json({ sent, removed });
});
