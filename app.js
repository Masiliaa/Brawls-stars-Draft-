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

/* Le catalogue arrive : on l'applique — SAUF si l'écran des brawlers est
   ouvert. Là, le remplacer réorganise la grille par rareté sous le doigt de
   quelqu'un en train de cocher : les cases changent de place, et on voit
   d'autres noms cochés que ceux qu'on vient de toucher. Aucune information ne
   vaut ça ; il attend qu'on quitte l'écran.

   Une première version notait « redessin en attente » et énumérait les
   actions à ne pas solder. Le drapeau n'était jamais lu, la liste ne
   protégeait rien, et le bug restait entier au premier lancement — le seul
   cas où ce garde-fou devait servir. Ce qui se garde ici n'est pas un
   drapeau, c'est le catalogue lui-même : tant qu'il n'est pas posé, rien ne
   peut bouger.

   Écrit AVANT render(), qui l'appelle : « var catalogueEnAttente » vaudrait
   undefined plus haut, et l'app s'appuierait sur un détail du langage pour
   ne pas se tromper. L'ordre de lecture dit la dépendance. */
var catalogueEnAttente = null;

function soldeCatalogue() {
  if (!catalogueEnAttente) return;
  appliquerCatalogue(catalogueEnAttente);
  catalogueEnAttente = null;
}

function render() {
  /* Le solde se fait ICI, et pas dans le gestionnaire de clic.
     ----------------------------------------------------------------------
     Il y était, et le clic n'est pas le seul chemin : la touche Échap quitte
     l'écran des brawlers en appelant ACTIONS.draft() puis render() sans
     passer par lui. Mesuré : catalogue arrivé pendant qu'on coche, Échap,
     l'app repartait sur la liste de secours — sans rareté, sans classe, donc
     avec un conseil qui n'est plus tout à fait le même conseil — et ne se
     rattrapait qu'au prochain changement d'écran fait à la souris.
     render() est le seul passage obligé de tous les chemins. Le garde-fou
     doit être là où personne ne peut l'éviter, pas sur l'un des chemins. */
  if (ecran !== "roster") soldeCatalogue();

  conteneur.innerHTML = vueHTML();

  /* La largeur utile dépend du mode, et la feuille de style ne peut pas le
     savoir : on le lui dit ici.
     ----------------------------------------------------------------------
     Sans ça, le mode rapide sur un écran de 1440 px donnait quatre bords
     droits différents sur la même page — mesuré : la ligne de la carte et le
     pied de page s'arrêtaient à 1282 px, tout le contenu à 778. Les filets
     ne suivaient pas ce qu'ils étaient censés séparer. Le mode analyse, lui,
     a besoin de toute la place pour son classement. */
  conteneur.dataset.mode = (ecran === "draft") ? modeEffectif() : "";

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
  if (grille && ecran === "roster") {
    /* L'écran des brawlers est groupé par rareté au repos et à plat dès
       qu'on cherche : la classe change en même temps que le contenu. */
    var corps = corpsRoster();
    grille.className = corps.classe;
    grille.innerHTML = corps.html;
  } else if (grille) {
    grille.innerHTML = grilleBrawlers("choix");
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

  /* N'afficher que ceux qui ne sont pas cochés, et revenir à tout. Ce n'est
     pas enregistré : c'est une façon de regarder, pas un réglage. */
  manquants: function () { filtreManquants = !filtreManquants; },
  draft: function () { ecran = "draft"; recherche = ""; cibleAjout = null; },
  cartes: function () { ecran = "cartes"; recherche = ""; modeOuvert = null; },

  /* Le nom du produit ramène au vrai point de départ : plus de carte, plus de
     picks, l'écran d'invitation.
     ----------------------------------------------------------------------
     Il pointait sur « draft », qui ne fait qu'aller à l'écran de draft. Une
     fois la carte choisie, on y est déjà : l'écran était rigoureusement
     identique avant et après le clic, donc le bouton paraissait mort — et il
     l'était les neuf dixièmes du temps, puisque c'est l'écran où l'on passe
     sa vie.

     Cette action est volontairement distincte de « draft » : le bouton
     « Retour » de la barre, lui, doit ramener sans rien effacer. Les deux
     partageaient la même entrée ; les séparer évite qu'un retour depuis
     « Mes brawlers » ne vide un draft en cours. */
  accueil: function () {
    carteId = null;
    sauverCarte();
    ennemis = []; bans = []; allies = [];
    cibleAjout = null;
    vueAnalyse = false;
    recherche = "";
    modeOuvert = null;
    ecran = "draft";
  },

  /* Taper le nom conseillé ouvre le calcul, retaper referme. Le même bouton
     dans les deux sens : c'est un aller-retour, pas un changement de mode.
     modeAffichage n'est pas touché — on repart toujours de son réglage. */
  detail: function () { vueAnalyse = !vueAnalyse; },

  /* Le classement montre quatre brawlers, puis tout sur demande. */
  plusAnalyse: function () { analyseTout = !analyseTout; },

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
    sauverCarte();
    noterCarteRecente(v);
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

  /* Cocher ou décocher une rareté entière. Le bouton fait l'inverse de ce
     qui est déjà là : tout coché → il décoche, sinon il complète. Compléter
     plutôt que basculer chacun, sinon un groupe à moitié coché s'inverserait
     au lieu de se remplir — ce que personne n'attend d'un « tout cocher ». */
  groupe: function (v) {
    var id = Number(v);
    var membres = brawlers.filter(function (b) {
      return ((b.rarete && b.rarete.id) || 0) === id;
    });
    var complet = membres.every(function (b) { return roster.has(b.k); });
    membres.forEach(function (b) {
      if (complet) roster.delete(b.k); else roster.add(b.k);
    });
    sauverRoster();
  },
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
    analyseTout = false;
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
    /* Entrée ne prend le premier résultat QUE depuis le champ de recherche :
       c'est le geste attendu quand on vient de taper trois lettres.
       ----------------------------------------------------------------------
       Partout ailleurs, non — et c'était un bug. Mesuré : focus posé au
       clavier sur la cinquième case (Surge), une frappe sur Entrée, c'est
       Damian qui entrait dans le draft. Le navigateur clique déjà de
       lui-même l'élément qui a le focus ; ce raccourci s'ajoutait par-dessus
       et désignait quelqu'un d'autre que celui qu'on visait. Naviguer au
       clavier dans la grille était donc impossible. */
    if (!champDeSaisieActif()) return;
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

/* Les icônes des modes se chargent à part : elles ne conditionnent aucun
   calcul, donc leur arrivée n'a pas à retarder le premier dessin. Et on ne
   les redemande pas quand on les a déjà : elles ne changent pour ainsi dire
   jamais, alors qu'un appel réseau de plus au démarrage se dispute la bande
   passante avec donnees.js sur le lien 4G où l'app doit répondre en 25 s. */
if (!Object.keys(IMAGES_MODES).length) {
  chargerModes().then(function () { if (ecran === "cartes") render(); });
}

chargerBrawlers().then(function (liste) {
  catalogueEnAttente = liste;
  /* On ne décide ici que du redessin : c'est render() qui pose le catalogue,
     et lui seul, depuis qu'il est le passage obligé. Sur l'écran des
     brawlers, pas de redessin — donc le catalogue reste en attente, ce qui
     est exactement la règle. */
  if (ecran !== "roster") render();
});
