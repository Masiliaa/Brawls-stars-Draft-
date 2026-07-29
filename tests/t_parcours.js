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
  check('16 cartes proposées', (await page.locator('[data-act="carte"]').count()) === 16);

  await page.getByText('Safe Zone').first().click();
  check('un brawler est conseillé', await page.locator('.hero .name').isVisible());
  check('le mode est affiché',
    (await page.locator('.b.full').first().textContent()).includes('Braquage'));
  check('3 suggestions de repli', (await page.locator('.row').count()) === 3);

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

  console.log('\n== changement de langue ==');
  await page.locator('[data-act="draft"], [data-act="roster"]').first().waitFor();
  const codeDepart = await page.locator('[data-act="langue"]').textContent();
  check('démarre en français (locale fr-FR)', codeDepart === 'FR', codeDepart);

  await page.locator('[data-act="langue"]').click();
  check('un clic → anglais',
    (await page.locator('[data-act="langue"]').textContent()) === 'EN');
  check('les textes suivent',
    await page.getByText('My brawlers').first().isVisible());
  check('l’attribut lang de la page suit',
    (await page.getAttribute('html', 'lang')) === 'en');

  await page.locator('[data-act="langue"]').click();
  check('deux clics → espagnol',
    (await page.locator('[data-act="langue"]').textContent()) === 'ES');
  check('les textes suivent',
    await page.getByText('Mis brawlers').first().isVisible());

  await page.reload({ waitUntil: 'networkidle' });
  check('la langue survit au rechargement',
    (await page.locator('[data-act="langue"]').textContent()) === 'ES');

  await page.locator('[data-act="langue"]').click();
  check('trois clics → retour au français',
    (await page.locator('[data-act="langue"]').textContent()) === 'FR');

  console.log('\n== bilan ==');
  check('aucune erreur JavaScript sur tout le parcours', erreurs.length === 0, erreurs);

  await nav.close();
  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  process.exit(fail ? 1 : 0);
})();
