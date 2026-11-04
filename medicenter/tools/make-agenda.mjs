// Creează agenda.html din index.html: aceeași aplicație, dar se deschide direct în agendă
// și are manifestul care permite instalarea pe telefon ca aplicație („Adaugă pe ecranul principal”).
// Rulează după orice modificare în index.html: node tools/make-agenda.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<title>Medicenter Clinic · Suceava</title>', '<title>Agenda · Medicenter Clinic</title>')
  .replace('<link rel="apple-touch-icon"', '<link rel="manifest" href="agenda.webmanifest">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Agenda">\n<link rel="apple-touch-icon"')
  .replace('<body>', '<body data-home="admin">');
writeFileSync(join(root, 'agenda.html'), '<!-- Generat din index.html de tools/make-agenda.mjs. Nu edita direct. -->\n' + html);
console.log('agenda.html');
