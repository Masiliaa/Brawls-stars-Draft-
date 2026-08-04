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
            + (o.drapeau
               ? '<span class="drapeau" aria-hidden="true">' + o.drapeau + "</span>"
               : "")
            + echapper(o.libelle) + "</button>";
    });
    html += "</div>";
  }
  return html + "</div>";
}

function barreHaut() {
  /* Le troisième bouton dépend d'où l'on est, et il doit toujours ramener
     quelque part.
     ----------------------------------------------------------------------
     Il proposait « Mes brawlers » partout sauf sur l'écran du roster. Sur la
     liste des cartes, la seule sortie était donc d'aller voir ses brawlers,
     ou de choisir une carte — ce qui remettait le draft à zéro. Autrement
     dit : consulter la carte en cours de draft coûtait ses picks.

     Règle simple : sur le draft on propose le roster, partout ailleurs on
     propose de revenir au draft. */
  var surLeDraft = (ecran === "draft") && !cibleAjout;

  /* Le choix du mode reste offert partout, y compris sur grand écran : c'est
     à l'utilisateur de dire s'il veut le nom seul ou le calcul avec, pas à
     la largeur de sa fenêtre d'en décider pour lui. */
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

  /* Le drapeau se repère avant d'être lu — c'est tout l'intérêt quand on
     cherche sa langue dans une liste écrite dans une langue qu'on ne lit
     pas encore. Le nom reste à côté : un drapeau seul est ambigu. */
  var menuLangue = menuDeroulant(
    "Langue", LANGUES[langue].drapeau + " " + LANGUES[langue].etiquette,
    t("choisirLangue"), "langue",
    ORDRE_LANGUES.map(function (l) {
      return {
        valeur: l, actif: l === langue,
        libelle: LANGUES[l].nom, drapeau: LANGUES[l].drapeau
      };
    }));

  /* Le nom du produit ramène à l'accueil, sur TOUS les écrans sans exception.
     ----------------------------------------------------------------------
     Il a d'abord été mort partout. Puis inerte sur l'écran de draft, en me
     disant qu'on y était déjà. Puis branché sur « draft » — ce qui revenait
     au même une fois la carte choisie : l'écran ne bougeait pas d'un pixel.

     Il pointe maintenant sur « accueil », qui repart de zéro : plus de carte,
     plus de picks. Le geste a donc toujours un effet, depuis n'importe où.
     C'est aussi ce que veut dire cliquer le nom d'un produit : recommencer. */
  var logo = '<button class="tt logo" data-act="accueil" title="'
           + echapper(t("retourAccueil")) + '">Le Manager</button>';

  return '<div class="bar">' + logo
       + '<div class="actions">' + menuMode + menuLangue
       + '<button class="b alt sm" data-act="' + (surLeDraft ? "roster" : "draft") + '">'
       + echapper(surLeDraft ? t("mesBrawlers") : t("retour"))
       + "</button></div></div>";
}

/* La grille de brawlers, en deux usages :
   "roster" — on coche ceux qu'on sait jouer, tous affichés
   "choix"  — on désigne un pick, limité aux 60 premiers pour rester fluide */
function grilleBrawlers(usage) {
  var filtre = sansAccents(recherche.trim());
  var liste = brawlers.filter(function (b) {
    return sansAccents(b.nom).indexOf(filtre) > -1;
  });

  if (usage === "choix") {
    /* Ceux qui sont déjà bannis ou déjà pris ne peuvent plus l'être : les
       montrer, c'est proposer un choix impossible. */
    var engages = dejaEngages();
    liste = liste.filter(function (b) { return engages.indexOf(b.k) < 0; });

    /* Rangés par ce qui a des chances de tomber sur cette carte, pas par
       ordre alphabétique : c'est ce qui permet de désigner d'un seul appui
       au lieu de taper trois lettres. */
    liste = ordreProbable(liste).slice(0, 60);
  }

  return liste.map(function (b) {
    var coche = usage === "roster" && roster.has(b.k);
    /* La classe « roster » porte le voile des non cochés. Sans elle, la
       grille de choix héritait de l'état « pas coché » en permanence. */
    return '<button class="cel' + (usage === "roster" ? " roster" : "")
         + (coche ? " on" : "") + '"'
         + ' data-act="' + (usage === "roster" ? "toggle" : "choisir") + '"'
         + ' data-v="' + b.k + '">'
         + portrait(b, 40, false)
         + "<b>" + echapper(b.nom) + "</b></button>";
  }).join("");
}

/* Les trois listes « Pris en face », « Mon équipe » et « Bannis » avaient
   ici une section chacune, empilées sous le conseil. Trois intitulés, trois
   rangées, trois boutons « ajouter » : la moitié de la hauteur de l'écran
   rapide pour de la saisie, et le nom conseillé sortait du champ dès qu'on
   descendait taper. Elles sont regroupées plus bas, à la densité du mode :
   blocSaisieCompacte() pour le rapide, blocContexte() pour l'analyse. */


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

/* Une carte de la liste. */
function ligneCarte(carte) {
  return '<button class="b full carte-choix" data-act="carte" data-v="' + carte.id + '">'
       + '<span class="gauche">' + vignette(carte, 34)
       + '<span class="nom">' + echapper(nomCarte(carte)) + "</span></span>"
       + '<span class="fleche">›</span></button>';
}


/* Écran 2 — choisir la carte.

   Replié par mode, et pas tout déplié : avec 27 cartes en rotation, la
   liste complète faisait six écrans de haut. On connaît son mode avant
   d'ouvrir l'app, donc six lignes suffisent à s'y retrouver.

   La recherche court-circuite le repli : trois lettres suffisent quand on
   connaît le nom, sans avoir à se rappeler dans quel mode la carte tombe. */
function ecranCartes() {
  return barreHaut()
       + '<input class="inp" id="q" placeholder="'
       + echapper(t("chercherCarte")) + '" value="' + echapper(recherche) + '">'
       + '<div id="listeCartes">' + listeCartesHTML() + "</div>";
}


/* Séparée de l'écran pour être redessinée seule pendant la frappe : refaire
   toute la page ferait perdre le focus du champ à chaque lettre. */
function listeCartesHTML() {
  var html = "";
  var filtre = sansAccents(recherche.trim());
  if (filtre) {
    /* On cherche sur les deux noms : celui qu'affiche le jeu et celui
       d'origine. Quelqu'un qui a lu « Milieu de scène » à l'écran le tape ;
       quelqu'un qui connaît le nom anglais le tape aussi. */
    var trouvees = MAPS.filter(function (c) {
      return sansAccents(c.nom).indexOf(filtre) !== -1
          || sansAccents(nomCarte(c)).indexOf(filtre) !== -1;
    });
    if (!trouvees.length) {
      return html + '<div class="lab" style="margin-top:18px">'
           + echapper(t("aucuneCarte")) + "</div>";
    }
    trouvees.forEach(function (carte) {
      html += '<section class="groupe-mode" style="--m:' + MODES[carte.mode].c + '">'
            + ligneCarte(carte) + "</section>";
    });
    return html;
  }

  Object.keys(MODES).forEach(function (mode) {
    var cartes = MAPS.filter(function (c) { return c.mode === mode; });
    if (!cartes.length) return;
    var ouvert = (modeOuvert === mode);

    html += '<section class="groupe-mode" style="--m:' + MODES[mode].c + '">'
          + '<button class="b full titre-mode-b' + (ouvert ? " ouvert" : "")
          + '" data-act="ouvrirModeCarte" data-v="' + mode + '">'
          + '<span class="gauche"><span class="nom">' + echapper(nomMode(mode))
          + '</span></span>'
          + '<span class="compte">' + cartes.length + "</span>"
          + '<span class="fleche">' + (ouvert ? "⌄" : "›") + "</span></button>";

    if (ouvert) cartes.forEach(function (carte) { html += ligneCarte(carte); });
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
       + astuceClavier()
       + '<div class="grid" id="grid">' + grilleBrawlers("choix") + "</div>"
       + '<button class="b alt sm reset" data-act="annuler">'
       + echapper(t("annuler")) + "</button>";
}

/* Un raccourci que personne ne connaît n'existe pas. La ligne n'apparaît
   qu'avec une souris — la classe est posée au démarrage par app.js — et
   reste discrète : c'est un rappel, pas une consigne. */
function astuceClavier() {
  return '<p class="astuce-clavier">' + echapper(t("astuceClavier")) + "</p>";
}


/* ============ Écran 4 — le draft ============ */

/* Le grand bouton du haut : la carte en cours, ou l'invitation à en choisir une. */
function boutonCarte(carte, couleur) {
  /* Tant qu'aucune carte n'est choisie, ce bandeau EST l'invitation : il
     porte la phrase d'explication et le seul bouton de l'écran.
     ----------------------------------------------------------------------
     Il y avait ici deux commandes identiques, l'une sous l'autre : ce
     bandeau, qui disait « Choisir la carte », puis un encadré qui redisait
     « Choisir la carte ». Et le bandeau proposait « changer » alors qu'il
     n'y avait rien à changer. Deux fois le même geste, un mot qui ment. */
  if (!carte) {
    return '<button class="b full carte-active vide" data-act="cartes"'
         + ' style="--m:' + couleur + '">'
         + '<span class="deux-lignes">'
         + '<span class="sur">' + echapper(t("etape1")) + "</span>"
         + '<span class="nom">' + echapper(t("choisirCarte")) + "</span>"
         + '<span class="aide">' + echapper(t("inviteCarte")) + "</span>"
         + "</span>"
         + '<span class="fleche" aria-hidden="true">›</span></button>';
  }

  return '<button class="b full carte-active" data-act="cartes" style="--m:' + couleur + '">'
       + '<span class="gauche">' + vignette(carte, 32)
       + '<span class="deux-lignes">'
       + '<span class="sur">' + echapper(nomMode(carte.mode)) + "</span>"
       + '<span class="nom">' + echapper(nomCarte(carte)) + "</span>"
       + "</span></span>"
       + '<span class="action">' + echapper(t("changer")) + "</span></button>";
}

/* Où en est le draft : combien de picks adverses viendront encore après le
   tien. L'app le déduit de l'ordre fixe du classé ; l'afficher évite que le
   joueur se demande pourquoi les conseils changent de ton.

   Les traits devant la phrase montrent la même chose en forme : un trait
   plein par pick adverse déjà saisi, un trait creux par pick qui peut encore
   tomber. C'est ce que les autres outils affichent comme une séquence de
   draft — sauf qu'ici rien n'est deviné : on ne sait pas qui pique en
   premier, donc on ne le dessine pas. Seul ce qui est saisi est plein. */
function ligneSituation() {
  var restantes = reponsesRestantes();
  var cle = !restantes ? "pickDernier"
          : (restantes === 1 ? "pickExpose1" : "pickExposeN");

  var traits = "";
  for (var i = 0; i < MAX_ENNEMIS; i++) {
    traits += '<span class="' + (i < ennemis.length ? "fait" : "") + '"></span>';
  }

  return '<p class="situation' + (restantes ? "" : " libre") + '">'
       + '<span class="tour" aria-hidden="true">' + traits + "</span>"
       + "<span>" + echapper(t(cle, { n: restantes })) + "</span></p>";
}

function encadre(message, action, libelle) {
  return '<div class="box"><p>' + echapper(message) + "</p>"
       + '<button class="b" data-act="' + action + '">' + echapper(libelle) + "</button></div>";
}

/* Le brawler recommandé, en grand, puis les suivants en bande.

   Sur deux colonnes, le classement complet est déjà affiché à droite : la
   bande des suivants ferait doublon, et la porte vers le détail n'ouvre
   plus rien puisque le détail est là. Le bloc se réduit alors au verdict. */
function blocConseils(liste, couleurMode, cote) {
  if (!liste.length) {
    return '<div class="box"><p>' + echapper(t("tousBannis")) + "</p></div>";
  }

  /* Hors deux colonnes, le bloc entier est un bouton : taper le nom ouvre le
     calcul. C'est la porte vers le mode analyse, à un geste au lieu de deux
     dans un menu. Un bouton qui ne ferait rien serait pire que pas de
     bouton, donc à côté du classement c'est une simple boîte. */
  var premier = liste[0];
  var html = cote
    ? '<div class="hero" style="--r:' + (premier.b.couleur || couleurMode) + '">'
    : '<button class="hero" data-act="detail"'
      + ' title="' + echapper(t("voirCalcul")) + '"'
      + ' style="--r:' + (premier.b.couleur || couleurMode) + '">';

  html += '<span class="tierb">' + echapper(t("tier", { tier: premier.tier })) + "</span>"
        + '<div class="in">' + portrait(premier.b, 84, true)
        + '<span><span class="ribbon">' + echapper(t("prends")) + "</span>"
        + '<div class="tt name">' + echapper(premier.nom) + "</div></span>"
        + (cote ? "" : '<span class="vers-detail" aria-hidden="true">›</span>')
        + "</div>"
        + '<div class="why">' + echapper(premier.raison) + "</div>"
        + (cote ? "</div>" : "</button>");

  if (cote) return html;

  /* Les suivants tenaient sur trois lignes pleines, raison comprise : 195 px,
     le plus gros poste de l'écran après le conseil lui-même, et c'est lui qui
     poussait la saisie hors du champ. Ils passent en bande qui se fait
     glisser du pouce. Ce qu'ils perdent — la phrase qui explique pourquoi —
     est précisément ce que le mode analyse existe pour montrer, à un geste
     d'ici. Le rang et le taux, eux, restent : ce sont des mesures. */
  html += '<div class="lab serre">' + echapper(t("sinon")) + "</div>"
        + '<div class="replis">';

  liste.slice(1).forEach(function (x) {
    var sur = surLaCarte(x.k, carteActive());
    var detail = sur
      ? t("altRang", { rang: sur.rang, wr: virgule(sur.wr.toFixed(1)) })
      : t("tier", { tier: x.tier });

    html += '<button class="repli" data-act="detail">'
          + portrait(x.b, 28, false)
          + '<span class="txt"><span class="n">' + echapper(x.nom) + "</span>"
          + '<span class="d">' + echapper(detail) + "</span></span></button>";
  });

  return html + "</div>";
}

/* Rang et taux de victoire d'un brawler sur la carte en cours, ou null s'il
   n'y figure pas. Lu directement dans les données relevées — jamais estimé. */
function surLaCarte(cle, carte) {
  if (!carte) return null;
  for (var i = 0; i < carte.top.length; i++) {
    if (clef(carte.top[i][0]) === cle) {
      return { rang: i + 1, wr: carte.top[i][1] };
    }
  }
  return null;
}

/* ============ Écran 4 bis — analyse détaillée ============
   Même calcul que le mode rapide, mais on montre tout : le classement
   complet, chaque raison retenue, et d'où viennent les points. */

function ligneAnalyse(x, rang, meilleurScore) {
  var parts = [
    [t("libTier"), x.detail.tier],
    [t("libCarte"), x.detail.carte],
    [t("libEnnemis"), x.detail.ennemis],
    [t("libRisque"), x.detail.risque],
    [t("libAllies"), x.detail.allies]
  ].filter(function (p) { return p[1]; });

  /* Une barre sous le score : dix nombres à trois chiffres ne se classent
     pas à l'œil, dix barres si. La longueur est relative au premier, jamais
     à un maximum théorique — c'est un écart réel, pas une note sur 100. */
  var part = meilleurScore > 0
           ? Math.max(4, Math.round((x.score / meilleurScore) * 100)) : 0;

  var html = '<article class="analyse' + (rang === 1 ? " premier" : "") + '">'
           + '<header>'
           + '<span class="rang">' + rang + "</span>"
           + portrait(x.b, 38, false)
           + '<span class="qui"><span class="nom">' + echapper(x.nom) + "</span>"
           + '<span class="tier">' + echapper(t("tier", { tier: x.tier })) + "</span></span>"
           + '<span class="score"><b>' + Math.round(x.score) + "</b>"
           + "<i>" + echapper(t("libScore")) + "</i>"
           + '<span class="jauge-score"><i style="width:' + part + '%"></i></span>'
           + "</span>"
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

  /* On n'arrive ici depuis le mode rapide qu'en tapant le nom : il faut donc
     de quoi remonter, au même endroit et aussi visible que la porte d'entrée. */
  var html = vueAnalyse
    ? '<button class="b alt sm retour-conseil" data-act="detail">‹ '
      + echapper(t("retourConseil")) + "</button>"
    : "";

  html += '<p class="intro">' + echapper(t("analyseIntro", { n: liste.length })) + "</p>";
  var meilleur = liste[0].score;
  liste.forEach(function (x, i) { html += ligneAnalyse(x, i + 1, meilleur); });
  return html;
}


/* ============ Les picks saisis, deux densités ============
   Le mode rapide se joue contre le chrono : les trois listes tiennent en
   deux rangées, pour que le nom conseillé et la saisie restent visibles
   ensemble. Le mode analyse se lit sans chrono, mais son contexte était
   sous dix fiches — il remonte donc tout en haut, en bande d'une ligne. */

/* Une pastille compacte : portrait, nom, croix. */
function pastille(cle, classe, action, taille) {
  return '<button class="pil ' + classe + '" data-act="' + action
       + '" data-v="' + cle + '">'
       + portrait(brawler(cle), taille || 32, false)
       + echapper(nomBrawler(cle)) + " ✕</button>";
}

/* Un ban ne se lit pas, il se compte : c'est un brawler retiré du choix, pas
   un adversaire à jouer contre. Six noms écrits en toutes lettres faisaient
   déborder la rangée sur une deuxième ligne. Réduit au portrait, il garde sa
   place et son geste — et il a la même tête dans les deux modes. */
function jetonBan(cle) {
  /* Sans croix, six portraits grisés ressemblaient à de la décoration : rien
     ne disait qu'ils étaient bannis, ni qu'on pouvait les retirer. La croix
     est posée par-dessus, donc elle ne coûte pas un pixel de hauteur. */
  return '<button class="jeton-ctx ban" data-act="rmb" data-v="' + cle + '"'
       + ' title="' + echapper(t("retirerBan", { nom: nomBrawler(cle) })) + '">'
       + portrait(brawler(cle), 28, false)
       + '<span class="croix" aria-hidden="true">✕</span></button>';
}

function boutonAjout(action, libelle) {
  return '<button class="pil add" data-act="' + action + '">'
       + echapper(libelle || t("ajouter")) + "</button>";
}

/* Mode rapide — deux rangées au lieu de trois sections. « Nouveau draft »
   se range au bout du premier intitulé : il ne coûte plus une ligne. */
function blocSaisieCompacte() {
  var html = '<div class="lab serre lab-avec-action">'
           + "<span>" + echapper(t("prisEnFace")) + "</span>"
           + '<button class="b alt sm relancer" data-act="reset">'
           + echapper(t("nouveauDraft")) + "</button></div>"
           + '<div class="wrap">';

  ennemis.forEach(function (cle) { html += pastille(cle, "", "rme"); });
  if (ennemis.length < MAX_ENNEMIS) html += boutonAjout("addE");
  html += "</div>";

  html += '<div class="lab serre">' + echapper(t("monEquipe")) + "</div>"
        + '<div class="wrap">';
  allies.forEach(function (cle) { html += pastille(cle, "allie", "rma"); });
  if (allies.length < MAX_ALLIES) html += boutonAjout("addA");
  html += "</div>";

  /* Les bans avaient leur propre section, puis ont été collés à la suite des
     alliés pour gagner de la hauteur. Résultat : un intitulé pour deux
     choses différentes, et six portraits sans nom qui débordaient sur une
     deuxième ligne. Ils reprennent leur intitulé, avec le compte — c'est ce
     qu'on veut savoir d'un coup d'œil, pas qui exactement. */
  html += '<div class="lab serre lab-avec-action">'
        + "<span>" + echapper(t("bannis")) + "</span>"
        + '<span class="compte-ban">' + bans.length + "/" + MAX_BANS + "</span></div>"
        + '<div class="wrap rangee-bans">';
  bans.forEach(function (cle) { html += jetonBan(cle); });
  if (bans.length < MAX_BANS) {
    html += '<button class="jeton-ctx vide" data-act="addB"'
          + ' title="' + echapper(t("ajouterBan")) + '">+</button>';
  }

  return html + "</div>";
}

/* Mode analyse — la même information sur une seule ligne, en tête d'écran :
   c'est la seule chose qu'on modifie pendant qu'on lit le classement. */
function blocContexte() {
  function groupe(cleTitre, cles, classe, actionRetirer, actionAjouter, maximum) {
    var html = '<span class="groupe"><span class="et">'
             + echapper(t(cleTitre)) + "</span>";
    cles.forEach(function (cle) {
      html += '<button class="jeton-ctx ' + classe + '" data-act="' + actionRetirer
            + '" data-v="' + cle + '" title="' + echapper(nomBrawler(cle)) + '">'
            + portrait(brawler(cle), 26, false) + "</button>";
    });
    if (cles.length < maximum) {
      html += '<button class="jeton-ctx vide" data-act="' + actionAjouter
            + '" title="' + echapper(t("ajouter")) + '">+</button>';
    }
    return html + "</span>";
  }

  return '<div class="contexte">'
       + groupe("ctxFace", ennemis, "", "rme", "addE", MAX_ENNEMIS)
       + groupe("ctxAvec", allies, "allie", "rma", "addA", MAX_ALLIES)
       + groupe("ctxBan", bans, "ban", "rmb", "addB", MAX_BANS)
       + '<button class="b alt sm relancer" data-act="reset">'
       + echapper(t("nouveauDraft")) + "</button></div>";
}


/* ============ Bans conseillés ============
   Les bans se jouent avant les picks : dès qu'un pick est saisi, la phase
   est passée et le bloc disparaît de lui-même. */

function phaseDeBan() {
  return !ennemis.length && !allies.length && bans.length < MAX_BANS;
}

function blocBans() {
  var liste = bansConseilles(NB_BANS_CONSEILLES);
  if (!liste.length) return "";

  /* L'app disait « bannis ceux-là » et il fallait ensuite ouvrir la saisie,
     chercher le nom, le taper, le désigner. Le conseil et le geste étaient
     séparés par cinq actions. Chaque ligne est maintenant le bouton qui
     l'exécute. */
  var html = '<div class="lab serre">' + echapper(t("aBannir")) + "</div>";
  liste.forEach(function (x) {
    html += '<button class="row conseil-ban" data-act="banConseil" data-v="'
          + x.k + '" title="' + echapper(t("bannirCelui", { nom: x.nom })) + '">'
          + portrait(x.b, 34, false)
          + '<span class="n">' + echapper(x.nom) + "</span>"
          + '<span class="w">' + echapper(x.raison) + "</span>"
          + '<span class="geste" aria-hidden="true">+</span></button>';
  });
  return html;
}


function ecranDraft() {
  var carte = carteActive();
  var couleur = carte ? MODES[carte.mode].c : "#FFC93C";
  var html = barreHaut() + boutonCarte(carte, couleur);

  /* Le bandeau porte déjà l'invitation et le geste : rien à ajouter sous
     lui, sinon on redemande deux fois la même chose. */
  if (!carte) return html + noteHTML();

  if (roster.size === 0) {
    return html + encadre(t("inviteRoster"), "roster", t("cocherMesBrawlers")) + noteHTML();
  }

  /* Les deux modes ne sont plus la même page avec un bloc échangé.
     ----------------------------------------------------------------------
     ANALYSE — on la lit sans chrono, elle a le droit d'être longue. Son
     contexte remonte en tête : il était sous dix fiches, à trois écrans de
     défilement de ce qu'on voulait corriger.

     RAPIDE — elle se joue contre le chrono. Tout ce qu'exige un tour de
     draft tient d'un seul regard : le nom, sa raison, et la saisie juste
     dessous. L'adversaire pick, on le tape, le nom change au-dessus sans
     que rien ne bouge sous le pouce. */
  var mode = modeEffectif();

  /* LARGE — deux colonnes. Le conseil et sa saisie restent en vue à gauche
     pendant que le classement défile à droite : sur un portable, la colonne
     unique laissait 64 % de l'écran vide et faisait quand même défiler
     trois fois. */
  if (mode === "large") {
    return html
         + '<div class="deux-colonnes">'
         + '<div class="col-conseil">'
         + ligneSituation()
         + blocConseils(conseils(), couleur, true)
         + blocSaisieCompacte()
         + (phaseDeBan() ? blocBans() : "")
         + "</div>"
         + '<div class="col-detail">' + blocAnalyse(carte) + "</div>"
         + "</div>" + noteHTML();
  }

  if (mode === "analyse") {
    html += blocContexte();
    html += ligneSituation();
    return html + blocAnalyse(carte) + noteHTML();
  }

  /* RAPIDE — une colonne sur un téléphone debout. Les deux moitiés sont
     malgré tout enveloppées séparément, parce qu'une fenêtre large mais
     basse — un téléphone couché, et Brawl Stars se joue couché — a la place
     de les mettre côte à côte sans rien changer d'autre. C'est la feuille
     de style qui en décide, pas ce code. */
  html += ligneSituation();
  html += '<div class="rapide-corps">'
        + '<div class="part-verdict">' + blocConseils(conseils(), couleur) + "</div>"
        + '<div class="part-saisie">' + blocSaisieCompacte()
        + (phaseDeBan() ? blocBans() : "") + "</div>"
        + "</div>";

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

  /* Les sources se replient : huit lignes qu'on ne lit pas chaque fois et
     qui poussent tout le reste vers le haut. Elles restent à un geste.

     La mention Supercell, elle, ne se replie pas. Elle relève de la Fan
     Content Policy dont dépend cet outil — usage personnel, non monétisé,
     images servies par leur CDN. Une obligation cachée derrière un clic
     n'est plus affichée : elle reste donc toujours visible, hors du repli.
     Le lien est ajouté après l'échappement, c'est le seul HTML de la note. */
  return '<div class="note">'
       + "<details><summary>" + echapper(t("noteResume")) + "</summary>"
       + echapper(texte) + "</details>"
       + '<p class="supercell">' + echapper(t("noteSupercell"))
       + '<a href="https://supercell.com/fan-content-policy" target="_blank"'
       + ' rel="noopener noreferrer">' + echapper(t("lienPolicy")) + "</a>.</p></div>";
}


/* ============ Aiguillage ============ */

function vueHTML() {
  if (ecran === "roster") return ecranRoster();
  if (ecran === "cartes") return ecranCartes();
  if (cibleAjout) return ecranChoix();
  return ecranDraft();
}
