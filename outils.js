/* outils.js — petites fonctions de base, utilisées partout.
   Aucune dépendance : ce fichier peut être lu en premier et se suffit. */

/* Transforme un nom de brawler en identifiant stable.
   « Larry & Lawrie » → « larrylawrie », « Mr. P » → « mrp ».
   C'est la clé employée partout : roster, tables de matchups, synergie.
   refresh.py applique exactement la même règle côté Python. */
function clef(nom) {
  return String(nom || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
