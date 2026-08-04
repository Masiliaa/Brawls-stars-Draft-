/* outils.js — petites fonctions de base, utilisées partout.
   Aucune dépendance : ce fichier peut être lu en premier et se suffit. */

/* Transforme un nom de brawler en identifiant stable.
   « Larry & Lawrie » → « larrylawrie », « Mr. P » → « mrp ».
   C'est la clé employée partout : roster, tables de matchups, synergie.
   refresh.py applique exactement la même règle côté Python. */
function clef(nom) {
  return String(nom || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* Pour comparer une recherche à un texte accentué : « phenix » doit trouver
   « Phénix flamboyant ». Personne ne pose les accents sur un clavier de
   téléphone, encore moins pendant un draft. */
function sansAccents(texte) {
  return String(texte || "").normalize("NFD")
    .replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* Variante pour les noms de fichiers d'image sur les CDN, qui gardent les
   tirets et remplacent le reste par des soulignés.
   « El Primo » → « el_primo ». */
function slugCdn(nom) {
  return String(nom).toLowerCase().replace(/[^a-z0-9-]/g, "_");
}

/* Neutralise le texte avant de l'insérer dans du HTML, pour qu'un nom
   contenant < ou & ne casse pas la page. */
function echapper(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Le séparateur décimal de la langue courante : 73.1 → « 73,1 » en français
   et en espagnol, « 73.1 » en anglais. */
function virgule(nombre) {
  var separateur = (typeof LANGUES !== "undefined" && LANGUES[langue])
    ? LANGUES[langue].decimal : ",";
  return String(nombre).replace(".", separateur);
}

/* Deux lettres à afficher quand aucune image ne se charge.
   « Larry & Lawrie » → « LL », « Mortis » → « MO ». */
function initiales(nom) {
  var mots = String(nom).replace(/[^a-zA-Z0-9 &-]/g, "").split(/[ &-]+/).filter(Boolean);
  var deux = mots.length >= 2 ? mots[0][0] + mots[1][0] : String(nom).slice(0, 2);
  return deux.toUpperCase();
}

/* Couleur de repli quand l'API n'a pas fourni la couleur de rareté.
   Toujours la même couleur pour un même brawler, pour éviter que l'app
   change d'aspect à chaque rechargement. */
function teinte(cle) {
  var somme = 0;
  for (var i = 0; i < cle.length; i++) {
    somme = (somme * 31 + cle.charCodeAt(i)) % 360;
  }
  return "hsl(" + somme + " 62% 55%)";
}


/* ============ Le stockage du navigateur, en un seul endroit ============
   Il y avait huit clés, douze try/catch recopiés et quatre façons différentes
   d'échouer : false, null, [], {}, ou le silence. Chaque nouvelle clé rajoutait
   son bloc, et la politique « stockage plein / navigation privée » se
   retrouvait écrite onze fois — donc impossible à faire évoluer d'un coup.

   Une seule paire, une seule convention : en lecture on rend la valeur par
   défaut si quoi que ce soit se passe mal, en écriture on échoue en silence.
   Une app qui marche vaut mieux qu'une app qui a raison. */
function lireJSON(cle, defaut) {
  try {
    var brut = localStorage.getItem(cle);
    if (brut === null) return defaut;
    var lu = JSON.parse(brut);
    return (lu === null || lu === undefined) ? defaut : lu;
  } catch (e) { return defaut; }
}

function ecrireJSON(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); }
  catch (e) { /* stockage plein ou navigation privée : tant pis */ }
}

function lireTexte(cle, defaut) {
  try {
    var brut = localStorage.getItem(cle);
    return brut === null ? defaut : brut;
  } catch (e) { return defaut; }
}

function ecrireTexte(cle, valeur) {
  try {
    if (valeur) localStorage.setItem(cle, valeur);
    else localStorage.removeItem(cle);
  } catch (e) { /* ignoré */ }
}
