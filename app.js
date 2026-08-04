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

/* Un pointeur fin, c'est une souris ou un trackpad : il y a un clavier
   derrière. Sur un écran tactile, donner le focus au champ ferait surgir le
   clavier virtuel par-dessus la grille qu'on vient d'ouvrir. */
var AU_CLAVIER = !!(window.matchMedia && window.matchMedia("(pointer:fine)").matches);
if (AU_CLAVIER) document.body.classList.add("clavier");

function render() {
  conteneur.innerHTML = vueHTML();

  /* Ouvrir un écran de recherche et devoir cliquer dans le champ avant de
     taper, c'est un geste de trop quand on a un clavier sous les doigts. */
  if (!AU_CLAVIER) return;
  var champ = document.getElementById("q");
  if (champ) champ.focus();
}


/* ============ Changement de largeur ============
   Tourner un téléphone, faire pivoter une tablette ou redimensionner une
   fenêtre change la mise en page : à partir d'un certain point, conseil et
   classement tiennent côte à côte. On ne redessine que quand le seuil est
   franchi — un redimensionnement de fenêtre émet des dizaines d'événements
   par seconde, et refaire l'écran à chaque pixel n'apporterait rien. */
var largeurEtait = deuxColonnes();

window.addEventListener("resize", function () {
  var maintenant = deuxColonnes();
  if (maintenant === largeurEtait) return;
  largeurEtait = maintenant;
  menuOuvert = null;      /* le menu de mode peut venir de disparaître */
  render();
});


/* ============ Frappe dans le champ de recherche ============ */

conteneur.addEventListener("input", function (e) {
  if (e.target.id !== "q") return;
  recherche = e.target.value;

  var grille = document.getElementById("grid");
  if (grille) {
    grille.innerHTML = grilleBrawlers(ecran === "roster" ? "roster" : "choix");
  }
  /* L'écran des cartes a sa propre liste : on ne redessine qu'elle, sinon
     le champ perd le focus à chaque lettre tapée. */
  var liste = document.getElementById("listeCartes");
  if (liste) liste.innerHTML = listeCartesHTML();
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
  roster: function () { ecran = "roster"; recherche = ""; vueAnalyse = false; },
  draft: function () { ecran = "draft"; recherche = ""; cibleAjout = null; },
  cartes: function () { ecran = "cartes"; recherche = ""; modeOuvert = null; },

  /* Taper le nom conseillé ouvre le calcul, retaper referme. Le même bouton
     dans les deux sens : c'est un aller-retour, pas un changement de mode.
     modeAffichage n'est pas touché — on repart toujours de son réglage. */
  detail: function () { vueAnalyse = !vueAnalyse; },

  /* Déplier un mode sur l'écran des cartes. Un seul à la fois : deux modes
     ouverts, et on retombe dans la liste à rallonge qu'on vient de fermer. */
  ouvrirModeCarte: function (v) { modeOuvert = (modeOuvert === v) ? null : v; },

  /* Choisir une carte remet le draft à zéro : on démarre une nouvelle partie. */
  /* Changer de carte démarre une nouvelle partie, donc vide les picks.
     Mais rechoisir CELLE QU'ON A DÉJÀ n'est pas un changement : c'est ce que
     fait quelqu'un venu vérifier le nom de la carte, et lui effacer son
     draft pour ça serait une punition absurde. */
  carte: function (v) {
    if (v !== carteId) {
      ennemis = []; bans = []; allies = [];
    }
    carteId = v;
    cibleAjout = null;
    vueAnalyse = false;
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

  /* Bannir directement depuis le conseil, sans passer par la recherche. */
  banConseil: function (v) {
    if (bans.length < MAX_BANS && bans.indexOf(v) < 0) bans.push(v);
  },

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
    vueAnalyse = false;
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

/* ============ Le clavier ============
   Sur un ordinateur, ce n'est pas la mise en page qui fait gagner du temps,
   c'est le clavier : taper « pip » puis Entrée bat n'importe quel nombre de
   clics. Trois touches suffisent, et aucune n'invente de fonction nouvelle —
   elles déclenchent exactement ce que déclenche un bouton visible.

     Entrée  désigne le premier résultat affiché
     Échap   annule, referme, revient
     E A B   ouvrent la saisie d'un ennemi, d'un allié, d'un ban

   Les lettres ne valent que sur l'écran de draft et jamais pendant qu'on
   écrit : sinon taper « bea » dans la recherche déclencherait trois écrans. */

function champDeSaisieActif() {
  var a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
}

/* Le premier résultat de la grille ou de la liste de cartes, selon l'écran. */
function premierResultat() {
  return document.querySelector('#grid .cel, #listeCartes [data-act="carte"]');
}

var RACCOURCIS_DRAFT = { e: "addE", a: "addA", b: "addB" };

document.addEventListener("keydown", function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === "Escape") {
    if (menuOuvert) { menuOuvert = null; render(); return; }
    /* Écran de désignation ou de carte : Échap ramène au draft, comme le
       bouton « Annuler ». Sur le draft lui-même, il referme le détail. */
    if (cibleAjout) { ACTIONS.annuler(); render(); return; }
    if (ecran !== "draft") { ACTIONS.draft(); render(); return; }
    if (vueAnalyse) { ACTIONS.detail(); render(); return; }
    return;
  }

  if (e.key === "Enter") {
    var premier = premierResultat();
    if (!premier) return;
    e.preventDefault();
    premier.click();
    return;
  }

  if (champDeSaisieActif() || ecran !== "draft" || cibleAjout) return;

  var action = RACCOURCIS_DRAFT[e.key.toLowerCase()];
  if (!action) return;
  e.preventDefault();
  menuOuvert = null;
  ACTIONS[action]();
  render();
});


/* ============ Démarrage ============
   On dessine tout de suite avec la liste de secours, pour que l'app soit
   utilisable sans attendre le réseau, puis on redessine quand l'API a
   répondu (ou échoué). */

chargerLangue();
render();
chargerBrawlers().then(render);
