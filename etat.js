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
  ecrireJSON(CLE_CATALOGUE, brawlers);
}

/* En dessous de ce nombre, ce n'est pas un catalogue : c'est un accident.
   Le seuil servait déjà à la RELECTURE — mieux vaut la liste de secours, qui
   est au moins cohérente, qu'un catalogue tronqué par un stockage plein. Il ne
   servait pas à l'ÉCRITURE, et c'était le trou.
   ------------------------------------------------------------------------
   Mesuré, avec une API répondant 200 mais ne renvoyant que trois brawlers :
   le catalogue gardé passait de 105 à 3, l'app posait ces 3 et ne rendait plus
   que 3 conseils. Le bon catalogue était détruit dans le navigateur, donc la
   prochaine ouverture hors ligne repartait sans classes ni raretés. Une seule
   réponse abîmée suffisait, et rien ne le disait. */
var MIN_CATALOGUE = 40;

function relireCatalogue() {
  var lu = lireListe(CLE_CATALOGUE);
  /* On refuse une liste vide ou trop courte : mieux vaut la liste de secours,
     qui est au moins cohérente, qu'un catalogue tronqué par un stockage plein.
     Et on regarde la première fiche : une liste de quarante n'importe quoi
     passerait le test de longueur, et le moteur travaillerait sur du vide. */
  if (lu.length < MIN_CATALOGUE || !lu[0] || !lu[0].k) return false;
  brawlers = lu;
  indexerBrawlers();
  return true;
}

/* Relu ICI, et pas plus haut : une fonction est utilisable avant sa ligne,
   mais « var CLE_CATALOGUE » ne l'est pas — elle vaudrait undefined, et on
   lirait la clé « undefined ». Piège classique, attrapé par les tests.

   Relu AVANT le premier dessin : sans ça l'app démarrait sur la liste de
   secours (pas de rareté, donc grille alphabétique), puis l'API répondait et
   la grille se réorganisait par rareté sous le doigt de quelqu'un en train
   de cocher. */
var CATALOGUE_GARDE = relireCatalogue();

/* ============ Les images des modes de jeu ============
   Les six modes n'avaient qu'une couleur. Dans le jeu ils ont chacun leur
   icône, et c'est à elle qu'on les reconnaît — pas à un nom écrit.

   Les identifiants d'image ne sont PAS écrits en dur : on les lit, comme le
   reste. Les deviner reviendrait à inventer une valeur, et une icône fausse
   est pire qu'une icône absente. Le rapprochement se fait sur le nom
   normalisé — « Brawl-Ball » et « brawlBall » donnent la même clé. */
var CLE_MODES = "manager:modes";
var IMAGES_MODES = {};

IMAGES_MODES = lireObjet(CLE_MODES);

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
        ecrireJSON(CLE_MODES, trouve);
      }
    })
    .catch(function () { /* on garde ce qu'on avait, ou rien */ });
}

/* Pose un catalogue fraîchement reçu. Séparé de sa récupération : c'est
   l'appelant qui choisit le moment, voir chargerBrawlers(). */
function appliquerCatalogue(liste) {
  if (!liste || !liste.length) return false;
  brawlers = liste;
  indexerBrawlers();
  garderCatalogue();
  /* noterCatalogueVu() était appelé ICI, juste avant recalculerNouveaux() —
     donc on marquait tout comme vu, puis on cherchait ce qui ne l'était pas.
     La réponse était forcément « rien ». Le rappel « 2 nouveaux brawlers » ne
     pouvait donc apparaître chez personne dont l'API répond, c'est-à-dire
     chez à peu près tout le monde. Il ne se voyait que depuis la machine où
     ce code a été écrit, où l'API est injoignable — et c'est pour ça qu'il
     avait l'air de marcher. Voir noterCatalogueVu() pour l'endroit juste. */
  recalculerNouveaux();
  return true;
}

/* Complète le catalogue avec l'API : vraies URL d'image, couleur de rareté
   et classe. La classe est indispensable au cycle de familles du moteur. */
/* Le même état qu'une panne réseau : ce qui est affiché ne vient pas d'un
   appel réussi aujourd'hui, et le pied de page doit rester exact. */
function souciCatalogue(recus) {
  etatApi = CATALOGUE_GARDE ? "garde" : "hors";
  if (typeof console !== "undefined" && console.warn) {
    console.warn("catalogue refusé : " + recus + " brawlers reçus, "
                 + MIN_CATALOGUE + " au minimum");
  }
}

function chargerBrawlers() {
  return fetch("https://api.brawlapi.com/v1/brawlers")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (donnees) {
      var liste = (donnees.list || [])
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
      /* On NE POSE PAS le catalogue ici. C'est l'appelant qui décide QUAND
         l'appliquer — parce que le remplacer pendant que l'écran des
         brawlers est ouvert réorganise la grille sous le doigt de quelqu'un
         en train de cocher. La règle est un invariant, pas une liste de cas :
         « le catalogue ne change pas tant que cet écran est dessiné ». */
      /* Une réponse 200 ne veut pas dire une réponse utilisable.
         --------------------------------------------------------------------
         Mesuré, trois cas où le serveur répond 200 : liste vide, champ
         « list » absent, tout filtré par released:false. Dans les trois,
         etatApi passait à « ok », l'app tournait sur la liste de secours —
         donc SANS classes, ce qui éteint la règle d'équilibre des familles —
         et le pied de page n'en disait pas un mot. L'utilisateur lisait
         « Tiers par mode · source …, date » comme si tout était chargé.

         Une réponse trop courte est traitée exactement comme une panne : on
         garde ce qu'on avait, et on le DIT. C'est aussi ce qui empêche une
         réponse tronquée d'écraser un bon catalogue gardé. */
      if (liste.length < MIN_CATALOGUE) {
        souciCatalogue(liste.length);
        return null;
      }
      etatApi = "ok";
      return liste;
    })
    /* Pas de réseau, ou une réponse illisible : si le catalogue de la
       dernière fois est là, l'app garde ses portraits ET ses classes. On dit
       quand même « hors », parce que le pied de page doit rester exact : ce
       qui est affiché ne vient pas d'un appel réussi aujourd'hui. */
    /* relireCatalogue() a déjà été appelée au chargement : la rappeler ici
       relirait 20 Ko et réindexerait 107 entrées pour rien, sur la branche
       hors ligne — précisément celle où les secondes comptent. */
    .catch(function () {
      etatApi = CATALOGUE_GARDE ? "garde" : "hors";
      return null;
    });
}


/* ============ 3. Le roster, enregistré dans le navigateur ============ */

/* NE PAS CHANGER cette clé : un roster existant est déjà enregistré chez
   l'utilisateur, et le renommer le ferait disparaître. */
var CLE_ROSTER = "manager:roster";

var roster = new Set(lireListe(CLE_ROSTER));

/* La carte d'un identifiant. Cette boucle était écrite trois fois — ici,
   dans relireCarte() et dans carteActive() de moteur.js. MAPS est régénéré à
   chaque saison par refresh.py : trois copies, c'est trois occasions
   d'oublier, et l'oubli est silencieux. */
function carteParId(id) {
  if (!id) return null;
  for (var i = 0; i < MAPS.length; i++) {
    if (MAPS[i].id === id) return MAPS[i];
  }
  return null;
}

/* Les brawlers connus au moment où le roster a été revu la dernière fois.
   Sert à repérer ceux que Supercell a sortis depuis — la seule chose qu'on
   puisse honnêtement détecter. On ne sait PAS si l'utilisateur a débloqué un
   brawler ; on sait qu'il en existe un qu'il n'a jamais vu passer, et c'est
   déjà de quoi lui proposer d'aller voir. */
var CLE_VUS = "manager:vus";

function sauverRoster() {
  ecrireJSON(CLE_ROSTER, Array.from(roster));
}

/* « Vus » décrit le CATALOGUE, pas le roster. Les coupler était un raccourci,
   et il produisait un mensonge : au premier lancement en réseau lent, la
   liste de secours (105 noms reconstruits depuis les tier lists) était
   enregistrée comme « ce que l'utilisateur a vu » ; l'API arrivait avec ses
   107, et l'app annonçait « 2 nouveaux brawlers » alors que rien n'était
   nouveau — ils manquaient simplement au repli. On n'enregistre donc que
   lorsque la source fait autorité.

   Au passage, c'était aussi 818 octets ré-écrits à CHAQUE case cochée : 54 Ko
   pour remplir un roster, en écriture bloquante sur le fil principal.

   QUAND l'appeler — la première correction avait déplacé cet appel dans
   appliquerCatalogue(), c'est-à-dire à l'arrivée du catalogue. Mais le nom
   de la clé dit ce qu'elle veut dire : « vus », par l'utilisateur. Marquer
   tout comme vu à l'instant où l'API répond, avant même qu'il ait ouvert
   l'écran, vide la clé de son sens — et comme recalculerNouveaux() suivait
   immédiatement, la réponse était toujours « rien de nouveau ». Le rappel
   n'apparaissait donc chez personne dont l'API répond.

   L'appel est maintenant fait quand l'écran des brawlers est RÉELLEMENT
   dessiné (voir render() dans app.js). C'est le moment où « vu » devient
   vrai, et le seul. */
function noterCatalogueVu() {
  if (etatApi !== "ok" && etatApi !== "garde") return;
  ecrireJSON(CLE_VUS, brawlers.map(function (b) { return b.k; }));
}

/* Les brawlers apparus depuis la dernière visite de l'écran « Mes brawlers ».
   Calculé une fois, pas à chaque dessin : le résultat ne peut changer qu'à
   l'arrivée du catalogue. Au tout premier lancement la liste des vus est
   vide : on ne crie pas « 107 nouveaux », on se tait. */
var nouveauxBrawlers = [];

function recalculerNouveaux() {
  var vus = lireListe(CLE_VUS);
  if (!vus.length) { nouveauxBrawlers = []; return; }
  var connus = {};
  vus.forEach(function (k) { connus[k] = true; });
  nouveauxBrawlers = brawlers.filter(function (b) { return !connus[b.k]; });
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

/* Filtrées sur le pool en cours : la rotation change à chaque saison, et
   proposer une carte qui n'existe plus serait pire que ne rien proposer. */
function cartesRecentes() {
  return lireListe(CLE_RECENTES).map(carteParId).filter(Boolean);
}

function noterCarteRecente(id) {
  if (!id) return;
  /* On travaille sur les identifiants bruts : résoudre les cartes pour ne
     garder que leur id ensuite, c'est balayer MAPS pour rien. */
  var liste = lireListe(CLE_RECENTES).filter(function (x) { return x !== id; });
  ecrireJSON(CLE_RECENTES, [id].concat(liste).slice(0, MAX_RECENTES));
}

function sauverCarte() {
  ecrireTexte(CLE_CARTE, carteId);
}

/* Relue seulement si la carte est encore en rotation : le pool change à
   chaque saison, et rouvrir sur une carte qui n'existe plus serait pire que
   de ne rien retenir. */
function relireCarte() {
  return carteParId(lireTexte(CLE_CARTE, null)) ? lireTexte(CLE_CARTE, null) : null;
}

/* La carte en cours est relue ici, en fin de fichier : relireCarte() a besoin
   de MAPS, et l'état doit être complet avant que app.js ne dessine. */
carteId = relireCarte();

/* Ce qui est apparu depuis la dernière visite, calculé une fois. */
recalculerNouveaux();
