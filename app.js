/* app.js — ce qui se passe quand on touche l'écran.
   ------------------------------------------------------------------------
   Le fonctionnement est volontairement simple : à chaque action on modifie
   l'état (dans etat.js), puis on redessine tout l'écran. Pas de mise à jour
   partielle, pas de synchronisation à maintenir. L'app est assez petite
   pour que ce soit instantané.

   Seule exception : la recherche ne redessine que la grille, pour ne pas
   faire perdre le focus du clavier à chaque lettre tapée.
   ------------------------------------------------------------------------ */

var conteneur = document.getElementById("app");

function render() {
  conteneur.innerHTML = vueHTML();
}


/* ============ Frappe dans le champ de recherche ============ */

conteneur.addEventListener("input", function (e) {
  if (e.target.id !== "q") return;
  recherche = e.target.value;

  var grille = document.getElementById("grid");
  if (grille) {
    grille.innerHTML = grilleBrawlers(ecran === "roster" ? "roster" : "choix");
  }
});


/* ============ Actions des boutons ============
   Chaque bouton porte data-act. On les traite ici, une action par entrée. */

var ACTIONS = {

  /* Ouvre ou referme un menu de la barre du haut. */
  ouvrirLangue: function () { menuOuvert = (menuOuvert === "Langue") ? null : "Langue"; },
  ouvrirMode: function () { menuOuvert = (menuOuvert === "Mode") ? null : "Mode"; },

  /* Choix fait dans un menu : on applique et le menu se referme tout seul. */
  langue: function (v) { definirLangue(v); },
  mode: function (v) { definirMode(v); },

  /* — Navigation — */
  roster: function () { ecran = "roster"; recherche = ""; },
  draft: function () { ecran = "draft"; recherche = ""; cibleAjout = null; },
  cartes: function () { ecran = "cartes"; },

  /* Choisir une carte remet le draft à zéro : on démarre une nouvelle partie. */
  carte: function (v) {
    carteId = v;
    ennemis = []; bans = []; allies = [];
    cibleAjout = null;
    ecran = "draft";
  },

  /* — Mes persos — */
  tout: function () {
    roster = new Set(brawlers.map(function (b) { return b.k; }));
    sauverRoster();
  },
  rien: function () { roster = new Set(); sauverRoster(); },
  toggle: function (v) {
    if (roster.has(v)) roster.delete(v); else roster.add(v);
    sauverRoster();
  },

  /* — Ouvrir l'écran de désignation — */
  addA: function () { cibleAjout = "allie"; recherche = ""; },
  addE: function () { cibleAjout = "ennemi"; recherche = ""; },
  addB: function () { cibleAjout = "ban"; recherche = ""; },
  annuler: function () { cibleAjout = null; recherche = ""; },

  /* Ajouter le brawler désigné à la bonne liste, sans doublon ni dépassement. */
  choisir: function (v) {
    var listes = {
      ennemi: { liste: ennemis, max: MAX_ENNEMIS },
      ban: { liste: bans, max: MAX_BANS },
      allie: { liste: allies, max: MAX_ALLIES }
    };
    var destination = listes[cibleAjout];
    if (destination
        && destination.liste.length < destination.max
        && destination.liste.indexOf(v) < 0) {
      destination.liste.push(v);
    }
    cibleAjout = null;
    recherche = "";
  },

  /* — Retirer une pastille — */
  rma: function (v) { allies = allies.filter(function (x) { return x !== v; }); },
  rme: function (v) { ennemis = ennemis.filter(function (x) { return x !== v; }); },
  rmb: function (v) { bans = bans.filter(function (x) { return x !== v; }); },

  /* Nouveau draft : on garde la carte, on vide les picks. */
  reset: function () {
    ennemis = []; bans = []; allies = [];
    cibleAjout = null;
  }
};

var OUVRENT_UN_MENU = ["ouvrirLangue", "ouvrirMode"];

conteneur.addEventListener("click", function (e) {
  var bouton = e.target.closest("[data-act]");

  /* Cliquer à côté referme le menu ouvert, comme partout ailleurs. */
  if (!bouton) {
    if (menuOuvert) { menuOuvert = null; render(); }
    return;
  }

  var nom = bouton.getAttribute("data-act");
  var action = ACTIONS[nom];
  if (!action) return;

  /* Toute action autre que l'ouverture d'un menu le referme. */
  if (OUVRENT_UN_MENU.indexOf(nom) < 0) menuOuvert = null;

  action(bouton.getAttribute("data-v"));
  render();
});

/* Échap referme le menu : réflexe attendu dès qu'on est au clavier. */
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && menuOuvert) {
    menuOuvert = null;
    render();
  }
});


/* ============ Démarrage ============
   On dessine tout de suite avec la liste de secours, pour que l'app soit
   utilisable sans attendre le réseau, puis on redessine quand l'API a
   répondu (ou échoué). */

chargerLangue();
render();
chargerBrawlers().then(render);
