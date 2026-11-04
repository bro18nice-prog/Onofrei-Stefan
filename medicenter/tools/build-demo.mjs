// Construiește o singură pagină HTML (dist/medicenter-demo.html) din index.html, CSS, JS și logo,
// folosită pentru link-ul de previzualizare al demo-ului.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const html = read('index.html');
const body = html.split('<!-- BODY:START -->')[1].split('<!-- BODY:END -->')[0];
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => read(m[1]));
const fonts = html.match(/<link rel="stylesheet" href="(https:\/\/fonts[^"]+)">/)[1];

const out = [
  '<title>Medicenter Clinic</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<link rel="stylesheet" href="${fonts}">`,
  `<style>\n${read('css/style.css')}\n</style>`,
  body.trim(),
  `<script>\n${scripts.join('\n')}\n</script>`
].join('\n').replaceAll('href="agenda.html"', 'href="#admin"').replace(/img\/[\w-]+\.png/g, (p) => 'data:image/png;base64,' + readFileSync(join(root, p)).toString('base64'));

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/medicenter-demo.html'), out);
console.log('dist/medicenter-demo.html', (out.length / 1024).toFixed(0) + ' KB');
