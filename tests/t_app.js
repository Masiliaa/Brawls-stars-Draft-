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
  // locale fr-FR : verifie aussi la detection automatique de la langue.
  const page = await nav.newPage({ locale: 'fr-FR' });

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
  // Un seul ennemi connu : deux picks adverses peuvent encore répondre, donc
  // le matchup ne vaut pas plein tarif (voir FIABILITE_MATCHUP).
  const attendu = await page.evaluate(() => Math.round(PT_MATCHUP * FIABILITE_MATCHUP[1]));
  check('bonus au gagnant, pondéré par l’ordre de pick',
    m && m[1] === res.sans.mortis + attendu,
    { avec: m && m[1], sans: res.sans.mortis, attendu });
  check('malus au perdant, pondéré de la même façon',
    pi && pi[1] === res.sans.piper - attendu,
    { avec: pi && pi[1], sans: res.sans.piper, attendu });

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

  console.log('\n== couverture alliée (repli sans duo mesuré) ==');
  // Personne ne publie de taux de victoire en duo. La table de matchups, elle,
  // dit qui bat qui : si l'allié bat ce qui te bat, la paire tient. C'est une
  // déduction, pas une mesure -- d'où un barème plus bas et un texte qui
  // affiche l'échantillon.
  const cv = await page.evaluate(() => {
    const vraiCounters = COUNTERS;
    // Cible battue par trois lanceurs ; l'allié « edgar » les bat tous.
    COUNTERS = {
      cible: { perd: [], bat: [] },
      // « perd » liste qui bat cette entrée : edgar bat les trois lanceurs.
      lanceur1: { perd: [['edgar', null]], bat: [['cible', null]] },
      lanceur2: { perd: [['edgar', null]], bat: [['cible', null]] },
      lanceur3: { perd: [['edgar', null]], bat: [['cible', null]] },
      inutile: { perd: [], bat: [['cible', null]] }
    };
    SYNERGIE = {};
    const menaces = menacesContre('cible');
    const couv = couvertureAlliee('cible', 'edgar');
    const rien = couvertureAlliee('cible', 'poco');
    // Sous MENACES_MIN, on ne prétend rien : c'est un manque de données.
    COUNTERS = { maigre: { perd: [], bat: [['x', null]] } };
    const troppeu = couvertureAlliee('x', 'maigre');
    COUNTERS = vraiCounters;
    return { menaces, couv, rien, troppeu, min: MENACES_MIN, pts: PT_COUVERTURE };
  });
  check('les menaces sont lues dans les deux sens',
    cv.menaces.length === 4, cv.menaces);
  check('l\'allié qui couvre est reconnu', cv.couv === 0.75, cv.couv);
  check('un allié qui ne couvre rien vaut zéro', cv.rien === 0, cv.rien);
  check('trop peu de contres connus : aucune prétention', cv.troppeu === 0, cv.troppeu);
  check('la déduction pèse moins qu\'une mesure', cv.pts < 10, cv.pts);

  const cv2 = await page.evaluate(p => {
    eval(p);
    SYNERGIE = {};
    allies = [];
    const seul = conseils().find(x => x.k === 'mortis').score;
    // Un allié réel qui couvre : le score doit monter, sans dépasser le
    // plafond d'une vraie synergie mesurée.
    allies = ['poco'];
    const accompagne = conseils().find(x => x.k === 'mortis');
    allies = [];
    return { seul, score: accompagne.score, detail: accompagne.detail.allies };
  }, petit);
  check('la couverture s\'ajoute au score, sans le remplacer',
    cv2.score >= cv2.seul, cv2);
  check('l\'apport allié reste borné', Math.abs(cv2.detail) <= 16, cv2.detail);

  console.log('\n== mode Analyse : le détail est cohérent avec le score ==');
  const an = await page.evaluate(p => {
    eval(p);
    COUNTERS = { barley: { perd: [['mortis', 'Se faufile']], bat: [['piper', 'Le noie']] } };
    carteId = 'safe-zone'; ennemis = ['barley']; allies = ['poco'];
    roster = new Set(['mortis', 'piper', 'jacky', 'poco', 'bull', 'colt', 'bo', 'emz']);
    const liste = conseils(NB_ANALYSE);
    COUNTERS = {}; ennemis = []; allies = [];
    return liste.map(x => ({
      k: x.k, score: x.score, detail: x.detail,
      raisons: x.raisons, premiere: x.raison
    }));
  }, petit);
  check('le mode Analyse rend plus de brawlers que le rapide',
    an.length > 4, an.length);
  check('somme du détail = score, pour chacun',
    an.every(x => Math.abs(Object.keys(x.detail)
      .reduce((s, k) => s + x.detail[k], 0) - x.score) < 0.001),
    an.map(x => [x.k, x.score, x.detail]));
  check('les cinq règles sont toujours détaillées',
    an.every(x => ['tier', 'carte', 'ennemis', 'risque', 'allies']
      .every(k => typeof x.detail[k] === 'number')), an[0]);
  check('toutes les raisons sont exposées, pas juste la première',
    an.some(x => x.raisons.length > 1), an.map(x => x.raisons.length));
  check('la première raison reste celle du mode rapide',
    an.every(x => x.raisons[0] === x.premiere), an[0]);
  check('classement décroissant conservé',
    an.every((x, i) => i === 0 || an[i - 1].score >= x.score), an.map(x => x.score));

  console.log('\n== ordre de pick ==');
  const pick = await page.evaluate(p => {
    eval(p);
    // Beaucoup de brawlers battent Mortis : il est donc risqué tant que
    // l'adversaire peut encore répondre.
    COUNTERS = { mortis: { perd: [['a',''],['b',''],['c',''],['d',''],
                                  ['e',''],['f',''],['g',''],['h','']], bat: [] } };
    carteId = 'safe-zone';
    roster = new Set(['mortis', 'piper', 'jacky', 'poco']);
    allies = []; bans = [];

    const mesure = n => {
      ennemis = ['barley', 'shelly', 'bull'].slice(0, n);
      const x = conseils(NB_ANALYSE).find(y => y.k === 'mortis');
      return { restantes: reponsesRestantes(), risque: x.detail.risque,
               score: x.score, raisons: x.raisons };
    };
    const out = { zero: mesure(0), un: mesure(1), deux: mesure(2), trois: mesure(3) };
    COUNTERS = {}; ennemis = [];
    return out;
  }, petit);

  check('0 ennemi connu → 3 réponses à venir', pick.zero.restantes === 3, pick.zero);
  check('3 ennemis connus → dernier pick', pick.trois.restantes === 0, pick.trois);
  check('un brawler très contrable est pénalisé en premier pick',
    pick.zero.risque < 0, pick.zero.risque);
  check('la pénalité décroît à mesure que l’adversaire perd la main',
    pick.zero.risque < pick.un.risque && pick.un.risque < pick.deux.risque,
    [pick.zero.risque, pick.un.risque, pick.deux.risque]);
  check('aucune pénalité en dernier pick', pick.trois.risque === 0, pick.trois);
  check('le dernier pick est signalé dans les raisons',
    pick.trois.raisons.join(' ').includes('dernier pick'), pick.trois.raisons);

  const fiab = await page.evaluate(p => {
    eval(p);
    COUNTERS = { barley: { perd: [['mortis', 'Se faufile']], bat: [] } };
    carteId = 'safe-zone'; roster = new Set(['mortis', 'piper']); allies = []; bans = [];
    const avec = n => {
      ennemis = ['barley', 'shelly', 'bull'].slice(0, n);
      return conseils(NB_ANALYSE).find(y => y.k === 'mortis').detail.ennemis;
    };
    const out = { un: avec(1), trois: avec(3) };
    COUNTERS = {}; ennemis = [];
    return out;
  }, petit);
  check('le même contre vaut plus en dernier pick qu’en pick avancé',
    fiab.trois > fiab.un, fiab);

  console.log('\n== bans conseillés ==');
  const ban = await page.evaluate(() => {
    COUNTERS = {};
    carteId = 'safe-zone';
    // Roster large : les 4 premiers passent en picks conseilles et sortent
    // donc des bans, mais il reste des brawlers du roster a tester.
    roster = new Set(['mortis', 'piper', 'jacky', 'poco',
                      'bull', 'colt', 'bo', 'emz', 'shelly', 'barley']);
    ennemis = []; allies = []; bans = [];

    const sansCounters = bansConseilles(NB_BANS_CONSEILLES);

    // Chuck punit trois brawlers de mon roster : il doit remonter.
    COUNTERS = { chuck: { perd: [], bat: [['mortis', ''], ['piper', ''], ['jacky', '']] } };
    // Classement complet : la penalite « tu le joues aussi » fait justement
    // sortir tes propres brawlers du haut du tableau.
    const avecCounters = bansConseilles(999);

    // Un brawler deja banni ou deja pris ne doit plus etre propose.
    bans = [sansCounters[0].k];
    ennemis = [sansCounters[1].k];
    const apresExclusion = bansConseilles(999).map(x => x.k);

    COUNTERS = {}; bans = []; ennemis = [];
    return {
      sansCounters: sansCounters.map(x => ({ k: x.k, tier: x.tier, raison: x.raison })),
      chuck: avecCounters.find(x => x.k === 'chuck'),
      rangChuck: avecCounters.findIndex(x => x.k === 'chuck'),
      // Premier brawler du roster encore proposable au ban.
      duRoster: avecCounters.find(x => roster.has(x.k)),
      picks: conseils().map(x => x.k),
      exclus: [sansCounters[0].k, sansCounters[1].k],
      apresExclusion: apresExclusion
    };
  });

  check('3 bans proposés', ban.sansCounters.length === 3, ban.sansCounters);
  check('ce sont les plus forts sur la carte',
    ban.sansCounters.every(x => x.tier === 'S' || x.tier === 'A'), ban.sansCounters);
  check('chacun est justifié',
    ban.sansCounters.every(x => x.raison && x.raison.length > 3), ban.sansCounters);
  check('un banni ou un pick n’est plus proposé',
    ban.exclus.every(k => !ban.apresExclusion.includes(k)),
    { exclus: ban.exclus, proposes: ban.apresExclusion.slice(0, 5) });
  check('celui qui punit ton roster est signalé',
    ban.chuck && /3 de tes brawlers/.test(ban.chuck.raison), ban.chuck);
  check('et il remonte dans le classement',
    ban.rangChuck < 5, { rang: ban.rangChuck, score: ban.chuck && ban.chuck.score });
  check('un brawler de ton roster est signalé comme tel',
    ban.duRoster && ban.duRoster.raisons.join(' ').includes('tu le joues aussi'),
    ban.duRoster);
  check('les picks conseillés ne sont jamais proposés au ban',
    ban.picks.every(k => !ban.apresExclusion.includes(k)),
    { picks: ban.picks, bans: ban.apresExclusion.slice(0, 6) });

  const phase = await page.evaluate(() => {
    carteId = 'safe-zone'; roster = new Set(['mortis', 'piper']);
    ennemis = []; allies = []; bans = [];
    const avantPick = phaseDeBan();
    ennemis = ['barley'];
    const apresPick = phaseDeBan();
    ennemis = []; bans = ['a', 'b', 'c', 'd', 'e', 'f'];
    const bansPleins = phaseDeBan();
    bans = [];
    return { avantPick, apresPick, bansPleins };
  });
  const contradiction = await page.evaluate(() => {
    COUNTERS = {};
    carteId = 'safe-zone';
    roster = new Set(['mortis', 'piper', 'jacky', 'poco', 'bull', 'colt', 'bo', 'emz']);
    ennemis = []; allies = []; bans = [];
    const picks = conseils().map(x => x.k);
    const bansProposes = bansConseilles(NB_BANS_CONSEILLES).map(x => x.k);
    return { picks, bansProposes,
             communs: picks.filter(k => bansProposes.includes(k)) };
  });
  check('l’app ne conseille jamais de bannir ce qu’elle conseille de prendre',
    contradiction.communs.length === 0, contradiction);

  check('la phase de ban est active avant tout pick', phase.avantPick === true);
  check('elle se termine dès le premier pick saisi', phase.apresPick === false);
  check('et quand les 6 bans sont connus', phase.bansPleins === false);

  console.log('\n== pied de page honnête ==');
  const note1 = await page.evaluate(() => { COUNTERS = {}; SYNERGIE = {}; return noteHTML(); });
  check('dit que la table de matchups manque', /Table de matchups absente/.test(note1), note1);
  check('dit que les alliés ne servent qu’aux rôles', /pas à une synergie mesurée/.test(note1));
  const note2 = await page.evaluate(() => {
    COUNTERS = { a: {}, b: {} }; SYNERGIE = { 'a|b': 1 }; return noteHTML();
  });
  check('annonce le nb de brawlers couverts', /Matchups : 2 brawlers/.test(note2), note2);
  check('ne présente pas les counters comme une mesure',
    /pas une mesure statistique/.test(note2), note2);
  check('mention Fan Content Policy de Supercell',
    /ni affilié, ni approuvé, ni sponsorisé par Supercell/.test(note2), note2);
  check('lien cliquable vers la policy',
    /href="https:\/\/supercell\.com\/fan-content-policy"/.test(note2), note2);
  // Seules les balises que la note produit elle-même sont admises : tout
  // autre « < » signalerait du texte de source non échappé.
  check('le reste de la note est bien échappé',
    !/<(?!\/?(a|div|p|details|summary)\b)/.test(note2), note2);

  // Une source non relevée ne doit jamais hériter de la date d'une autre.
  const note3 = await page.evaluate(() => {
    COUNTERS = { a: {}, b: {} }; SYNERGIE = {};
    MAJ.matchups = ['01/09/2026', 'brawlcalculator.com'];
    const s = noteHTML();
    MAJ.matchups = null;
    return s;
  });
  check('date propre à chaque source',
    /Tiers par mode · source Brawl Time Ninja, 29\/07\/2026/.test(note3) &&
    /source brawlcalculator\.com, 01\/09\/2026/.test(note3), note3);
  const note4 = await page.evaluate(() => {
    COUNTERS = { a: {} }; MAJ.matchups = null;
    const s = noteHTML(); COUNTERS = {}; return s;
  });
  check('aucune date inventée pour une source non datée',
    /Matchups : 1 brawler ·/.test(note4) && !/source/.test(note4.split('Matchups')[1]), note4);

  console.log('\n== persistance du roster ==');
  const cle = await page.evaluate(() => {
    roster = new Set(['mortis', 'piper']); sauverRoster();
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
  check('1re source = brawltime quand l’API n’a rien donné',
    /media\.brawltime\.ninja/.test(img.chaine[0]), img.chaine);
  check('slug correct', /larry___lawrie/.test(img.chaine[0]), img.chaine[0]);
  check('initiales en dernier recours', img.ini === 'LL', img.ini);

  // Vérifié le 29/07/2026 : cdn.brawlify.com/brawlers/borderless/{nom}.png
  // répond 404 pour tous les brawlers. Cette adresse ne doit pas revenir.
  const toutesSources = await page.evaluate(() => {
    return brawlers.slice(0, 20)
      .map(b => sourcesBrawler(b).filter(Boolean).join(" "))
      .join(" ");
  });
  check('l’adresse brawlify en 404 a bien disparu',
    !/cdn\.brawlify\.com\/brawlers\/borderless/.test(toutesSources),
    toutesSources.slice(0, 120));

  // L'URL fournie par l'API est la seule certaine : elle doit primer sur
  // les URL reconstruites à partir du nom.
  const ordre = await page.evaluate(() => {
    const b = { nom: 'Larry & Lawrie', k: 'larrylawrie',
                img: 'https://cdn.brawlify.com/brawler/borderless/16000042.png' };
    const d = document.createElement('div');
    d.innerHTML = portrait(b, 40, false);
    const el = d.querySelector('img');
    return [el.getAttribute('src')].concat(el.getAttribute('data-fb').split('|'));
  });
  check('URL de l’API en tête', ordre[0].includes('16000042'), ordre);
  check('brawltime conservé en repli', /brawltime/.test(ordre[1]), ordre);
  check('deux sources seulement, plus la source morte', ordre.length === 2, ordre);

  const finale = await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = portrait({ nom: 'Mortis', k: 'mortis' }, 40, false);
    document.body.appendChild(d);
    const el = d.querySelector('img');
    for (let i = 0; i < 6 && d.querySelector('img'); i++) fbImg(d.querySelector('img'));
    return d.innerHTML;
  });
  check('finit sur les initiales, pas sur du vide', /<em>MO<\/em>/.test(finale), finale);

  // Cas reel : on clique pendant qu'une image charge encore. Le nouvel
  // ecran remplace tout, l'echec de chargement arrive sur une balise qui
  // n'est plus dans la page. Ne doit pas lever d'erreur.
  const detachee = await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = portrait({ nom: 'Mortis', k: 'mortis' }, 40, false);
    const img = d.querySelector('img');
    img.setAttribute('data-fb', '');        // plus aucune source de repli
    d.innerHTML = '';                       // l'ecran est redessine
    try { fbImg(img); return 'ok'; }
    catch (e) { return 'erreur: ' + e.message; }
  });
  check('image detachee de la page : aucune erreur', detachee === 'ok', detachee);

  console.log('\n== parcours complet à l’écran ==');
  await page.evaluate(() => { COUNTERS = {}; SYNERGIE = {}; carteId = null; ennemis = []; allies = []; bans = []; roster = new Set(['mortis','piper','bo','emz']); ecran = 'draft'; render(); });
  await page.getByText('Choisir la carte').first().click();
  // L'écran est replié par mode : on ouvre le Braquage pour voir ses cartes.
  check('les modes sont listés',
    (await page.locator('[data-act="ouvrirModeCarte"]').count()) === 6);
  await page.locator('[data-act="ouvrirModeCarte"][data-v="heist"]').click();
  check('liste des cartes affichée', await page.getByText('Safe Zone').first().isVisible());
  await page.getByText('Safe Zone').first().click();
  check('hero affiché après choix', await page.locator('.hero .name').first().isVisible());
  // L'étiquette « Prends » en capitales orange a disparu avec la carte qui la
  // portait. Ce qui doit rester vérifié, c'est que le verdict porte sa mesure :
  // un nom sans son tier ni son taux serait une affirmation sans source.
  check('le verdict porte sa mesure',
    /Tier/.test(await page.locator('.hero .mesure').first().textContent()));
  await page.locator('[data-act="addE"]').click();
  check('grille de choix ennemi', await page.locator('#grid .cel').first().isVisible());
  await page.locator('#grid .cel').first().click();
  check('ennemi ajouté', (await page.locator('[data-act="rme"]').count()) === 1);
  check('toujours aucune erreur JS', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
