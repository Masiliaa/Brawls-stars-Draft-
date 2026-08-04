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

/* Le brawler correspondant à une clé. Renvoie un objet minimal plutôt que
   null si la clé est inconnue, pour que l'affichage ne casse jamais. */
function brawler(cle) {
  return parClef[cle]
      || { nom: cle, k: cle, img: null, couleur: null, classe: null, rarete: null };
}

function nomBrawler(cle) {
  return brawler(cle).nom;
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
      etatApi = "ok";
    })
    .catch(function () { etatApi = "hors"; });
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

function sauverRoster() {
  try {
    localStorage.setItem(CLE_ROSTER, JSON.stringify(Array.from(roster)));
  } catch (e) { /* échec silencieux : mieux vaut une app qui marche */ }
}
