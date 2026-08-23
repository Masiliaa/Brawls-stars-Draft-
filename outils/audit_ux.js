/* L'app passee au crible des regles mecaniquement verifiables de
   ui-ux-pro-max (.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv).
   On ne rapporte que ce qu'on MESURE.

       node outils/audit_ux.js            les trois ecrans
       node outils/audit_ux.js draft      un seul

   Il ne visait que l'ecran de draft, et il a fallu bricoler une variante
   pour regarder les deux autres — donc ils n'etaient jamais regardes. Les
   trois passent maintenant d'office, et la sortie est un code d'erreur
   exploitable : 0 si tout tient, 1 sinon. */
const { chromium } = require('playwright');

function lum(c) { // luminance relative WCAG
  const v = c.map(x => { x /= 255; return x <= .03928 ? x/12.92 : Math.pow((x+.055)/1.055, 2.4); });
  return .2126*v[0] + .7152*v[1] + .0722*v[2];
}
function contraste(a, b) {
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1,L2) + .05) / (Math.min(L1,L2) + .05);
}
const rgb = s => (s.match(/\d+/g) || [0,0,0]).slice(0,3).map(Number);

const ECRANS = process.argv.slice(2).length ? process.argv.slice(2)
                                            : ['draft', 'roster', 'cartes'];

(async () => {
  const nav = await chromium.launch({ executablePath: process.env.CHROME });
  let manques = 0;
  for (const ECRAN of ECRANS) {
  const page = await nav.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await page.route('**/api.brawlapi.com/**', r => r.abort());
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof render === 'function');
  /* ECRAN vit cote Node ; le code ci-dessous tourne dans le navigateur. Il
     faut donc le lui PASSER — sinon il n'existe pas de l'autre cote. */
  await page.evaluate((quel) => {
    roster = new Set(brawlers.map(b => b.k)); sauverRoster(); definirLangue('fr');
    carteId = MAPS[0].id; ennemis=['piper','bull']; allies=['gus']; bans=[];
    ecran = quel; recherche = ''; render();
  }, ECRAN);
  await page.waitForTimeout(1200);

  const d = await page.evaluate(() => {
    const cibles = [...document.querySelectorAll('button,[data-act],a')]
      .map(e => { const r = e.getBoundingClientRect();
        return { t:(e.textContent||'').trim().slice(0,20), w:Math.round(r.width), h:Math.round(r.height),
                 x:Math.round(r.left), y:Math.round(r.top), aria:e.getAttribute('aria-label')||e.title||'',
                 txt:(e.textContent||'').trim().length, vis:r.width>0&&r.height>0 }; })
      .filter(c => c.vis);
    const textes = [...document.body.querySelectorAll('*')].filter(e =>
      e.children.length===0 && (e.textContent||'').trim().length>2).map(e => {
        const s = getComputedStyle(e); const r = e.getBoundingClientRect();
        let fond = s.backgroundColor, p = e;
        while ((fond==='rgba(0, 0, 0, 0)'||!fond) && p.parentElement) { p=p.parentElement; fond=getComputedStyle(p).backgroundColor; }
        return { txt:(e.textContent||'').trim().slice(0,26), col:s.color, fond,
                 taille:parseFloat(s.fontSize), lh:s.lineHeight, w:Math.round(r.width) };
      });
    const imgs = [...document.querySelectorAll('img')].map(i => ({
      alt: i.getAttribute('alt'), lazy: i.getAttribute('loading'),
      maxw: getComputedStyle(i).maxWidth }));
    const titres = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName);
    return { cibles, textes, imgs, titres,
      viewport: (document.querySelector('meta[name=viewport]')||{}).content || '(absent)',
      scrollH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      lang: document.documentElement.lang || '(absent)' };
  });

  const R = [];
  const ok = (regle, bon, detail) => R.push({ regle, bon, detail });

  // Touch — Target Size
  const petites = d.cibles.filter(c => c.h < 44 || c.w < 44);
  ok('Touch · taille des cibles (44 px)', petites.length === 0,
     petites.length ? petites.map(c=>`${c.w}×${c.h} « ${c.t} »`).join(' · ') : `${d.cibles.length} cibles, toutes ≥ 44`);

  // Touch — Spacing 8px
  let colles = [];
  for (let i=0;i<d.cibles.length;i++) for (let j=i+1;j<d.cibles.length;j++) {
    const a=d.cibles[i], b=d.cibles[j];
    const dx = Math.max(0, Math.max(a.x-(b.x+b.w), b.x-(a.x+a.w)));
    const dy = Math.max(0, Math.max(a.y-(b.y+b.h), b.y-(a.y+a.h)));
    if (dx===0 && dy===0) continue;              // imbriquees
    if (dx < 8 && dy < 8 && (dx>0||dy>0)) colles.push(`« ${a.t} » / « ${b.t} » : ${Math.max(dx,dy)} px`);
  }
  ok('Touch · 8 px entre deux cibles', colles.length===0, colles.slice(0,3).join(' · ') || 'aucune paire trop serrée');

  // Accessibilité — contraste 4.5:1 (et 7:1 vise par dark-mode-oled)
  const faibles = d.textes.filter(t => contraste(rgb(t.col), rgb(t.fond)) < 4.5);
  const sous7  = d.textes.filter(t => contraste(rgb(t.col), rgb(t.fond)) < 7);
  ok('A11y · contraste ≥ 4,5:1', faibles.length===0,
     faibles.length ? faibles.map(t=>`${contraste(rgb(t.col),rgb(t.fond)).toFixed(1)}:1 « ${t.txt} »`).slice(0,4).join(' · ')
                    : `${d.textes.length} textes contrôlés`);
  ok('A11y · contraste ≥ 7:1 (viser, OLED)', sous7.length===0,
     `${sous7.length} texte(s) entre 4,5 et 7 — acceptable, mais c\'est la marge`);

  // Accessibilité — boutons sans texte
  const muets = d.cibles.filter(c => c.txt===0 && !c.aria);
  ok('A11y · bouton sans texte a un libellé', muets.length===0,
     muets.length ? `${muets.length} sans aria-label ni title` : 'tous nommés');

  // Responsive
  ok('Responsive · meta viewport', /width=device-width/.test(d.viewport), d.viewport);
  ok('Responsive · pas de défilement horizontal', !d.scrollH, d.scrollH ? 'la page déborde en largeur' : 'contenu dans la largeur');
  const petitTexte = d.textes.filter(t => t.taille < 12);
  ok('Responsive · corps de texte lisible', petitTexte.length===0,
     petitTexte.length ? `${petitTexte.length} sous 12 px, le plus petit ${Math.min(...petitTexte.map(t=>t.taille))} px` : '≥ 12 px partout');

  // Images
  ok('Perf · images en chargement paresseux', d.imgs.length===0 || d.imgs.every(i=>i.lazy==='lazy'),
     `${d.imgs.filter(i=>i.lazy==='lazy').length}/${d.imgs.length} en lazy`);
  const sansAlt = d.imgs.filter(i => i.alt === null);
  ok('A11y · attribut alt présent', sansAlt.length===0, `${sansAlt.length}/${d.imgs.length} sans alt`);

  // Typographie — interlignage
  const lhServe = d.textes.filter(t => t.txt.length>40 && t.lh!=='normal')
    .map(t => parseFloat(t.lh)/t.taille).filter(x=>x&&x<1.4);
  ok('Typo · interligne 1,5 sur les blocs de texte', lhServe.length===0,
     lhServe.length ? `${lhServe.length} bloc(s) sous 1,4` : 'conforme');

  // Structure
  ok('A11y · hiérarchie de titres', d.titres.length>0, d.titres.length? d.titres.join(' ') : 'AUCUN titre h1-h6 sur la page');
  ok('A11y · langue déclarée', d.lang!=='(absent)', d.lang);

  const n = R.filter(r=>r.bon).length;
  manques += R.length - n;
  console.log(`\n===== écran « ${ECRAN} » : ${n}/${R.length} règles tenues =====\n`);
  R.forEach(r => console.log(`${r.bon?'  ok  ':'  ✗   '} ${r.regle}\n         ${r.detail}`));
  await page.close();
  }
  await nav.close();
  /* Un code de sortie, pour que la CI puisse s'en servir un jour sans avoir
     a relire la sortie a l'oeil. */
  console.log(manques ? `\n${manques} règle(s) non tenue(s).` : '\nRien à signaler.');
  process.exit(manques ? 1 : 0);
})();
