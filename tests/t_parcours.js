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

  console.log('\n== le roster survit au rechargement ==');
  await page.reload({ waitUntil: 'networkidle' });
  const apresReload = await page.evaluate(() => roster.size);
  check('roster relu depuis le navigateur', apresReload === toutCoche, apresReload);
  check('clé localStorage inchangée',
    (await page.evaluate(() => localStorage.getItem('manager:roster'))) !== null);

  console.log('\n== choisir une carte ==');
  await page.locator('[data-act="cartes"]').first().click();
  check('les 6 modes sont listés', (await page.locator('.lab').count()) === 6);
  // Le pool suit la rotation classée : sa taille change d'une saison à
  // l'autre. On vérifie que l'écran propose exactement les cartes chargées,
  // pas un nombre fixé une fois pour toutes.
  const nbCartes = await page.evaluate(() => MAPS.length);
  check('toutes les cartes sont proposées',
    (await page.locator('[data-act="carte"]').count()) === nbCartes, nbCartes);
  check('pool de taille plausible', nbCartes >= 12 && nbCartes <= 36, nbCartes);

  await page.getByText('Safe Zone').first().click();
  check('un brawler est conseillé', await page.locator('.hero .name').isVisible());
  check('le mode est affiché',
    (await page.locator('.b.full').first().textContent()).includes('Braquage'));
  // Les bans conseillés partagent la classe .row : on ne compte que les picks.
  check('3 suggestions de repli',
    (await page.locator('.row:not(.conseil-ban)').count()) === 3);
  check('et 3 bans conseillés pendant la phase de ban',
    (await page.locator('.conseil-ban').count()) === 3);

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
    (await page.locator('.b.full').first().textContent()).includes('Safe Zone'));

  console.log('\n== changer de carte remet le draft à zéro ==');
  await ajouter('addE', 2);
  await page.locator('[data-act="cartes"]').first().click();
  await page.getByText('Hot Potato').first().click();
  check('nouvelle carte affichée',
    (await page.locator('.b.full').first().textContent()).includes('Hot Potato'));
  check('les ennemis ont été vidés', (await page.locator('[data-act="rme"]').count()) === 0);

  console.log('\n== roster vide : message d\'invite ==');
  await page.locator('[data-act="roster"]').click();
  await page.locator('[data-act="rien"]').click();
  check('« tout décocher » vide tout', (await page.locator('.cel.on').count()) === 0);
  await page.locator('[data-act="draft"]').click();
  check('l\'app explique quoi faire',
    (await page.locator('.box p').textContent()).includes('Coche d\'abord'));

  console.log('\n== bascule Rapide / Analyse ==');
  // Le roster a été vidé juste avant : deux boutons portent data-act="roster"
  // (la barre du haut et l'encadré d'invite). On prend le premier.
  await page.locator('[data-act="cartes"]').first().click();
  await page.getByText('Safe Zone').first().click();
  await page.locator('[data-act="roster"]').first().click();
  await page.locator('[data-act="tout"]').click();
  await page.locator('[data-act="draft"]').click();

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
  const fiches = await page.locator('.analyse').count();
  check('le mode Analyse détaille plusieurs brawlers', fiches > 4, fiches);
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
  check('démarre en français (locale fr-FR)', codeDepart === 'FR', codeDepart);

  await page.locator('[data-act="ouvrirLangue"]').click();
  check('les trois langues sont proposées',
    (await page.locator('.menu [data-act="langue"]').count()) === 3);
  check('elles sont nommées en toutes lettres',
    (await page.locator('.menu [data-act="langue"]').allTextContents())
      .join('|').includes('Español'));

  // On va directement à l'espagnol, sans passer par l'anglais.
  await page.locator('.menu [data-act="langue"][data-v="es"]').click();
  check('choix direct de l’espagnol',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()) === 'ES');
  check('les textes suivent',
    await page.getByText('Mis brawlers').first().isVisible());
  check('l’attribut lang de la page suit',
    (await page.getAttribute('html', 'lang')) === 'es');

  await page.reload({ waitUntil: 'networkidle' });
  check('la langue survit au rechargement',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()) === 'ES');

  await page.locator('[data-act="ouvrirLangue"]').click();
  await page.locator('.menu [data-act="langue"][data-v="fr"]').click();
  check('retour direct au français',
    (await page.locator('[data-act="ouvrirLangue"]').textContent()) === 'FR');
  check('plus aucune trace de « persos »',
    !(await page.locator('#app').innerText()).toLowerCase().includes('persos'));

  console.log('\n== bilan ==');
  check('aucune erreur JavaScript sur tout le parcours', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
