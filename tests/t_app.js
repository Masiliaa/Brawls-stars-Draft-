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
  /* L'API est coupee par defaut dans TOUTE la suite.
     ------------------------------------------------------------------------
     Un controle ne doit jamais dependre du reseau de la machine qui le fait
     tourner. Ici la politique reseau repond 403 a api.brawlapi.com ; sur les
     serveurs de GitHub elle repond. Sept controles ont ete corriges le
     05/08/2026 pour avoir suppose l'absence de reseau au lieu de l'imposer,
     et deux vrais bugs sont passes par ce trou.
     Les blocs qui ont besoin d'une reponse la posent eux-memes par-dessus :
     une route enregistree plus tard prend le pas sur celle-ci. */
  await page.route('**/api.brawlapi.com/**', r => r.abort());


  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) erreurs.push('console: ' + m.text()); });

  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });

  console.log('\n== chargement ==');
  check('aucune erreur JS', erreurs.length === 0, erreurs);
  check('app rendue', (await page.locator('#app .logo').textContent()) === 'Le Manager');
  check('ecran initial = choisir la carte', await page.getByText('Choisir la carte').first().isVisible());

  // L'API est coupee : on injecte des classes pour pouvoir tester le cycle de
  // familles, comme le ferait l'API en vrai.
  //
  // Douze etaient injectees, et les 93 autres restaient sans classe. Le cycle
  // ne s'appliquait donc jamais a eux, et une regle qui se serait eteinte pour
  // ces 93-la serait passee inapercue. Les douze gardent leur classe exacte —
  // les tests qui suivent en dependent — et tous les autres en recoivent une,
  // repartie sur les trois familles.
  const couverture = await page.evaluate(() => {
    const cls = { mortis: 'Assassin', barley: 'Artillery', piper: 'Marksman',
                  jacky: 'Tank', shade: 'Assassin', poco: 'Support',
                  surge: 'Damage Dealer', bibi: 'Tank', bo: 'Marksman',
                  emz: 'Controller', bull: 'Tank', colt: 'Damage Dealer' };
    const roue = ['Assassin', 'Controller', 'Marksman'];
    brawlers.forEach(function (b, i) {
      b.classe = cls[b.k] || roue[i % roue.length];
    });
    indexerBrawlers();
    return { total: brawlers.length,
             sansClasse: brawlers.filter(b => !b.classe).length,
             familles: new Set(brawlers.map(b => FAMILLE_DE_CLASSE[b.classe])).size };
  });
  check('tous les brawlers ont une classe, pas seulement douze',
    couverture.sansClasse === 0 && couverture.total > 100, couverture);
  check('et les trois familles sont représentées',
    couverture.familles === 3, couverture);

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
  // Ce controle verifiait « piperCycle !== undefined ». Piper est dans le
  // roster, donc conseils() le renvoie TOUJOURS : l'assertion ne pouvait pas
  // echouer, quel que soit le comportement du cycle. Elle comptait pour un
  // controle vert sans rien controler.
  // Ce qu'on veut savoir : le cycle joue-t-il dans les DEUX sens ? Mortis
  // (agression) gagne contre Barley (controle) ; Piper (portee) perd contre
  // lui, puisque controle bat portee.
  const piperCycle = cycle.find(x => x[0] === 'piper');
  const neutre = await page.evaluate(p => {
    eval(p); COUNTERS = {}; ennemis = [];
    const s = {}; conseils().forEach(x => s[x.k] = x.score); return s;
  }, petit);
  check('le cycle bonifie qui gagne',
    mortisCycle[1] > neutre.mortis, { avec: mortisCycle[1], sans: neutre.mortis });
  check('et pénalise qui perd',
    piperCycle && piperCycle[1] < neutre.piper,
    { avec: piperCycle && piperCycle[1], sans: neutre.piper });
  // La phrase exacte depend de la raison retenue : le cycle lui-meme
  // (« portee contre leur controle ») ou le verdict de composition
  // (« mauvais face a leur composition »). Ce qui compte est qu'une raison
  // soit donnee, pas laquelle — un malus silencieux serait le defaut.
  check('le malus est nommé, pas silencieux',
    piperCycle && /contre leur|composition/.test(piperCycle[2]),
    piperCycle && piperCycle[2]);

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

  // detail.ennemis est la SOMME sur tous les ennemis. Pour comparer le meme
  // contre a deux positions de pick, il faut donc que les deux ennemis en
  // plus n'apportent rien — sinon on mesure leur contribution, pas la
  // ponderation.
  //
  // Ils n'apportaient rien ici par accident : le cycle de familles a besoin
  // de « classe », qui vient de l'API, et l'API ne repond pas depuis le bac
  // a sable ou ce test a ete ecrit. Sur les serveurs de GitHub elle repond,
  // le cycle s'appliquait, et le test tombait — 10 contre 4 au lieu de
  // l'inverse. Le test avait raison de tomber : il ne mesurait pas ce qu'il
  // annoncait. On neutralise donc la classe explicitement, au lieu de
  // compter sur un reseau absent.
  const fiab = await page.evaluate(p => {
    eval(p);
    COUNTERS = { barley: { perd: [['mortis', 'Se faufile']], bat: [] } };
    carteId = 'safe-zone'; roster = new Set(['mortis', 'piper']); allies = []; bans = [];
    const classes = {};
    ['shelly', 'bull'].forEach(k => {
      const b = brawlers.find(x => x.k === k);
      if (b) { classes[k] = b.classe; b.classe = null; }
    });
    const avec = n => {
      ennemis = ['barley', 'shelly', 'bull'].slice(0, n);
      return conseils(NB_ANALYSE).find(y => y.k === 'mortis').detail.ennemis;
    };
    const out = { un: avec(1), trois: avec(3) };
    Object.keys(classes).forEach(k => {
      brawlers.find(x => x.k === k).classe = classes[k];
    });
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

  // Vérifié le 29/07/2026 : cdn.brawlify.com/brawlers/borderless/{NOM}.png
  // répond 404 pour tous les brawlers. C'était une adresse DEVINÉE à partir
  // du nom, jamais contrôlée, et elle ne doit pas revenir.
  //
  // Ce qu'on interroge, c'est donc ce que NOTRE code fabrique — pas ce que
  // l'API renvoie. La distinction n'est pas théorique : l'API sert elle aussi
  // du cdn.brawlify.com, mais par identifiant numérique (…/borderless/
  // 16000027.png), ce qui est une autre adresse, et c'est sa réponse, pas
  // notre invention. Le motif précédent ne les distinguait pas : il passait
  // ici, où l'API est injoignable, et tombait sur les serveurs de GitHub, où
  // elle répond. On donne donc une fiche SANS img pour ne regarder que les
  // adresses reconstruites.
  const fabriquees = await page.evaluate(() => {
    return brawlers.slice(0, 20)
      .map(b => sourcesBrawler({ nom: b.nom, k: b.k, img: null })
                  .filter(Boolean).join(" "))
      .join(" ");
  });
  check('aucune adresse brawlify n’est reconstruite par nous',
    !/cdn\.brawlify\.com/.test(fabriquees), fabriquees.slice(0, 120));

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

  // La grille etait coupee a 60 par un slice(0, 60), sur 105 brawlers : 45 ne
  // figuraient nulle part, et rien a l'ecran ne le disait. Qui descend
  // jusqu'en bas sans trouver son adversaire en conclut que l'app ne le
  // connait pas. Le classement par probabilite reste, la coupe non.
  const grille = await page.evaluate(() => ({
    cases: document.querySelectorAll('#grid .cel').length,
    connus: brawlers.length,
    engages: dejaEngages().length,
  }));
  check('la grille montre TOUS les brawlers désignables',
    grille.cases === grille.connus - grille.engages, grille);

  await page.locator('#grid .cel').first().click();
  check('ennemi ajouté', (await page.locator('[data-act="rme"]').count()) === 1);

  // ── La transformation de chargerBrawlers() ─────────────────────────────
  // Elle porte cinq cas particuliers, chacun ecrit apres un incident reel, et
  // AUCUN n'etait exerce : ces branches ne s'executent que lorsque l'API
  // repond, ce qui n'arrive jamais sur la machine ou ce code est ecrit.
  //
  // On appelle la VRAIE fonction, pas une copie de sa logique : un test qui
  // reimplemente ce qu'il controle ne controle rien. La fausse reponse est
  // donc completee jusqu'a depasser MIN_CATALOGUE, sinon chargerBrawlers()
  // refuse le catalogue — ce qui est le comportement voulu, verifie a part.
  console.log('\n== ce que chargerBrawlers() fait de la reponse ==');
  {
    const CAS = [
      // ordre volontairement melange : la sortie doit etre triee par nom
      { name: 'Zola', released: true, imageUrl: 'http://a/z.png',
        class: { name: 'Tank' }, rarity: { id: 3, name: 'Super Rare', color: '#00ff00' } },
      // imageUrl2 doit primer sur imageUrl
      { name: 'Alma', released: true, imageUrl: 'http://a/vieux.png',
        imageUrl2: 'http://a/neuf.png',
        class: { name: 'Marksman' }, rarity: { id: 1, name: 'Common', color: '#fff' } },
      // « Unknown » n'est pas une classe : elle doit devenir null
      { name: 'Brix', released: true, class: { name: 'Unknown' },
        rarity: { id: 2, name: 'Rare', color: '#123456' } },
      // couleur invalide relevee en vrai le 04/08/2026 : « #fff11ev »
      { name: 'Cyre', released: true, class: { name: 'Support' },
        rarity: { id: 6, name: 'Legendary', color: '#fff11ev' } },
      // rarity.id non numerique : rarete doit valoir null
      { name: 'Dane', released: true, class: { name: 'Controller' },
        rarity: { id: 'six', name: 'Legendary', color: '#abc' } },
      // ni image, ni rarity, ni class
      { name: 'Eero', released: true },
      // released:false : doit disparaitre
      { name: 'Fantome', released: false, class: { name: 'Tank' } },
    ];
    // De quoi depasser le seuil, sans interferer avec les cas ci-dessus.
    const bourrage = [];
    for (let i = 0; i < 50; i++) {
      bourrage.push({ name: 'Test' + String(i).padStart(2, '0'), released: true,
        class: { name: 'Tank' }, rarity: { id: 4, name: 'Epic', color: '#a0f' } });
    }
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ list: CAS.concat(bourrage) }) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());

    const r = await p.evaluate(async () => {
      const liste = await chargerBrawlers();
      if (!liste) return { refuse: true };
      const par = {}; liste.forEach(b => { par[b.nom] = b; });
      return { refuse: false, total: liste.length,
               noms: liste.slice(0, 6).map(b => b.nom), par: par };
    });
    check('la vraie fonction rend bien un catalogue', r.refuse === false, r);
    check('un brawler non sorti est écarté',
      !r.par.Fantome && r.total === 56, r.total);
    check('les noms sont triés',
      r.noms.join(',') === 'Alma,Brix,Cyre,Dane,Eero,Test00', r.noms);
    check('imageUrl2 prime sur imageUrl',
      r.par.Alma.img === 'http://a/neuf.png', r.par.Alma.img);
    check('imageUrl sert de repli', r.par.Zola.img === 'http://a/z.png', r.par.Zola.img);
    check('aucune image : null, pas une chaîne vide',
      r.par.Eero.img === null, r.par.Eero.img);
    check('la classe « Unknown » devient null',
      r.par.Brix.classe === null, r.par.Brix.classe);
    check('une vraie classe est gardée', r.par.Zola.classe === 'Tank', r.par.Zola.classe);
    check('la couleur « #fff11ev » est refusée',
      r.par.Cyre.couleur === null, r.par.Cyre.couleur);
    check('une couleur valide est gardée',
      r.par.Zola.couleur === '#00ff00', r.par.Zola.couleur);
    check('un identifiant de rareté non numérique donne null',
      r.par.Dane.rarete === null, r.par.Dane.rarete);
    check('une rareté valide est gardée',
      r.par.Zola.rarete && r.par.Zola.rarete.id === 3, r.par.Zola.rarete);
    check('la clé est normalisée depuis le nom', r.par.Alma.k === 'alma', r.par.Alma.k);
    await p.close();
  }

  // Et sous le seuil, la meme fonction doit REFUSER — c'est le garde-fou qui
  // empeche une reponse tronquee d'ecraser un bon catalogue.
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ list: [{ name: 'Seul', released: true }] }) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    const r = await p.evaluate(async () => ({
      rendu: await chargerBrawlers(), seuil: MIN_CATALOGUE, etat: etatApi }));
    check('sous le seuil, chargerBrawlers refuse le catalogue',
      r.rendu === null, r.rendu);
    check('et le dit dans etatApi', r.etat !== 'ok', r.etat);
    await p.close();
  }

  // ── Quatre choses qui marchaient mal sans mentir ───────────────────────
  console.log('\n== quatre frictions mesurées ==');

  // 1. L'adresse d'image vient de l'API, donc de l'exterieur : elle doit etre
  //    echappee comme n'importe quel autre texte. Mesure avant correction :
  //    une adresse contenant un guillemet posait un attribut sur la balise.
  {
    const r = await page.evaluate(() => {
      const piege = 'http://x/a.png" data-piege="oui';
      const d = document.createElement('div');
      d.innerHTML = portrait({ nom: 'Test', k: 'test', img: piege }, 40, false);
      const img = d.querySelector('img');
      return { injecte: img.hasAttribute('data-piege'), src: img.getAttribute('src') };
    });
    check('une adresse d\'image piégée n\'injecte pas d\'attribut',
      r.injecte === false, r);
    check('et l\'adresse est gardée telle quelle dans src',
      r.src === 'http://x/a.png" data-piege="oui', r.src);
  }

  // 2. « manager:vus » etait reecrit a CHAQUE dessin, donc a chaque case
  //    cochee : dix cases, onze reecritures, 9 Ko. Une fois par visite suffit.
  {
    const p = await nav.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    let corps = null;
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(corps) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    const noms = await p.evaluate(() => brawlers.map(b => b.nom));
    corps = { list: noms.map(n => ({ name: n, released: true, class: { name: 'Tank' },
      rarity: { id: 4, name: 'Epic', color: '#a0f' } })) };
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForFunction(() => etatApi === 'ok', null, { timeout: 15000 });
    await p.evaluate(() => {
      window.__n = 0;
      const vrai = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k) {
        if (k === 'manager:vus') window.__n++;
        return vrai.apply(this, arguments);
      };
      ecran = 'roster'; render();
    });
    for (let i = 0; i < 10; i++) await p.locator('#grid .cel').nth(i).click();
    const n = await p.evaluate(() => window.__n);
    check('« vus » est écrit une fois par visite, pas à chaque case', n <= 1, n);
    // Et il doit quand meme etre ecrit en repartant de l'ecran.
    await p.locator('.bar .actions [data-act="draft"]').click();
    await p.locator('[data-act="roster"]').first().click();
    const apres = await p.evaluate(() => window.__n);
    check('mais il l\'est de nouveau à la visite suivante', apres > n, { n, apres });
    await p.close();
  }

  // 3. Une premiere reponse PARTIELLE de /v1/gamemodes etait gardee et plus
  //    jamais redemandee : les modes muets le restaient pour de bon.
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.abort());
    let complet = false;
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ list: complet
        ? [['Brawl-Ball', 'bb'], ['gemGrab', 'gg'], ['Heist', 'he'],
           ['Bounty', 'bo'], ['knockout', 'ko'], ['hotZone', 'hz']]
            .map(([h, i]) => ({ hash: h, imageUrl: 'http://i/' + i + '.png' }))
        : [{ hash: 'Brawl-Ball', imageUrl: 'http://i/bb.png' }] }) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: 'networkidle' });
    const partiel = await p.evaluate(() => Object.keys(IMAGES_MODES).length);
    complet = true;
    await p.reload({ waitUntil: 'networkidle' });
    // Attente BORNEE, et qui ne jette pas : si l'app ne redemande jamais, le
    // controle doit ECHOUER proprement, pas planter la suite et emporter tout
    // ce qui suit. Une premiere version utilisait waitForFunction sans
    // rattrapage — avec l'ancien code elle expirait, et les controles d'apres
    // n'etaient meme pas executes.
    await p.waitForFunction(() => Object.keys(IMAGES_MODES).length > 1,
      null, { timeout: 5000 }).catch(() => {});
    const apres = await p.evaluate(() => Object.keys(IMAGES_MODES).length);
    check('un jeu d\'icônes incomplet est redemandé',
      partiel === 1 && apres === 6, { partiel, apres });
    await p.close();
  }

  // 4. « Tout cocher » travaillait sur la liste PERIMEE pendant que le
  //    catalogue attendait : 105 coches alors que 107 attendaient.
  {
    const p = await nav.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    let go; const att = new Promise(r => { go = r; }); let corps = null;
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/brawlers**', async r => {
      await att; await r.fulfill({ status: 200, contentType: 'application/json',
                                   body: JSON.stringify(corps) }); });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: 'domcontentloaded' });
    const noms = await p.evaluate(() => brawlers.map(b => b.nom));
    corps = { list: noms.concat(['Zilpha', 'Vondra']).map(n => ({
      name: n, released: true, class: { name: 'Tank' },
      rarity: { id: 4, name: 'Epic', color: '#a0f' } })) };
    await p.evaluate(() => { ecran = 'roster'; render(); });
    go();
    await p.waitForFunction(() => etatApi === 'ok', null, { timeout: 5000 })
      .catch(() => {});
    const r = await p.evaluate(() => {
      ACTIONS.tout(); render();
      return { coches: roster.size,
               affiches: brawlers.length,
               enAttente: catalogueEnAttente ? catalogueEnAttente.length : null };
    });
    check('« tout cocher » coche le vrai catalogue, pas la liste périmée',
      r.coches === r.enAttente && r.enAttente > r.affiches, r);
    await p.close();
  }

  // ── Les icones de modes ────────────────────────────────────────────────
  // Aucune suite ne simulait /v1/gamemodes : les controles faisaient un VRAI
  // appel reseau, donc leur resultat dependait de la machine. Le rapprochement
  // se fait sur le nom normalise, en essayant hash, name et scHash — c'est ce
  // qui evite d'ecrire les identifiants en dur, et c'est justement ce qui
  // n'etait verifie nulle part.
  console.log('\n== les icones de modes ==');
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ list: [
        { hash: 'Brawl-Ball', imageUrl: 'http://i/bb.png' },   // via hash
        { name: 'gemGrab', imageUrl2: 'http://i/gg.png' },     // via name, imageUrl2
        { scHash: 'Heist', imageUrl: 'http://i/he.png' },      // via scHash
        { hash: 'Bounty' },                                    // sans image : ignore
        { hash: 'Inconnu', imageUrl: 'http://i/x.png' },       // mode qu'on ne connait pas
      ] }) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    const r = await p.evaluate(async () => {
      await chargerModes();
      return { images: IMAGES_MODES, garde: lireObjet('manager:modes') };
    });
    check('un mode rapproché par son « hash »',
      r.images.brawlBall === 'http://i/bb.png', r.images);
    check('un autre par son « name », avec imageUrl2',
      r.images.gemGrab === 'http://i/gg.png', r.images);
    check('un troisième par son « scHash »',
      r.images.heist === 'http://i/he.png', r.images);
    check('un mode sans image n\'entre pas',
      r.images.bounty === undefined, r.images);
    check('un mode inconnu de l\'app est ignoré',
      Object.keys(r.images).length === 3, r.images);
    check('et le résultat est gardé pour la prochaine ouverture',
      r.garde.brawlBall === 'http://i/bb.png', r.garde);
    await p.close();
  }

  // Une reponse vide ne doit pas effacer les icones de la derniere fois.
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/api.brawlapi.com/v1/brawlers**', r => r.abort());
    await p.route('**/api.brawlapi.com/v1/gamemodes**', r => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ list: [] }) }));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.setItem('manager:modes',
      JSON.stringify({ brawlBall: 'http://i/garde.png' })));
    await p.reload({ waitUntil: 'domcontentloaded' });
    const r = await p.evaluate(async () => {
      const avant = IMAGES_MODES.brawlBall;
      await chargerModes();
      return { avant: avant, apres: IMAGES_MODES.brawlBall };
    });
    check('une réponse vide n\'efface pas les icônes gardées',
      r.apres === 'http://i/garde.png', r);
    await p.close();
  }

  // ── Une seule langue est telechargee ───────────────────────────────────
  // counters.js portait les trois langues : 155 Ko de francais, 126
  // d'anglais, 6,6 d'espagnol, pour un utilisateur qui n'en lit qu'une.
  // La detection existait deja (choix enregistre, sinon navigator.languages) ;
  // ce sont les donnees qui ne la suivaient pas.
  console.log('\n== une seule langue est téléchargée ==');
  for (const [loc, attendue, bout] of [
    ['fr-FR', 'fr', 'Presse son'],
    ['es-ES', 'es', null],
    ['en-GB', 'en', 'Pressures his'],
    ['de-DE', 'en', 'Pressures his'],   // langue non parlée : repli
  ]) {
    const ctx = await nav.newContext({ locale: loc });
    const p = await ctx.newPage();
    await p.route('**/api.brawlapi.com/**', r => r.abort());
    const vus = [];
    p.on('response', r => {
      const f = r.url().split('/').pop();
      if (/^counters/.test(f)) vus.push(f);
    });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });
    await p.waitForFunction(() => COUNTERS_PRET, null, { timeout: 15000 }).catch(() => {});
    const r = await p.evaluate(() => ({ langue: langue,
      fiches: Object.keys(COUNTERS).length,
      exemple: (COUNTERS['8bit'] && COUNTERS['8bit'].perd[0][1]) || '' }));
    check(loc + ' → langue ' + attendue, r.langue === attendue, r.langue);
    check(loc + ' : UN seul fichier chargé, celui de la langue',
      vus.length === 1 && vus[0] === 'counters-' + attendue + '.js', vus);
    check(loc + ' : la table est complète', r.fiches === 105, r.fiches);
    if (bout) {
      check(loc + ' : les phrases sont dans la bonne langue',
        r.exemple.indexOf(bout) === 0, r.exemple.slice(0, 40));
    }
    await ctx.close();
  }

  // Changer de langue en cours de route demande l'autre fichier — et l'app
  // continue de conseiller pendant ce temps, puisque « qui bat qui » est
  // identique dans les trois : seules les phrases changent.
  {
    const ctx = await nav.newContext({ locale: 'fr-FR' });
    const p = await ctx.newPage();
    await p.route('**/api.brawlapi.com/**', r => r.abort());
    const vus = [];
    p.on('response', r => {
      const f = r.url().split('/').pop();
      if (/^counters/.test(f)) vus.push(f);
    });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle' });
    await p.waitForFunction(() => COUNTERS_PRET, null, { timeout: 15000 }).catch(() => {});
    const avant = await p.evaluate(() => COUNTERS['8bit'].perd[0][1].slice(0, 12));
    await p.evaluate(() => { ACTIONS.langue('en'); render(); });
    await p.waitForFunction(() => COUNTERS['8bit'].perd[0][1].indexOf('Pressures') === 0,
      null, { timeout: 15000 }).catch(() => {});
    const apres = await p.evaluate(() => ({
      langue: langue, phrase: COUNTERS['8bit'].perd[0][1].slice(0, 12),
      fiches: Object.keys(COUNTERS).length }));
    check('passer en anglais charge le fichier anglais',
      vus.join(',') === 'counters-fr.js,counters-en.js', vus);
    check('et les phrases changent bien de langue',
      avant.indexOf('Presse') === 0 && apres.phrase.indexOf('Pressures') === 0,
      { avant, apres: apres.phrase });
    check('la table reste complète', apres.fiches === 105, apres.fiches);
    // Repasser au francais ne retelecharge pas : le fichier est deja la.
    await p.evaluate(() => { ACTIONS.langue('fr'); render(); });
    await p.waitForTimeout(300);
    check('revenir en arrière ne retélécharge rien', vus.length === 2, vus);
    await ctx.close();
  }

  // ── counters-<langue>.js arrive apres le premier dessin ─────────────────────────
  // Il pesait 322 Ko sur les 524 qu'il fallait attendre avant de voir quoi
  // que ce soit : 11,1 s d'ecran noir en 3G lente, mesure. Il est donc
  // charge a part. Ce qui doit rester vrai pendant qu'il charge : l'app est
  // utilisable, ET aucun chiffre n'est montre — sans cette table les scores
  // changent sur les 27 cartes, meme sans un seul ennemi designe.
  console.log('\n== la table des duels arrive apres le premier dessin ==');
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    const boum = [];
    p.on('pageerror', e => boum.push(e.message));
    // On retient le fichier d'explications le temps de regarder l'ecran.
    let relacher;
    const bloque = new Promise(r => { relacher = r; });
    await p.route('**/counters-*.js', async route => {
      await bloque;
      await route.continue();
    });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html',
      { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => {
      roster = new Set(brawlers.map(x => x.k)); sauverRoster();
      carteId = MAPS[0].id; ecran = 'draft'; render();
    });
    const pendant = await p.evaluate(() => ({
      pret: COUNTERS_PRET,
      table: Object.keys(COUNTERS).length,
      carteChoisissable: !!document.querySelector('[data-act="cartes"]'),
      versLeRoster: !!document.querySelector('[data-act="roster"]'),
      attente: !!document.querySelector('.attente'),
      chiffres: document.querySelectorAll('.analyse, .hero .mesure').length,
    }));
    check('pendant le chargement, la carte reste choisissable',
      pendant.carteChoisissable, pendant);
    check('et « Mes brawlers » aussi', pendant.versLeRoster, pendant);
    check('l\'app dit qu\'elle charge', pendant.attente, pendant);
    check('et ne montre AUCUN chiffre qu\'elle devra reprendre',
      pendant.chiffres === 0, pendant);

    relacher();
    await p.waitForFunction(() => COUNTERS_PRET, null, { timeout: 15000 });
    const apres = await p.evaluate(() => ({
      table: Object.keys(COUNTERS).length,
      attente: !!document.querySelector('.attente'),
      conseil: !!document.querySelector('.hero .name'),
    }));
    check('une fois arrivee, la table est pleine', apres.table > 100, apres);
    check('le message d\'attente disparait', !apres.attente, apres);
    check('et le conseil s\'affiche', apres.conseil, apres);
    check('sans une seule erreur JS', boum.length === 0, boum);
    await p.close();
  }

  // Si le fichier ne vient jamais, l'app ne doit pas rester a annoncer un
  // chargement qui n'arrivera pas : elle retombe sur le cycle de familles,
  // ce qu'elle sait deja faire quand une paire manque, et le pied de page
  // le dit.
  {
    const p = await nav.newPage({ locale: 'fr-FR' });
    await p.route('**/counters-*.js', route => route.abort());
    await p.goto('http://127.0.0.1:' + PORT + '/index.html',
      { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => COUNTERS_PRET, null, { timeout: 15000 });
    const r = await p.evaluate(() => {
      roster = new Set(brawlers.map(x => x.k)); sauverRoster();
      carteId = MAPS[0].id; ecran = 'draft'; render();
      return { conseil: !!document.querySelector('.hero .name'),
               attente: !!document.querySelector('.attente'),
               note: document.querySelector('.note').textContent };
    });
    check('table introuvable : le conseil s\'affiche quand meme', r.conseil, r);
    check('sans rester bloque sur le message d\'attente', !r.attente, r);
    check('et le pied de page annonce la table absente',
      /matchups absente/i.test(r.note), r.note.slice(0, 120));
    await p.close();
  }

  // ── Un stockage abime ne doit pas donner un ecran blanc ────────────────
  // JSON.parse ne repond qu'a « est-ce du JSON ? », jamais a « est-ce la
  // bonne chose ? ». Mesure : trois de ces six valeurs, parfaitement
  // analysables, donnaient une page entierement vide. Et la valeur restant
  // dans le navigateur, chaque reouverture rebloquait au meme endroit.
  console.log('\n== stockage abîmé : l\'app tient debout ==');
  const CAS = [
    ['manager:roster', '{"pas":"un tableau"}'],
    ['manager:roster', '"chaine"'],
    ['manager:recentes', '42'],
    ['manager:catalogue', '{"liste":null}'],
    ['manager:catalogue', '[1,2,3]'],
    ['manager:modes', '[1,2,3]'],
    ['manager:vus', 'true'],
  ];
  for (const [cle, val] of CAS) {
    const p = await nav.newPage();
    const boum = [];
    p.on('pageerror', e => boum.push(e.message));
    await p.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.evaluate(([c, v]) => localStorage.setItem(c, v), [cle, val]);
    await p.reload({ waitUntil: 'networkidle' });
    const vivant = await p.evaluate(() => document.querySelectorAll('button').length);
    check(cle + ' = ' + val + ' : l\'app s\'ouvre quand même',
      vivant > 0 && boum.length === 0, { boutons: vivant, erreurs: boum });
    await p.close();
  }

  check('toujours aucune erreur JS', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
