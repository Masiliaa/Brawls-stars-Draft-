// Contrôles de index.html dans un vrai navigateur.
//
//   (python3 -m http.server 8765 &) && node tests/t_app.js
//
// Nécessite playwright et un Chromium. CHROME=/chemin/vers/chrome pour
// imposer un binaire, PORT=... pour changer de port.
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8765;

let ok = 0, fail = 0;
const check = (nom, cond, detail = '') => {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { fail++; console.log('  FAIL ' + nom + '   ' + JSON.stringify(detail)); }
};

(async () => {
  const nav = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await nav.newPage();

  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) erreurs.push('console: ' + m.text()); });

  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });

  console.log('\n== chargement ==');
  check('aucune erreur JS', erreurs.length === 0, erreurs);
  check('app rendue', (await page.locator('#app .logo').textContent()) === 'Le Manager');
  check('ecran initial = choisir la carte', await page.getByText('Choisir la carte').first().isVisible());

  // L'API brawlapi est bloquée ici : on injecte des classes pour pouvoir
  // tester le cycle de familles, comme le ferait l'API en vrai.
  await page.evaluate(() => {
    const cls = { mortis: 'Assassin', barley: 'Artillery', piper: 'Marksman',
                  jacky: 'Tank', shade: 'Assassin', poco: 'Support',
                  surge: 'Damage Dealer', bibi: 'Tank', bo: 'Marksman',
                  emz: 'Controller', bull: 'Tank', colt: 'Damage Dealer' };
    Object.keys(cls).forEach(k => { if (parClef[k]) parClef[k].classe = cls[k]; });
  });

  console.log('\n== moteur : carte + roster ==');
  const base = await page.evaluate(() => {
    carteId = 'safe-zone';                     // Braquage
    roster = new Set(['mortis', 'barley', 'piper', 'jacky', 'bo', 'emz', 'colt', 'bull']);
    ennemis = []; allies = []; bans = [];
    return conseils().map(x => [x.k, x.score, x.raison]);
  });
  check('4 conseils rendus', base.length === 4, base);
  check('triés par score décroissant',
    base.every((x, i) => i === 0 || base[i - 1][1] >= x[1]), base.map(x => x[1]));
  check('raison non vide', base.every(x => x[2] && x[2].length > 3), base);

  console.log('\n== bans et picks exclus ==');
  const exclu = await page.evaluate(() => {
    bans = ['colt']; ennemis = ['bo']; allies = ['emz'];
    const r = conseils().map(x => x.k);
    bans = []; ennemis = []; allies = [];
    return r;
  });
  check('banni absent', !exclu.includes('colt'), exclu);
  check('ennemi absent', !exclu.includes('bo'), exclu);
  check('allié absent', !exclu.includes('emz'), exclu);

  // conseils() ne renvoie que les 4 premiers : on isole un petit roster pour
  // que chaque candidat testé soit forcément visible dans le résultat.
  const petit = "roster = new Set(['mortis','piper','jacky','poco']); ennemis=[]; allies=[]; bans=[];";

  console.log('\n== repli cycle de familles (COUNTERS vide) ==');
  const cycle = await page.evaluate(p => {
    eval(p); COUNTERS = {};
    ennemis = ['barley'];                       // Artillery -> contrôle
    return conseils().map(x => [x.k, x.score, x.raison]);
  }, petit);
  const mortisCycle = cycle.find(x => x[0] === 'mortis');
  check('agression bonifiée contre contrôle',
    mortisCycle && /agression contre leur contrôle/.test(mortisCycle[2]), cycle);
  const piperCycle = cycle.find(x => x[0] === 'piper');   // portée, battue par agression ? non : portée bat agression
  check('les deux familles notées', piperCycle !== undefined, cycle);

  console.log('\n== COUNTERS : le matchup prend le pas sur le cycle ==');
  const res = await page.evaluate(p => {
    eval(p);
    const sans = {};
    conseils().forEach(x => sans[x.k] = x.score);
    COUNTERS = {
      barley: {
        perd: [['mortis', 'Se faufile entre les arcs lents des bouteilles']],
        bat: [['piper', 'Le noie sous les flaques dès qu’il se pose']]
      }
    };
    ennemis = ['barley'];
    const apres = conseils().map(x => [x.k, x.score, x.raison]);
    return { sans, apres };
  }, petit);
  const m = res.apres.find(x => x[0] === 'mortis');
  const pi = res.apres.find(x => x[0] === 'piper');
  check('raison nomme l’ennemi et cite l’explication',
    m && /^bat Barley : Se faufile/.test(m[2]), m);
  check('mortis passe devant', res.apres[0][0] === 'mortis', res.apres);
  check('cycle de familles neutralisé pour cet ennemi',
    m && !/agression contre/.test(m[2]), m);
  check('bonus de +12 au gagnant', m && m[1] === res.sans.mortis + 12,
    { avec: m && m[1], sans: res.sans.mortis });
  check('malus de −12 au perdant', pi && pi[1] === res.sans.piper - 12,
    { avec: pi && pi[1], sans: res.sans.piper });

  console.log('\n== SYNERGIE ==');
  const syn = await page.evaluate(p => {
    eval(p); COUNTERS = {};
    allies = ['poco'];
    const sans = conseils().find(x => x.k === 'mortis').score;   // inclut PT_ROLE
    SYNERGIE = { 'mortis|poco': 2.0 };
    const a = conseils().find(x => x.k === 'mortis');
    SYNERGIE = { 'mortis|poco': 40 };            // au-delà du plafond
    const plafond = conseils().find(x => x.k === 'mortis').score;
    SYNERGIE = { 'mortis|poco': -3.0 };
    const negatif = conseils().find(x => x.k === 'mortis');
    SYNERGIE = {};
    return { sans, avec: a.score, raison: a.raison, plafond,
             negatif: negatif.score, raisonNeg: negatif.raison };
  }, petit);
  check('un duo mesuré positif bat une paire inconnue', syn.avec > syn.sans, syn);
  check('bonus proportionnel (2,0 → +4), rôles conservés', syn.avec === syn.sans + 4, syn);
  check('synergie plafonnée à +10', syn.plafond === syn.sans + 10, syn);
  check('synergie négative pénalisée', syn.negatif === syn.sans - 6, syn);
  check('raison synergie lisible', /marche avec Poco/.test(syn.raison), syn.raison);
  // La raison affichée est la meilleure du candidat : on ne veut pas d'un
  // motif décourageant sous un brawler que l'app recommande.
  check('pas de motif négatif sous un pick recommandé',
    !/faible|mauvais|perd contre|double un rôle/.test(syn.raisonNeg), syn.raisonNeg);

  console.log('\n== pied de page honnête ==');
  const note1 = await page.evaluate(() => { COUNTERS = {}; SYNERGIE = {}; return noteHTML(); });
  check('dit que la table de matchups manque', /Table de matchups absente/.test(note1));
  check('dit que les alliés ne servent qu’aux rôles', /pas à une synergie mesurée/.test(note1));
  const note2 = await page.evaluate(() => {
    COUNTERS = { a: {}, b: {} }; SYNERGIE = { 'a|b': 1 }; return noteHTML();
  });
  check('annonce le nb de brawlers couverts', /Matchups : 2 brawlers/.test(note2), note2);
  check('ne présente pas les counters comme une mesure',
    /pas une mesure statistique/.test(note2), note2);
  check('mentionne Supercell', /non affilié à Supercell/.test(note2));

  // Une source non relevée ne doit jamais hériter de la date d'une autre.
  const note3 = await page.evaluate(() => {
    COUNTERS = { a: {}, b: {} }; SYNERGIE = {};
    MAJ.matchups = ['01/09/2026', 'brawlcalculator.com'];
    const s = noteHTML();
    MAJ.matchups = null;
    return s;
  });
  check('date propre à chaque source',
    /Tiers par mode relevés le 29\/07\/2026/.test(note3) &&
    /relevés le 01\/09\/2026 sur brawlcalculator\.com/.test(note3), note3);
  const note4 = await page.evaluate(() => {
    COUNTERS = { a: {} }; MAJ.matchups = null;
    const s = noteHTML(); COUNTERS = {}; return s;
  });
  check('aucune date inventée pour une source non datée',
    /Matchups : 1 brawler,/.test(note4) && !/1 brawler relevé le/.test(note4), note4);

  console.log('\n== persistance du roster ==');
  const cle = await page.evaluate(() => {
    roster = new Set(['mortis', 'piper']); sauver();
    return localStorage.getItem('manager:roster');
  });
  check('clé manager:roster inchangée', JSON.parse(cle).sort().join() === 'mortis,piper', cle);

  console.log('\n== repli des images ==');
  const img = await page.evaluate(() => {
    const h = portrait({ nom: 'Larry & Lawrie', k: 'larrylawrie' }, 40, false);
    const d = document.createElement('div'); d.innerHTML = h;
    const el = d.querySelector('img');
    const chaine = [el.getAttribute('src')].concat(el.getAttribute('data-fb').split('|'));
    fbImg(el); const apres1 = el.getAttribute('src');
    return { chaine, apres1, ini: el.getAttribute('data-ini') };
  });
  check('1re source = brawltime (assets off)',
    /media\.brawltime\.ninja/.test(img.chaine[0]), img.chaine);
  check('repli suivant = brawlify', /cdn\.brawlify\.com/.test(img.apres1), img);
  check('slug correct', /larry___lawrie/.test(img.chaine[0]), img.chaine[0]);
  check('initiales en dernier recours', img.ini === 'LL', img.ini);

  const finale = await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = portrait({ nom: 'Mortis', k: 'mortis' }, 40, false);
    document.body.appendChild(d);
    const el = d.querySelector('img');
    for (let i = 0; i < 6 && d.querySelector('img'); i++) fbImg(d.querySelector('img'));
    return d.innerHTML;
  });
  check('finit sur les initiales, pas sur du vide', /<em>MO<\/em>/.test(finale), finale);

  console.log('\n== parcours complet à l’écran ==');
  await page.evaluate(() => { COUNTERS = {}; SYNERGIE = {}; carteId = null; ennemis = []; allies = []; bans = []; roster = new Set(['mortis','piper','bo','emz']); vue = 'draft'; render(); });
  await page.getByText('Choisir la carte').first().click();
  check('liste des cartes affichée', await page.getByText('Safe Zone').first().isVisible());
  await page.getByText('Safe Zone').first().click();
  check('hero affiché après choix', await page.locator('.hero .name').first().isVisible());
  check('bouton "Prends" présent', (await page.locator('.ribbon').first().textContent()) === 'Prends');
  await page.locator('[data-act="addE"]').click();
  check('grille de choix ennemi', await page.locator('#grid .cel').first().isVisible());
  await page.locator('#grid .cel').first().click();
  check('ennemi ajouté', (await page.locator('[data-act="rme"]').count()) === 1);
  check('toujours aucune erreur JS', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
