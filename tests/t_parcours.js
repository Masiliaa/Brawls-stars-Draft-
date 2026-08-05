// Parcours utilisateur complet, dans un vrai navigateur.
//
//   (python3 -m http.server 8765 &) && node tests/t_parcours.js
//
// Contrairement à t_app.js qui teste le moteur de calcul, ce fichier
// simule ce que fait vraiment quelqu'un : cliquer, taper, recharger.
// Aucune fonction n'est appelée directement — tout passe par l'écran.
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8765;
const BASE = 'http://127.0.0.1:' + PORT;

let ok = 0, fail = 0;
const check = (nom, cond, detail = '') => {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { fail++; console.log('  FAIL ' + nom + '   ' + JSON.stringify(detail)); }
};

(async () => {
  const nav = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await nav.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });

  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) {
      erreurs.push('console: ' + m.text());
    }
  });

  console.log('\n== chaque fichier est bien servi ==');
  for (const f of ['index.html', 'style.css', 'outils.js', 'donnees.js',
                   'etat.js', 'moteur.js', 'vues.js', 'app.js']) {
    const r = await page.request.get(BASE + '/' + f);
    check(f + ' → ' + r.status(), r.status() === 200);
  }

  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });

  console.log('\n== écran de départ ==');
  check('le logo est là', await page.locator('.logo').isVisible());
  check('invite à choisir la carte',
    await page.getByText('Choisir la carte').first().isVisible());
  check('le pied de page est affiché', await page.locator('.note').isVisible());

  // Il y avait ici deux commandes identiques l'une sous l'autre : le bandeau
  // « Choisir la carte », puis un encadré qui redisait « Choisir la carte ».
  // Un seul geste possible, donc un seul bouton.
  check('un seul chemin vers la liste des cartes',
    (await page.locator('[data-act="cartes"]').count()) === 1,
    await page.locator('[data-act="cartes"]').count());
  // Le nom du produit répond sur TOUS les écrans, accueil compris. Le rendre
  // inerte là où l'on est déjà semblait logique et se voyait cassé une fois
  // sur deux, puisque c'est l'écran où l'on passe sa vie.
  check('le nom du produit est cliquable, ici comme ailleurs',
    (await page.locator('.logo[data-act="accueil"]').count()) === 1);

  console.log('\n== mes persos : cocher, chercher, décocher ==');
  await page.locator('[data-act="roster"]').click();
  check('la grille des persos s\'affiche', (await page.locator('.cel').count()) > 90);

  await page.locator('[data-act="tout"]').click();
  const toutCoche = await page.locator('.cel.on').count();
  check('« tout cocher » coche tout', toutCoche > 90, toutCoche);
  check('le compteur suit',
    (await page.locator('.intro').textContent()).includes(String(toutCoche)));

  await page.locator('#q').fill('mor');
  const filtre = await page.locator('.cel').count();
  check('la recherche filtre', filtre > 0 && filtre < toutCoche, filtre);
  check('« Mortis » ressort',
    (await page.locator('.cel b').first().textContent()).toLowerCase().includes('mor'));

  await page.locator('#q').fill('');
  check('vider la recherche restaure la liste',
    (await page.locator('.cel').count()) === toutCoche);

  // Ici, et ici seulement, il y a deux états à distinguer d'un coup d'œil.
  await page.locator('[data-act="rien"]').click();
  const voile = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('#grid .cel')).opacity));
  await page.locator('[data-act="tout"]').click();
  const plein = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('#grid .cel')).opacity));
  check('un perso non coché reste visiblement en retrait',
    voile < plein, { nonCoche: voile, coche: plein });

  console.log('\n== le roster survit au rechargement ==');
  await page.reload({ waitUntil: 'networkidle' });
  const apresReload = await page.evaluate(() => roster.size);
  check('roster relu depuis le navigateur', apresReload === toutCoche, apresReload);
  check('clé localStorage inchangée',
    (await page.evaluate(() => localStorage.getItem('manager:roster'))) !== null);

  console.log('\n== choisir une carte ==');
  await page.locator('[data-act="cartes"]').first().click();
  // L'écran est replié : six modes, aucune carte visible tant qu'on n'a pas
  // ouvert. Tout déplier faisait trois écrans de haut avec 27 cartes.
  check('les 6 modes sont listés',
    (await page.locator('[data-act="ouvrirModeCarte"]').count()) === 6);
  check('aucune carte avant d\'ouvrir un mode',
    (await page.locator('[data-act="carte"]').count()) === 0);
  const nbCartes = await page.evaluate(() => MAPS.length);
  check('pool de taille plausible', nbCartes >= 12 && nbCartes <= 36, nbCartes);
  check('l\'écran tient sur une hauteur d\'iPhone',
    (await page.evaluate(() => document.body.scrollHeight)) <= 900,
    await page.evaluate(() => document.body.scrollHeight));

  await page.locator('[data-act="ouvrirModeCarte"][data-v="heist"]').click();
  const nbHeist = await page.evaluate(
    () => MAPS.filter(c => c.mode === 'heist').length);
  check('ouvrir un mode montre ses cartes',
    (await page.locator('[data-act="carte"]').count()) === nbHeist, nbHeist);
  await page.locator('[data-act="ouvrirModeCarte"][data-v="heist"]').click();
  check('re-cliquer referme le mode',
    (await page.locator('[data-act="carte"]').count()) === 0);

  // La recherche court-circuite le repli : on ne se souvient pas toujours
  // dans quel mode tombe une carte.
  await page.locator('#q').fill('safe');
  const trouvees = await page.locator('[data-act="carte"]').count();
  check('la recherche trouve la carte', trouvees >= 1 && trouvees < nbCartes, trouvees);
  await page.locator('#q').fill('zzzz');
  check('une recherche vaine le dit',
    (await page.locator('[data-act="carte"]').count()) === 0);

  // Le jeu annonce « Milieu de scène », pas « Center Stage ». Traduire de
  // tête pendant les 25 secondes du draft n'est pas une option, et personne
  // ne pose les accents sur un clavier de téléphone.
  await page.locator('#q').fill('milieu');
  check('on trouve la carte par le nom que le jeu annonce',
    (await page.locator('[data-act="carte"]').count()) === 1);
  await page.locator('#q').fill('center');
  check('et toujours par son nom d\'origine',
    (await page.locator('[data-act="carte"]').count()) === 1);
  await page.locator('#q').fill('phenix');
  check('les accents ne sont pas obligatoires',
    (await page.locator('[data-act="carte"]').count()) === 1);
  await page.locator('#q').fill('');
  check('vider la recherche rend les modes',
    (await page.locator('[data-act="ouvrirModeCarte"]').count()) === 6);
  await page.locator('[data-act="ouvrirModeCarte"][data-v="heist"]').click();

  await page.getByText('Safe Zone').first().click();
  check('un brawler est conseillé', await page.locator('.hero .name').isVisible());
  check('le mode est affiché',
    (await page.locator('.carte-active').first().textContent()).includes('Braquage'));
  // Les remplaçants ont fait trois allers-retours : trois lignes pleines
  // (195 px, la saisie sortait de l'écran), puis une bande qui glissait (la
  // place gagnée, la phrase perdue), puis de nouveau une liste — parce qu'une
  // fois l'écran rangé il restait 300 px de vide au milieu. La place existait.
  check('3 remplaçants proposés', (await page.locator('.autre').count()) === 3);
  check('et chacun dit pourquoi',
    (await page.locator('.autre .p').count()) === 3 &&
    (await page.locator('.autre .p').first().textContent()).trim().length > 0);
  check('et 3 bans conseillés pendant la phase de ban',
    (await page.locator('.conseil-ban').count()) === 3);
  // Une bande qui déborde doit défiler dans sa propre boîte : si elle fait
  // glisser la page entière, on perd le nom conseillé en cherchant un repli.
  check('la bande ne fait pas déborder la page',
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth));

  // ── Aucun écran sans sortie ────────────────────────────────────────────
  // La liste des cartes n'avait qu'une issue : choisir une carte, ce qui
  // remettait le draft à zéro. Consulter la carte en cours coûtait donc ses
  // picks. Chaque écran doit ramener au draft d'un seul geste, et le nom du
  // produit doit y ramener aussi — c'est le réflexe de n'importe quel site.
  console.log('\n== aucun écran sans sortie ==');
  for (const [nom, aller] of [
    ['liste des cartes', async () => page.locator('[data-act="cartes"]').first().click()],
    ['désigner un ennemi', async () => page.locator('[data-act="addE"]').click()],
    ['mes brawlers', async () => page.locator('[data-act="roster"]').click()],
  ]) {
    await aller();
    check(nom + ' : on peut revenir au draft',
      (await page.locator('.bar .actions [data-act="draft"]').count()) === 1);
    check(nom + ' : le nom du produit y ramène aussi',
      (await page.locator('.logo[data-act="accueil"]').count()) === 1);
    await page.locator('.bar .actions [data-act="draft"]').click();
    check(nom + ' : et on y est', await page.locator('.hero .name').isVisible());
  }

  // Rechoisir la carte qu'on a déjà n'est pas un changement de carte : c'est
  // ce que fait quelqu'un venu vérifier son nom.
  console.log('\n== revoir sa carte ne coûte pas son draft ==');
  await page.locator('[data-act="addE"]').click();
  await page.locator('#grid .cel').first().click();
  const avant = await page.locator('[data-act="rme"]').count();
  await page.locator('[data-act="cartes"]').first().click();
  await page.locator('[data-act="ouvrirModeCarte"][data-v="heist"]').click();
  await page.getByText('Safe Zone').first().click();
  check('les picks sont conservés',
    (await page.locator('[data-act="rme"]').count()) === avant, avant);
  await page.locator('[data-act="reset"]').click();

  // ── Désigner sans taper ────────────────────────────────────────────────
  // Mesuré le 04/08/2026 : les huit brawlers les plus joués sur la carte
  // arrivaient en positions 5, 10, 12, 28, 45, 49 — et deux n'étaient pas
  // affichés du tout, la grille étant coupée à 60 noms rangés dans l'ordre
  // alphabétique. Pour saisir le pick adverse le plus probable, il fallait
  // donc taper son nom. C'est le vrai coût de la saisie, bien plus que le
  // nombre d'appuis.
  console.log('\n== le pick probable est sous le pouce ==');
  await page.locator('[data-act="addE"]').click();
  const ordre = await page.evaluate(() => {
    const grille = [...document.querySelectorAll('#grid .cel')]
      .map(e => e.getAttribute('data-v'));
    const surLaCarte = carteActive().top.map(t => clef(t[0]));
    return {
      rangs: surLaCarte.map(k => grille.indexOf(k)),
      visibles: surLaCarte.filter(k => {
        const e = document.querySelector('#grid .cel[data-v="' + k + '"]');
        return e && e.getBoundingClientRect().bottom <= window.innerHeight;
      }).length,
      combien: surLaCarte.length
    };
  });
  check('tous les brawlers de la carte sont proposés',
    ordre.rangs.every(r => r >= 0), ordre.rangs);
  check('et ils occupent les toutes premières places',
    Math.max.apply(null, ordre.rangs) < ordre.combien + 2, ordre.rangs);
  check('visibles sans faire défiler',
    ordre.visibles === ordre.combien, ordre.visibles + '/' + ordre.combien);

  // Le voile à 50 % des non cochés était posé sur toutes les grilles. Celle-ci
  // n'a pas d'état coché : elle était donc grisée en entier, noms à 2,25:1
  // alors qu'il en faut 4,5. L'écran le plus tendu de l'app était le moins
  // lisible. On mesure le contraste réel, voile compris.
  const lisibilite = await page.evaluate(() => {
    const rgb = s => s.match(/\d+(\.\d+)?/g).map(Number);
    const lum = ([r, g, b]) => {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const cel = document.querySelector('#grid .cel');
    const nom = cel.querySelector('b');
    const op = parseFloat(getComputedStyle(cel).opacity);
    const fond = rgb(getComputedStyle(document.body).backgroundColor);
    const vu = rgb(getComputedStyle(nom).color).map((v, i) => v * op + fond[i] * (1 - op));
    const [a, b] = [lum(vu), lum(fond)].sort((m, n) => n - m);
    return { contraste: +((a + 0.05) / (b + 0.05)).toFixed(2), opacite: op };
  });
  check('les noms de la grille de choix sont lisibles (≥ 4,5:1)',
    lisibilite.contraste >= 4.5, lisibilite);
  check('la grille de choix n’est pas voilée',
    lisibilite.opacite === 1, lisibilite);

  await page.locator('[data-act="annuler"]').click();

  // Un brawler déjà banni ne peut plus être pické : le proposer, c'est
  // offrir un choix impossible.
  await page.locator('[data-act="addB"]').click();
  const premierBan = await page.locator('#grid .cel').first().getAttribute('data-v');
  await page.locator('#grid .cel').first().click();
  await page.locator('[data-act="addE"]').click();
  check('un brawler banni disparaît des propositions',
    (await page.locator('#grid .cel[data-v="' + premierBan + '"]').count()) === 0,
    premierBan);
  await page.locator('[data-act="annuler"]').click();
  await page.locator('[data-act="reset"]').click();

  console.log('\n== ajouter des picks, jusqu\'aux limites ==');
  async function ajouter(bouton, combien) {
    for (let i = 0; i < combien; i++) {
      await page.locator('[data-act="' + bouton + '"]').click();
      await page.locator('#grid .cel').nth(i).click();
    }
  }

  await ajouter('addE', 3);
  check('3 ennemis ajoutés', (await page.locator('[data-act="rme"]').count()) === 3);
  check('« + ajouter » disparaît à 3 ennemis',
    (await page.locator('[data-act="addE"]').count()) === 0);

  await page.locator('[data-act="rme"]').first().click();
  check('retirer un ennemi le fait revenir',
    (await page.locator('[data-act="addE"]').count()) === 1);

  await ajouter('addA', 2);
  check('2 alliés ajoutés', (await page.locator('[data-act="rma"]').count()) === 2);
  check('« + ajouter » disparaît à 2 alliés',
    (await page.locator('[data-act="addA"]').count()) === 0);

  await ajouter('addB', 6);
  check('6 bans ajoutés', (await page.locator('[data-act="rmb"]').count()) === 6);
  check('« + ajouter » disparaît à 6 bans',
    (await page.locator('[data-act="addB"]').count()) === 0);

  check('un brawler est toujours conseillé', await page.locator('.hero .name').isVisible());

  // ── Les bans ───────────────────────────────────────────────────────────
  // L'app disait « bannis ceux-là » et il fallait ensuite ouvrir la saisie,
  // chercher le nom, le taper : cinq gestes entre le conseil et l'acte.
  // Et six portraits grisés sans croix ne disaient pas qu'ils étaient
  // retirables — ils ressemblaient à de la décoration.
  console.log('\n== les bans ==');
  check('chaque ban banni porte une croix',
    (await page.locator('.etat .ban .t .croix').count()) ===
    (await page.evaluate(() => bans.length)));
  check('et le compte est affiché',
    /\d/.test(await page.locator('.etat .reste').textContent()));


  // ── Le mode rapide tient sur un écran ──────────────────────────────────
  // C'est la raison d'être du mode : pendant un draft, descendre pour taper
  // un ennemi faisait sortir le nom conseillé du champ de vision. On mesure
  // ici le cas chargé — 2 ennemis, 2 alliés, 6 bans — parce que c'est celui
  // qui débordait. Sans ce contrôle, la propriété se reperdra au premier
  // bloc ajouté.
  console.log('\n== le mode rapide tient sur une hauteur d\'iPhone ==');
  // La saisie n'est plus faite de « .wrap » empilés mais d'une rangée par
  // liste, dans « .etat ». La dernière est celle des bans.
  const basUtile = await page.evaluate(() => {
    const l = document.querySelectorAll('.etat .r');
    return l.length ? Math.round(l[l.length - 1].getBoundingClientRect().bottom) : 1e9;
  });
  check('saisie comprise, tout tient sous 844 px', basUtile <= 844, basUtile);
  check('et la page ne déborde pas en largeur',
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth));

  // ── Descendre dans le détail, et remonter ──────────────────────────────
  // Changer de mode demandait deux gestes dans un menu, et c'était un
  // réglage qu'on oubliait d'avoir mis. Un geste à l'aller, un au retour —
  // et le mode de départ ne doit pas bouger, sinon le draft suivant s'ouvre
  // sur l'écran long sans qu'on ait rien demandé.
  console.log('\n== taper le nom ouvre le calcul, retaper referme ==');
  await page.locator('.hero').click();
  check('le classement détaillé s\'ouvre',
    (await page.locator('.analyse').count()) > 1,
    await page.locator('.analyse').count());
  check('le score porte une jauge',
    (await page.locator('.analyse .jauge-score').count()) > 1);
  // La saisie du mode analyse était une bande à part — trois portraits nus
  // sous des capitales grises — dont les tuiles se recouvraient de 10 px,
  // cinq fois par écran. C'est maintenant la MÊME saisie que le mode rapide,
  // au même endroit : au-dessus du classement, puisque c'est la seule chose
  // qu'on modifie pendant qu'on le lit.
  check('la saisie est remontée au-dessus du classement',
    await page.evaluate(() => {
      const c = document.querySelector('.etat');
      const a = document.querySelector('.analyse');
      return !!c && !!a && c.getBoundingClientRect().top < a.getBoundingClientRect().top;
    }));
  check('et rien ne s\'y recouvre',
    await page.evaluate(() => {
      let n = 0;
      document.querySelectorAll('.etat .r').forEach(r => {
        const e = [...r.children];
        for (let i = 0; i < e.length - 1; i++) {
          const a = e[i].getBoundingClientRect(), b = e[i + 1].getBoundingClientRect();
          if (Math.abs(a.top - b.top) < 5 && b.left < a.right - 0.5) n++;
        }
      });
      return n === 0;
    }));

  await page.locator('.retour-conseil').click();
  check('un geste suffit à revenir au conseil',
    await page.locator('.hero .name').isVisible());
  check('le mode de départ n\'a pas été touché',
    (await page.evaluate(() => modeAffichage)) === 'rapide');
  check('et rien n\'a été enregistré dans le navigateur',
    (await page.evaluate(() => localStorage.getItem('manager:mode'))) !== 'analyse');

  console.log('\n== annuler un choix ==');
  await page.locator('[data-act="rmb"]').first().click();
  await page.locator('[data-act="addB"]').click();
  check('l\'écran de choix s\'ouvre', await page.locator('[data-act="annuler"]').isVisible());
  await page.locator('[data-act="annuler"]').click();
  check('annuler ramène au draft', await page.locator('.hero .name').isVisible());
  check('rien n\'a été ajouté', (await page.locator('[data-act="rmb"]').count()) === 5);

  console.log('\n== nouveau draft ==');
  await page.locator('[data-act="reset"]').click();
  check('les picks sont vidés',
    (await page.locator('[data-act="rme"]').count()) === 0 &&
    (await page.locator('[data-act="rma"]').count()) === 0 &&
    (await page.locator('[data-act="rmb"]').count()) === 0);
  check('la carte est conservée',
    (await page.locator('.carte-active').first().textContent()).includes('Safe Zone'));

  // Le conseil de ban n'apparaît qu'en phase de ban, c'est-à-dire quand
  // aucun pick n'est encore saisi — donc juste ici.
  const conseil = page.locator('.conseil-ban').first();
  const nomConseille = (await conseil.locator('.n').textContent()).trim();
  await conseil.click();
  check('taper un ban conseillé le bannit',
    await page.evaluate(n => bans.map(nomBrawler).indexOf(n) > -1, nomConseille),
    nomConseille);
  await page.locator('[data-act="reset"]').click();

  // ── Le clavier ─────────────────────────────────────────────────────────
  // Sur un ordinateur, ce n'est pas la mise en page qui fait gagner du temps
  // mais le clavier : trois lettres et Entrée battent n'importe quel nombre
  // de clics. Le piège est que les raccourcis mordent sur la frappe — taper
  // « bea » dans la recherche ne doit pas ouvrir trois écrans.
  console.log('\n== le clavier ==');
  await page.keyboard.press('e');
  check('« e » ouvre la saisie d\'un ennemi',
    (await page.evaluate(() => cibleAjout)) === 'ennemi');
  check('et le champ a déjà le focus',
    await page.evaluate(() => document.activeElement.id === 'q'));

  await page.keyboard.type('pip');
  await page.keyboard.press('Enter');
  check('taper puis Entrée désigne le premier résultat',
    JSON.stringify(await page.evaluate(() => ennemis)) === '["piper"]',
    await page.evaluate(() => ennemis));

  await page.keyboard.press('a');
  await page.keyboard.press('Escape');
  check('Échap annule la désignation en cours',
    (await page.evaluate(() => cibleAjout)) === null);

  await page.keyboard.press('b');
  await page.keyboard.type('bea');
  check('les lettres tapées dans le champ ne déclenchent rien',
    (await page.evaluate(() => cibleAjout)) === 'ban' &&
    (await page.evaluate(() => recherche)) === 'bea',
    await page.evaluate(() => [cibleAjout, recherche]));
  await page.keyboard.press('Escape');

  // Entrée hors du champ : le navigateur clique lui-meme ce qui a le focus.
  // Le raccourci s'ajoutait par-dessus et prenait le PREMIER resultat —
  // mesure : focus sur la cinquieme case, Entree, c'est la premiere qui
  // entrait dans le draft. Naviguer au clavier dans la grille etait donc
  // impossible, et l'erreur etait silencieuse : on obtenait bien un brawler.
  await page.keyboard.press('e');
  const vise = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#grid .cel')];
    c[4].focus();
    return { cible: c[4].getAttribute('data-v'), premier: c[0].getAttribute('data-v') };
  });
  await page.keyboard.press('Enter');
  // On regarde le DERNIER ajouté : « piper » est encore là, mis par le test
  // du champ de recherche juste au-dessus.
  check('Entrée avec le focus sur une case prend CETTE case',
    (await page.evaluate(() => ennemis[ennemis.length - 1])) === vise.cible,
    [vise, await page.evaluate(() => ennemis)]);
  check('et ce n\'était pas déjà la première case',
    vise.cible !== vise.premier, vise);

  await page.locator('[data-act="reset"]').click();


  console.log('\n== changer de carte remet le draft à zéro ==');
  await ajouter('addE', 2);
  await page.locator('[data-act="cartes"]').first().click();
  // On tape le nom d'origine et on clique sur celui que le jeu annonce en
  // français : c'est exactement ce que fait quelqu'un qui connaît la carte
  // sous son nom anglais mais joue avec l'interface traduite.
  await page.locator('#q').fill('Hot Potato');
  await page.getByText('C\'est chaud patate').first().click();
  check('nouvelle carte affichée sous son nom français',
    (await page.locator('.carte-active').first().textContent()).includes('chaud patate'));
  check('les ennemis ont été vidés', (await page.locator('[data-act="rme"]').count()) === 0);

  console.log('\n== roster vide : message d\'invite ==');
  await page.locator('[data-act="roster"]').click();
  await page.locator('[data-act="rien"]').click();
  check('« tout décocher » vide tout', (await page.locator('.cel.on').count()) === 0);
  await page.locator('.bar .actions [data-act="draft"]').click();
  check('l\'app explique quoi faire',
    (await page.locator('.box p').textContent()).includes('Coche d\'abord'));

  console.log('\n== bascule Rapide / Analyse ==');
  // Le roster a été vidé juste avant : deux boutons portent data-act="roster"
  // (la barre du haut et l'encadré d'invite). On prend le premier.
  await page.locator('[data-act="cartes"]').first().click();
  await page.locator('#q').fill('Safe Zone');
  await page.getByText('Safe Zone').first().click();
  await page.locator('[data-act="roster"]').first().click();
  await page.locator('[data-act="tout"]').click();
  await page.locator('.bar .actions [data-act="draft"]').click();

  check('démarre en mode Rapide',
    (await page.locator('[data-act="ouvrirMode"]').textContent()) === 'Rapide');
  check('le mode Rapide montre un seul grand nom',
    (await page.locator('.hero').count()) === 1 &&
    (await page.locator('.analyse').count()) === 0);

  // Le bouton ouvre un menu ; rien ne change tant qu'on n'a pas choisi.
  await page.locator('[data-act="ouvrirMode"]').click();
  check('le menu s\'ouvre', await page.locator('.menu').isVisible());
  check('les deux modes sont proposés',
    (await page.locator('.menu [data-act="mode"]').count()) === 2);
  check('le mode courant est coché',
    (await page.locator('.menu [data-act="mode"].actif').getAttribute('data-v')) === 'rapide');
  check('rien n\'a changé tant qu\'on ne choisit pas',
    (await page.locator('.hero').count()) === 1);

  await page.locator('.menu [data-act="mode"][data-v="analyse"]').click();
  check('choisir Analyse l\'applique',
    (await page.locator('[data-act="ouvrirMode"]').textContent()) === 'Analyse');
  check('le menu se referme après le choix',
    (await page.locator('.menu').count()) === 0);
  // Le classement en montrait dix d'office : deux à quatre écrans à faire
  // défiler sur tous les supports, pour n'en jouer qu'un. Il en montre quatre,
  // et propose le reste — les six autres restent atteignables d'un geste.
  const fiches = await page.locator('.analyse').count();
  check('le mode Analyse détaille plusieurs brawlers', fiches === 4, fiches);
  check('et propose d\'aller voir les autres',
    (await page.locator('[data-act="plusAnalyse"]').count()) === 1);
  await page.locator('[data-act="plusAnalyse"]').click();
  const toutes = await page.locator('.analyse').count();
  check('les voir toutes tient en un geste', toutes > 4, toutes);
  check('et on peut revenir à la liste courte',
    (await page.locator('[data-act="plusAnalyse"]').count()) === 1);
  await page.locator('[data-act="plusAnalyse"]').click();
  check('la liste redevient courte',
    (await page.locator('.analyse').count()) === 4);
  check('plus de hero en mode Analyse', (await page.locator('.hero').count()) === 0);
  check('chaque fiche montre un score',
    (await page.locator('.analyse .score b').count()) === fiches);
  check('chaque fiche montre le détail des points',
    (await page.locator('.analyse .calcul').count()) === fiches);

  await page.reload({ waitUntil: 'networkidle' });
  check('le mode survit au rechargement',
    (await page.locator('[data-act="ouvrirMode"]').textContent()) === 'Analyse');

  // Un clic à côté doit refermer le menu sans rien changer.
  await page.locator('[data-act="ouvrirMode"]').click();
  await page.locator('.note').click();
  check('cliquer à côté referme le menu',
    (await page.locator('.menu').count()) === 0);
  check('et ne change rien',
    (await page.locator('[data-act="ouvrirMode"]').textContent()) === 'Analyse');

  await page.locator('[data-act="ouvrirMode"]').click();
  await page.keyboard.press('Escape');
  check('Échap referme le menu', (await page.locator('.menu').count()) === 0);

  await page.locator('[data-act="ouvrirMode"]').click();
  await page.locator('.menu [data-act="mode"][data-v="rapide"]').click();
  check('retour au mode Rapide',
    (await page.locator('[data-act="ouvrirMode"]').textContent()) === 'Rapide');

  console.log('\n== changement de langue ==');
  await page.locator('[data-act="draft"], [data-act="roster"]').first().waitFor();
  const codeDepart = await page.locator('[data-act="ouvrirLangue"]').textContent();
  check('démarre en français (locale fr-FR)',
    codeDepart.includes('FR'), codeDepart);
  check('et le drapeau est là', codeDepart.includes('🇫🇷'), codeDepart);

  await page.locator('[data-act="ouvrirLangue"]').click();
  check('les trois langues sont proposées',
    (await page.locator('.menu [data-act="langue"]').count()) === 3);
  check('elles sont nommées en toutes lettres',
    (await page.locator('.menu [data-act="langue"]').allTextContents())
      .join('|').includes('Español'));

  // On va directement à l'espagnol, sans passer par l'anglais.
  await page.locator('.menu [data-act="langue"][data-v="es"]').click();
  check('choix direct de l’espagnol',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()).includes('ES'));
  check('les textes suivent',
    await page.getByText('Mis brawlers').first().isVisible());
  check('l’attribut lang de la page suit',
    (await page.getAttribute('html', 'lang')) === 'es');

  await page.reload({ waitUntil: 'networkidle' });
  check('la langue survit au rechargement',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()).includes('ES'));

  await page.locator('[data-act="ouvrirLangue"]').click();
  await page.locator('.menu [data-act="langue"][data-v="fr"]').click();
  check('retour direct au français',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()).includes('FR'));
  check('plus aucune trace de « persos »',
    !(await page.locator('#app').innerText()).toLowerCase().includes('persos'));

  // ── Le nom du produit repart de zéro ───────────────────────────────────
  // Il pointait sur « aller à l'écran de draft ». Une fois la carte choisie
  // on y était déjà : l'écran ne bougeait pas d'un pixel, donc le bouton
  // paraissait mort — et il l'était sur l'écran où l'on passe sa vie.
  // Il repart maintenant de zéro. Ce qui compte ici est la contrepartie :
  // le bouton « Retour » de la barre, lui, ne doit RIEN effacer, sinon
  // aller vérifier son roster en pleine draft coûterait ses picks.
  console.log('\n== le nom du produit repart de zéro ==');
  await page.locator('[data-act="cartes"]').first().click();
  await page.locator('#q').fill('Safe Zone');
  await page.getByText('Safe Zone').first().click();
  await ajouter('addE', 2);
  await ajouter('addB', 1);

  await page.locator('[data-act="roster"]').first().click();
  await page.locator('.bar .actions [data-act="draft"]').click();
  check('« Retour » ne touche pas au draft',
    (await page.locator('[data-act="rme"]').count()) === 2 &&
    (await page.locator('[data-act="rmb"]').count()) === 1);

  const ecranAvant = await page.locator('#app').innerText();
  await page.locator('.bar .logo').click();
  check('le clic sur le nom change bien l’écran',
    (await page.locator('#app').innerText()) !== ecranAvant);
  check('la carte est relâchée',
    await page.evaluate(() => carteId === null));
  check('les picks sont vidés',
    await page.evaluate(() =>
      ennemis.length === 0 && allies.length === 0 && bans.length === 0));
  check('on retombe sur l’invitation à choisir une carte',
    (await page.locator('[data-act="cartes"]').count()) > 0 &&
    (await page.locator('.hero .name').count()) === 0);

  // Et depuis un autre écran que le draft, il doit ramener là aussi.
  await page.locator('[data-act="roster"]').first().click();
  await page.locator('.bar .logo').click();
  check('depuis « Mes brawlers » il ramène à l’accueil',
    (await page.evaluate(() => ecran)) === 'draft');

  // ── Les brawlers rangés par rareté ─────────────────────────────────────
  // L'ordre alphabétique ne dit rien de ce qu'on possède ; la rareté, si.
  // L'API n'est pas joignable pendant les tests, donc aucune rareté n'est
  // connue et l'écran retombe sur la liste simple — ce repli est vérifié en
  // premier. On injecte ensuite les 7 raretés relevées le 04/08/2026 sur
  // api.brawlapi.com, avec leurs effectifs réels, pour vérifier le reste.
  console.log('\n== les brawlers rangés par rareté ==');
  await page.locator('[data-act="roster"]').first().click();
  check('sans rareté connue, la liste simple reprend la main',
    (await page.locator('.rangee-rarete').count()) === 0 &&
    (await page.evaluate(() => document.getElementById('grid').className)) === 'grid');

  const RARETES = [[1, 'Common', 1], [2, 'Rare', 8], [3, 'Super Rare', 10],
                   [4, 'Epic', 30], [5, 'Mythic', 41], [6, 'Legendary', 15],
                   [7, 'Ultra Legendary', 2]];
  await page.evaluate((R) => {
    let i = 0;
    R.forEach(([id, nom, n]) => {
      for (let j = 0; j < n && i < brawlers.length; j++, i++) brawlers[i].rarete = { id, nom };
    });
    while (i < brawlers.length) brawlers[i++].rarete = { id: 5, nom: 'Mythic' };
    roster = new Set(); sauverRoster(); render();
  }, RARETES);

  const intitules = await page.locator('.rangee-rarete').allInnerTexts();
  check('un intitulé par rareté rencontrée', intitules.length >= 6, intitules.length);
  check('l’intitulé est traduit, pas laissé en anglais',
    intitules[0].toLowerCase().includes('commun'), intitules[0]);
  check('il dit où l’on en est', /0\s+sur\s+1/.test(intitules[0].replace(/\n/g, ' ')),
    intitules[0]);
  check('du plus commun au plus rare',
    intitules[intitules.length - 1].toLowerCase().includes('légendaire'),
    intitules[intitules.length - 1]);

  // Compléter, et non basculer chacun : un groupe à moitié coché doit se
  // remplir, pas s'inverser.
  await page.locator('[data-act="groupe"]').nth(1).click();
  check('« tout cocher » remplit le groupe et lui seul',
    (await page.evaluate(() => roster.size)) === 8,
    await page.evaluate(() => roster.size));
  check('le bouton propose alors de décocher',
    (await page.locator('.rangee-rarete').nth(1).innerText()).includes('décocher'));
  await page.locator('[data-act="groupe"]').nth(1).click();
  check('et le re-clic vide le groupe',
    (await page.evaluate(() => roster.size)) === 0);

  // Découper trois résultats en sept intitulés ne range rien.
  await page.locator('#q').fill('mor');
  check('pendant une recherche, la liste redevient simple',
    (await page.locator('.rangee-rarete').count()) === 0 &&
    (await page.evaluate(() => document.getElementById('grid').className)) === 'grid');
  await page.locator('#q').fill('');
  check('vider la recherche rend les raretés',
    (await page.locator('.rangee-rarete').count()) >= 6);

  // ── Voir où l'on en est, et ce qui manque ──────────────────────────────
  // Le nombre était en fin de phrase, alors que c'est la seule chose qu'on
  // vient vérifier. Et rien ne permettait de trouver ce qu'on n'a pas : la
  // recherche marche sur un nom qu'on a déjà en tête.
  console.log('\n== voir où l\'on en est, et ce qui manque ==');
  const total = await page.evaluate(() => brawlers.length);
  await page.locator('[data-act="tout"]').click();
  check('le compteur dit le nombre ET le total',
    (await page.locator('.compteur').innerText()).replace(/\s+/g, ' ')
      === total + ' sur ' + total,
    await page.locator('.compteur').innerText());

  await page.locator('[data-act="manquants"]').click();
  check('tout coché, « ceux qui manquent » ne montre rien',
    (await page.locator('.cel').count()) === 0 &&
    (await page.locator('.rangee-rarete').count()) === 0);

  await page.locator('[data-act="manquants"]').click();
  for (let i = 0; i < 3; i++) await page.locator('#grid .cel').nth(i).click();
  await page.locator('[data-act="manquants"]').click();
  check('il montre exactement les décochés',
    (await page.locator('.cel').count()) === 3,
    await page.locator('.cel').count());
  // Sous le filtre, « 0 sur 1 » doit rester le compte du groupe entier :
  // afficher le compte de ce qui reste visible serait un mensonge par omission.
  check('le compte reste celui du groupe entier',
    /sur\s+1$/.test((await page.locator('.rangee-rarete').first().innerText())
      .split('\n')[1] || ''),
    (await page.locator('.rangee-rarete').first().innerText()).replace(/\n/g, ' · '));
  await page.locator('[data-act="manquants"]').click();
  await page.locator('[data-act="tout"]').click();

  // ── Les six frictions relevées le 04/08/2026 ───────────────────────────
  console.log('\n== ce qui survit à une fermeture, et à une coupure ==');

  // Le bloc précédent laisse l'écran des brawlers ouvert.
  await page.locator('.bar .actions [data-act="draft"]').click();

  // 2. La langue, le mode et le roster survivaient au rechargement ; pas la
  //    carte. Refermer et rouvrir coûtait trois gestes pour revenir là où on
  //    était, dans une app qui vise moins de 25 secondes.
  await page.locator('[data-act="cartes"]').first().click();
  await page.locator('#q').fill('Safe Zone');
  await page.getByText('Safe Zone').first().click();
  const carteAvant = await page.evaluate(() => carteId);
  await page.reload({ waitUntil: 'networkidle' });
  check('la carte est retenue d\'une ouverture à l\'autre',
    (await page.evaluate(() => carteId)) === carteAvant, carteAvant);
  check('mais pas les picks — une nouvelle ouverture est une nouvelle partie',
    await page.evaluate(() => !ennemis.length && !allies.length && !bans.length));

  // Et le nom du produit doit toujours pouvoir tout relâcher, enregistrement
  // compris : sinon la carte reviendrait après l'avoir explicitement quittée.
  await page.locator('.bar .logo').click();
  await page.reload({ waitUntil: 'networkidle' });
  check('repartir de zéro efface aussi la carte retenue',
    (await page.evaluate(() => carteId)) === null);

  // 1. Sans réseau, l'app retombait sur une liste de secours sans classes —
  //    or la classe fait marcher la règle d'équilibre des familles. Le
  //    catalogue est désormais gardé d'une ouverture à l'autre.
  await page.evaluate(() => {
    const faux = brawlers.map(b => ({ nom: b.nom, k: b.k, img: null,
      couleur: '#ff0000', classe: 'Tank', rarete: { id: 4, nom: 'Epic' } }));
    localStorage.setItem('manager:catalogue', JSON.stringify(faux));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('sans API, le catalogue de la dernière fois reprend la main',
    (await page.evaluate(() => etatApi)) === 'garde',
    await page.evaluate(() => etatApi));
  check('les classes sont donc toujours là',
    (await page.evaluate(() => brawlers.filter(b => b.classe).length)) > 40);
  check('et le pied de page le dit, au lieu de laisser croire que c\'est frais',
    await page.evaluate(() => {
      const d = document.querySelector('.note details'); if (d) d.open = true;
      return /derni[eè]re ouverture/i.test(document.querySelector('.note').innerText);
    }));
  await page.evaluate(() => localStorage.removeItem('manager:catalogue'));

  // 5. L'app ne peut pas deviner qu'on a débloqué un brawler. Elle peut voir
  //    qu'il en est apparu un au catalogue depuis la dernière visite.
  await page.evaluate(() => {
    localStorage.setItem('manager:vus',
      JSON.stringify(brawlers.slice(2).map(b => b.k)));
  });
  await page.reload({ waitUntil: 'networkidle' });
  check('deux brawlers apparus depuis la dernière visite sont signalés',
    (await page.locator('.rappel').count()) === 1 &&
    /2/.test(await page.locator('.rappel').innerText()),
    await page.locator('.rappel').count());
  check('et le rappel mène droit à l\'écran des brawlers',
    (await page.locator('.rappel[data-act="roster"]').count()) === 1);
  // Au tout premier lancement, rien n'a jamais été vu : on ne crie pas
  // « 107 nouveaux », on se tait.
  await page.evaluate(() => localStorage.removeItem('manager:vus'));
  await page.reload({ waitUntil: 'networkidle' });
  check('au premier lancement, aucun rappel',
    (await page.locator('.rappel').count()) === 0);

  // ── Le catalogue ne bouge pas sous le doigt ────────────────────────────
  // Bug signalé : « j'ai coché douze brawlers, au moment de la draft je
  // n'avais même pas les mêmes ». Cause : le rangement par rareté a besoin de
  // l'API ; tant qu'elle n'a pas répondu la grille est alphabétique, et quand
  // elle répond TOUT se réorganise — sous le doigt de quelqu'un qui coche.
  //
  // Une première correction posait un drapeau « redessin en attente » avec
  // une liste d'actions à ne pas solder. Le drapeau n'était jamais lu : le
  // bug restait entier. Ce test-ci continue de cocher APRÈS l'arrivée du
  // catalogue — c'est exactement ce que la première correction laissait
  // passer, et ce qu'aucun test ne vérifiait.
  console.log('\n== le catalogue ne bouge pas sous le doigt ==');
  await page.locator('[data-act="roster"]').first().click();
  await page.locator('[data-act="rien"]').click();
  for (let i = 0; i < 6; i++) await page.locator('#grid .cel').nth(i).click();
  const casesAvant = await page.evaluate(() =>
    [...document.querySelectorAll('#grid .cel')].slice(0, 8)
      .map(e => e.querySelector('b').textContent));

  await page.evaluate(() => {
    const liste = brawlers.map((b, i) => ({ nom: b.nom, k: b.k, img: null,
      couleur: '#ff0000', classe: 'Tank',
      rarete: { id: [1, 2, 3, 4, 5, 6, 7][i % 7], nom: 'R' } }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    catalogueEnAttente = liste; etatApi = 'ok';
    if (ecran !== 'roster') { soldeCatalogue(); render(); }
  });
  await page.locator('#grid .cel').nth(6).click();
  await page.locator('#grid .cel').nth(7).click();
  const casesApres = await page.evaluate(() =>
    [...document.querySelectorAll('#grid .cel')].slice(0, 8)
      .map(e => e.querySelector('b').textContent));
  check('les cases ne bougent pas pendant qu\'on coche',
    JSON.stringify(casesAvant) === JSON.stringify(casesApres),
    { avant: casesAvant.slice(0, 4), apres: casesApres.slice(0, 4) });
  check('et les huit cochés sont bien les huit touchés',
    (await page.evaluate(() => roster.size)) === 8);

  await page.locator('.bar .actions [data-act="draft"]').click();
  check('le catalogue s\'applique dès qu\'on quitte l\'écran',
    await page.evaluate(() => catalogueEnAttente === null && !!brawlers[0].rarete));
  await page.locator('[data-act="roster"]').first().click();
  check('et la grille est alors rangée par rareté',
    (await page.locator('.rangee-rarete').count()) >= 6);
  check('sans avoir rien perdu du roster',
    (await page.evaluate(() => roster.size)) === 8);

  // ── Le taux d'utilisation ──────────────────────────────────────────────
  // refresh.py releve deux mesures par ligne de carte — taux de victoire ET
  // taux d'utilisation — et rangeait la seconde dans MAPS sans que personne
  // ne la lise. « Rosa, n°2, 59,45 % de victoires » s'affichait comme
  // « Griff, 55,1 % », joue par 42 % des equipes : l'un est une mesure,
  // l'autre le bruit de quelques parties, et rien ne les distinguait.
  console.log('\n== le taux d\'utilisation est lu ==');
  const usage = await page.evaluate(() => {
    const c = MAPS.find(m => m.top.some(e => e[2] < SEUIL_FIABLE));
    const bas = c.top.findIndex(e => e[2] < SEUIL_FIABLE);
    const haut = c.top.findIndex(e => e[2] >= SEUIL_FIABLE);
    return {
      // en dessous du seuil, le bonus de carte est rabote…
      basBrut: BONUS_CARTE[bas], basPts: pointsDeCarte(clef(c.top[bas][0]), c).points,
      // …au-dessus, il ne bouge pas d'un point
      hautBrut: BONUS_CARTE[haut], hautPts: pointsDeCarte(clef(c.top[haut][0]), c).points,
      // et il n'est jamais annule : figurer au classement reste un fait
      plancher: fiabilite(0) === PLANCHER_FIABLE,
      // un jeu de donnees d'avant, sans 3e nombre, doit calculer comme avant
      sansDonnee: fiabilite(undefined) === 1,
      texte: pointsDeCarte(clef(c.top[bas][0]), c).raisons[0].texte,
    };
  });
  check('sous le seuil, le bonus de carte est rabattu',
    usage.basPts < usage.basBrut, usage);
  check('au-dessus, il ne bouge pas', usage.hautPts === usage.hautBrut, usage);
  check('il n\'est jamais annulé complètement', usage.plancher, usage);
  check('un jeu de données sans ce nombre calcule comme avant',
    usage.sansDonnee, usage);
  check('et le taux d\'utilisation est écrit à l\'écran',
    /jou[ée] par|picked by|usado por/.test(usage.texte), usage.texte);

  // Le solde etait ecrit dans le gestionnaire de clic. Echap ne passe pas par
  // lui : il appelle ACTIONS.draft() puis render() directement. Mesure : le
  // catalogue restait en attente indefiniment, l'app tournait sur la liste de
  // secours — sans rarete ni classe, donc avec un conseil qui n'est plus tout
  // a fait le meme conseil — et se rattrapait seulement au prochain
  // changement d'ecran fait a la souris. Depuis, le solde est dans render(),
  // qui est le passage oblige de TOUS les chemins.
  // (on est déjà sur l'écran des brawlers, laissé par le test précédent)
  await page.evaluate(() => {
    brawlers = brawlers.map(b => ({ nom: b.nom, k: b.k, img: null, couleur: '#0f0',
      classe: b.classe, rarete: null }));
    indexerBrawlers();
    catalogueEnAttente = brawlers.map(b => Object.assign({}, b,
      { rarete: { id: 1, nom: 'R' } }));
    etatApi = 'ok'; render();
  });
  check('sur le roster, le catalogue attend toujours',
    await page.evaluate(() => catalogueEnAttente !== null));
  await page.keyboard.press('Escape');
  check('Échap quitte le roster comme le bouton',
    (await page.evaluate(() => ecran)) === 'draft');
  check('et solde le catalogue, comme le ferait un clic',
    await page.evaluate(() => catalogueEnAttente === null && !!brawlers[0].rarete),
    await page.evaluate(() => [catalogueEnAttente === null, brawlers[0].rarete]));

  console.log('\n== bilan ==');
  check('aucune erreur JavaScript sur tout le parcours', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
