/* Datele clinicii: secții și servicii (din lista de prețuri primită de la Medicenter). */
window.MC = window.MC || {};

MC.CLINIC = {
  name: 'Medicenter Clinic',
  address: 'Str. Vasile Alecsandri nr. 10, Suceava',
  area: 'zona centrală',
  phone: '0739 640 556',
  phoneHref: 'tel:+40739640556',
  hours: '09:00 – 20:00',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Strada+Vasile+Alecsandri+10+Suceava'
};

/* Secțiile clinicii. Capacitatea (pacienți pe oră) se setează din admin. */
MC.CATS = [
  { id: 'kineto', name: 'Kinetoterapie și recuperare', short: 'Kinetoterapie', color: '#3a7cb8', icon: 'kineto',
    blurb: 'Kinetoterapie individuală și de grup, recuperare neurologică, RPG, Schroth, ATM.' },
  { id: 'masaj', name: 'Masaj și drenaj limfatic', short: 'Masaj', color: '#c0784e', icon: 'masaj',
    blurb: 'Masaj terapeutic, reflexogen, prenatal, pentru bebeluși și drenaj limfatic.' },
  { id: 'fizio', name: 'Fizioterapie', short: 'Fizioterapie', color: '#22978a', icon: 'fizio',
    blurb: 'Curenți, laser, magnetoterapie, ultrasunete, Tecar și Deep Oscillation.' },
  { id: 'neuro', name: 'Neurologie și psihiatrie', short: 'Neuro', color: '#8761b5', icon: 'neuro',
    blurb: 'Consultații, EEG, Brainmap și antrenament neuronal (neurofeedback).' }
];

/* Iconițe desenate simplu (SVG), folosite pe carduri și în meniuri. */
MC.ICONS = {
  kineto: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="27" cy="8" r="4"/><path d="M26 14l-5 12 8 6v11"/><path d="M21 26l-8 8"/><path d="M17 18l9-4 7 7 7-2"/></svg>',
  masaj: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 16c6-6 12 6 18 0s12 6 18 0"/><path d="M6 26c6-6 12 6 18 0s12 6 18 0"/><path d="M6 36c6-6 12 6 18 0s12 6 18 0"/></svg>',
  fizio: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M27 4L11 27h12l-3 17 17-24H25z"/></svg>',
  neuro: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 26h8l4-10 6 20 6-28 5 18h4l3-6 3 6h3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};

/*
 * Câmpuri: id, cat, name, dur (minute, folosit pentru ocuparea orelor), durLabel (afișat),
 * price (afișat), pkg (pachet de ședințe; la programare se rezervă o ședință).
 */
MC.SERVICES = [
  // Kinetoterapie și recuperare
  { id: 'k01', cat: 'kineto', name: 'Kinetoterapie individuală', dur: 50, durLabel: '50 min', price: '170 lei' },
  { id: 'k02', cat: 'kineto', name: 'Kinetoterapie de grup', dur: 50, durLabel: '50 min', price: '140 lei / ședință' },
  { id: 'k03', cat: 'kineto', name: 'Kinetoterapie pentru afecțiuni neurologice', dur: 90, durLabel: '90 min', price: '230 lei' },
  { id: 'k04', cat: 'kineto', name: 'RPG – reeducare posturală globală', dur: 50, durLabel: '50 min', price: '150 lei' },
  { id: 'k05', cat: 'kineto', name: 'Terapia Schroth', dur: 50, durLabel: '50 min', price: '150 lei' },
  { id: 'k06', cat: 'kineto', name: 'Evaluare posturală / Schroth', dur: 45, durLabel: '45 min', price: '200 lei' },
  { id: 'k07', cat: 'kineto', name: 'Recuperare articulație temporo-mandibulară (ATM)', dur: 50, durLabel: '45–50 min', price: '150 lei' },
  { id: 'k08', cat: 'kineto', name: 'Kinesio taping (local / regional)', dur: 30, durLabel: '', price: '20 – 150 lei' },
  { id: 'k09', cat: 'kineto', name: 'Bandaj compresiv multistrat pentru limfedem', dur: 45, durLabel: '', price: 'membru superior 100 lei · membru inferior 140 lei' },
  { id: 'k10', cat: 'kineto', pkg: true, name: 'Pachet RPG / Schroth – 10 ședințe', dur: 50, durLabel: '50 min / ședință', price: '1300 lei' },
  { id: 'k11', cat: 'kineto', pkg: true, name: 'Pachet kinetoterapie de grup – 10 ședințe', dur: 50, durLabel: '50 min / ședință', price: '1260 lei' },
  { id: 'k12', cat: 'kineto', pkg: true, name: 'Pachet kinetoterapie bebeluși – 10 ședințe', dur: 50, durLabel: '45–50 min / ședință', price: '1530 lei' },
  { id: 'k13', cat: 'kineto', pkg: true, name: 'Pachet gimnastică prenatală – 10 ședințe', dur: 50, durLabel: '', price: '1300 lei' },
  { id: 'k14', cat: 'kineto', pkg: true, name: 'Pachet kinetoterapie de grup + masaj terapeutic – 10 ședințe', dur: 60, durLabel: '', price: '1850 lei' },
  { id: 'k15', cat: 'kineto', pkg: true, name: 'Pachet recuperare ATM – 10 ședințe', dur: 50, durLabel: '45–50 min / ședință', price: '1350 lei' },

  // Masaj și drenaj limfatic
  { id: 'm01', cat: 'masaj', name: 'Masaj reflexogen', dur: 50, durLabel: '40–50 min', price: '150 lei' },
  { id: 'm02', cat: 'masaj', pkg: true, name: 'Pachet masaj reflexogen – 10 ședințe', dur: 50, durLabel: '40–50 min / ședință', price: '1300 lei' },
  { id: 'm03', cat: 'masaj', name: 'Reflexoterapie generală', dur: 90, durLabel: '90 min', price: '250 lei' },
  { id: 'm04', cat: 'masaj', name: 'Reflexoterapie – 2 zone', dur: 40, durLabel: '40 min', price: '150 lei' },
  { id: 'm05', cat: 'masaj', name: 'Masaj general', dur: 50, durLabel: '50 min', price: '140 lei' },
  { id: 'm06', cat: 'masaj', name: 'Masaj terapeutic', dur: 30, durLabel: '20–30 min', price: '75 lei' },
  { id: 'm07', cat: 'masaj', name: 'Masaj segmentar', dur: 15, durLabel: '15 min', price: '50 lei' },
  { id: 'm08', cat: 'masaj', name: 'Masaj prenatal', dur: 50, durLabel: '50 min', price: '140 lei' },
  { id: 'm09', cat: 'masaj', name: 'Masaj bebeluși', dur: 30, durLabel: '30 min', price: '75 lei' },
  { id: 'm10', cat: 'masaj', name: 'Masaj de detensionare miofascială / trigger point', dur: 50, durLabel: '50 min', price: '150 lei' },
  { id: 'm11', cat: 'masaj', name: 'Drenaj limfatic mecanic', dur: 45, durLabel: '45 min', price: '70 lei' },
  { id: 'm12', cat: 'masaj', name: 'Drenaj limfatic manual (local / general)', dur: 50, durLabel: '25 min / 50 min', price: '80 – 150 lei' },

  // Fizioterapie
  { id: 'f01', cat: 'fizio', name: 'Curenți', dur: 20, durLabel: '', price: '20 lei / zonă / ședință' },
  { id: 'f02', cat: 'fizio', name: 'Laserterapie', dur: 20, durLabel: '', price: '20 lei / zonă / ședință' },
  { id: 'f03', cat: 'fizio', name: 'Magnetoterapie', dur: 20, durLabel: '', price: '20 lei / zonă / ședință' },
  { id: 'f04', cat: 'fizio', name: 'Terapie cu ultrasunete', dur: 20, durLabel: '', price: '20 lei / zonă / ședință' },
  { id: 'f05', cat: 'fizio', name: 'Terapia Tecar', dur: 30, durLabel: '', price: '70 lei / zonă / ședință' },
  { id: 'f06', cat: 'fizio', name: 'Terapia Deep Oscillation', dur: 30, durLabel: '', price: '80 lei / zonă / ședință' },
  { id: 'f07', cat: 'fizio', pkg: true, name: 'Pachet fizioterapie – 4 proceduri (curenți, ultrasunete, magnetoterapie, laserterapie)', dur: 60, durLabel: '', price: '800 lei' },
  { id: 'f08', cat: 'fizio', pkg: true, name: 'Pachet Tecar + 3 proceduri fizioterapie – 10 ședințe', dur: 60, durLabel: '', price: '1150 lei' },
  { id: 'f09', cat: 'fizio', pkg: true, name: 'Pachet Deep Oscillation + 2 proceduri fizioterapie – 10 ședințe', dur: 60, durLabel: '', price: '1100 lei' },
  { id: 'f10', cat: 'fizio', pkg: true, name: 'Pachet Deep Oscillation + 3 proceduri fizioterapie – 10 ședințe', dur: 60, durLabel: '', price: '1150 lei' },

  // Neurologie și psihiatrie
  { id: 'n01', cat: 'neuro', name: 'Consultație neurologie pediatrică', dur: 60, durLabel: '', price: '300 lei' },
  { id: 'n02', cat: 'neuro', name: 'Consultație psihiatrie pediatrică', dur: 60, durLabel: '', price: '300 lei' },
  { id: 'n03', cat: 'neuro', name: 'Consultație psihiatrie', dur: 60, durLabel: '', price: '300 lei' },
  { id: 'n04', cat: 'neuro', name: 'Control', dur: 30, durLabel: '', price: '150 lei' },
  { id: 'n05', cat: 'neuro', name: 'Brainmap (scanare) cu interpretare', dur: 60, durLabel: '', price: '1000 lei' },
  { id: 'n06', cat: 'neuro', name: 'Antrenament neuronal (neurofeedback)', dur: 30, durLabel: '30 min', price: '350 lei' },
  { id: 'n07', cat: 'neuro', name: 'Antrenament neuronal (neurofeedback)', dur: 45, durLabel: '45 min', price: '450 lei' },
  { id: 'n08', cat: 'neuro', pkg: true, name: 'Pachet neurofeedback – 10 ședințe', dur: 30, durLabel: '30 min / ședință', price: '3150 lei' },
  { id: 'n09', cat: 'neuro', pkg: true, name: 'Pachet neurofeedback – 20 ședințe', dur: 30, durLabel: '30 min / ședință', price: '5250 lei' },
  { id: 'n10', cat: 'neuro', pkg: true, name: 'Pachet neurofeedback – 10 ședințe', dur: 45, durLabel: '45 min / ședință', price: '4050 lei' },
  { id: 'n11', cat: 'neuro', pkg: true, name: 'Pachet neurofeedback – 20 ședințe', dur: 45, durLabel: '45 min / ședință', price: '6750 lei' },
  { id: 'n12', cat: 'neuro', name: 'EEG (electroencefalogramă)', dur: 60, durLabel: '45–60 min', price: '500 lei' },
  { id: 'n13', cat: 'neuro', name: 'EEG (electroencefalogramă) prelungit', dur: 120, durLabel: '120 min', price: '700 lei' }
];

MC.serviceById = function (id) {
  return MC.SERVICES.find(function (s) { return s.id === id; });
};
MC.catById = function (id) {
  return MC.CATS.find(function (c) { return c.id === id; });
};
/* Câte ore din agendă ocupă un serviciu (sloturile sunt de câte o oră). */
MC.slotHours = function (service) {
  return Math.max(1, Math.ceil((service.dur || 60) / 60));
};
