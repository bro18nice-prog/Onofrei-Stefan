# Medicenter Clinic – site cu programări online

Site pentru Medicenter Clinic (Str. Vasile Alecsandri nr. 10, Suceava): prezentare, servicii și prețuri, programare online, agenda personalului.

## Structura

```
index.html              site-ul public
agenda.html             aceeași aplicație, deschisă direct în agendă; se instalează pe telefon (generat)
agenda.webmanifest      numele și iconița aplicației „Agenda” de pe telefon
_headers                reguli de securitate pentru găzduire
css/style.css           tot designul
img/                    logo (normal și pentru fundal închis), iconițe aplicație
js/config.js            legătura cu baza de date (adresa și cheia publică Supabase)
js/data.js              datele clinicii, secțiile și lista de servicii cu prețuri
js/utils.js             date calendaristice, texte, notificări
js/store.js             programări, setări, conturi (modul demo sau Supabase)
js/site.js              paginile publice și programarea online
js/admin.js             agenda personalului, setări, lista personalului
js/main.js              navigarea între pagini, pornirea aplicației
js/vendor/              biblioteca Supabase (versiune fixă, fără CDN)
supabase/schema.sql     baza de date și regulile de acces (se rulează o dată în Supabase)
tools/make-agenda.mjs   regenerează agenda.html după orice schimbare în index.html
tools/build-demo.mjs    creează o singură pagină pentru link-ul de demo
```

Site-ul e static: nu are nevoie de server propriu. Paginile se deschid prin adrese ca `…/#programare`.

**Moduri de funcționare**
- **Demo** (`js/config.js` gol): datele stau în browser, cu programări de test; parola agendei este `medicenter`.
- **Live** (`js/config.js` completat): pacienții și personalul folosesc aceeași bază de date Supabase.

## Lansarea (o singură dată)

### 1. Baza de date – Supabase (gratuit)
1. Cont pe **supabase.com** → **New project**: nume `medicenter`, regiunea **Central EU (Frankfurt)**, o parolă de bază de date (se păstrează, dar nu e nevoie de ea zilnic).
2. **SQL Editor** → **New query** → se lipește conținutul din `supabase/schema.sql`.
   Înainte de **Run**, la final se înlocuiește `EMAIL_ADMINISTRATOR` cu emailul administratorului clinicii.
3. **Project Settings → API**: se copiază **Project URL** și cheia **anon public** în `js/config.js`.
4. **Authentication → URL Configuration**:
   - **Site URL**: adresa site-ului, ex. `https://medicenter-suceava.ro/agenda.html`
   - **Redirect URLs**: se adaugă `https://medicenter-suceava.ro/**`
5. **Authentication → Sign In / Providers → Email**: „Confirm email” rămâne **pornit**.

### 2. Găzduirea – Cloudflare Pages (gratuit)
1. Cont pe **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → conectare la GitHub și alegerea acestui repository.
2. **Build command**: gol. **Build output directory**: `medicenter`.
3. După publicare, site-ul are o adresă gratuită `…pages.dev`. Orice modificare urcată pe GitHub se publică singură.

(Alternativ, Netlify: „Add new site” → „Deploy manually” → se trage folderul `medicenter`.)

### 3. Domeniul
- Gratuit: adresa `…pages.dev` sau `…netlify.app`.
- Propriu (recomandat): un domeniu `.ro` de la un registrar românesc, apoi în Cloudflare Pages → **Custom domains** → se adaugă domeniul și se urmează pașii afișați.

### 4. Conturile (din Supabase, fără email de confirmare)
Serviciul de email inclus în Supabase trimite mesaje **doar** adreselor din echipa proiectului Supabase
(Organization → Team). Pentru orice alt email (de ex. contul comun Yahoo al clinicii), contul se creează direct:
**Supabase → Authentication → Users → Add user → Create new user** → email + parolă → bifat **Auto Confirm User** → Create.
Apoi emailul se trece în listă din **Agenda → Setări → Personal cu acces la agendă** (sau există deja, pentru administrator).

## Conturile personalului

- Administratorul adaugă colegii din **Agenda → Setări → Personal cu acces la agendă** (nume + email; bifat „Administrator” doar pentru cine trebuie să schimbe setări).
- Contul se creează din Supabase (pasul 4 de mai sus). „Creează cont” din agendă merge doar pentru adresele din echipa Supabase.
- **Schimbarea parolei**: din agendă → **Cont și telefon** → **Schimbă parola** (cât ești conectat).
- **Parolă uitată**: administratorul intră în Supabase → Authentication → Users → contul → **Send password recovery**
  (merge doar pentru adresele din echipa Supabase); altfel șterge contul și îl creează din nou cu o parolă nouă.
- **Plecarea unui coleg**: Setări → **Scoate accesul**. Accesul se oprește imediat, chiar dacă are încă parola.
- Un cont creat cu un email care nu e în listă nu vede nimic.

**Cont comun al clinicii.** Medicii folosesc un singur cont (emailul Yahoo al clinicii): creat din Supabase, trecut o singură dată
în listă, cu „Administrator” nebifat, și toți intră în agendă cu același email și aceeași parolă. Proprietarul site-ului păstrează
contul lui separat, de administrator. Când pleacă cineva din clinică, se schimbă parola contului comun
(Agendă → Cont și telefon → Schimbă parola), iar telefoanele celorlalți se reconectează cu parola nouă.
În agendă nu se vede cine anume a confirmat o programare când toți folosesc același cont.

Securitatea este verificată în baza de date (`supabase/schema.sql`), nu doar în site:
pacienții văd doar câte locuri sunt ocupate (fără nume), programările noi trec prin verificarea locurilor libere,
iar datele pacienților sunt vizibile doar personalului din listă, cu email confirmat.

## Cum funcționează programările

- Programări pe ore fixe, între prima oră și ora de închidere (implicit 09:00–20:00, luni–vineri).
- Fiecare terapie are un număr de **locuri pe oră**. Implicit 7 la toate: pacienții trimit cereri, iar medicul îi așază la confirmare. Se schimbă din Setări.
- Cererile de pe site sunt **în așteptare** până le confirmă clinica (Confirmă / Mută și confirmă / Refuză), apoi pacientul e anunțat pe WhatsApp.
- Serviciile de peste o oră (ex. 90 min, EEG 120 min) ocupă două ore la rând.
- Pachetele se programează ședință cu ședință.
- O oră plină apare „Complet” pentru pacienți. Dacă doi pacienți aleg ultimul loc în același timp, baza de date îl dă primului, iar al doilea e rugat să aleagă altă oră.
- Același număr de telefon poate avea cel mult 5 programări viitoare făcute online (protecție împotriva programărilor false).

## Ghid pentru personal

### Intrarea în agendă
Pe site, jos: **Acces personal** (adresa `…/agenda.html`) → email + parolă → **Intră în cont**.

### Agenda ca aplicație pe telefon (o singură dată pe fiecare telefon)
Cel mai simplu: se trimite medicilor pe WhatsApp linkul `…/agenda.html?email=EMAILUL_CONTULUI` (emailul se completează singur;
doar parola se scrie). După intrare, pe telefon apare jos o bară care arată exact ce trebuie apăsat (pe Android, butonul **Instalează**).
Instrucțiunile sunt și în agendă, la **Cont și telefon** (pe Android apare direct butonul **Instalează agenda pe acest telefon**).
- **Android (Chrome):** se deschide `…/agenda.html` → meniul ⋮ → **Instalează aplicația** (sau **Adaugă pe ecranul de pornire**).
- **iPhone (Safari):** se deschide `…/agenda.html` în Safari → **Partajează** (pătratul cu săgeată; pe iOS 26 întâi **⋯** dreapta jos) → **Adaugă pe ecranul principal** → **Adaugă**. Pe iPhone nu există buton de instalare automată.

Apare iconița **Agenda**, care se deschide direct în agendă, pe tot ecranul. Agenda se actualizează singură la fiecare minut.

### Citirea agendei
- Coloanele sunt zilele, rândurile sunt orele; culoarea din stânga numelui arată secția.
- Din lista de sus se alege o secție ca să se vadă ocuparea: **verde** = locuri libere, **portocaliu** = aproape plin, **roșu** = complet (ex. `3/4`).
- ‹ › schimbă săptămâna, **Azi** revine la săptămâna curentă. Pe telefon se vede o zi, aleasă din butoanele de sus.

### Totul se face din butoane
**Apeși pe o programare** → în dreapta (pe telefon, dedesubt) apar butoanele:
- **Confirmă** / **Refuză** / **Altă oră** (pentru cererile noi de pe site);
- **Mută** (alegi ziua și ora; pe calculator poți și trage programarea), **Modifică datele** (nume, telefon, copil, observații),
  **WhatsApp** (mesajul către pacient e deja scris), **Sună**, **Anulează** (cere confirmare), **Reactivează** (pentru una anulată);
- câmpul **Terapeut**, pentru cine lucrează cu pacientul.

**Apeși pe o oră** (pe spațiul liber) → butoanele:
- **Programare nouă** (pacient care a sunat; intră direct confirmată);
- **Blochează ora** / **Deblochează ora** — pacienții nu o mai pot alege online;
- **Locuri la ora asta** — câți pacienți încap atunci (pe toată clinica sau pe secție);
- **Blochează ziua** / **Deblochează ziua** — toată ziua.

### Notificări pe telefon la cereri noi
În agendă → **Cont și telefon** → **Activează notificările** (pe iPhone, din aplicația Agenda pusă pe ecran; pe Android, din Chrome).
La fiecare cerere nouă de pe site apare pe telefon „Cerere nouă de programare”, cu serviciul, ziua și ora (fără numele pacientului);
apăsând pe ea se deschide agenda. Se activează pe fiecare telefon în parte.

### Locuri pe oră, zile închise, terapeut
- **Blocare pe secții:** apeși pe o oră → **Blochează ora** sau **Blochează ziua** → alegi ce blochezi: toată clinica,
  **Recuperare medicală** (kineto + masaj + fizio), o singură secție sau Neurologie/psihiatrie/neurofeedback. Apăsând din nou, deblochezi.
- **Câte locuri sunt la o oră:** apeși pe ora din agendă → sus în dreapta, „Locuri la ora …”: pe toată clinica sau pe secție.
  Gol = normal (după Setări), 0 = închis la ora aceea. Ora primește eticheta „max N” sau „închis”.
- **O zi întreagă închisă:** apeși pe orice oră din ziua respectivă → **Închide toată ziua**. Ziua apare hașurată, cu „ÎNCHIS”,
  iar pacienții nu o mai pot alege. Programările deja făcute rămân în agendă (se mută sau se anulează). **Redeschide ziua** anulează închiderea.
- Pe o oră închisă nu se pot adăuga programări nici din agendă; pentru o excepție, redeschizi ora.
- **Terapeutul:** în fișa programării, câmpul **Terapeut**; numele scurt apare pe programare. Din lista de sus se poate vedea agenda unui singur terapeut.

### Setări (doar administratori)
Câte locuri are fiecare terapie la aceeași oră (inițial 7 la toate: medicul așază pacienții la confirmare), programul, zilele lucrătoare, cu câte zile înainte se pot face programări, lista personalului.

## Adrese și lansare
- Site-ul oficial: **https://medicenterclinic.ro** (agenda: `https://medicenterclinic.ro/agenda.html`, cod QR în `img/qr-agenda.png`).
- Adresa veche `medicenter.bro18nice.workers.dev` merge în continuare, dar e ascunsă din Google (`_headers`), ca să nu apară de două ori.
- Google: `robots.txt` permite totul în afară de agendă; `sitemap.xml` arată pagina principală. Datele clinicii (adresă, telefon, program) sunt
  în `index.html`, pentru rezultatele Google.
- În Supabase → Authentication → URL Configuration: Site URL `https://medicenterclinic.ro/agenda.html`, Redirect URLs `https://medicenterclinic.ro/**`.

## De completat
- `js/data.js` → `company`: denumirea firmei, pentru Politica de confidențialitate (cerută de GDPR).
- `js/data.js` → `retentionMonths`: cât se păstrează datele programărilor (implicit 24 de luni).
