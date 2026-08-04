// La même app sur un téléphone, une tablette et un ordinateur.
//
//   (python3 -m http.server 8765 &) && node tests/t_ecrans.js
//
// Ce fichier existe parce qu'une seule mesure avait suffi à trancher : sur
// un portable, la colonne unique laissait 64 % de l'écran vide et faisait
// quand même défiler trois fois pour lire le classement.
//
// Il vérifie une règle et une seule : ce qu'on doit voir sans faire défiler
// — le nom conseillé et la saisie — est visible partout. Pas de détection
// d'appareil : un iPhone tenu en paysage fait 844 px de large, plus qu'un
// iPad debout. Seules la largeur et la hauteur décident.
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8765;
const BASE = 'http://127.0.0.1:' + PORT;

let ok = 0, fail = 0;
const check = (nom, cond, detail = '') => {
  if (cond) { ok++; console.log('  ok   ' + nom); }
  else { fail++; console.log('  FAIL ' + nom + '   ' + JSON.stringify(detail)); }
};

// Largeur, hauteur, et si les deux colonnes sont possibles à cette taille.
// « Possible » et non « affiché » : les deux colonnes ne viennent que si la
// place le permet ET si l'utilisateur a demandé le détail. Le mode reste son
// choix — la largeur de sa fenêtre ne décide pas à sa place.
const TAILLES = [
  ['iPhone debout',   390,  844, false],
  ['iPhone couché',   844,  390, false],  // large, mais 390 px de haut
  ['iPad debout',     820, 1180, true],
  ['iPad couché',    1180,  820, true],
  ['portable',       1440,  900, true],
  ['grand écran',    1920, 1080, true],
];

const PREPARER = () => {
  roster = new Set(brawlers.map(x => x.k)); sauverRoster();
  carteId = MAPS[0].id;
  ennemis = ['piper', 'bull']; allies = ['poco']; bans = ['leon'];
  ecran = 'draft'; vueAnalyse = false; modeAffichage = 'rapide';
  render();
};

(async () => {
  const nav = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {});

  const erreurs = [];

  for (const [nom, w, h, attenduLarge] of TAILLES) {
    console.log('\n== ' + nom + ' — ' + w + '×' + h + ' ==');
    const page = await nav.newPage({ viewport: { width: w, height: h }, locale: 'fr-FR' });
    page.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));

    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    const vu = await page.evaluate(([hauteur, prep]) => {
      eval('(' + prep + ')()');
      const nomConseil = document.querySelector('.hero .name');
      // La saisie n'est plus faite de « .wrap » empilés mais d'une rangée par
      // liste, dans « .etat ». On mesure la dernière, qui est celle des bans.
      const rangees = document.querySelectorAll('.etat .r, .wrap');
      const dernier = rangees[rangees.length - 1];
      return {
        large: modeEffectif() === 'large',
        deuxCol: !!document.querySelector('.deux-colonnes'),
        menuMode: !!document.querySelector('[data-act="ouvrirMode"]'),
        basNom: nomConseil ? Math.round(nomConseil.getBoundingClientRect().bottom) : 1e9,
        basSaisie: dernier ? Math.round(dernier.getBoundingClientRect().bottom) : 1e9,
        largeurPage: document.documentElement.scrollWidth,
        largeurVue: window.innerWidth,
        colonne: Math.round(document.getElementById('app').getBoundingClientRect().width),
      };
    }, [h, PREPARER.toString()]);

    check('le nom conseillé est visible sans défiler', vu.basNom <= h, vu.basNom);
    check('la saisie aussi', vu.basSaisie <= h, vu.basSaisie);
    check('rien ne déborde en largeur',
      vu.largeurPage <= vu.largeurVue, [vu.largeurPage, vu.largeurVue]);

    // Le gaspillage est ce qui a déclenché le chantier : on le borne.
    const perdu = Math.round(100 * (w - vu.colonne) / w);
    check('moins de 25 % de largeur perdue', perdu <= 25, perdu + ' %');

    // Le mode reste offert partout : sur un grand écran aussi, on peut
    // vouloir le nom seul. Le faire disparaître, c'était retirer une
    // commande à quelqu'un qui ne l'avait pas demandé.
    check('le choix du mode est offert', vu.menuMode);
    check('en mode rapide, une seule colonne partout', !vu.deuxCol);

    const enDetail = await page.evaluate(() => {
      definirMode('analyse'); render();
      return { deuxCol: !!document.querySelector('.deux-colonnes'),
               fiches: document.querySelectorAll('.analyse').length };
    });
    check(attenduLarge
            ? 'en mode analyse, le calcul se met à côté du conseil'
            : 'en mode analyse, le calcul remplace le conseil',
      enDetail.deuxCol === attenduLarge, enDetail);
    check('et le classement est bien là', enDetail.fiches > 1, enDetail.fiches);
    await page.evaluate(() => { definirMode('rapide'); render(); });

    await page.close();
  }

  // Tourner un téléphone ou redimensionner une fenêtre franchit le seuil :
  // la mise en page doit suivre sans recharger.
  console.log('\n== tourner l\'appareil, redimensionner la fenêtre ==');
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  page.on('pageerror', e => erreurs.push('redimensionnement : ' + e.message));
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(prep => eval('(' + prep + ')()'), PREPARER.toString());
  await page.evaluate(() => { definirMode('analyse'); render(); });
  check('on part bien sur deux colonnes',
    (await page.locator('.deux-colonnes').count()) === 1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(120);
  check('rétréci, il repasse sur une colonne',
    (await page.locator('.deux-colonnes').count()) === 0);
  check('et le menu de mode revient',
    (await page.locator('[data-act="ouvrirMode"]').count()) === 1);
  check('le draft en cours n\'a pas bougé',
    (await page.locator('[data-act="rme"]').count()) === 2);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(120);
  check('réélargi, les deux colonnes reviennent',
    (await page.locator('.deux-colonnes').count()) === 1);
  check('et les picks sont toujours là',
    (await page.locator('[data-act="rme"]').count()) === 2);
  await page.close();

  console.log('\n== bilan ==');
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs);

  console.log('\n== ' + ok + ' ok, ' + fail + ' echecs ==');
  await nav.close();
  process.exit(fail ? 1 : 0);
})();
