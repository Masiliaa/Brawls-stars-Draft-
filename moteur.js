/* moteur.js — comment le brawler conseillé est calculé.
   ------------------------------------------------------------------------
   Aucun HTML ici, aucun accès à la page : uniquement du calcul.

   Le principe : chaque brawler du roster reçoit un score, et on garde les
   4 meilleurs. Le score part du tier du brawler sur le mode joué, puis
   quatre règles indépendantes l'ajustent :

     1. la carte      il est bien classé sur cette carte précise
     2. les ennemis   il bat, ou se fait battre par, ce qui est pris en face
     3. les alliés    il complète ou double les rôles de l'équipe
     4. la synergie   ce duo gagne plus souvent ensemble

   Chaque règle est une fonction séparée qui renvoie { points, raisons }.
   Pour changer le comportement de l'app, c'est une de ces quatre fonctions
   qu'il faut lire — pas les 200 lignes d'un bloc.

   Chaque raison porte une PRIORITÉ : seule la meilleure est affichée sous
   le brawler. Plus le chiffre est bas, plus la raison est mise en avant.
   Les raisons négatives ont une priorité haute pour ne jamais s'afficher
   sous un brawler que l'app recommande.
   ------------------------------------------------------------------------ */


/* ============ Le barème ============
   Ce sont les seuls réglages à toucher pour rendre l'app plus ou moins
   sensible à tel ou tel critère. */

var POINTS_TIER = { S: 100, A: 82, B: 62, C: 40, D: 20 };

/* Bonus selon la place occupée sur la carte : 1er, 2e, 3e… */
var BONUS_CARTE = [20, 15, 11, 9, 7, 5, 4, 3];
var BONUS_CARTE_RESTE = 2;

var PT_MATCHUP = 12;   /* gain ou perte face à un ennemi de la table COUNTERS */
var PT_CYCLE = 9;      /* idem, mais via le cycle de familles, moins fiable */
var PT_ROLE = 6;       /* rôle complété (+) ou doublé (−) dans l'équipe */

/* PT_SYN convertit un écart de taux de victoire en équipe (en points de
   pourcentage, typiquement 0 à 5) vers l'échelle de score. Sans ce facteur,
   un duo mesuré à +5 marquerait moins qu'une paire inconnue créditée de
   PT_ROLE. Le total est ensuite plafonné pour ne pas écraser le tier. */
var PT_SYN = 2, SYN_MAX = 10;

var NB_CONSEILS = 4;   /* nombre de brawlers proposés à l'écran */


/* ============ Le cycle de familles ============
   Repli grossier utilisé uniquement quand un matchup est absent de
   COUNTERS. Trois familles qui se battent en rond, comme pierre-feuille-
   ciseaux. Ce n'est PAS une mesure, et le pied de page le dit. */

var FAMILLE_DE_CLASSE = {
  Assassin: "agression", Tank: "agression",
  Controller: "controle", Artillery: "controle", Support: "controle",
  "Damage Dealer": "portee", Marksman: "portee"
};
var FAMILLE_BATTUE = { agression: "controle", controle: "portee", portee: "agression" };
var NOM_FAMILLE = { agression: "agression", controle: "contrôle", portee: "portée" };


/* ============ Index dérivés des données ============ */

/* Pour chaque mode, le tier de chaque brawler : TIER_PAR_MODE.heist.mortis
   vaut "D". Construit une fois au chargement à partir de TIERS. */
var TIER_PAR_MODE = {};
Object.keys(TIERS).forEach(function (mode) {
  TIER_PAR_MODE[mode] = {};
  Object.keys(TIERS[mode]).forEach(function (tier) {
    TIERS[mode][tier].split(",").forEach(function (nom) {
      TIER_PAR_MODE[mode][clef(nom)] = tier;
    });
  });
});


/* ============ Petits accès ============ */

function carteActive() {
  for (var i = 0; i < MAPS.length; i++) {
    if (MAPS[i].id === carteId) return MAPS[i];
  }
  return null;
}

/* La famille d'un brawler, déduite de sa classe fournie par l'API.
   Renvoie null si l'API n'a pas répondu : le cycle est alors inopérant. */
function familleDe(cle) {
  var b = parClef[cle];
  return (b && b.classe) ? (FAMILLE_DE_CLASSE[b.classe] || null) : null;
}

/* Clé d'un duo dans SYNERGIE : toujours les deux clés triées. */
function cleSynergie(a, b) {
  return [a, b].sort().join("|");
}

function raison(priorite, texte) {
  return { priorite: priorite, texte: texte };
}


/* ============ Règle 0 — le tier de base ============ */

function pointsDeTier(cle, mode) {
  var tier = TIER_PAR_MODE[mode][cle] || "D";
  var raisons = [];
  if (tier === "S" || tier === "A") {
    raisons.push(raison(2, "tier " + tier + " en " + MODES[mode].nom));
  }
  return { tier: tier, points: POINTS_TIER[tier], raisons: raisons };
}


/* ============ Règle 1 — le classement sur la carte ============ */

function pointsDeCarte(cle, carte) {
  for (var i = 0; i < carte.top.length; i++) {
    if (clef(carte.top[i][0]) !== cle) continue;
    var tauxVictoire = carte.top[i][1];
    return {
      points: BONUS_CARTE[i] || BONUS_CARTE_RESTE,
      raisons: [raison(1, "n°" + (i + 1) + " sur la carte · "
                          + virgule(tauxVictoire) + " % de victoires")]
    };
  }
  return { points: 0, raisons: [] };
}


/* ============ Règle 2 — face aux ennemis ============ */

/* Matchup entre un candidat et un ennemi, d'après COUNTERS. La table est
   lue dans les deux sens : une paire peut n'être renseignée que d'un côté.
   Renvoie null si la paire est absente — l'appelant retombe alors sur le
   cycle de familles pour cet ennemi précis, et pour lui seul. */
function duel(candidat, ennemi) {
  var nom = nomBrawler(ennemi);

  /* L'entrée [cle, phrase] correspondant à `cible`, ou null. */
  function chercher(liste, cible) {
    for (var i = 0; i < (liste || []).length; i++) {
      if (liste[i][0] === cible) return liste[i];
    }
    return null;
  }

  /* La phrase d'explication peut manquer : on n'affiche alors que le verdict,
     sans deux-points orphelins. */
  function verdict(entree, points, priorite, debut) {
    return {
      points: points, priorite: priorite,
      texte: debut + nom + (entree[1] ? " : " + entree[1] : "")
    };
  }

  var entree, fiche = COUNTERS[ennemi];
  if (fiche) {
    entree = chercher(fiche.perd, candidat);
    if (entree) return verdict(entree, PT_MATCHUP, 0, "bat ");
    entree = chercher(fiche.bat, candidat);
    if (entree) return verdict(entree, -PT_MATCHUP, 7, "perd contre ");
  }

  fiche = COUNTERS[candidat];
  if (fiche) {
    entree = chercher(fiche.bat, ennemi);
    if (entree) return verdict(entree, PT_MATCHUP, 0, "bat ");
    entree = chercher(fiche.perd, ennemi);
    if (entree) return verdict(entree, -PT_MATCHUP, 7, "perd contre ");
  }

  return null;
}

function pointsContreEnnemis(cle) {
  var points = 0, raisons = [], sansDonnee = [];

  ennemis.forEach(function (ennemi) {
    var resultat = duel(cle, ennemi);
    if (resultat) {
      points += resultat.points;
      raisons.push(raison(resultat.priorite, resultat.texte));
    } else {
      sansDonnee.push(ennemi);
    }
  });

  /* Repli par familles, uniquement pour les ennemis absents de la table. */
  var famille = familleDe(cle);
  if (famille && sansDonnee.length) {
    var favorables = 0, defavorables = 0;
    sansDonnee.forEach(function (ennemi) {
      var f = familleDe(ennemi);
      if (!f) return;
      if (FAMILLE_BATTUE[famille] === f) favorables++;
      if (FAMILLE_BATTUE[f] === famille) defavorables++;
    });
    points += (favorables - defavorables) * PT_CYCLE;
    if (favorables > defavorables) {
      raisons.push(raison(5, NOM_FAMILLE[famille] + " contre leur "
                             + NOM_FAMILLE[FAMILLE_BATTUE[famille]]));
    } else if (defavorables > favorables) {
      raisons.push(raison(8, "mauvais face à leur composition"));
    }
  }

  return { points: points, raisons: raisons };
}


/* ============ Règles 3 et 4 — avec les alliés ============ */

/* Deux effets indépendants qui s'additionnent :

   — l'équilibre des rôles vaut pour tous les alliés ;
   — la synergie mesurée s'y ajoute quand le duo est dans la table.

   Les cumuler ainsi évite de pénaliser un candidat simplement parce que
   son duo, lui, est documenté. */
function pointsAvecAllies(cle) {
  var points = 0, raisons = [];
  if (!allies.length) return { points: points, raisons: raisons };

  var famille = familleDe(cle);
  if (famille) {
    var doublons = 0;
    allies.forEach(function (a) { if (familleDe(a) === famille) doublons++; });
    if (doublons) {
      points -= PT_ROLE * doublons;
      raisons.push(raison(6, "double un rôle déjà pris par ton équipe"));
    } else {
      points += PT_ROLE;
      raisons.push(raison(3, "complète les rôles de ton équipe"));
    }
  }

  var total = 0, plusMarquant = null;
  allies.forEach(function (a) {
    var ecart = SYNERGIE[cleSynergie(cle, a)];
    if (typeof ecart !== "number") return;
    total += ecart;
    if (!plusMarquant || Math.abs(ecart) > Math.abs(plusMarquant.ecart)) {
      plusMarquant = { ecart: ecart, allie: a };
    }
  });

  if (plusMarquant) {
    points += Math.max(-SYN_MAX, Math.min(SYN_MAX, total * PT_SYN));
    if (plusMarquant.ecart > 0) {
      raisons.push(raison(2, "marche avec " + nomBrawler(plusMarquant.allie)
                             + " · +" + virgule(plusMarquant.ecart)
                             + " pts de victoires en équipe"));
    } else if (plusMarquant.ecart < 0) {
      raisons.push(raison(7, "synergie faible avec " + nomBrawler(plusMarquant.allie)));
    }
  }

  return { points: points, raisons: raisons };
}


/* ============ Assemblage ============ */

/* Note un seul brawler en appliquant toutes les règles. */
function evaluer(cle, carte) {
  var base = pointsDeTier(cle, carte.mode);
  var apports = [
    base,
    pointsDeCarte(cle, carte),
    pointsContreEnnemis(cle),
    pointsAvecAllies(cle)
  ];

  var score = 0, raisons = [];
  apports.forEach(function (a) {
    score += a.points;
    raisons = raisons.concat(a.raisons);
  });

  /* Aucune règle n'a rien eu à dire : on affiche au moins le tier. */
  if (!raisons.length) {
    raisons.push(raison(4, "tier " + base.tier + " en " + MODES[carte.mode].nom));
  }
  raisons.sort(function (a, b) { return a.priorite - b.priorite; });

  var b = brawler(cle);
  return {
    k: cle, b: b, nom: b.nom,
    tier: base.tier, score: score,
    raison: raisons[0].texte
  };
}

/* Les meilleurs brawlers à prendre, dans l'ordre.
   Les brawlers déjà pris, bannis ou joués par l'équipe sont écartés. */
function conseils() {
  var carte = carteActive();
  if (!carte) return [];

  var indisponibles = {};
  ennemis.concat(bans).concat(allies).forEach(function (cle) {
    indisponibles[cle] = true;
  });

  var classement = [];
  roster.forEach(function (cle) {
    if (!indisponibles[cle]) classement.push(evaluer(cle, carte));
  });

  classement.sort(function (a, b) { return b.score - a.score; });
  return classement.slice(0, NB_CONSEILS);
}
