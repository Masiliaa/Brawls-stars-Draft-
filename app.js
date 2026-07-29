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

  /* Fait défiler les langues : français → anglais → espagnol → français. */
  langue: function () { definirLangue(langueSuivante()); },

  /* Bascule entre lecture rapide et analyse détaillée. */
  mode: function () { definirMode(modeSuivant()); },

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

conteneur.addEventListener("click", function (e) {
  var bouton = e.target.closest("[data-act]");
  if (!bouton) return;

  var action = ACTIONS[bouton.getAttribute("data-act")];
  if (!action) return;

  action(bouton.getAttribute("data-v"));
  render();
});


/* ============ Démarrage ============
   On dessine tout de suite avec la liste de secours, pour que l'app soit
   utilisable sans attendre le réseau, puis on redessine quand l'API a
   répondu (ou échoué). */

chargerLangue();
render();
chargerBrawlers().then(render);
