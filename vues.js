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

  /* Plus aucune source : on affiche les initiales, ou rien pour une carte. */
  var ini = img.getAttribute("data-ini");
  if (ini) img.parentNode.innerHTML = "<em>" + echapper(ini) + "</em>";
  else img.remove();
}

/* Début de balise <img> avec la première source et la file d'attente. */
function baliseImage(sources) {
  var valides = sources.filter(Boolean);
  return '<img src="' + valides[0] + '" data-fb="' + valides.slice(1).join("|") + '"';
}

/* b.img vient de l'API : c'est la seule URL certaine, les autres sont
   reconstruites à partir du nom. Un slug deviné se trompe justement sur les
   noms difficiles (Larry & Lawrie, Mr. P, 8-Bit), donc l'URL de l'API passe
   avant les deux CDN. */
function sourcesBrawler(b) {
  var slug = slugCdn(b.nom);
  return [
    ASSETS_LOCAUX ? "assets/brawlers/" + slug + ".png" : null,
    b.img,
    "https://media.brawltime.ninja/brawlers/" + slug + "/avatar.png?size=160",
    "https://cdn.brawlify.com/brawlers/borderless/" + slug + ".png"
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

function barreHaut() {
  var versRoster = ecran !== "roster";
  return '<div class="bar"><div class="tt logo">Le Manager</div>'
       + '<button class="b alt sm" data-act="' + (versRoster ? "roster" : "draft") + '">'
       + (versRoster ? "Mes persos" : "Retour")
       + "</button></div>";
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
  var html = '<div class="lab">' + titre + '</div><div class="wrap">';

  cles.forEach(function (cle) {
    html += '<button class="pil ' + classe + '"'
          + ' data-act="' + actionRetirer + '" data-v="' + cle + '">'
          + portrait(brawler(cle), 32, false)
          + echapper(nomBrawler(cle)) + " ✕</button>";
  });

  if (cles.length < maximum) {
    html += '<button class="pil add" data-act="' + actionAjouter + '">+ ajouter</button>';
  }
  return html + "</div>";
}


/* ============ Écran 1 — mes persos ============ */

function ecranRoster() {
  var nb = roster.size;
  return barreHaut()
       + '<p class="intro">Coche les brawlers niveau 9 minimum que tu sais jouer. '
       + nb + " coché" + (nb > 1 ? "s" : "") + ".</p>"
       + '<div class="wrap" style="margin-bottom:12px">'
       + '<button class="b sm" data-act="tout">Tout cocher</button>'
       + '<button class="b alt sm" data-act="rien">Tout décocher</button></div>'
       + '<input class="inp" id="q" placeholder="Chercher un brawler" value="'
       + echapper(recherche) + '">'
       + '<div class="grid" id="grid">' + grilleBrawlers("roster") + "</div>";
}


/* ============ Écran 2 — choisir la carte ============ */

function ecranCartes() {
  var html = barreHaut();

  Object.keys(MODES).forEach(function (mode) {
    var info = MODES[mode];
    html += '<div style="margin-bottom:16px">'
          + '<div class="lab" style="color:' + info.c + ';margin-top:0">' + info.nom + "</div>";

    MAPS.filter(function (c) { return c.mode === mode; }).forEach(function (carte) {
      html += '<div style="margin-bottom:8px">'
            + '<button class="b full" data-act="carte" data-v="' + carte.id + '"'
            + ' style="background:' + info.c + ";color:#191036;text-shadow:none;"
            + "box-shadow:0 5px 0 color-mix(in srgb," + info.c + ' 55%,#191036)">'
            + '<span style="display:flex;align-items:center;gap:11px">'
            + vignette(carte, 34)
            + '<span style="font-size:18px">' + echapper(carte.nom) + "</span></span>"
            + '<span style="font-size:13px">›</span></button></div>';
    });

    html += "</div>";
  });

  return html;
}


/* ============ Écran 3 — désigner un brawler ============ */

var TITRE_CHOIX = {
  ennemi: "Qui est pris en face ?",
  allie: "Qu'a pris ton coéquipier ?",
  ban: "Quel brawler est banni ?"
};

function ecranChoix() {
  return barreHaut()
       + '<div class="lab" style="margin-top:0">' + TITRE_CHOIX[cibleAjout] + "</div>"
       + '<input class="inp" id="q" placeholder="Chercher" value="' + echapper(recherche) + '">'
       + '<div class="grid" id="grid">' + grilleBrawlers("choix") + "</div>"
       + '<button class="b alt sm" style="margin-top:12px" data-act="annuler">Annuler</button>';
}


/* ============ Écran 4 — le draft ============ */

/* Le grand bouton du haut : la carte en cours, ou l'invitation à en choisir une. */
function boutonCarte(carte, couleur) {
  return '<button class="b full" data-act="cartes" style="background:' + couleur
       + ";box-shadow:0 5px 0 color-mix(in srgb," + couleur + ' 55%,#191036);margin-bottom:14px">'
       + '<span style="display:flex;align-items:center;gap:11px">'
       + (carte ? vignette(carte, 32) : "")
       + '<span><span style="display:block;font-size:11px;opacity:.75">'
       + (carte ? MODES[carte.mode].nom : "Étape 1") + "</span>"
       + '<span style="font-size:20px">'
       + (carte ? echapper(carte.nom) : "Choisir la carte") + "</span></span></span>"
       + '<span style="font-size:13px">changer</span></button>';
}

function encadre(message, action, libelle) {
  return '<div class="box"><p>' + message + "</p>"
       + '<button class="b" data-act="' + action + '">' + libelle + "</button></div>";
}

/* Le brawler recommandé, en grand, puis les suivants en liste. */
function blocConseils(liste, couleurMode) {
  if (!liste.length) {
    return '<div class="box"><p>Tous tes brawlers sont bannis ou déjà pris.</p></div>';
  }

  var premier = liste[0];
  var html = '<div class="hero" style="--r:' + (premier.b.couleur || couleurMode) + '">'
           + '<span class="tierb">Tier ' + premier.tier + "</span>"
           + '<div class="in">' + portrait(premier.b, 84, true)
           + '<span><span class="ribbon">Prends</span>'
           + '<div class="tt name">' + echapper(premier.nom) + "</div></span></div>"
           + '<div class="why">' + echapper(premier.raison) + "</div></div>";

  liste.slice(1).forEach(function (x) {
    html += '<div class="row">' + portrait(x.b, 40, false)
          + '<span class="n">' + echapper(x.nom) + "</span>"
          + '<span class="w">' + echapper(x.raison) + "</span></div>";
  });

  return html;
}

function ecranDraft() {
  var carte = carteActive();
  var couleur = carte ? MODES[carte.mode].c : "#FFC93C";
  var html = barreHaut() + boutonCarte(carte, couleur);

  if (!carte) {
    return html + encadre(
      "Ouvre la carte annoncée au début du draft. Tu auras un nom tout de suite.",
      "cartes", "Choisir la carte") + noteHTML();
  }

  if (roster.size === 0) {
    return html + encadre(
      "Coche d'abord tes brawlers, sinon impossible de te conseiller un perso jouable.",
      "roster", "Cocher mes persos") + noteHTML();
  }

  html += blocConseils(conseils(), couleur);
  html += sectionPastilles("Mon équipe", allies, "allie", "rma", "addA", MAX_ALLIES);
  html += sectionPastilles("Pris en face", ennemis, "", "rme", "addE", MAX_ENNEMIS);
  html += sectionPastilles("Bannis", bans, "ban", "rmb", "addB", MAX_BANS);
  html += '<button class="b alt sm" style="margin-top:18px" data-act="reset">Nouveau draft</button>';

  return html + noteHTML();
}


/* ============ Pied de page ============
   Il dit d'où vient chaque chiffre et ce qui manque. Une heuristique ne
   doit jamais y passer pour une mesure. */

function noteHTML() {
  /* pluriel : marque à accorder avec ce qui précède (« relevé » / « relevés »). */
  function source(bloc, pluriel) {
    return bloc ? " relevé" + (pluriel || "") + " le " + bloc[0] + " sur " + bloc[1] : "";
  }

  var texte = "Tiers par mode" + source(MAJ.tiers, "s") + ", saison " + SAISON + ". ";
  texte += "Classements par carte" + source(MAJ.cartes, "s") + ". ";

  var nb = Object.keys(COUNTERS).length;
  texte += nb
    ? "Matchups : " + nb + " brawler" + (nb > 1 ? "s" : "") + source(MAJ.matchups, nb > 1 ? "s" : "")
      + ", un jugement d'experts adossé aux classements SpenLC — pas une mesure statistique. "
    : "Table de matchups absente : l'app retombe sur le cycle agression → contrôle → portée, "
      + "une approximation, pas une mesure. ";

  texte += Object.keys(SYNERGIE).length
    ? "Synergie alliée : écarts de taux de victoire en équipe" + source(MAJ.synergie, "s")
      + ", ajoutés à l'équilibre des rôles. "
    : "Les picks alliés servent à l'équilibre des rôles, pas à une synergie mesurée. ";

  if (etatApi === "hors") {
    texte += "Couleurs de rareté et classes indisponibles : l'API n'a pas répondu. ";
  }
  texte += "Contenu non affilié à Supercell.";

  return '<div class="note">' + echapper(texte) + "</div>";
}


/* ============ Aiguillage ============ */

function vueHTML() {
  if (ecran === "roster") return ecranRoster();
  if (ecran === "cartes") return ecranCartes();
  if (cibleAjout) return ecranChoix();
  return ecranDraft();
}
