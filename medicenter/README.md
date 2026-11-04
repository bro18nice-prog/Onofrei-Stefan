# Medicenter Clinic – site cu programări online

Site pentru Medicenter Clinic (Str. Vasile Alecsandri nr. 10, Suceava): prezentare, servicii și prețuri, programare online și agenda personalului.

## Structura

```
index.html            site-ul public (header, footer, încărcarea scripturilor)
agenda.html           aceeași aplicație, deschisă direct în agendă; se instalează pe telefon (generat)
agenda.webmanifest    numele și iconița aplicației „Agenda” de pe telefon
css/style.css         tot designul
img/logo.png          logo-ul clinicii, cu fundal transparent
img/logo-light.png    logo-ul pentru fundaluri închise
img/icon-*.png        iconița aplicației de pe telefon
js/data.js            datele clinicii, secțiile și lista de servicii cu prețuri
js/utils.js           funcții pentru date calendaristice, texte, notificări
js/store.js           unde se salvează programările și setările
js/site.js            paginile publice și programarea online
js/admin.js           panoul personalului: agenda, mutare, anulare, setări
js/main.js            navigarea între pagini
tools/build-demo.mjs  creează o singură pagină pentru link-ul de demo
tools/make-agenda.mjs creează agenda.html din index.html
```

Site-ul e static: nu are nevoie de server, merge pe orice găzduire gratuită (Cloudflare Pages, Netlify, GitHub Pages).
Paginile se deschid prin adrese de forma `…/#programare` și `…/#admin`.

După orice modificare în `index.html`: `node tools/make-agenda.mjs`.
Pentru link-ul de demo: `node tools/build-demo.mjs` creează `dist/medicenter-demo.html`.

## Conturile personalului (la lansare)

Conturile se fac în Supabase (gratuit), nu în cod:
1. Se creează un cont pe supabase.com și un proiect „medicenter” (regiunea Frankfurt).
2. Tabelele și regulile de acces se pun o singură dată, din fișierul de configurare al proiectului.
3. **Adăugare membru al personalului:** Authentication → Users → Add user → email + parolă (sau „Invite”, ca persoana să-și aleagă singură parola).
4. **Scoatere din cont:** Authentication → Users → utilizatorul → Delete user. Accesul se oprește imediat.
5. **Parolă uitată:** pe ecranul de intrare există „Am uitat parola”, care trimite un link pe email.

Doar emailurile adăugate de administrator pot intra în agendă. Pacienții nu au cont: ei doar se programează.

## Stadiul actual (demo)

- Programările și setările se salvează **în browserul fiecărui dispozitiv** (localStorage). Merge pentru prezentare, dar o programare făcută de pe telefonul unui pacient nu ajunge în agenda de la clinică.
- Înainte de lansare, `js/store.js` se leagă la o bază de date online gratuită (Supabase). Restul site-ului rămâne neschimbat.
- Parola de admin din demo este `medicenter`. La lansare, fiecare membru al personalului primește cont propriu (email și parolă).
- Agenda pornește cu programări de test, marcate „test”. Se șterg din **Setări → Șterge programările de test**.

## Cum funcționează programările

- Programările se fac pe ore fixe, între ora de început și ora de închidere (implicit 09:00–20:00, de luni până vineri).
- Fiecare secție are o **capacitate pe oră**, adică câți pacienți pot fi programați în aceeași oră:
  Kinetoterapie 4, Masaj 2, Fizioterapie 4, Neurologie și psihiatrie 1 (valori de test, se schimbă din Setări).
- Serviciile de peste o oră (de ex. kinetoterapie neurologică 90 min, EEG 120 min) ocupă două ore consecutive.
- Pachetele se programează ședință cu ședință.
- Când o oră e plină, pacienții o văd „Complet” și nu o mai pot alege.

## Ghid pentru personal

### Intrarea în agendă
1. Pe site, jos în pagină, apăsați **Acces personal** (adresa `…/agenda.html`).
2. Introduceți parola și apăsați **Intră în cont**.

### Agenda ca aplicație pe telefon
Se face o singură dată pe fiecare telefon, din pagina `…/agenda.html`:
- **Android (Chrome):** meniul ⋮ din dreapta sus → **Instalează aplicația** (sau **Adaugă pe ecranul de pornire**) → **Instalează**.
- **iPhone (Safari):** butonul **Partajează** (pătratul cu săgeată) → **Adaugă pe ecranul principal** → **Adaugă**.

Pe ecran apare iconița **Agenda**. Se deschide direct în agendă, pe tot ecranul, fără bara browserului.

### Citirea agendei
- Fiecare coloană e o zi, fiecare rând e o oră. În fiecare oră apar pacienții programați.
- Culoarea din stânga numelui arată secția (legenda e deasupra agendei).
- Alegeți o secție din lista de sus ca să vedeți ocuparea fiecărei ore:
  **verde** = locuri libere, **portocaliu** = aproape plin, **roșu** = complet. Numărul, de ex. `3/4`, înseamnă 3 pacienți din 4 locuri.
- Săgețile ‹ › schimbă săptămâna, iar **Azi** revine la săptămâna curentă.
- Pe telefon, agenda arată o singură zi. Ziua se alege din butoanele de deasupra.

### Mutarea unei programări
- **Pe calculator:** trageți pacientul cu mouse-ul în altă oră sau altă zi. Ora se colorează verde dacă mai e loc și roșu dacă e plină.
- **Pe telefon sau calculator:** apăsați pe pacient, apoi în **Mută programarea** alegeți ziua și ora și apăsați **Mută**.
- Dacă ora nouă e plină, mutarea nu se face și apare un mesaj.

### Anularea unei programări
Apăsați pe pacient → **Anulează programarea** → **Da, anulează**. Locul devine imediat liber pentru alți pacienți.

### Adăugarea unui pacient care a sunat
- Apăsați pe o oră goală din agendă: se deschide formularul cu ziua și ora deja completate.
- Sau apăsați **+ Programare** și completați serviciul, ziua, ora, numele și telefonul.

### Setări
- **Capacitate pe oră:** câți pacienți pot fi în aceeași oră, pe fiecare secție.
- **Program:** prima oră de programare și ora de închidere.
- **Zile lucrătoare:** bifați zilele în care clinica primește programări.
- **Zile înainte:** cu câte zile în avans se pot programa pacienții (implicit 60).

### Ce vede pacientul
1. Alege secția și serviciul (cu durată și preț).
2. Alege ziua din calendar (zilele cu locuri libere sunt colorate) și ora (cu numărul de locuri rămase).
3. Completează numele și telefonul, bifează acordul pentru date și apasă **Confirmă programarea**.
4. Programarea apare imediat în agendă, marcată „programat online”.
