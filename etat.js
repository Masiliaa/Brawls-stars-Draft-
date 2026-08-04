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

/* Descente ponctuelle dans le détail, depuis le mode rapide.
   ------------------------------------------------------------------------
   Changer de mode demandait deux gestes dans un menu, et c'était un réglage
   qu'on oubliait d'avoir mis — pendant un draft, deux gestes de trop. On ne
   change donc plus de mode : on tape le nom conseillé pour voir le calcul,
   on retape pour revenir.

   Volontairement NON enregistré : c'est un aller-retour, pas une préférence.
   modeAffichage reste le mode de départ, et n'est pas touché. */
var vueAnalyse = false;

function modeEffectif() {
  return vueAnalyse ? "analyse" : modeAffichage;
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
  return { nom: nom, k: clef(nom), img: null, couleur: null, classe: null };
});

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
  return parClef[cle] || { nom: cle, k: cle, img: null, couleur: null, classe: null };
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
            couleur: (b.rarity && b.rarity.color) || null,
            classe: (b.class && b.class.name !== "Unknown") ? b.class.name : null
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
