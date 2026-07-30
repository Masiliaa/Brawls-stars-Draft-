/* vues.js — comment tout ça est affiché.
   ------------------------------------------------------------------------
   Chaque fonction ici fabrique un morceau de HTML sous forme de texte, et
   ne fait rien d'autre : pas de calcul, pas de modification de l'état.

   Un écran = une fonction. vueHTML() choisit laquelle appeler.

   Les boutons portent un attribut data-act (l'action) et parfois data-v
   (sur quoi elle porte). C'est app.js qui les intercepte.
   ------------------------------------------------------------------------ */


/* ============ Images ============
   Chaîne de repli : fichier local dans assets/ (si ASSETS_LOCAUX) → URL
   fournie par l'API → brawltime → brawlify → initiales.
   L'attribut data-fb transporte les URL restantes, séparées par des barres
   verticales ; fbImg passe à la suivante à chaque échec. */

function fbImg(img) {
  var restantes = img.getAttribute("data-fb");
  var liste = restantes ? restantes.split("|") : [];

  if (liste.length) {
    img.setAttribute("data-fb", liste.slice(1).join("|"));
    img.src = liste[0];
    return;
  }

  /* L'image a pu quitter la page entre-temps : chaque clic redessine tout
     l'écran, et l'échec de chargement arrive après coup. Sans ce garde-fou,
     parentNode vaut null et le navigateur remonte une erreur. */
  var parent = img.parentNode;
  if (!parent) return;

  /* Plus aucune source : on affiche les initiales, ou rien pour une carte. */
  var ini = img.getAttribute("data-ini");
  if (ini) parent.innerHTML = "<em>" + echapper(ini) + "</em>";
  else img.remove();
}

/* Début de balise <img> avec la première source et la file d'attente. */
function baliseImage(sources) {
  var valides = sources.filter(Boolean);
  return '<img src="' + valides[0] + '" data-fb="' + valides.slice(1).join("|") + '"';
}

/* b.img vient de l'API : c'est la seule adresse certaine. Celle de
   brawltime est reconstruite à partir du nom — elle marche pour la plupart
   des brawlers, mais pas pour les plus récents.

   Il y avait ici une troisième source, cdn.brawlify.com/brawlers/borderless/
   {nom}.png. Vérifiée le 29/07/2026 : elle répond 404 pour tout le monde.
   C'était une adresse devinée, jamais contrôlée. La garder ne faisait que
   retarder l'affichage des initiales d'une requête inutile. */
function sourcesBrawler(b) {
  var slug = slugCdn(b.nom);
  return [
    ASSETS_LOCAUX ? "assets/brawlers/" + slug + ".png" : null,
    b.img,
    "https://media.brawltime.ninja/brawlers/" + slug + "/avatar.png?size=160"
  ];
}

function sourcesCarte(carte) {
  return [
    ASSETS_LOCAUX ? "assets/maps/" + carte.img + ".png" : null,
    "https://media.brawltime.ninja/maps/" + carte.img + ".png?size=200",
    "https://cdn.brawlify.com/maps/regular/" + carte.img + ".png"
  ];
}

function portrait(b, taille, penche) {
  var couleur = b.couleur || teinte(b.k || "x");
  return '<span class="port' + (penche ? " tilt" : "") + '" style="'
       + "width:" + taille + "px;height:" + taille + "px;"
       + "--r:" + couleur + ";"
       + "--fs:" + Math.round(taille * 0.4) + "px;"
       + "border-radius:" + Math.round(taille * 0.26) + 'px">'
       + baliseImage(sourcesBrawler(b))
       + ' data-ini="' + echapper(initiales(b.nom)) + '" alt="" onerror="fbImg(this)">'
       + "</span>";
}

function vignette(carte, largeur) {
  return '<span class="vig" style="width:' + largeur + "px;height:"
       + Math.round(largeur * 1.5) + 'px">'
       + baliseImage(sourcesCarte(carte))
       + ' alt="" onerror="fbImg(this)"></span>';
}


/* ============ Morceaux réutilisés ============ */

/* Un bouton qui ouvre une liste de choix, plutôt qu'un bouton qui bascule
   à l'aveugle : on voit les options avant de décider, et on peut aller
   directement à celle qu'on veut. */
function menuDeroulant(nom, libelleBouton, titre, action, options) {
  var ouvert = menuOuvert === nom;

  var html = '<div class="choix">'
           + '<button class="b alt sm declenche" data-act="ouvrir' + nom + '"'
           + ' aria-haspopup="true" aria-expanded="' + ouvert + '"'
           + ' title="' + echapper(titre) + '">'
           + echapper(libelleBouton) + "</button>";

  if (ouvert) {
    html += '<div class="menu" role="menu">';
    options.forEach(function (o) {
      html += '<button role="menuitemradio" aria-checked="' + o.actif + '"'
            + ' class="' + (o.actif ? "actif" : "") + '"'
            + ' data-act="' + action + '" data-v="' + o.valeur + '">'
            + '<span class="coche">' + (o.actif ? "✓" : "") + "</span>"
            + echapper(o.libelle) + "</button>";
    });
    html += "</div>";
  }
  return html + "</div>";
}

function barreHaut() {
  var versRoster = ecran !== "roster";

  var menuMode = menuDeroulant(
    "Mode",
    t(modeAffichage === "rapide" ? "modeRapide" : "modeAnalyse"),
    t("choisirMode"), "mode",
    MODES_AFFICHAGE.map(function (m) {
      return {
        valeur: m, actif: m === modeAffichage,
        libelle: t(m === "rapide" ? "modeRapide" : "modeAnalyse")
      };
    }));

  var menuLangue = menuDeroulant(
    "Langue", LANGUES[langue].etiquette, t("choisirLangue"), "langue",
    ORDRE_LANGUES.map(function (l) {
      return { valeur: l, actif: l === langue, libelle: LANGUES[l].nom };
    }));

  return '<div class="bar"><div class="tt logo">Le Manager</div>'
       + '<div class="actions">' + menuMode + menuLangue
       + '<button class="b alt sm" data-act="' + (versRoster ? "roster" : "draft") + '">'
       + echapper(versRoster ? t("mesBrawlers") : t("retour"))
       + "</button></div></div>";
}

/* La grille de brawlers, en deux usages :
   "roster" — on coche ceux qu'on sait jouer, tous affichés
   "choix"  — on désigne un pick, limité aux 60 premiers pour rester fluide */
function grilleBrawlers(usage) {
  var filtre = recherche.trim().toLowerCase();
  var liste = brawlers.filter(function (b) {
    return b.nom.toLowerCase().indexOf(filtre) > -1;
  });
  if (usage === "choix") liste = liste.slice(0, 60);

  return liste.map(function (b) {
    var coche = usage === "roster" && roster.has(b.k);
    return '<button class="cel' + (coche ? " on" : "") + '"'
         + ' data-act="' + (usage === "roster" ? "toggle" : "choisir") + '"'
         + ' data-v="' + b.k + '">'
         + portrait(b, 40, false)
         + "<b>" + echapper(b.nom) + "</b></button>";
  }).join("");
}

/* Les trois listes « Mon équipe », « Pris en face » et « Bannis » ont
   exactement la même forme : des pastilles retirables, plus un bouton
   d'ajout tant que la limite n'est pas atteinte. */
function sectionPastilles(titre, cles, classe, actionRetirer, actionAjouter, maximum) {
  var html = '<div class="lab">' + echapper(titre) + '</div><div class="wrap">';

  cles.forEach(function (cle) {
    html += '<button class="pil ' + classe + '"'
          + ' data-act="' + actionRetirer + '" data-v="' + cle + '">'
          + portrait(brawler(cle), 32, false)
          + echapper(nomBrawler(cle)) + " ✕</button>";
  });

  if (cles.length < maximum) {
    html += '<button class="pil add" data-act="' + actionAjouter + '">'
          + echapper(t("ajouter")) + "</button>";
  }
  return html + "</div>";
}


/* ============ Écran 1 — mes persos ============ */

function ecranRoster() {
  var nb = roster.size;
  return barreHaut()
       + '<p class="intro">'
       + echapper(t(pluriel(nb) ? "rosterIntroN" : "rosterIntro1", { n: nb })) + "</p>"
       + '<div class="wrap barre-outils">'
       + '<button class="b sm" data-act="tout">' + echapper(t("toutCocher")) + "</button>"
       + '<button class="b alt sm" data-act="rien">' + echapper(t("toutDecocher")) + "</button></div>"
       + '<input class="inp" id="q" placeholder="' + echapper(t("chercherBrawler"))
       + '" value="' + echapper(recherche) + '">'
       + '<div class="grid" id="grid">' + grilleBrawlers("roster") + "</div>";
}


/* ============ Écran 2 — choisir la carte ============ */

function ecranCartes() {
  var html = barreHaut();

  Object.keys(MODES).forEach(function (mode) {
    var info = MODES[mode];
    html += '<section class="groupe-mode" style="--m:' + info.c + '">'
          + '<div class="lab titre-mode">' + echapper(nomMode(mode)) + "</div>";

    MAPS.filter(function (c) { return c.mode === mode; }).forEach(function (carte) {
      html += '<button class="b full carte-choix" data-act="carte" data-v="' + carte.id + '">'
            + '<span class="gauche">' + vignette(carte, 34)
            + '<span class="nom">' + echapper(carte.nom) + "</span></span>"
            + '<span class="fleche">›</span></button>';
    });

    html += "</section>";
  });

  return html;
}


/* ============ Écran 3 — désigner un brawler ============ */

var CLE_TITRE_CHOIX = { ennemi: "choixEnnemi", allie: "choixAllie", ban: "choixBan" };

function ecranChoix() {
  return barreHaut()
       + '<div class="lab" style="margin-top:0">'
       + echapper(t(CLE_TITRE_CHOIX[cibleAjout])) + "</div>"
       + '<input class="inp" id="q" placeholder="' + echapper(t("chercher"))
       + '" value="' + echapper(recherche) + '">'
       + '<div class="grid" id="grid">' + grilleBrawlers("choix") + "</div>"
       + '<button class="b alt sm reset" data-act="annuler">'
       + echapper(t("annuler")) + "</button>";
}


/* ============ Écran 4 — le draft ============ */

/* Le grand bouton du haut : la carte en cours, ou l'invitation à en choisir une. */
function boutonCarte(carte, couleur) {
  return '<button class="b full carte-active" data-act="cartes" style="--m:' + couleur + '">'
       + '<span class="gauche">' + (carte ? vignette(carte, 32) : "")
       + '<span class="deux-lignes">'
       + '<span class="sur">' + echapper(carte ? nomMode(carte.mode) : t("etape1")) + "</span>"
       + '<span class="nom">' + echapper(carte ? carte.nom : t("choisirCarte")) + "</span>"
       + "</span></span>"
       + '<span class="action">' + echapper(t("changer")) + "</span></button>";
}

/* Où en est le draft : combien de picks adverses viendront encore après le
   tien. L'app le déduit de l'ordre fixe du classé ; l'afficher évite que le
   joueur se demande pourquoi les conseils changent de ton. */
function ligneSituation() {
  var restantes = reponsesRestantes();
  var cle = !restantes ? "pickDernier"
          : (restantes === 1 ? "pickExpose1" : "pickExposeN");
  return '<p class="situation' + (restantes ? "" : " libre") + '">'
       + echapper(t(cle, { n: restantes })) + "</p>";
}

function encadre(message, action, libelle) {
  return '<div class="box"><p>' + echapper(message) + "</p>"
       + '<button class="b" data-act="' + action + '">' + echapper(libelle) + "</button></div>";
}

/* Le brawler recommandé, en grand, puis les suivants en liste. */
function blocConseils(liste, couleurMode) {
  if (!liste.length) {
    return '<div class="box"><p>' + echapper(t("tousBannis")) + "</p></div>";
  }

  var premier = liste[0];
  var html = '<div class="hero" style="--r:' + (premier.b.couleur || couleurMode) + '">'
           + '<span class="tierb">' + echapper(t("tier", { tier: premier.tier })) + "</span>"
           + '<div class="in">' + portrait(premier.b, 84, true)
           + '<span><span class="ribbon">' + echapper(t("prends")) + "</span>"
           + '<div class="tt name">' + echapper(premier.nom) + "</div></span></div>"
           + '<div class="why">' + echapper(premier.raison) + "</div></div>";

  liste.slice(1).forEach(function (x) {
    html += '<div class="row">' + portrait(x.b, 40, false)
          + '<span class="n">' + echapper(x.nom) + "</span>"
          + '<span class="w">' + echapper(x.raison) + "</span></div>";
  });

  return html;
}

/* ============ Écran 4 bis — analyse détaillée ============
   Même calcul que le mode rapide, mais on montre tout : le classement
   complet, chaque raison retenue, et d'où viennent les points. */

function ligneAnalyse(x, rang) {
  var parts = [
    [t("libTier"), x.detail.tier],
    [t("libCarte"), x.detail.carte],
    [t("libEnnemis"), x.detail.ennemis],
    [t("libRisque"), x.detail.risque],
    [t("libAllies"), x.detail.allies]
  ].filter(function (p) { return p[1]; });

  var html = '<article class="analyse">'
           + '<header>'
           + '<span class="rang">' + rang + "</span>"
           + portrait(x.b, 38, false)
           + '<span class="qui"><span class="nom">' + echapper(x.nom) + "</span>"
           + '<span class="tier">' + echapper(t("tier", { tier: x.tier })) + "</span></span>"
           + '<span class="score"><b>' + Math.round(x.score) + "</b>"
           + "<i>" + echapper(t("libScore")) + "</i></span>"
           + "</header>";

  html += '<ul class="raisons">';
  x.raisons.forEach(function (r) {
    html += "<li>" + echapper(r) + "</li>";
  });
  html += "</ul>";

  if (parts.length) {
    html += '<footer class="calcul">';
    parts.forEach(function (p) {
      var signe = p[1] > 0 ? "+" : "";
      html += '<span class="' + (p[1] > 0 ? "plus" : "moins") + '">'
            + echapper(p[0]) + " " + signe + Math.round(p[1]) + "</span>";
    });
    html += "</footer>";
  }

  return html + "</article>";
}

function blocAnalyse(carte) {
  var liste = conseils(NB_ANALYSE);
  if (!liste.length) {
    return '<div class="box"><p>' + echapper(t("analyseVide")) + "</p></div>";
  }
  var html = '<p class="intro">'
           + echapper(t("analyseIntro", { n: liste.length })) + "</p>";
  liste.forEach(function (x, i) { html += ligneAnalyse(x, i + 1); });
  return html;
}


function ecranDraft() {
  var carte = carteActive();
  var couleur = carte ? MODES[carte.mode].c : "#FFC93C";
  var html = barreHaut() + boutonCarte(carte, couleur);

  if (!carte) {
    return html + encadre(t("inviteCarte"), "cartes", t("choisirCarte")) + noteHTML();
  }

  if (roster.size === 0) {
    return html + encadre(t("inviteRoster"), "roster", t("cocherMesBrawlers")) + noteHTML();
  }

  html += ligneSituation();
  html += (modeAffichage === "analyse")
        ? blocAnalyse(carte)
        : blocConseils(conseils(), couleur);
  html += sectionPastilles(t("monEquipe"), allies, "allie", "rma", "addA", MAX_ALLIES);
  html += sectionPastilles(t("prisEnFace"), ennemis, "", "rme", "addE", MAX_ENNEMIS);
  html += sectionPastilles(t("bannis"), bans, "ban", "rmb", "addB", MAX_BANS);
  html += '<button class="b alt sm reset" data-act="reset">'
        + echapper(t("nouveauDraft")) + "</button>";

  return html + noteHTML();
}


/* ============ Pied de page ============
   Il dit d'où vient chaque chiffre et ce qui manque. Une heuristique ne
   doit jamais y passer pour une mesure. */

function noteHTML() {
  /* Chaque bloc a deux formulations : avec sa date et sa source quand elles
     sont connues, sans elles sinon. Écrire les deux phrases en entier dans
     chaque langue évite les accords bancals d'un assemblage automatique. */
  function avec(bloc, cleDatee, cleSimple, extra) {
    var valeurs = extra || {};
    if (!bloc) return t(cleSimple, valeurs);
    valeurs.source = bloc[1];
    valeurs.date = bloc[0];
    return t(cleDatee, valeurs);
  }

  var texte = avec(MAJ.tiers, "noteTiers", "noteTiersSansDate", { saison: SAISON });
  texte += avec(MAJ.cartes, "noteCartes", "noteCartesSansDate");

  var nb = Object.keys(COUNTERS).length;
  texte += nb
    ? avec(MAJ.matchups, "noteMatchups", "noteMatchupsSansDate",
           { n: nb, mot: motBrawler(nb) })
    : t("noteMatchupsAbsents");

  texte += Object.keys(SYNERGIE).length
    ? avec(MAJ.synergie, "noteSynergie", "noteSynergieSansDate")
    : t("noteSynergieAbsente");

  if (etatApi === "hors") texte += t("noteApiHors");

  /* Mention exigée par la Fan Content Policy de Supercell, dont relève cet
     outil : usage personnel, non monétisé, images servies par leur CDN.
     Le lien est ajouté après l'échappement, c'est le seul HTML de la note. */
  texte += t("noteSupercell");

  return '<div class="note">' + echapper(texte)
       + '<a href="https://supercell.com/fan-content-policy" target="_blank"'
       + ' rel="noopener noreferrer">' + echapper(t("lienPolicy")) + "</a>.</div>";
}


/* ============ Aiguillage ============ */

function vueHTML() {
  if (ecran === "roster") return ecranRoster();
  if (ecran === "cartes") return ecranCartes();
  if (cibleAjout) return ecranChoix();
  return ecranDraft();
}
