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

/* « L'écran des brawlers a déjà été noté comme vu depuis qu'on y est entré ».
   Remis à faux dès qu'on en sort — voir render(). */
var rosterNote = false;

function soldeCatalogue() {
  if (!catalogueEnAttente) return;
  appliquerCatalogue(catalogueEnAttente);
  catalogueEnAttente = null;
}

/* La position de defilement de chaque ecran, et celui qui est actuellement
   affiche. En memoire seulement : ca vaut pour la visite en cours, pas
   au-dela — rouvrir l'app un autre jour doit repartir du haut. */
var defilement = {};
var ecranAffiche = null;

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

  /* Et l'inverse : sur l'écran des brawlers, on note que le catalogue a été
     vu. C'est ici que « vu » devient vrai — pas à l'arrivée des données.
     Après, pour que le rappel qu'on vient de satisfaire disparaisse du même
     coup, sans attendre un tour de plus.

     « et pas de catalogue en attente » : sans cette condition, on enregistre
     comme vue une liste que l'app s'apprête à jeter.
     ----------------------------------------------------------------------
     Mesuré, premier lancement, API répondant pendant qu'on est sur cet
     écran : « vus » recevait les 105 noms du repli, puis en quittant l'écran
     le catalogue à 107 était posé, et les 2 que le repli ignorait sortaient
     en « 2 nouveaux brawlers depuis ta dernière visite ». Ils n'étaient pas
     nouveaux : ils manquaient au repli. C'est mot pour mot le mensonge que
     le commentaire de noterCatalogueVu() dit avoir corrigé — réintroduit
     par un autre chemin, le jour même, par la correction précédente.

     etatApi ne suffit pas à s'en garder : il dit « l'appel a réussi », pas
     « la liste à l'écran vient de là ». catalogueEnAttente, lui, dit
     exactement qu'une autre liste va remplacer celle-ci.

     « et pas déjà noté » : une fois par VISITE de l'écran, pas à chaque
     dessin. render() tourne à chaque case cochée — mesuré, dix cases donnaient
     onze réécritures de manager:vus, 9 Ko, alors que le contenu est identique
     d'un clic à l'autre. Remplir un roster de 105 en écrivait près de 100, en
     écriture bloquante sur le fil principal. */
  var surLeRoster = (ecran === "roster");
  if (!surLeRoster) rosterNote = false;
  if (surLeRoster && !catalogueEnAttente && !rosterNote) {
    noterCatalogueVu();
    recalculerNouveaux();
    rosterNote = true;
  }

  /* Chaque écran retrouve l'endroit où on l'avait laissé.
     ----------------------------------------------------------------------
     Mesuré le 23/08 : on descend à 1230 px dans les 106 brawlers, on va voir
     le draft, on revient — on est à 0. Ce n'est pas un oubli du navigateur,
     c'est mécanique : le draft fait 950 px de haut, la position est donc
     ramenée dans ces limites, et le roster qui rouvre à 2 600 px ne peut plus
     la retrouver. Avec 3,2 écrans de portraits, c'est tout à refaire.

     On note donc la position de l'écran qu'on QUITTE, et on rend celle de
     l'écran qu'on ouvre. Rien n'est enregistré sur le téléphone : c'est vrai
     le temps de la visite, ce qui est exactement la portée du besoin. */
  var changeDEcran = (ecran !== ecranAffiche);
  if (changeDEcran && ecranAffiche) defilement[ecranAffiche] = window.scrollY;

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

  /* La restitution vient APRÈS le dessin : avant, la page n'a pas encore sa
     hauteur et le navigateur refuserait d'aller si loin. Les cellules ont une
     taille fixe, donc la hauteur est connue sans attendre les images — ce qui
     n'aurait pas été vrai avec des portraits de tailles variables. */
  if (changeDEcran) {
    ecranAffiche = ecran;
    /* Lire une dimension force le navigateur à recalculer la mise en page
       tout de suite. Sans cette lecture il garde encore l'ANCIENNE hauteur
       — celle de l'écran qu'on vient de quitter — et rabote la position
       demandée pour qu'elle y tienne. Mesuré : sans elle, on revenait à 0
       au lieu de 1131 px, exactement le défaut qu'on corrige ici. */
    void conteneur.offsetHeight;
    window.scrollTo(0, defilement[ecran] || 0);
  }

  /* Ouvrir un écran de recherche et devoir cliquer dans le champ avant de
     taper, c'est un geste de trop quand on a un clavier sous les doigts. */
  if (!AU_CLAVIER) return;
  var champ = document.getElementById("q");
  /* preventScroll : donner le focus à un champ fait défiler la page jusqu'à
     lui. Le champ est en tête de l'écran des brawlers — cette ligne ramenait
     donc TOUJOURS en haut, et c'est elle qui annulait la position qu'on vient
     de rendre juste au-dessus. Mesuré : position restaurée à 1131 px, puis
     0 px après le focus. Le curseur se pose sans que la page bouge. */
  if (champ) champ.focus({ preventScroll: true });
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
  /* Les trois actions du roster, rangees derriere un bouton : elles servent
     une fois, a la mise en place, et coutaient 219 px a chaque visite. */
  ouvrirRoster: function () { menuOuvert = (menuOuvert === "Roster") ? null : "Roster"; },

  /* Choix fait dans un menu : on applique et le menu se referme tout seul. */
  /* Changer de langue demande le fichier d'explications de cette langue-là.
     En attendant, l'app garde celui d'avant : la structure « qui bat qui » est
     la même dans les trois, seules les phrases diffèrent. Le conseil reste
     donc juste, et seule l'explication rattrape son retard — mieux que de
     bloquer l'écran pour une phrase. */
  langue: function (v) { definirLangue(v); chargerCounters(langue); },
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
    /* Le catalogue en attente s'il y en a un, sinon celui qui est posé.
       ----------------------------------------------------------------------
       Sur l'écran des brawlers, le catalogue reçu de l'API n'est
       DÉLIBÉRÉMENT pas posé — il attend qu'on quitte l'écran pour ne pas
       réorganiser la grille sous le doigt. « Tout cocher » travaillait donc
       sur la liste périmée : mesuré, 105 cochés alors que 107 attendaient.
       L'utilisateur croit avoir tout coché, et il lui en manque deux.
       On ne retire jamais rien du roster au passage : une clé cochée reste
       cochée même si le catalogue change. */
    var reference = catalogueEnAttente || brawlers;
    reference.forEach(function (b) { roster.add(b.k); });
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

var OUVRENT_UN_MENU = ["ouvrirLangue", "ouvrirMode", "ouvrirRoster"];

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

/* La table « qui bat qui » se charge après ce premier dessin.
   ------------------------------------------------------------------------
   Elle pèse 322 Ko sur les 524 que le navigateur télécharge avant de
   pouvoir afficher quoi que ce soit. Mesuré : 11,1 s d'écran noir en 3G
   lente, 2,9 s en 4G moyenne. L'app se donne 25 secondes en tout.

   Le premier geste, toujours, c'est choisir la carte — et ça ne demande
   que MAPS, 6,6 Ko. Autant le rendre possible tout de suite.

   Chargée par une balise plutôt que par fetch() : c'est ce qui la fait
   passer par le cache du navigateur et par le service worker comme
   n'importe quel autre fichier de l'app, sans qu'aucun des deux ait à
   connaître un cas particulier.

   En cas d'échec on ne bloque rien : COUNTERS reste vide, le moteur
   retombe sur le cycle de familles — c'est déjà ce qu'il fait quand une
   paire manque — et le pied de page dit que les matchups sont absents. */
var languesChargees = {};

function chargerCounters(pourLangue) {
  /* Une seule langue est téléchargée : celle qu'on lit.
     ----------------------------------------------------------------------
     counters.js portait les explications dans les trois langues à la fois —
     155 Ko de français, 126 d'anglais, 6,6 d'espagnol. Un utilisateur n'en
     lit qu'une : les deux autres partaient pour rien, à chaque ouverture,
     sur un téléphone. counters-fr.js fait 172 Ko contre 323 : −47 %.

     La langue est déjà connue à ce moment : chargerLangue() a lu le choix
     enregistré, ou à défaut celle de l'appareil (navigator.languages). */
  if (languesChargees[pourLangue]) return;
  languesChargees[pourLangue] = true;

  var balise = document.createElement("script");
  balise.src = "counters-" + pourLangue + ".js";
  balise.onload = function () { COUNTERS_PRET = true; render(); };
  balise.onerror = function () {
    /* Prêt ne veut pas dire rempli : ça veut dire « on sait à quoi s'en
       tenir ». Sans ça l'app resterait à annoncer un chargement qui
       n'arrivera jamais. */
    COUNTERS_PRET = true;
    render();
  };
  document.head.appendChild(balise);
}

chargerCounters(langue);

/* Les icônes des modes se chargent à part : elles ne conditionnent aucun
   calcul, donc leur arrivée n'a pas à retarder le premier dessin. Et on ne
   les redemande pas quand on les a déjà : elles ne changent pour ainsi dire
   jamais, alors qu'un appel réseau de plus au démarrage se dispute la bande
   passante avec donnees.js sur le lien 4G où l'app doit répondre en 25 s. */
/* On redemande tant qu'il MANQUE une icône, pas seulement quand il n'y en a
   aucune.
   ------------------------------------------------------------------------
   C'était « if (!Object.keys(IMAGES_MODES).length) ». Une première réponse
   partielle — l'API en donne trois sur six, ou son format change pour un mode
   — était gardée telle quelle et plus jamais redemandée : mesuré, une icône
   gardée, puis un rechargement où l'API avait les six, et toujours une seule.
   Les trois modes muets le restaient pour de bon. */
if (Object.keys(IMAGES_MODES).length < Object.keys(MODES).length) {
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
