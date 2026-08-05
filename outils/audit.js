// Audit d'ergonomie : ce que l'oeil ne mesure pas.
//
//   (python3 -m http.server 8765 &) && node outils/audit.js
//
// Trois criteres, sur sept ecrans :
//   - zones tactiles sous 32 px — le logo en faisait 15, il « ne marchait
//     pas toujours » parce qu'il fallait viser une bande de la hauteur d'un
//     trait ;
//   - contraste sous 4,5:1 — le pied de page etait a 2,7:1, et c'est lui qui
//     porte la mention Supercell ;
//   - boutons sans nom lisible, ni texte ni title ni aria-label.
//
// Il ne remplace pas les tests : ceux-la disent si l'app marche, celui-ci
// dit si elle s'utilise. A relancer apres tout changement d'apparence.
const { chromium } = require('playwright');
// Meme convention que les suites de tests/ : CHROME impose un binaire, sinon
// on prend celui de playwright. Le chemin du bac a sable etait ecrit en dur
// ici, ce qui marchait tant que ce fichier ne tournait que sur ma machine —
// et exactement jusqu'a ce qu'on le mette en integration continue.
const PORT = process.env.PORT || 8765;
const BASE = 'http://127.0.0.1:' + PORT;
const ETATS = {
  'accueil':   `carteId=null; ennemis=[];allies=[];bans=[]; ecran='draft'; cibleAjout=null;`,
  'draft':     `carteId='center-stage'; ennemis=['piper','bull']; allies=['poco']; bans=['leon']; ecran='draft'; cibleAjout=null;`,
  'phase ban': `carteId='center-stage'; ennemis=[];allies=[];bans=[]; ecran='draft'; cibleAjout=null;`,
  'cartes':    `ecran='cartes'; recherche=''; modeOuvert=null; cibleAjout=null;`,
  'choix':     `ecran='draft'; cibleAjout='ennemi'; recherche='';`,
  'roster':    `ecran='roster'; cibleAjout=null; recherche='';`,
  'analyse':   `carteId='center-stage'; ennemis=['piper','bull']; ecran='draft'; cibleAjout=null; vueAnalyse=true;`,
};
const lum = (c) => { const [r,g,b]=c.match(/\d+/g).map(Number).map(v=>{v/=255;
  return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; };
(async () => {
  const b = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage({ viewport:{width:390,height:844}, locale:'fr-FR' });
  await p.goto(BASE + '/index.html');
  await p.evaluate(() => localStorage.setItem('manager:langue','fr'));
  await p.reload(); await p.waitForTimeout(300);
  const trouve = {};
  for (const [nom, prep] of Object.entries(ETATS)) {
    const r = await p.evaluate(([prep]) => {
      roster=new Set(brawlers.map(x=>x.k)); sauverRoster();
      vueAnalyse=false; eval(prep); render();
      const vus = [];
      // Zones tactiles trop petites (Apple : 44 px)
      document.querySelectorAll('[data-act], a').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width && r.height && (r.height < 32 || r.width < 32)) {
          vus.push('zone tactile ' + Math.round(r.width) + '×' + Math.round(r.height)
            + ' — ' + (e.className || e.tagName).toString().slice(0,28));
        }
      });
      // Boutons sans nom lisible (ni texte ni title ni aria-label)
      document.querySelectorAll('button').forEach(e => {
        const nom = (e.innerText||'').trim() || e.getAttribute('title') || e.getAttribute('aria-label');
        if (!nom) vus.push('bouton sans nom — ' + (e.className||'?').toString().slice(0,34));
      });
      // Texte trop pâle sur le fond
      const contrastes = [];
      document.querySelectorAll('body *').forEach(e => {
        if (!e.childNodes.length || e.children.length || e.closest('head')) return;
        const t = (e.innerText||'').trim(); if (!t) return;
        const s = getComputedStyle(e);
        contrastes.push([t.slice(0,26), s.color, parseFloat(s.fontSize)]);
      });
      return { vus, contrastes };
    }, [prep]);
    const petits = [...new Set(r.vus)];
    if (petits.length) trouve[nom] = petits;
    for (const [txt, col, taille] of r.contrastes) {
      const L = lum(col), ratio = (L + 0.05) / (0.0035 + 0.05);
      if (ratio < 4.5 && taille < 18) {
        (trouve[nom] = trouve[nom]||[]).push('contraste ' + ratio.toFixed(1) + ':1 (' + taille + 'px) « ' + txt + ' »');
      }
    }
  }
  for (const [k,v] of Object.entries(trouve)) {
    console.log('\n— ' + k + ' —');
    [...new Set(v)].slice(0,8).forEach(x => console.log('   ' + x));
  }
  if (!Object.keys(trouve).length) console.log('\nRien à signaler.');
  await b.close();
})();
