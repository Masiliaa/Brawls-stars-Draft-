// Audit des traductions.
//
//   (python3 -m http.server 8765 &) && node tests/t_langues.js
//
// Vérifie qu'aucune langue n'a de texte oublié, en trop, ou resté en
// français par copier-coller — et que chaque écran s'affiche entièrement
// traduit dans les trois langues.
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
  const page = await nav.newPage({ locale: 'fr-FR' });

  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });

  console.log('\n== complétude : mêmes clés partout ==');
  const cles = await page.evaluate(() => {
    const out = {};
    Object.keys(LANGUES).forEach(l => { out[l] = Object.keys(LANGUES[l].txt).sort(); });
    return out;
  });
  const langues = Object.keys(cles);
  check('trois langues déclarées', langues.length === 3, langues);

  const reference = cles.fr;
  check('au moins 40 textes par langue', reference.length >= 40, reference.length);
  langues.forEach(l => {
    const manquantes = reference.filter(k => !cles[l].includes(k));
    const enTrop = cles[l].filter(k => !reference.includes(k));
    check(l + ' : aucune clé manquante', manquantes.length === 0, manquantes);
    check(l + ' : aucune clé en trop', enTrop.length === 0, enTrop);
  });

  console.log('\n== aucune valeur vide ni oubliée ==');
  const suspects = await page.evaluate(() => {
    const out = {};
    Object.keys(LANGUES).forEach(l => {
      out[l] = { vides: [], identiquesAuFr: [] };
      Object.keys(LANGUES[l].txt).forEach(k => {
        const v = LANGUES[l].txt[k];
        if (!v || !String(v).trim()) out[l].vides.push(k);
        if (l !== 'fr' && v === LANGUES.fr.txt[k]) out[l].identiquesAuFr.push(k);
      });
    });
    return out;
  });
  langues.forEach(l => {
    check(l + ' : aucun texte vide', suspects[l].vides.length === 0, suspects[l].vides);
  });

  // Certains textes sont légitimement identiques au français : noms propres
  // de modes, « Tier {tier} », « Fan Content Policy », « brawler(s) ».
  // « tier {tier} en {mode} » s'écrit à l'identique en français et en espagnol.
  // « tier » et « score » sont des emprunts, identiques dans les trois langues.
  const NORMAL = ['modeBrawlBall', 'tier', 'lienPolicy', 'motBrawler', 'motBrawlers',
                  'famControle', 'noteCartesSansDate', 'raisonTier',
                  'libTier', 'libScore'];
  ['en', 'es'].forEach(l => {
    const douteux = suspects[l].identiquesAuFr.filter(k => !NORMAL.includes(k));
    check(l + ' : rien laissé en français par oubli', douteux.length === 0, douteux);
  });

  console.log('\n== les {accolades} sont conservées ==');
  const trous = await page.evaluate(() => {
    const extraire = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
    const out = {};
    ['en', 'es'].forEach(l => {
      out[l] = [];
      Object.keys(LANGUES.fr.txt).forEach(k => {
        if (extraire(LANGUES.fr.txt[k]) !== extraire(LANGUES[l].txt[k])) out[l].push(k);
      });
    });
    return out;
  });
  ['en', 'es'].forEach(l => {
    check(l + ' : mêmes valeurs à insérer qu’en français', trous[l].length === 0, trous[l]);
  });

  console.log('\n== t() se comporte bien ==');
  const comportement = await page.evaluate(() => {
    definirLangue('fr');
    return {
      simple: t('retour'),
      remplace: t('tier', { tier: 'A' }),
      inconnue: t('cleQuiNexistePas'),
      repli: (function () {
        const sauve = LANGUES.es.txt.retour;
        delete LANGUES.es.txt.retour;
        definirLangue('es');
        const r = t('retour');
        LANGUES.es.txt.retour = sauve;
        definirLangue('fr');
        return r;
      })()
    };
  });
  check('texte simple', comportement.simple === 'Retour', comportement.simple);
  check('valeur insérée', comportement.remplace === 'Tier A', comportement.remplace);
  check('clé inconnue renvoyée telle quelle, pas du vide',
    comportement.inconnue === 'cleQuiNexistePas', comportement.inconnue);
  check('clé absente d’une langue → repli sur l’anglais',
    comportement.repli === 'Back', comportement.repli);

  console.log('\n== séparateur décimal par langue ==');
  const nombres = await page.evaluate(() => {
    const out = {};
    ['fr', 'en', 'es'].forEach(l => { definirLangue(l); out[l] = virgule(73.1); });
    definirLangue('fr');
    return out;
  });
  check('français : 73,1', nombres.fr === '73,1', nombres.fr);
  check('anglais : 73.1', nombres.en === '73.1', nombres.en);
  check('espagnol : 73,1', nombres.es === '73,1', nombres.es);

  console.log('\n== chaque écran, dans chaque langue ==');
  // Un mot témoin par écran et par langue : s'il apparaît, l'écran est traduit.
  // Comparaison insensible à la casse : le CSS met plusieurs de ces libellés
  // en majuscules, et innerText renvoie le texte tel qu'il est affiché.
  const contient = (foin, aiguille) =>
    foin.toLowerCase().includes(aiguille.toLowerCase());
  const TEMOINS = {
    fr: { draft: 'Choisir la carte', roster: 'Tout cocher', cartes: 'Razzia de gemmes',
          conseil: 'Prends', note: 'jugement d\'experts' },
    en: { draft: 'Choose the map', roster: 'Select all', cartes: 'Gem Grab',
          conseil: 'Pick', note: 'expert judgement' },
    es: { draft: 'Elegir el mapa', roster: 'Marcar todos', cartes: 'Atrapagemas',
          conseil: 'Elige', note: 'criterio de expertos' }
  };

  for (const l of ['fr', 'en', 'es']) {
    const vu = await page.evaluate(langue => {
      definirLangue(langue);
      COUNTERS = { x: { perd: [], bat: [] } };
      carteId = null; roster = new Set(); ennemis = []; allies = []; bans = [];
      ecran = 'draft'; cibleAjout = null; render();
      const draft = document.body.innerText;

      ecran = 'roster'; render();
      const roster2 = document.body.innerText;

      ecran = 'cartes'; render();
      const cartes = document.body.innerText;

      carteId = 'safe-zone'; roster = new Set(['bull', 'colt', 'bo', 'emz']);
      ecran = 'draft'; render();
      // Les sources sont repliées : innerText ne voit pas un <details>
      // fermé. On l'ouvre, puisque c'est bien son contenu qu'on vérifie.
      const d = document.querySelector('.note details');
      if (d) d.open = true;
      const conseil = document.body.innerText;

      COUNTERS = {};
      return { draft, roster: roster2, cartes, conseil };
    }, l);

    check(l + ' : écran de départ', contient(vu.draft, TEMOINS[l].draft), TEMOINS[l].draft);
    check(l + ' : écran mes persos', contient(vu.roster, TEMOINS[l].roster), TEMOINS[l].roster);
    check(l + ' : liste des cartes', contient(vu.cartes, TEMOINS[l].cartes), TEMOINS[l].cartes);
    check(l + ' : écran de conseil', contient(vu.conseil, TEMOINS[l].conseil), TEMOINS[l].conseil);
    check(l + ' : pied de page', contient(vu.conseil, TEMOINS[l].note), TEMOINS[l].note);
  }

  console.log('\n== aucun texte français ne fuit en anglais ==');
  const fuites = await page.evaluate(() => {
    definirLangue('en');
    carteId = 'safe-zone';
    roster = new Set(['bull', 'colt', 'bo', 'emz', 'mortis']);
    ennemis = ['barley']; allies = ['poco']; bans = ['shelly'];
    ecran = 'draft'; render();
    const texte = document.body.innerText;
    definirLangue('fr');
    // Mots exclusivement français qui ne doivent jamais apparaître en EN.
    const interdits = ['choisir', 'prends', 'ajouter', 'bannis', 'équipe',
                       'victoires', 'carte', 'nouveau draft', 'mes persos'];
    const bas = texte.toLowerCase();
    return interdits.filter(m => bas.includes(m));
  });
  check('aucun mot français résiduel en anglais', fuites.length === 0, fuites);

  console.log('\n== phrases de matchup multilingues ==');
  const matchups = await page.evaluate(() => {
    const out = {};
    ['fr', 'en', 'es'].forEach(l => {
      definirLangue(l);
      out[l] = {
        troisLangues: phraseCounter({ fr: 'phrase FR', en: 'phrase EN', es: 'phrase ES' }),
        anglaisSeul: phraseCounter({ en: 'only English' }),
        chaineSimple: phraseCounter('texte brut'),
        vide: phraseCounter(null)
      };
    });
    definirLangue('fr');
    return out;
  });
  check('sert la langue demandée',
    matchups.fr.troisLangues === 'phrase FR' &&
    matchups.en.troisLangues === 'phrase EN' &&
    matchups.es.troisLangues === 'phrase ES', matchups);
  check('repli sur l’anglais si la langue manque',
    matchups.es.anglaisSeul === 'only English', matchups.es);
  check('accepte l’ancien format en chaîne',
    matchups.fr.chaineSimple === 'texte brut', matchups.fr);
  check('phrase absente → chaîne vide, pas « undefined »',
    matchups.fr.vide === '', matchups.fr);

  console.log('\n== mode Analyse, dans les trois langues ==');
  const TEMOINS_ANALYSE = { fr: 'score', en: 'score', es: 'puntuación' };
  for (const l of ['fr', 'en', 'es']) {
    const vu = await page.evaluate(lg => {
      definirLangue(lg); definirMode('analyse'); menuOuvert = null;
      carteId = 'safe-zone';
      roster = new Set(['bull', 'colt', 'bo', 'emz', 'mortis', 'shelly']);
      ennemis = []; allies = ['poco']; bans = [];
      ecran = 'draft'; render();
      const t2 = document.body.innerText.toLowerCase();
      definirMode('rapide');
      return { texte: t2, cartes: document.querySelectorAll('.analyse').length };
    }, l);
    check(l + ' : le mode Analyse est traduit',
      vu.texte.includes(TEMOINS_ANALYSE[l].toLowerCase()), TEMOINS_ANALYSE[l]);
  }

  console.log('\n== ligne de situation du draft, dans chaque langue ==');
  const SITUATION = {
    fr: { expose: 'picks adverses après le tien', dernier: 'Dernier pick' },
    en: { expose: 'enemy picks after yours', dernier: 'Last pick' },
    es: { expose: 'picks rivales después del tuyo', dernier: 'Último pick' }
  };
  for (const l of ['fr', 'en', 'es']) {
    const vu = await page.evaluate(lg => {
      definirLangue(lg); definirMode('rapide'); menuOuvert = null;
      carteId = 'safe-zone'; roster = new Set(['bull', 'colt', 'bo', 'emz']);
      allies = []; bans = [];
      ennemis = []; ecran = 'draft'; render();
      const premier = document.querySelector('.situation').innerText;
      ennemis = ['barley', 'shelly', 'piper']; render();
      const dernier = document.querySelector('.situation').innerText;
      ennemis = [];
      return { premier, dernier };
    }, l);
    check(l + ' : premier pick annoncé',
      contient(vu.premier, SITUATION[l].expose), vu.premier);
    check(l + ' : dernier pick annoncé',
      contient(vu.dernier, SITUATION[l].dernier), vu.dernier);
  }

  console.log('\n== bans conseillés, dans chaque langue ==');
  const BAN = { fr: 'À bannir en priorité', en: 'Ban these first', es: 'Banear primero' };
  for (const l of ['fr', 'en', 'es']) {
    const vu = await page.evaluate(lg => {
      definirLangue(lg); definirMode('rapide'); menuOuvert = null;
      carteId = 'safe-zone'; roster = new Set(['bull', 'colt', 'bo', 'emz']);
      ennemis = []; allies = []; bans = [];
      ecran = 'draft'; render();
      const pendant = document.body.innerText;
      const lignes = document.querySelectorAll('.conseil-ban').length;
      ennemis = ['barley']; render();
      const apres = document.querySelectorAll('.conseil-ban').length;
      ennemis = [];
      return { pendant, lignes, apres };
    }, l);
    check(l + ' : le titre des bans est traduit', contient(vu.pendant, BAN[l]), BAN[l]);
    check(l + ' : 3 bans proposés', vu.lignes === 3, vu.lignes);
    check(l + ' : ils disparaissent dès le premier pick', vu.apres === 0, vu.apres);
  }

  console.log('\n== la barre du haut tient dans tous les écrans ==');
  // « Mes persos » / « My brawlers » / « Mis brawlers » n'ont pas la même
  // largeur : la barre doit tenir même sur le plus étroit des iPhone.
  for (const largeur of [320, 375, 430]) {
    const etroite = await nav.newPage({ viewport: { width: largeur, height: 800 } });
    await etroite.goto('http://127.0.0.1:' + PORT + '/index.html',
                       { waitUntil: 'domcontentloaded' });
    for (const l of ['fr', 'en', 'es']) {
      const mesure = await etroite.evaluate(lg => {
        definirLangue(lg);
        carteId = 'safe-zone';
        roster = new Set(['bull', 'colt', 'bo', 'emz']);
        ennemis = []; allies = []; bans = [];
        ecran = 'draft'; render();
        const bar = document.querySelector('.bar');
        // Le logo est exclu : il porte le nom du produit, il cède sa place
        // aux actions et se coupe proprement avec des points de suspension.
        // Un bouton d'action tronqué, lui, est un vrai défaut — c'est ce que
        // cette mesure cherche.
        const boutons = Array.prototype.slice.call(
          document.querySelectorAll('.bar .actions button'));
        return {
          page: document.documentElement.scrollWidth > window.innerWidth,
          barre: bar.scrollWidth > bar.clientWidth + 1,
          bouton: boutons.some(b => b.scrollWidth > b.clientWidth + 1)
        };
      }, l);
      check(largeur + 'px ' + l + ' : aucun débordement',
        !mesure.page && !mesure.barre && !mesure.bouton, mesure);
    }
    await etroite.close();
  }

  console.log('\n== la langue ne touche pas au roster ==');
  const cles2 = await page.evaluate(() => {
    roster = new Set(['mortis', 'piper']); sauverRoster();
    definirLangue('es'); definirLangue('en'); definirLangue('fr');
    return {
      roster: localStorage.getItem('manager:roster'),
      langue: localStorage.getItem('manager:langue')
    };
  });
  check('clé manager:roster intacte',
    JSON.parse(cles2.roster).sort().join() === 'mortis,piper', cles2.roster);
  check('langue rangée sous sa propre clé', cles2.langue === 'fr', cles2.langue);

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
