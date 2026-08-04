/* etat.js — ce que l'app retient à un instant donné.
   ------------------------------------------------------------------------
   Deux choses différentes vivent ici :

   1. L'ÉTAT DU DRAFT en cours — la carte, les picks, l'écran affiché.
      Il disparaît au rechargement de la page, c'est voulu.

   2. LE CATALOGUE des brawlers et le ROSTER de l'utilisateur.
      Le roster, lui, est enregistré dans le navigateur et survit.
   ------------------------------------------------------------------------ */


/* ============ 1. L'état du draft en cours ============ */

var ecran = "draft";       /* "draft" | "roster" | "cartes" */

/* Deux façons de lire le même calcul :
   "rapide"  — un nom en gros, on décide en une seconde
   "analyse" — le classement complet, chaque point justifié
   Le choix est retenu, sous sa propre clé. */
var MODES_AFFICHAGE = ["rapide", "analyse"];
var CLE_MODE_AFFICHAGE = "manager:mode";
var modeAffichage = "rapide";
try {
  var m = localStorage.getItem(CLE_MODE_AFFICHAGE);
  if (MODES_AFFICHAGE.indexOf(m) > -1) modeAffichage = m;
} catch (e) { /* ignoré */ }

function definirMode(m) {
  if (MODES_AFFICHAGE.indexOf(m) < 0) return;
  modeAffichage = m;
  try { localStorage.setItem(CLE_MODE_AFFICHAGE, m); } catch (e) { /* ignoré */ }
}

/* La place disponible, pas le type d'appareil.
   ------------------------------------------------------------------------
   Il serait tentant de distinguer téléphone, tablette et ordinateur. C'est
   une fausse piste : un iPhone tenu en paysage fait 844 px de large, soit
   plus que la zone utile d'un iPad en portrait. Le type d'appareil ne dit
   rien de ce qu'on peut afficher ; la largeur, si — et elle change quand on
   tourne l'appareil ou qu'on redimensionne une fenêtre.

   Au-delà du seuil, le conseil et le classement tiennent côte à côte : la
   séparation rapide / analyse n'existait que parce qu'un téléphone est
   étroit.

   La largeur est calculée, pas choisie : 340 px de plancher pour le conseil
   — en dessous, le nom en gros corps se coupe en deux — plus 28 de
   gouttière, 380 pour que le classement reste lisible, et 56 de marges.
   Soit 804, arrondi à 820.

   Mais la largeur ne suffit pas, et l'iPhone tenu en paysage le prouve :
   844 px de large, donc assez pour deux colonnes, et seulement 390 de haut.
   Y afficher le classement complet portait la page de 2 à 6,7 écrans — la
   seconde colonne n'a nulle part où tenir, et la première ne peut même pas
   se coller puisqu'elle dépasse déjà la fenêtre. D'où la seconde condition :
   il faut aussi de quoi loger le conseil et sa saisie, soit 600 px. */
var SEUIL_DEUX_COLONNES = 820;
var SEUIL_HAUTEUR = 600;

function deuxColonnes() {
  return window.innerWidth >= SEUIL_DEUX_COLONNES
      && window.innerHeight >= SEUIL_HAUTEUR;
}

/* Descente ponctuelle dans le détail, depuis le mode rapide.
   ------------------------------------------------------------------------
   Changer de mode demandait deux gestes dans un menu, et c'était un réglage
   qu'on oubliait d'avoir mis — pendant un draft, deux gestes de trop. On ne
   change donc plus de mode : on tape le nom conseillé pour voir le calcul,
   on retape pour revenir.

   Volontairement NON enregistré : c'est un aller-retour, pas une préférence.
   modeAffichage reste le mode de départ, et n'est pas touché. */
var vueAnalyse = false;

/* Sur l'écran des brawlers : n'afficher que ceux qui ne sont pas cochés.
   On part de « tout cocher », puis on retire ce qu'on n'a pas — et la liste
   rétrécit à mesure, au lieu de rester à 107 portraits jusqu'au bout. */
var filtreManquants = false;

/* Le classement du mode Analyse en montre 4, puis tout sur demande.
   Dix brawlers avec toutes leurs raisons, c'est deux à quatre écrans à faire
   défiler sur les trois supports — pour n'en jouer qu'un. Ce n'est pas
   enregistré : c'est une façon de regarder, pas un réglage. */
var analyseTout = false;
var NB_ANALYSE_COURT = 4;

function modeEffectif() {
  /* Le mode veut dire la même chose sur tous les écrans : « la réponse » ou
     « la réponse et son calcul ». Seule la forme change avec la place.
     ----------------------------------------------------------------------
     J'avais fait disparaître le menu sur écran large, en décidant seul que
     le choix ne servait plus à rien puisque les deux colonnes montrent tout.
     C'était retirer une commande à quelqu'un qui ne l'avait pas demandé :
     sur un grand écran aussi, on peut vouloir le nom seul et rien d'autre. */
  var detaille = vueAnalyse || modeAffichage === "analyse";
  if (deuxColonnes()) return detaille ? "large" : "rapide";
  return detaille ? "analyse" : "rapide";
}

/* Menu déroulant ouvert dans la barre du haut : null, "langue" ou "mode".
   Un seul à la fois, et il se referme au moindre clic ailleurs. */
var menuOuvert = null;
var cibleAjout = null;     /* null | "ennemi" | "allie" | "ban" — quand on choisit un brawler */
var carteId = null;        /* identifiant de la carte sélectionnée */
/* Relue plus bas, une fois relireCarte() définie et MAPS chargé. */
/* Mode déplié sur l'écran des cartes. Tout déplier faisait six écrans de
   haut depuis que le pool est passé à 27 cartes : on ne choisit pas sa
   carte en un geste quand il faut faire défiler six fois. */
var modeOuvert = null;
var recherche = "";        /* texte tapé dans le champ de recherche */

var ennemis = [];          /* jusqu'à 3 clés de brawlers pris en face */
var allies = [];           /* jusqu'à 2 clés de brawlers pris par l'équipe */
var bans = [];             /* jusqu'à 6 clés de brawlers bannis */

var MAX_ENNEMIS = 3, MAX_ALLIES = 2, MAX_BANS = 6;


/* ============ 2. Le catalogue des brawlers ============ */

/* État du chargement de l'API : "charge" pendant l'appel, puis "ok" ou
   "hors". Sert au pied de page à prévenir si les classes manquent. */
var etatApi = "charge";

/* Liste de secours, reconstruite à partir des tier lists. Elle permet à
   l'app de fonctionner même si l'API ne répond pas — sans les couleurs de
   rareté ni les classes, mais avec tous les noms. */
var NOMS_DE_SECOURS = (function () {
  var vus = {}, noms = [];
  Object.keys(TIERS).forEach(function (mode) {
    Object.keys(TIERS[mode]).forEach(function (tier) {
      TIERS[mode][tier].split(",").forEach(function (nom) {
        var cle = clef(nom);
        if (cle && !vus[cle]) { vus[cle] = true; noms.push(nom); }
      });
    });
  });
  return noms.sort(function (a, b) { return a.localeCompare(b, "fr"); });
})();

var brawlers = NOMS_DE_SECOURS.map(function (nom) {
  return { nom: nom, k: clef(nom), img: null, couleur: null, classe: null,
           rarete: null };
});

/* Une couleur venue d'une API n'est pas forcément une couleur.
   ------------------------------------------------------------------------
   Relevé le 04/08/2026 : la rareté « Legendary » est publiée avec la valeur
   « #fff11ev ». Le « v » n'est pas un chiffre hexadécimal, donc ce n'est pas
   une couleur — et les 15 brawlers légendaires perdaient silencieusement leur
   teinte à l'écran. On ne corrige pas la donnée d'autrui : on refuse ce qui
   n'est pas lisible, et le repli habituel reprend la main. */
function couleurValide(c) {
  return (typeof c === "string"
       && /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c))
    ? c : null;
}

/* Accès direct par clé, reconstruit à chaque fois que la liste change. */
var parClef = {};
function indexerBrawlers() {
  parClef = {};
  brawlers.forEach(function (b) { parClef[b.k] = b; });
}
indexerBrawlers();

/* Le catalogue gardé est relu ICI, avant le premier dessin — et non pas
   seulement quand l'appel réseau échoue.
   ------------------------------------------------------------------------
   Sans ça, l'app démarrait sur la liste de secours (pas de rareté, donc
   grille alphabétique), puis l'API répondait et la grille se réorganisait
   PAR RARETÉ, sous le doigt de quelqu'un en train de cocher. Les brawlers
   cochés restaient cochés, mais ailleurs : à l'écran on voyait d'autres noms
   cochés que ceux qu'on venait de toucher. Signalé, reproduit, mesuré — les
   douze premières cases passaient de « 8-Bit, Alli, Amber… » à « 8-Bit,
   Belle, Bull, Chuck… » sans que personne n'ait rien demandé.

   Relu tout de suite, l'écran est le même du premier au dernier instant pour
   quiconque a déjà ouvert l'app une fois. */
/* (relireCatalogue est déclarée plus bas ; une déclaration de fonction est
   utilisable avant sa ligne, c'est ce qui permet de garder la définition
   auprès de sa jumelle garderCatalogue().) */
relireCatalogue();

/* Le brawler correspondant à une clé. Renvoie un objet minimal plutôt que
   null si la clé est inconnue, pour que l'affichage ne casse jamais. */
function brawler(cle) {
  return parClef[cle]
      || { nom: cle, k: cle, img: null, couleur: null, classe: null, rarete: null };
}

function nomBrawler(cle) {
  return brawler(cle).nom;
}

/* Le catalogue, gardé de côté entre deux ouvertures.
   ------------------------------------------------------------------------
   L'app va chercher les portraits, les raretés et les CLASSES sur internet à
   chaque démarrage. Sans réponse, elle retombait sur une liste de secours
   reconstruite depuis les tier lists : les noms, et rien d'autre. Or la
   classe n'est pas de la décoration — c'est elle qui fait marcher la règle
   d'équilibre des familles du moteur. Autrement dit, sans réseau le conseil
   n'était plus tout à fait le même conseil.

   Or ce truc s'emploie dans un salon d'attente de 25 secondes, sur un
   téléphone, en 4G moyenne. Le catalogue est donc gardé dans le navigateur :
   la prochaine ouverture repart de la dernière version connue, et l'appel
   réseau ne fait plus que la rafraîchir. */
var CLE_CATALOGUE = "manager:catalogue";

function garderCatalogue() {
  try {
    localStorage.setItem(CLE_CATALOGUE, JSON.stringify(brawlers));
  } catch (e) { /* stockage plein : tant pis, l'app marche quand même */ }
}

function relireCatalogue() {
  var lu;
  try { lu = JSON.parse(localStorage.getItem(CLE_CATALOGUE) || "null"); }
  catch (e) { return false; }
  /* On refuse une liste vide ou trop courte : mieux vaut la liste de secours,
     qui est au moins cohérente, qu'un catalogue tronqué par un stockage plein. */
  if (!lu || lu.length < 40) return false;
  brawlers = lu;
  indexerBrawlers();
  return true;
}

/* ============ Les images des modes de jeu ============
   Les six modes n'avaient qu'une couleur. Dans le jeu ils ont chacun leur
   icône, et c'est à elle qu'on les reconnaît — pas à un nom écrit.

   Les identifiants d'image ne sont PAS écrits en dur : on les lit, comme le
   reste. Les deviner reviendrait à inventer une valeur, et une icône fausse
   est pire qu'une icône absente. Le rapprochement se fait sur le nom
   normalisé — « Brawl-Ball » et « brawlBall » donnent la même clé. */
var CLE_MODES = "manager:modes";
var IMAGES_MODES = {};

try {
  IMAGES_MODES = JSON.parse(localStorage.getItem(CLE_MODES) || "{}") || {};
} catch (e) { IMAGES_MODES = {}; }

function chargerModes() {
  return fetch("https://api.brawlapi.com/v1/gamemodes")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (donnees) {
      var parClefMode = {};
      (donnees.list || []).forEach(function (m) {
        var img = m.imageUrl || m.imageUrl2;
        if (!img) return;
        [m.hash, m.name, m.scHash].forEach(function (nom) {
          if (nom) parClefMode[clef(nom)] = img;
        });
      });
      var trouve = {};
      Object.keys(MODES).forEach(function (mode) {
        var img = parClefMode[clef(mode)];
        if (img) trouve[mode] = img;
      });
      /* On ne remplace que si on a trouvé quelque chose : une réponse vide ne
         doit pas effacer les icônes de la dernière fois. */
      if (Object.keys(trouve).length) {
        IMAGES_MODES = trouve;
        try { localStorage.setItem(CLE_MODES, JSON.stringify(trouve)); }
        catch (e) { /* ignoré */ }
      }
    })
    .catch(function () { /* on garde ce qu'on avait, ou rien */ });
}

/* Complète le catalogue avec l'API : vraies URL d'image, couleur de rareté
   et classe. La classe est indispensable au cycle de familles du moteur. */
function chargerBrawlers() {
  return fetch("https://api.brawlapi.com/v1/brawlers")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (donnees) {
      brawlers = (donnees.list || [])
        .filter(function (b) { return b.released !== false; })
        .map(function (b) {
          return {
            nom: b.name,
            k: clef(b.name),
            img: b.imageUrl2 || b.imageUrl || null,
            couleur: couleurValide(b.rarity && b.rarity.color),
            classe: (b.class && b.class.name !== "Unknown") ? b.class.name : null,
            /* La rareté sert à ranger l'écran « Mes brawlers » : on possède
               presque toujours les communs, et ce qui manque se concentre
               dans les légendaires. Le nom est celui de l'API, en anglais ;
               langues.js le traduit quand il connaît la rareté, et le laisse
               tel quel sinon — Supercell peut en ajouter une demain. */
            rarete: (b.rarity && typeof b.rarity.id === "number")
              ? { id: b.rarity.id, nom: b.rarity.name || String(b.rarity.id) }
              : null
          };
        })
        .sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });
      indexerBrawlers();
      garderCatalogue();
      etatApi = "ok";
    })
    /* Pas de réseau, ou une réponse illisible : si le catalogue de la
       dernière fois est là, l'app garde ses portraits ET ses classes. On dit
       quand même « hors », parce que le pied de page doit rester exact : ce
       qui est affiché ne vient pas d'un appel réussi aujourd'hui. */
    .catch(function () {
      etatApi = relireCatalogue() ? "garde" : "hors";
    });
}


/* ============ 3. Le roster, enregistré dans le navigateur ============ */

/* NE PAS CHANGER cette clé : un roster existant est déjà enregistré chez
   l'utilisateur, et le renommer le ferait disparaître. */
var CLE_ROSTER = "manager:roster";

var roster = new Set();
try {
  var enregistre = localStorage.getItem(CLE_ROSTER);
  if (enregistre) roster = new Set(JSON.parse(enregistre));
} catch (e) { /* navigation privée ou stockage plein : on part à vide */ }

/* Les brawlers connus au moment où le roster a été revu la dernière fois.
   Sert à repérer ceux que Supercell a sortis depuis — la seule chose qu'on
   puisse honnêtement détecter. On ne sait PAS si l'utilisateur a débloqué un
   brawler ; on sait qu'il en existe un qu'il n'a jamais vu passer, et c'est
   déjà de quoi lui proposer d'aller voir. */
var CLE_VUS = "manager:vus";

function sauverRoster() {
  try {
    localStorage.setItem(CLE_ROSTER, JSON.stringify(Array.from(roster)));
    localStorage.setItem(CLE_VUS, JSON.stringify(brawlers.map(function (b) {
      return b.k;
    })));
  } catch (e) { /* échec silencieux : mieux vaut une app qui marche */ }
}

/* Les brawlers apparus depuis la dernière visite de l'écran « Mes brawlers ».
   Au tout premier lancement la liste des vus est vide : on ne crie pas
   « 107 nouveaux », on note ce qu'on connaît et on se tait. */
function brawlersNouveaux() {
  var vus;
  try { vus = JSON.parse(localStorage.getItem(CLE_VUS) || "null"); }
  catch (e) { vus = null; }
  if (!vus || !vus.length) return [];
  var connus = {};
  vus.forEach(function (k) { connus[k] = true; });
  return brawlers.filter(function (b) { return !connus[b.k]; });
}

/* ============ 3 bis. La carte en cours ============
   La langue, le mode et le roster survivaient au rechargement ; pas la carte.
   Refermer l'app et la rouvrir coûtait donc trois gestes pour revenir là où
   l'on était — dans une app qui vise moins de 25 secondes. Incohérent, et
   c'est l'incohérence qui se remarque. */
var CLE_CARTE = "manager:carte";

/* Les dernières cartes jouées, la plus récente en tête.
   ------------------------------------------------------------------------
   Choisir une carte coûtait trois gestes : ouvrir la liste, déplier le mode,
   toucher la carte — à chaque partie, avant même de commencer. Or on ne joue
   pas 27 cartes au hasard : on enchaîne quelques parties sur la rotation du
   moment. Les dernières jouées suffisent donc presque toujours, et elles
   ramènent le choix à UN geste, depuis l'écran de draft. */
var CLE_RECENTES = "manager:recentes";
var MAX_RECENTES = 4;

function cartesRecentes() {
  var lu;
  try { lu = JSON.parse(localStorage.getItem(CLE_RECENTES) || "[]"); }
  catch (e) { return []; }
  if (!lu || !lu.length) return [];
  /* Filtrées sur le pool en cours : la rotation change à chaque saison, et
     proposer une carte qui n'existe plus serait pire que ne rien proposer. */
  return lu.map(function (id) {
    for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
    return null;
  }).filter(Boolean);
}

function noterCarteRecente(id) {
  if (!id) return;
  var liste = cartesRecentes().map(function (c) { return c.id; });
  liste = [id].concat(liste.filter(function (x) { return x !== id; }));
  try {
    localStorage.setItem(CLE_RECENTES,
      JSON.stringify(liste.slice(0, MAX_RECENTES)));
  } catch (e) { /* ignoré */ }
}

function sauverCarte() {
  try {
    if (carteId) localStorage.setItem(CLE_CARTE, carteId);
    else localStorage.removeItem(CLE_CARTE);
  } catch (e) { /* ignoré */ }
}

/* Relue seulement si la carte est encore en rotation : le pool change à
   chaque saison, et rouvrir sur une carte qui n'existe plus serait pire que
   de ne rien retenir. */
function relireCarte() {
  var id;
  try { id = localStorage.getItem(CLE_CARTE); } catch (e) { return null; }
  if (!id) return null;
  for (var i = 0; i < MAPS.length; i++) {
    if (MAPS[i].id === id) return id;
  }
  return null;
}

/* La carte en cours est relue ici, en fin de fichier : relireCarte() a besoin
   de MAPS, et l'état doit être complet avant que app.js ne dessine. */
carteId = relireCarte();
