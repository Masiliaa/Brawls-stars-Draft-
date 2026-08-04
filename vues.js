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

  return cellules(liste, usage);
}

/* Les boutons d'une liste donnée. Séparé de grilleBrawlers() parce que
   l'écran des brawlers dessine plusieurs grilles, une par rareté. */
function cellules(liste, usage) {
  /* La taille du portrait est posée en ligne par portrait() : une règle CSS
     ne peut pas la reprendre. Elle se décide donc ici, avec le seuil que
     l'app emploie déjà partout — largeur ET hauteur, jamais le type
     d'appareil. Un iPhone couché fait 844 px de large mais 390 de haut :
     agrandir les portraits lui coûterait les lignes qu'il n'a pas. */
  var taille = deuxColonnes() ? 64 : 40;
  return liste.map(function (b) {
    var coche = usage === "roster" && roster.has(b.k);
    /* La classe « roster » porte le voile des non cochés. Sans elle, la
       grille de choix héritait de l'état « pas coché » en permanence. */
    return '<button class="cel' + (usage === "roster" ? " roster" : "")
         + (coche ? " on" : "") + '"'
         + ' data-act="' + (usage === "roster" ? "toggle" : "choisir") + '"'
         + ' data-v="' + b.k + '">'
         + portrait(b, taille, false)
         + "<b>" + echapper(b.nom) + "</b></button>";
  }).join("");
}

/* Les trois listes « Pris en face », « Mon équipe » et « Bannis » avaient
   ici une section chacune, empilées sous le conseil. Trois intitulés, trois
   rangées, trois boutons « ajouter » : la moitié de la hauteur de l'écran
   rapide pour de la saisie, et le nom conseillé sortait du champ dès qu'on
   descendait taper. Elles sont regroupées plus bas, à la densité du mode :
   blocSaisieCompacte(), la même dans les deux modes. */


/* ============ Écran 1 — mes persos ============ */

/* Les brawlers rangés par rareté, du plus commun au plus rare.
   ------------------------------------------------------------------------
   L'ordre alphabétique ne dit rien de ce qu'on possède. La rareté, si :
   on a presque toujours les communs et les rares, et ce qui manque se
   concentre à la fin. Relevé le 04/08/2026 sur l'API : 1 commun, 8 rares,
   10 super rares, 30 épiques, 41 mythiques, 15 légendaires, 2 ultra.

   À dire franchement : ça ne divise pas le nombre d'appuis — les deux tiers
   des brawlers sont mythiques ou épiques. Ça regroupe l'incertitude, ce qui
   n'est pas la même chose mais reste ce qu'on peut faire de mieux sans aller
   lire le compte du joueur. */
function groupesParRarete(liste) {
  var groupes = {}, ordre = [];
  liste.forEach(function (b) {
    var id = (b.rarete && b.rarete.id) || 0;
    if (!groupes[id]) {
      groupes[id] = { id: id, nom: (b.rarete && b.rarete.nom) || "", liste: [] };
      ordre.push(id);
    }
    groupes[id].liste.push(b);
  });
  ordre.sort(function (a, b) { return a - b; });
  return ordre.map(function (id) { return groupes[id]; });
}

/* Le nom d'une rareté, traduit si on la connaît, tel que l'API l'annonce
   sinon. Supercell peut en ajouter une demain : mieux vaut un mot anglais
   qu'un trou, et surtout pas un nom qu'on aurait inventé. */
function nomRarete(g) {
  var cle = "rarete" + g.id;
  var connue = LANGUES[langue].txt[cle] !== undefined
            || LANGUES[LANGUE_DEFAUT].txt[cle] !== undefined;
  return connue ? t(cle) : g.nom;
}

function blocRarete(g) {
  var coches = g.liste.filter(function (b) { return roster.has(b.k); }).length;
  var complet = coches === g.liste.length;
  var etiquette = nomRarete(g);

  /* Le compte porte sur le groupe entier, pas sur ce qui reste affiché :
     sous le filtre « ceux qui manquent », « 0 sur 30 » serait un mensonge
     par omission. Un groupe entièrement coché n'a plus rien à montrer, on
     l'efface — c'est le but du filtre. */
  var montres = filtreManquants
    ? g.liste.filter(function (b) { return !roster.has(b.k); })
    : g.liste;
  if (!montres.length) return "";

  /* Sept boutons « Tout cocher » identiques ne disent pas lequel on active.
     Le titre porte le nom du groupe, seul repère utile à la voix comme au
     survol. */
  var titre = t(complet ? "decocherGroupe" : "cocherGroupe", { groupe: etiquette });
  return '<div class="rangee-rarete">'
       + '<span class="titre-rarete">' + echapper(etiquette) + "</span>"
       + '<span class="compte-rarete">'
       + echapper(t("rosterCompte", { n: coches, total: g.liste.length })) + "</span>"
       + '<button class="b alt sm" data-act="groupe" data-v="' + g.id
       + '" title="' + echapper(titre) + '">'
       + echapper(t(complet ? "toutDecocher" : "toutCocher")) + "</button></div>"
       + '<div class="grid">' + cellules(montres, "roster") + "</div>";
}

/* Le corps de la grille, rendu à part : la frappe dans la recherche ne
   redessine que lui, sinon le champ perdrait le focus à chaque lettre. */
function corpsRoster() {
  var filtre = sansAccents(recherche.trim());
  var liste = brawlers.filter(function (b) {
    return sansAccents(b.nom).indexOf(filtre) > -1;
  });
  var groupes = groupesParRarete(liste);
  /* Pendant une recherche, découper trois résultats en sept intitulés ne
     range rien. Et si l'API n'a pas répondu, aucune rareté n'est connue :
     on retombe alors sur la liste simple, qui a toujours marché. */
  var groupe = !filtre && groupes.every(function (g) { return g.id > 0; });
  if (groupe) return { classe: "", html: groupes.map(blocRarete).join("") };

  if (filtreManquants) {
    liste = liste.filter(function (b) { return !roster.has(b.k); });
  }
  return { classe: "grid", html: cellules(liste, "roster") };
}

function ecranRoster() {
  /* Le nombre était en fin de phrase — « … que tu sais jouer. 68 cochés. »
     C'est pourtant la seule chose qu'on vient vérifier en revenant ici. Il
     passe devant, en grand, avec son total : « 68 sur 107 » se lit d'un
     coup d'œil, « 68 » seul ne dit pas s'il en manque beaucoup. */
  var corps = corpsRoster();
  return barreHaut()
       + '<p class="intro"><b class="compteur">'
       + echapper(t("rosterCompte", { n: roster.size, total: brawlers.length }))
       + "</b> " + echapper(t("rosterConsigne")) + "</p>"
       + '<div class="wrap barre-outils">'
       + '<button class="b sm" data-act="tout">' + echapper(t("toutCocher")) + "</button>"
       + '<button class="b alt sm" data-act="rien">' + echapper(t("toutDecocher")) + "</button>"
       + '<button class="b alt sm' + (filtreManquants ? " actif" : "")
       + '" data-act="manquants">'
       + echapper(t(filtreManquants ? "rosterFiltreTous" : "rosterFiltreManquants"))
       + "</button></div>"
       + '<input class="inp" id="q" placeholder="' + echapper(t("chercherBrawler"))
       + '" value="' + echapper(recherche) + '">'
       + '<div class="' + corps.classe + '" id="grid">' + corps.html + "</div>";
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

  /* Une carte déjà choisie n'est plus une décision, c'est un rappel : elle
     tenait sur un bandeau de 72 px avec vignette, mode au-dessus, nom en
     dessous et « changer » à droite — la place d'un titre pour un rappel.
     Elle tient sur une ligne, où le nom de la carte est le seul mot en
     blanc. La vignette part avec : on ne cherche pas sa carte ici, on
     vérifie qu'on ne s'est pas trompé, et un nom suffit à ça. */
  return '<button class="ligne-carte carte-active" data-act="cartes"'
       + ' style="--m:' + couleur + '">'
       + '<span class="mode">' + echapper(nomMode(carte.mode)) + "</span>"
       + '<span class="nom">' + echapper(nomCarte(carte)) + "</span>"
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

  /* Le verdict tenait dans une carte : fond, contour, halo, une étiquette
     « PICK » en capitales orange, et le tier en pastille flottante en haut à
     droite, alignée avec rien. Cinq objets pour dire un nom.
     Il ne reste que le nom, posé à côté de son portrait sur le fond de la
     page, et une ligne de mesure en dessous. Le tier y rejoint le taux :
     ce sont deux chiffres de même nature, ils vont ensemble. */
  var sur = surLaCarte(premier.k, carteActive());
  html += '<span class="in">' + portrait(premier.b, 60, false)
        + '<span class="tt name">' + echapper(premier.nom) + "</span></span>"
        + '<span class="mesure"><span class="chip">'
        + echapper(t("tier", { tier: premier.tier })) + "</span>"
        + (sur ? "<span>" + echapper(t("surCetteCarte",
            { wr: virgule(sur.wr.toFixed(1)) })) + "</span>" : "")
        + "</span>"
        + '<span class="why">' + echapper(premier.raison) + "</span>"
        + (cote ? "</div>" : "</button>");

  if (cote) return html;

  /* Les remplaçants ont fait trois allers-retours, et voici pourquoi.
     ----------------------------------------------------------------------
     Trois lignes pleines avec leur raison : 195 px, ils poussaient la saisie
     hors de l'écran. Réduits à une bande qui glisse : la place gagnée, mais
     la phrase perdue — or c'est elle qui permet de choisir entre eux.

     Mesuré depuis : une fois l'écran vraiment rangé, il restait environ
     300 px de vide au milieu. La place existait, elle était simplement
     entassée là où elle ne servait à rien. Elle leur revient, la phrase
     avec — et le taux tombe en colonne à droite, ce à quoi servent des
     chiffres alignés. */
  html += '<div class="listes" aria-label="' + echapper(t("sinon")) + '">';

  liste.slice(1).forEach(function (x) {
    var s = surLaCarte(x.k, carteActive());
    /* Quand la seule chose à dire est le rang sur la carte, la phrase
       répéterait le taux affiché juste à droite — et avec deux décimales
       contre une, ce qui se lit comme deux chiffres différents. On garde
       alors le rang seul ; sinon la phrase, qui dit quelque chose. */
    var sous = (x.raisonEstLeRang && s) ? t("rangCarte", { rang: s.rang }) : x.raison;
    html += '<button class="autre" data-act="detail">'
          + portrait(x.b, 38, false)
          + '<span class="txt"><span class="n">' + echapper(x.nom) + "</span>"
          + '<span class="p">' + echapper(sous) + "</span></span>"
          + '<span class="v">'
          + echapper(s ? virgule(s.wr.toFixed(1)) + " %" : t("tier", { tier: x.tier }))
          + "</span></button>";
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

/* Les parts d'un score, dans l'ordre où elles se lisent. La clé sert aussi
   de classe CSS : une couleur par nature de point, et une seule fois. */
var PARTS_SCORE = ["tier", "carte", "ennemis", "allies", "risque"];

/* Ce qui compose un score, et de combien. Les points s'additionnent
   exactement — 82 + 15 + 12 − 2 = 107 — donc on peut le dessiner sans rien
   inventer : c'est une décomposition juste, pas une estimation. */
function partsDuScore(x) {
  var positives = [], negatives = [], total = 0;
  PARTS_SCORE.forEach(function (cle) {
    var v = Math.round(x.detail[cle] || 0);
    if (!v) return;
    total += Math.abs(v);
    (v > 0 ? positives : negatives).push({ cle: cle, valeur: v });
  });
  /* Les négatives en dernier : ce qu'on perd se lit au bout de ce qu'on
     gagne, pas au milieu. */
  return { liste: positives.concat(negatives), total: total };
}

/* Le libellé traduit d'une part. */
function nomPart(cle) {
  return t({ tier: "libTier", carte: "libCarte", ennemis: "libEnnemis",
             allies: "libAllies", risque: "libRisque" }[cle]);
}

function ligneAnalyse(x, rang, ampleurMax) {
  var parts = partsDuScore(x);

  /* La longueur totale de la barre dit l'ampleur du calcul ; ses parts
     disent d'où vient le score. Sans la première, dix barres de même
     longueur pour 107, 105 et 102 laisseraient croire que les trois se
     valent — une barre normalisée qui ressemble à une barre de score est un
     mensonge par la forme. */
  var largeur = ampleurMax > 0
    ? Math.max(6, Math.round((parts.total / ampleurMax) * 100)) : 0;

  var html = '<article class="analyse' + (rang === 1 ? " premier" : "") + '">'
           + '<div class="tete">'
           + '<span class="rang">' + rang + "</span>"
           + portrait(x.b, 34, false)
           + '<span class="nom">' + echapper(x.nom) + "</span>"
           + '<span class="tier">' + echapper(t("tier", { tier: x.tier })) + "</span>"
           + '<span class="score"><b>' + Math.round(x.score) + "</b>"
           + '<i class="lu">' + echapper(t("libScore")) + "</i></span>"
           + "</div>";

  if (parts.total) {
    html += '<span class="piste-jauge"><span class="jauge-score" style="width:'
          + largeur + '%">';
    parts.liste.forEach(function (p) {
      var pourcent = (Math.abs(p.valeur) / parts.total) * 100;
      html += '<i class="part-' + p.cle + (p.valeur < 0 ? " retire" : "")
            + '" style="width:' + pourcent.toFixed(2) + '%"></i>';
    });
    html += "</span></span>";

    html += '<div class="calcul">';
    parts.liste.forEach(function (p) {
      html += '<span class="' + (p.valeur > 0 ? "plus" : "moins") + '">'
            + '<b class="part-' + p.cle + (p.valeur < 0 ? " retire" : "")
            + '" aria-hidden="true"></b>'
            + echapper(nomPart(p.cle)) + " "
            + (p.valeur > 0 ? "" : "−") + Math.abs(p.valeur) + "</span>";
    });
    html += "</div>";
  }

  /* La première raison est celle qui a été retenue pour le conseil : elle se
     lit en clair, les autres en retrait. */
  x.raisons.forEach(function (r, i) {
    html += i === 0
      ? '<p class="pourquoi">' + echapper(r) + "</p>"
      : (i === 1 ? '<ul class="raisons"><li>' : "<li>") + echapper(r) + "</li>";
  });
  if (x.raisons.length > 1) html += "</ul>";

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

  /* L'échelle des barres est commune à toute la liste, sinon comparer deux
     lignes ne voudrait rien dire. On prend la plus grande ampleur affichée,
     pas un maximum théorique : c'est un écart réel entre ces brawlers-là. */
  var ampleurMax = 0;
  liste.forEach(function (x) {
    ampleurMax = Math.max(ampleurMax, partsDuScore(x).total);
  });

  /* Le conteneur porte la mise en page : une colonne partout, deux quand
     l'écran est large et bas — un téléphone couché, la position où l'on joue,
     et la pire case du tableau avec près de six écrans à faire défiler. */
  html += '<div class="classement">';
  liste.forEach(function (x, i) { html += ligneAnalyse(x, i + 1, ampleurMax); });
  return html + "</div>";
}


/* ============ Les picks saisis, deux densités ============
   Le mode rapide se joue contre le chrono : les trois listes tiennent en
   deux rangées, pour que le nom conseillé et la saisie restent visibles
   ensemble. Le mode analyse se lit sans chrono, mais son contexte était
   sous dix fiches — il remonte donc tout en haut, en bande d'une ligne. */

/* Une seule saisie pour les deux modes.
   ------------------------------------------------------------------------
   Il y en avait deux : des pastilles avec le nom écrit pour le mode rapide,
   et une bande de portraits nus pour le mode analyse. Deux dessins pour la
   même chose, donc deux fois les corrections — et celui du mode analyse
   avait un défaut que l'autre n'avait pas : ses tuiles se RECOUVRAIENT de
   10 px, cinq fois par écran (mesuré), parce que sa zone tactile de 40 px
   venait d'une marge négative de 7 px que l'écart entre éléments ne
   compensait pas.

   Elles n'en font plus qu'une. Trois aides ne servaient plus qu'à l'ancienne
   version — pastille(), jetonBan(), boutonAjout() — et sont parties avec. */
function blocSaisieCompacte() {
  /* Trois intitulés en capitales grises espacées, chacun sur sa ligne, et
     sous chacun une rangée de pastilles de largeurs toutes différentes :
     six lignes pour trois informations, et rien qui s'aligne.

     Une rangée par liste. L'intitulé passe en minuscules dans une colonne de
     largeur fixe — c'est elle qui met les portraits en colonne droite, ce
     qui manquait le plus. Un seul « + » par rangée : quatre carrés en
     pointillés vides faisaient formulaire à remplir, alors qu'un compte dit
     la même chose sans occuper l'écran. */
  function rangee(cleLibelle, cles, classe, actionRetirer, actionAjouter,
                  maximum, fin) {
    var html = '<div class="r' + (classe ? " " + classe : "") + '">'
             + '<span class="cle">' + echapper(t(cleLibelle)) + "</span>";
    cles.forEach(function (cle) {
      html += '<button class="t" data-act="' + actionRetirer + '" data-v="' + cle
            + '" title="' + echapper(t("retirer", { nom: nomBrawler(cle) })) + '">'
            + portrait(brawler(cle), 36, false)
            + '<span class="croix" aria-hidden="true">✕</span></button>';
    });
    if (cles.length < maximum) {
      html += '<button class="plus" data-act="' + actionAjouter
            + '" title="' + echapper(t("ajouter")) + '">+</button>';
    }
    return html + (fin || "") + "</div>";
  }

  /* « Nouveau draft » se range au bout de la première rangée : c'est un geste
     rare, il ne mérite pas une ligne à lui. */
  var relance = '<button class="b alt sm relancer" data-act="reset">'
              + echapper(t("nouveauDraft")) + "</button>";
  /* Le compte s'affiche TOUJOURS, y compris à zéro. Une fois les six bans
     posés le « + » disparaît de lui-même, et sans le compte plus rien
     n'expliquait pourquoi : « 0 restants » est justement la réponse. */
  var compte = '<span class="reste">'
             + echapper(t("bansRestants", { n: MAX_BANS - bans.length }))
             + "</span>";

  return '<div class="etat">'
       + rangee("saisieFace", ennemis, "", "rme", "addE", MAX_ENNEMIS, relance)
       + rangee("saisieAvec", allies, "allie", "rma", "addA", MAX_ALLIES)
       + rangee("saisieBans", bans, "ban", "rmb", "addB", MAX_BANS, compte)
       + "</div>";
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
  /* Même intitulé que la saisie : en minuscules, sans capitales espacées.
     Sept intitulés criés sur un écran, c'était sept fois personne. */
  var html = '<div class="titre-doux">' + echapper(t("aBannir")) + "</div>";
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
    html += blocSaisieCompacte();
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
