/* moteur.js — comment le brawler conseillé est calculé.
   ------------------------------------------------------------------------
   Aucun HTML ici, aucun accès à la page : uniquement du calcul.

   Le principe : chaque brawler du roster reçoit un score, et on garde les
   meilleurs. Le score part du tier du brawler sur le mode joué, puis des
   règles indépendantes l'ajustent :

     1. la carte      il est bien classé sur cette carte précise
     2. les ennemis   il bat, ou se fait battre par, ce qui est pris en face
     3. le risque     il est exposé tant que l'adversaire peut répondre
     4. les alliés    il complète ou double les rôles de l'équipe
     5. la synergie   ce duo gagne plus souvent ensemble

   Chaque règle est une fonction séparée qui renvoie { points, raisons }.
   Pour changer le comportement de l'app, c'est une de ces fonctions qu'il
   faut lire — pas les 200 lignes d'un bloc.

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
/* Couverture mutuelle, en repli quand aucune synergie mesurée n'existe.
   Plafond plus bas que SYN_MAX : une déduction ne doit jamais peser autant
   qu'une mesure. En dessous de COUVERTURE_MIN_ALLIE, l'allié ne couvre pas
   assez pour que ça vaille la peine d'être dit. */
var PT_COUVERTURE = 6, COUVERTURE_MIN_ALLIE = 0.34;
/* Garde-fou si la table venait à s'appauvrir. Mesuré le 02/08/2026 : les
   105 brawlers ont entre 3 et 9 contres connus, médiane 5. Aucun n'est donc
   écarté aujourd'hui — et c'est pour ça que le texte affiché montre le
   compte (« 3 de tes 5 contres ») et non un pourcentage seul : « 100 % » se
   lirait « invincible » là où ça veut dire « tout ce que la table sait ». */
var MENACES_MIN = 3;

var NB_CONSEILS = 4;    /* brawlers proposés en mode Rapide */
var NB_ANALYSE = 10;    /* brawlers détaillés en mode Analyse */

/* ---- Ordre de pick ----
   En classé, l'ordre du draft est fixe : chaque pick adverse déjà connu est
   un pick adverse qui ne viendra plus après le tien. Le nombre de réponses
   encore possibles vaut donc exactement MAX_ENNEMIS moins les ennemis
   saisis — aucun réglage à demander à l'utilisateur.

   Deux conséquences opposées :

   — Un contre est d'autant plus fiable qu'il reste peu de réponses. En
     dernier pick, personne ne peut plus s'adapter : le matchup vaut plein
     tarif. Plus tôt, l'adversaire garde la main.

   — À l'inverse, un brawler facilement contrable est risqué tant que
     l'adversaire peut encore répondre. Ce malus a besoin de COUNTERS pour
     savoir combien de brawlers le battent ; sans la table, il reste à zéro
     et le pied de page dit que les matchups manquent. */

/* Coefficient appliqué au terme « ennemis », indexé par le nombre d'ennemis
   déjà connus. À 0 ennemi le terme est nul de toute façon. */
var FIABILITE_MATCHUP = [1, 0.8, 1, 1.3];

var PT_EXPO = 10;    /* malus maximal pour un brawler très contrable */
var VULN_REF = 8;    /* au-delà de 8 counters connus, vulnérabilité maximale */

/* ---- Bans conseillés ----
   Bannir sert à retirer du draft ce qui te ferait mal. Une bonne cible est
   forte sur cette carte, punit ce que tu sais jouer, et n'est pas un de tes
   propres choix — un ban retire le brawler pour les DEUX équipes. */
var PT_BAN_MENACE = 9;   /* par brawler de ton roster que la cible bat */
var VICTIMES_REF = 4;    /* au-delà, la menace ne croît plus */
var PT_BAN_TIEN = 30;    /* malus : bannir un brawler que tu joues te prive aussi */
var NB_BANS_CONSEILLES = 3;


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
/* Le nom affiché d'une famille dépend de la langue : on passe par une clé. */
var CLE_FAMILLE = { agression: "famAgression", controle: "famControle", portee: "famPortee" };
function nomFamille(f) { return t(CLE_FAMILLE[f]); }

/* Idem pour les modes : la couleur est dans donnees.js, le nom dans langues.js. */
var CLE_MODE = {
  brawlBall: "modeBrawlBall", bounty: "modeBounty", knockout: "modeKnockout",
  gemGrab: "modeGemGrab", heist: "modeHeist", hotZone: "modeHotZone"
};
function nomMode(m) { return t(CLE_MODE[m]); }

/* Le nom d'une carte tel que le jeu l'annonce dans la langue de l'app.
   ---------------------------------------------------------------------------
   « Center Stage » s'annonce « Milieu de scène » en français. L'app affichait
   la version anglaise : il fallait traduire de tête, pendant les 25 secondes
   du draft, pour retrouver sa carte dans la liste.

   Rien n'est traduit ici : les noms viennent de ce que le jeu affiche
   réellement, relevé par refresh.py. Sans traduction connue, l'anglais reste
   — c'est le nom d'origine, jamais une invention. */
function nomCarte(carte) {
  if (!carte) return "";
  return (carte.noms && carte.noms[langue]) || carte.nom;
}


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

/* La raison « n°5 sur cette carte, 55,29 % » n'explique rien : elle répète
   une mesure déjà affichée à côté. La vue a besoin de le savoir pour ne pas
   imprimer deux fois le même chiffre — d'où cette priorité nommée. */
var PRIORITE_CARTE = 1;

function raison(priorite, texte) {
  return { priorite: priorite, texte: texte };
}

/* Nombre de picks adverses qui viendront encore après le tien. */
/* ============ L'ordre dans lequel on propose les brawlers ============
   Mesuré le 04/08/2026 sur Center Stage : sur les huit brawlers les plus
   joués de la carte, le premier arrivait en 5e position de la grille, le
   dernier en 49e — et deux ne s'affichaient pas du tout, la liste étant
   coupée à 60 noms rangés par ordre alphabétique. Autrement dit : pour
   saisir le pick adverse le plus probable, il fallait taper son nom.

   On range donc par ce qu'on sait vraiment : d'abord les brawlers relevés
   sur cette carte, dans leur ordre de classement ; puis les autres par
   tier dans ce mode ; puis l'alphabet. Aucune estimation là-dedans — que
   des mesures déjà affichées ailleurs dans l'app. */
var POIDS_TIER_ORDRE = { S: 100, A: 200, B: 300, C: 400, D: 500 };

function ordreProbable(liste) {
  var carte = carteActive();
  var rang = {};
  if (carte) {
    carte.top.forEach(function (e, i) { rang[clef(e[0])] = i; });
  }
  var tiers = (carte && TIER_PAR_MODE[carte.mode]) || {};

  function poids(b) {
    if (b.k in rang) return rang[b.k];              /* 0 à 7 : sur la carte */
    return POIDS_TIER_ORDRE[tiers[b.k]] || 900;     /* sinon, son tier */
  }

  return liste.slice().sort(function (a, b) {
    var pa = poids(a), pb = poids(b);
    if (pa !== pb) return pa - pb;
    return a.nom.localeCompare(b.nom, "fr");
  });
}

/* Un brawler déjà banni ou déjà pris ne peut plus l'être une seconde fois :
   le laisser dans la liste, c'est proposer un choix impossible. */
function dejaEngages() {
  return ennemis.concat(allies, bans);
}

function reponsesRestantes() {
  return Math.max(0, MAX_ENNEMIS - ennemis.length);
}


/* ============ Règle 0 — le tier de base ============ */

function pointsDeTier(cle, mode) {
  var tier = TIER_PAR_MODE[mode][cle] || "D";
  var raisons = [];
  if (tier === "S" || tier === "A") {
    raisons.push(raison(2, t("raisonTier", { tier: tier, mode: nomMode(mode) })));
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
      raisons: [raison(PRIORITE_CARTE, t("raisonCarte", {
        rang: i + 1, wr: virgule(tauxVictoire)
      }))]
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

  /* La phrase d'explication peut manquer, ou n'exister que dans une autre
     langue : on n'affiche alors que le verdict, sans deux-points orphelins. */
  function verdict(entree, points, priorite, cle) {
    var phrase = phraseCounter(entree[1]);
    return {
      points: points, priorite: priorite,
      texte: t(cle, { nom: nom }) + (phrase ? " : " + phrase : "")
    };
  }

  var entree, fiche = COUNTERS[ennemi];
  if (fiche) {
    entree = chercher(fiche.perd, candidat);
    if (entree) return verdict(entree, PT_MATCHUP, 0, "raisonBat");
    entree = chercher(fiche.bat, candidat);
    if (entree) return verdict(entree, -PT_MATCHUP, 7, "raisonPerd");
  }

  fiche = COUNTERS[candidat];
  if (fiche) {
    entree = chercher(fiche.bat, ennemi);
    if (entree) return verdict(entree, PT_MATCHUP, 0, "raisonBat");
    entree = chercher(fiche.perd, ennemi);
    if (entree) return verdict(entree, -PT_MATCHUP, 7, "raisonPerd");
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
      raisons.push(raison(5, t("raisonCycle", {
        famille: nomFamille(famille),
        famille2: nomFamille(FAMILLE_BATTUE[famille])
      })));
    } else if (defavorables > favorables) {
      raisons.push(raison(8, t("raisonMauvaiseCompo")));
    }
  }

  /* Un contre vaut d'autant plus que l'adversaire a moins de marge pour
     s'adapter derrière. */
  points *= FIABILITE_MATCHUP[Math.min(ennemis.length, 3)];

  return { points: Math.round(points), raisons: raisons };
}


/* ============ Règle 2 bis — l'exposition au contre-pick ============ */

/* Tant que l'adversaire peut encore répondre, sortir un brawler que beaucoup
   de monde contre est un pari. En dernier pick, ce risque disparaît. */
function pointsExposition(cle) {
  var restantes = reponsesRestantes();

  if (!restantes) {
    /* Priorité basse : l'information est utile en mode Analyse, mais ne doit
       pas voler la vedette à une vraie raison de prendre le brawler. */
    return { points: 0, raisons: [raison(9, t("raisonDernierPick"))] };
  }

  var fiche = COUNTERS[cle];
  var vulnerabilite = (fiche && fiche.perd) ? fiche.perd.length : 0;
  if (!vulnerabilite) return { points: 0, raisons: [] };

  var part = Math.min(vulnerabilite, VULN_REF) / VULN_REF;
  var points = -Math.round(PT_EXPO * (restantes / MAX_ENNEMIS) * part);

  return {
    points: points,
    raisons: points ? [raison(7, t("raisonExpose", { n: vulnerabilite }))] : []
  };
}


/* ============ Règles 3 et 4 — avec les alliés ============ */

/* Deux effets indépendants qui s'additionnent :

   — l'équilibre des rôles vaut pour tous les alliés ;
   — la synergie mesurée s'y ajoute quand le duo est dans la table.

   Les cumuler ainsi évite de pénaliser un candidat simplement parce que
   son duo, lui, est documenté. */
/* Les brawlers qui battent `cle`, d'après la table de matchups. On lit dans
   les deux sens : une paire peut n'être renseignée que d'un côté. */
function menacesContre(cle) {
  var menaces = {};
  (COUNTERS[cle] ? COUNTERS[cle].perd : []).forEach(function (e) {
    menaces[e[0]] = true;
  });
  Object.keys(COUNTERS).forEach(function (autre) {
    (COUNTERS[autre].bat || []).forEach(function (e) {
      if (e[0] === cle) menaces[autre] = true;
    });
  });
  return Object.keys(menaces);
}


/* Couverture mutuelle : combien des brawlers qui te battent sont battus par
   ton allié.

   Ce n'est PAS un taux de victoire en duo — personne ne nous en fournit, et
   en inventer un serait mentir. C'est une propriété déduite de la table de
   matchups : si l'adversaire doit choisir entre te contrer toi ou contrer
   ton allié, la paire tient. C'est le raisonnement qu'un joueur fait de
   tête, rendu explicite.

   Le texte affiché dit « couvre tes contres », jamais « % de victoires » :
   une déduction ne doit pas se faire passer pour une mesure. */
function couvertureAlliee(cle, allie) {
  var menaces = menacesContre(cle);
  if (menaces.length < MENACES_MIN) return 0;
  var couvertes = 0;
  menaces.forEach(function (m) {
    var fiche = COUNTERS[m];
    var battuParAllie = fiche && (fiche.perd || []).some(function (e) {
      return e[0] === allie;
    });
    var alliePerd = COUNTERS[allie] && (COUNTERS[allie].bat || [])
      .some(function (e) { return e[0] === m; });
    if (battuParAllie || alliePerd) couvertes++;
  });
  return couvertes / menaces.length;
}


function pointsAvecAllies(cle) {
  var points = 0, raisons = [];
  if (!allies.length) return { points: points, raisons: raisons };

  var famille = familleDe(cle);
  if (famille) {
    var doublons = 0;
    allies.forEach(function (a) { if (familleDe(a) === famille) doublons++; });
    if (doublons) {
      points -= PT_ROLE * doublons;
      raisons.push(raison(6, t("raisonDoubleRole")));
    } else {
      points += PT_ROLE;
      raisons.push(raison(3, t("raisonCompleteRole")));
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
      raisons.push(raison(2, t("raisonSynergiePlus", {
        nom: nomBrawler(plusMarquant.allie),
        ecart: virgule(plusMarquant.ecart)
      })));
    } else if (plusMarquant.ecart < 0) {
      raisons.push(raison(7, t("raisonSynergieMoins", {
        nom: nomBrawler(plusMarquant.allie)
      })));
    }
  }

  /* Faute de taux de victoire en duo, on se rabat sur ce que la table de
     matchups sait déjà : l'allié couvre-t-il ce qui te bat ?

     Uniquement en repli — une vraie mesure, quand elle existe, prime sur une
     déduction. Le barème est volontairement plus bas que SYN_MAX pour la
     même raison. */
  if (!plusMarquant) {
    var meilleure = null;
    allies.forEach(function (a) {
      var part = couvertureAlliee(cle, a);
      if (part >= COUVERTURE_MIN_ALLIE && (!meilleure || part > meilleure.part)) {
        meilleure = { part: part, allie: a };
      }
    });
    if (meilleure) {
      points += Math.round(PT_COUVERTURE * meilleure.part);
      var total = menacesContre(cle).length;
      raisons.push(raison(4, t("raisonCouverture", {
        nom: nomBrawler(meilleure.allie),
        n: Math.round(meilleure.part * total),
        total: total
      })));
    }
  }

  return { points: points, raisons: raisons };
}


/* ============ Assemblage ============ */

/* Note un seul brawler en appliquant toutes les règles.

   Renvoie le score, mais aussi TOUTES les raisons et le détail par règle.
   Le mode Rapide n'affiche que la première raison ; le mode Analyse montre
   le reste. Calculer une fois et laisser l'affichage choisir évite de faire
   diverger les deux modes. */
function evaluer(cle, carte) {
  var base = pointsDeTier(cle, carte.mode);
  var apports = {
    tier: base,
    carte: pointsDeCarte(cle, carte),
    ennemis: pointsContreEnnemis(cle),
    risque: pointsExposition(cle),
    allies: pointsAvecAllies(cle)
  };

  var score = 0, raisons = [], detail = {};
  Object.keys(apports).forEach(function (regle) {
    score += apports[regle].points;
    detail[regle] = apports[regle].points;
    raisons = raisons.concat(apports[regle].raisons);
  });

  /* Aucune règle n'a rien eu à dire : on affiche au moins le tier. */
  if (!raisons.length) {
    raisons.push(raison(4, t("raisonTier", {
      tier: base.tier, mode: nomMode(carte.mode)
    })));
  }
  raisons.sort(function (a, b) { return a.priorite - b.priorite; });

  var b = brawler(cle);
  return {
    k: cle, b: b, nom: b.nom,
    tier: base.tier, score: score,
    raison: raisons[0].texte,
    /* Vrai quand la seule chose qu'on ait à dire est le rang sur la carte :
       la vue affiche alors le rang seul, et laisse le taux à sa colonne. */
    raisonEstLeRang: raisons[0].priorite === PRIORITE_CARTE,
    raisons: raisons.map(function (r) { return r.texte; }),
    detail: detail
  };
}

/* ============ Bans conseillés ============ */

/* Combien de brawlers de TON roster cette cible bat, d'après COUNTERS.
   La table est lue dans les deux sens, sans compter deux fois la même
   victime. Renvoie 0 tant que COUNTERS est vide. */
function brawlersPunis(cle) {
  var punis = {};

  var fiche = COUNTERS[cle];
  if (fiche) {
    (fiche.bat || []).forEach(function (e) {
      if (roster.has(e[0])) punis[e[0]] = true;
    });
  }

  roster.forEach(function (mien) {
    var f = COUNTERS[mien];
    if (!f) return;
    (f.perd || []).forEach(function (e) {
      if (e[0] === cle) punis[mien] = true;
    });
  });

  return Object.keys(punis).length;
}

/* Les brawlers qu'il vaut le mieux retirer du draft.
   Même barème que pour les picks — force sur la carte — augmenté de ce que
   la cible punit chez toi, et diminué si tu la joues toi-même. */
function bansConseilles(combien) {
  var carte = carteActive();
  if (!carte) return [];

  var indisponibles = {};
  ennemis.concat(bans).concat(allies).forEach(function (cle) {
    indisponibles[cle] = true;
  });

  /* Ne jamais proposer de bannir ce qu'on vient de conseiller de prendre :
     l'app se contredirait à deux lignes d'intervalle. */
  conseils().forEach(function (x) { indisponibles[x.k] = true; });

  var classement = [];
  brawlers.forEach(function (b) {
    if (indisponibles[b.k]) return;

    var base = pointsDeTier(b.k, carte.mode);
    var surCarte = pointsDeCarte(b.k, carte);
    var score = base.points + surCarte.points;
    var raisons = base.raisons.concat(surCarte.raisons);

    var victimes = brawlersPunis(b.k);
    if (victimes) {
      score += PT_BAN_MENACE * Math.min(victimes, VICTIMES_REF);
      raisons.push(raison(0, t("raisonBanMenace", { n: victimes })));
    }

    if (roster.has(b.k)) {
      score -= PT_BAN_TIEN;
      raisons.push(raison(5, t("raisonBanTien")));
    }

    if (!raisons.length) {
      raisons.push(raison(4, t("raisonTier", {
        tier: base.tier, mode: nomMode(carte.mode)
      })));
    }
    raisons.sort(function (x, y) { return x.priorite - y.priorite; });

    classement.push({
      k: b.k, b: b, nom: b.nom, tier: base.tier, score: score,
      raison: raisons[0].texte,
      raisons: raisons.map(function (r) { return r.texte; })
    });
  });

  classement.sort(function (x, y) { return y.score - x.score; });
  return classement.slice(0, combien || NB_BANS_CONSEILLES);
}


/* Les meilleurs brawlers à prendre, dans l'ordre.
   Les brawlers déjà pris, bannis ou joués par l'équipe sont écartés.
   `combien` permet au mode Analyse d'en demander davantage. */
function conseils(combien) {
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
  return classement.slice(0, combien || NB_CONSEILS);
}
