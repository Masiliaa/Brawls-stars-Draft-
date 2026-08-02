/* langues.js — tous les textes affichés, en français, anglais et espagnol.
   ------------------------------------------------------------------------
   Aucun texte visible ne doit être écrit ailleurs que dans ce fichier.
   Le reste du code appelle t("cle") et ne connaît que des clés.

   Pour ajouter une langue : recopier un bloc entier, traduire les valeurs,
   garder les clés identiques. Un contrôle automatique vérifie qu'aucune
   langue n'a de clé en trop ni en moins.

   {accolades} = valeur insérée à l'exécution. Les garder telles quelles.
   ------------------------------------------------------------------------ */

var LANGUES = {

  /* ====================== FRANÇAIS ====================== */
  fr: {
    nom: "Français",
    etiquette: "FR",
    decimal: ",",
    /* En français, seul ce qui dépasse 1 prend la marque du pluriel. */
    pluriel: function (n) { return n > 1; },
    txt: {
      titre: "Le Manager — draft Brawl Stars",
      changerLangue: "Changer de langue",
      choisirLangue: "Choisir la langue",
      choisirMode: "Choisir l'affichage",

      mesBrawlers: "Mes brawlers",
      retour: "Retour",

      rosterIntro1: "Coche les brawlers niveau 9 minimum que tu sais jouer. {n} coché.",
      rosterIntroN: "Coche les brawlers niveau 9 minimum que tu sais jouer. {n} cochés.",
      toutCocher: "Tout cocher",
      toutDecocher: "Tout décocher",
      chercherBrawler: "Chercher un brawler",

      choixEnnemi: "Qui est pris en face ?",
      choixAllie: "Qu'a pris ton coéquipier ?",
      choixBan: "Quel brawler est banni ?",
      chercher: "Chercher",
      chercherCarte: "Chercher une carte",
      noteResume: "D'où viennent ces chiffres",
      aucuneCarte: "Aucune carte à ce nom",
      annuler: "Annuler",

      etape1: "Étape 1",
      choisirCarte: "Choisir la carte",
      changer: "changer",
      inviteCarte: "Ouvre la carte annoncée au début du draft. Tu auras un nom tout de suite.",
      inviteRoster: "Coche d'abord tes brawlers, sinon impossible de te conseiller un perso jouable.",
      cocherMesBrawlers: "Cocher mes brawlers",
      tousBannis: "Tous tes brawlers sont bannis ou déjà pris.",
      prends: "Prends",
      tier: "Tier {tier}",
      monEquipe: "Mon équipe",
      prisEnFace: "Pris en face",
      bannis: "Bannis",
      ajouter: "+ ajouter",
      nouveauDraft: "Nouveau draft",

      raisonTier: "tier {tier} en {mode}",
      raisonCarte: "n°{rang} sur la carte · {wr} % de victoires",
      raisonCouverture: "{nom} couvre {n} de tes {total} contres connus",
      raisonBat: "bat {nom}",
      raisonPerd: "perd contre {nom}",
      raisonCycle: "{famille} contre leur {famille2}",
      raisonMauvaiseCompo: "mauvais face à leur composition",
      raisonDoubleRole: "double un rôle déjà pris par ton équipe",
      raisonCompleteRole: "complète les rôles de ton équipe",
      raisonSynergiePlus: "marche avec {nom} · +{ecart} pts de victoires en équipe",
      raisonSynergieMoins: "synergie faible avec {nom}",

      famAgression: "agression",
      famControle: "contrôle",
      famPortee: "portée",

      modeBrawlBall: "Brawl Ball",
      modeBounty: "Prime",
      modeKnockout: "Hors-jeu",
      modeGemGrab: "Razzia de gemmes",
      modeHeist: "Braquage",
      modeHotZone: "Zone réservée",

      modeRapide: "Rapide",
      modeAnalyse: "Analyse",
      changerMode: "Changer de mode d'affichage",
      libScore: "score",
      libTier: "tier",
      libCarte: "carte",
      libEnnemis: "face",
      libAllies: "équipe",
      analyseVide: "Aucun brawler disponible à analyser.",
      analyseIntro: "{n} brawlers de ton roster, classés. Le détail montre d'où vient chaque point.",
      pickDernier: "Dernier pick · personne ne répond après toi",
      pickExpose1: "1 pick adverse après le tien · privilégie la sûreté",
      pickExposeN: "{n} picks adverses après le tien · privilégie la sûreté",
      raisonExpose: "{n} brawlers le contrent, risqué tant qu'ils peuvent répondre",
      raisonDernierPick: "dernier pick : le contre ne peut plus être puni",
      libRisque: "risque",
      aBannir: "À bannir en priorité",
      raisonBanMenace: "bat {n} de tes brawlers",
      raisonBanTien: "mais tu le joues aussi",
      motBrawler: "brawler",
      motBrawlers: "brawlers",
      noteTiers: "Tiers par mode · source {source}, {date} · saison {saison}. ",
      noteTiersSansDate: "Tiers par mode · saison {saison}. ",
      noteCartes: "Classements par carte · source {source}, {date}. ",
      noteCartesSansDate: "Classements par carte. ",
      noteMatchups: "Matchups : {n} {mot} · source {source}, {date} · jugement d'experts adossé aux classements SpenLC, pas une mesure statistique. ",
      noteMatchupsSansDate: "Matchups : {n} {mot} · jugement d'experts adossé aux classements SpenLC, pas une mesure statistique. ",
      noteMatchupsAbsents: "Table de matchups absente · l'app retombe sur le cycle agression → contrôle → portée, une approximation, pas une mesure. ",
      noteSynergie: "Synergie alliée · source {source}, {date} · ajoutée à l'équilibre des rôles. ",
      noteSynergieSansDate: "Synergie alliée · ajoutée à l'équilibre des rôles. ",
      noteSynergieAbsente: "Les picks alliés servent à l'équilibre des rôles, pas à une synergie mesurée. ",
      noteApiHors: "Couleurs de rareté et classes indisponibles : l'API n'a pas répondu. ",
      noteSupercell: "Images et noms de brawlers appartiennent à Supercell. Ce contenu n'est ni affilié, ni approuvé, ni sponsorisé par Supercell — voir la ",
      lienPolicy: "Fan Content Policy"
    }
  },

  /* ====================== ENGLISH ====================== */
  en: {
    nom: "English",
    etiquette: "EN",
    decimal: ".",
    pluriel: function (n) { return n !== 1; },
    txt: {
      titre: "Le Manager — Brawl Stars draft",
      changerLangue: "Change language",
      choisirLangue: "Choose language",
      choisirMode: "Choose display",

      mesBrawlers: "My brawlers",
      retour: "Back",

      rosterIntro1: "Tick the brawlers at power 9 or above that you can play. {n} selected.",
      rosterIntroN: "Tick the brawlers at power 9 or above that you can play. {n} selected.",
      toutCocher: "Select all",
      toutDecocher: "Clear all",
      chercherBrawler: "Search for a brawler",

      choixEnnemi: "Who did they pick?",
      choixAllie: "What did your teammate pick?",
      choixBan: "Which brawler is banned?",
      chercher: "Search",
      chercherCarte: "Search a map",
      noteResume: "Where these numbers come from",
      aucuneCarte: "No map with that name",
      annuler: "Cancel",

      etape1: "Step 1",
      choisirCarte: "Choose the map",
      changer: "change",
      inviteCarte: "Open the map announced at the start of the draft. You'll get a name straight away.",
      inviteRoster: "Tick your brawlers first, otherwise there's no way to suggest one you can actually play.",
      cocherMesBrawlers: "Select my brawlers",
      tousBannis: "All your brawlers are banned or already taken.",
      prends: "Pick",
      tier: "Tier {tier}",
      monEquipe: "My team",
      prisEnFace: "Enemy picks",
      bannis: "Banned",
      ajouter: "+ add",
      nouveauDraft: "New draft",

      raisonTier: "tier {tier} in {mode}",
      raisonCarte: "#{rang} on this map · {wr}% win rate",
      raisonCouverture: "{nom} covers {n} of your {total} known counters",
      raisonBat: "beats {nom}",
      raisonPerd: "loses to {nom}",
      raisonCycle: "{famille} against their {famille2}",
      raisonMauvaiseCompo: "weak against their line-up",
      raisonDoubleRole: "duplicates a role your team already covers",
      raisonCompleteRole: "rounds out your team's roles",
      raisonSynergiePlus: "works with {nom} · +{ecart} pts team win rate",
      raisonSynergieMoins: "weak synergy with {nom}",

      famAgression: "aggression",
      famControle: "control",
      famPortee: "range",

      modeBrawlBall: "Brawl Ball",
      modeBounty: "Bounty",
      modeKnockout: "Knockout",
      modeGemGrab: "Gem Grab",
      modeHeist: "Heist",
      modeHotZone: "Hot Zone",

      modeRapide: "Quick",
      modeAnalyse: "Analysis",
      changerMode: "Change display mode",
      libScore: "score",
      libTier: "tier",
      libCarte: "map",
      libEnnemis: "enemies",
      libAllies: "team",
      analyseVide: "No brawler available to analyse.",
      analyseIntro: "{n} brawlers from your roster, ranked. The breakdown shows where every point comes from.",
      pickDernier: "Last pick · nobody answers after you",
      pickExpose1: "1 enemy pick after yours · play it safe",
      pickExposeN: "{n} enemy picks after yours · play it safe",
      raisonExpose: "{n} brawlers counter it, risky while they can still answer",
      raisonDernierPick: "last pick: the counter can no longer be punished",
      libRisque: "risk",
      aBannir: "Ban these first",
      raisonBanMenace: "beats {n} of your brawlers",
      raisonBanTien: "but you play it too",
      motBrawler: "brawler",
      motBrawlers: "brawlers",
      noteTiers: "Mode tier lists · source {source}, {date} · season {saison}. ",
      noteTiersSansDate: "Mode tier lists · season {saison}. ",
      noteCartes: "Per-map rankings · source {source}, {date}. ",
      noteCartesSansDate: "Per-map rankings. ",
      noteMatchups: "Matchups: {n} {mot} · source {source}, {date} · expert judgement based on SpenLC tier lists, not a statistical measure. ",
      noteMatchupsSansDate: "Matchups: {n} {mot} · expert judgement based on SpenLC tier lists, not a statistical measure. ",
      noteMatchupsAbsents: "No matchup table · the app falls back on the aggression → control → range cycle, an approximation, not a measure. ",
      noteSynergie: "Team synergy · source {source}, {date} · added to role balance. ",
      noteSynergieSansDate: "Team synergy · added to role balance. ",
      noteSynergieAbsente: "Ally picks only balance roles; there is no measured synergy. ",
      noteApiHors: "Rarity colours and classes unavailable: the API did not respond. ",
      noteSupercell: "Brawler images and names belong to Supercell. This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell — see the ",
      lienPolicy: "Fan Content Policy"
    }
  },

  /* ====================== ESPAÑOL ====================== */
  es: {
    nom: "Español",
    etiquette: "ES",
    decimal: ",",
    pluriel: function (n) { return n !== 1; },
    txt: {
      titre: "Le Manager — draft de Brawl Stars",
      changerLangue: "Cambiar idioma",
      choisirLangue: "Elegir idioma",
      choisirMode: "Elegir visualización",

      mesBrawlers: "Mis brawlers",
      retour: "Volver",

      rosterIntro1: "Marca los brawlers de nivel 9 o más que sabes jugar. {n} seleccionado.",
      rosterIntroN: "Marca los brawlers de nivel 9 o más que sabes jugar. {n} seleccionados.",
      toutCocher: "Marcar todos",
      toutDecocher: "Desmarcar todos",
      chercherBrawler: "Buscar un brawler",

      choixEnnemi: "¿A quién han elegido enfrente?",
      choixAllie: "¿Qué ha elegido tu compañero?",
      choixBan: "¿Qué brawler está baneado?",
      chercher: "Buscar",
      chercherCarte: "Buscar un mapa",
      noteResume: "De dónde vienen estas cifras",
      aucuneCarte: "Ningún mapa con ese nombre",
      annuler: "Cancelar",

      etape1: "Paso 1",
      choisirCarte: "Elegir el mapa",
      changer: "cambiar",
      inviteCarte: "Abre el mapa anunciado al empezar el draft. Tendrás un nombre enseguida.",
      inviteRoster: "Marca primero tus brawlers; si no, no hay forma de recomendarte uno que puedas jugar.",
      cocherMesBrawlers: "Marcar mis brawlers",
      tousBannis: "Todos tus brawlers están baneados o ya elegidos.",
      prends: "Elige",
      tier: "Tier {tier}",
      monEquipe: "Mi equipo",
      prisEnFace: "Elegidos enfrente",
      bannis: "Baneados",
      ajouter: "+ añadir",
      nouveauDraft: "Nuevo draft",

      raisonTier: "tier {tier} en {mode}",
      raisonCarte: "n.º{rang} en el mapa · {wr} % de victorias",
      raisonCouverture: "{nom} cubre {n} de tus {total} counters conocidos",
      raisonBat: "gana a {nom}",
      raisonPerd: "pierde contra {nom}",
      raisonCycle: "{famille} contra su {famille2}",
      raisonMauvaiseCompo: "flojo frente a su composición",
      raisonDoubleRole: "duplica un rol que tu equipo ya cubre",
      raisonCompleteRole: "completa los roles de tu equipo",
      raisonSynergiePlus: "funciona con {nom} · +{ecart} pts de victorias en equipo",
      raisonSynergieMoins: "poca sinergia con {nom}",

      famAgression: "agresión",
      famControle: "control",
      famPortee: "alcance",

      modeBrawlBall: "Brawl Ball",
      modeBounty: "Caza Estelar",
      modeKnockout: "Noqueo",
      modeGemGrab: "Atrapagemas",
      modeHeist: "Atraco",
      modeHotZone: "Zona Restringida",

      modeRapide: "Rápido",
      modeAnalyse: "Análisis",
      changerMode: "Cambiar modo de visualización",
      libScore: "puntuación",
      libTier: "tier",
      libCarte: "mapa",
      libEnnemis: "rivales",
      libAllies: "equipo",
      analyseVide: "Ningún brawler disponible para analizar.",
      analyseIntro: "{n} brawlers de tu roster, ordenados. El desglose muestra de dónde sale cada punto.",
      pickDernier: "Último pick · nadie responde después de ti",
      pickExpose1: "1 pick rival después del tuyo · juega seguro",
      pickExposeN: "{n} picks rivales después del tuyo · juega seguro",
      raisonExpose: "{n} brawlers lo contrarrestan, arriesgado mientras puedan responder",
      raisonDernierPick: "último pick: el counter ya no puede castigarse",
      libRisque: "riesgo",
      aBannir: "Banear primero",
      raisonBanMenace: "gana a {n} de tus brawlers",
      raisonBanTien: "pero tú también lo juegas",
      motBrawler: "brawler",
      motBrawlers: "brawlers",
      noteTiers: "Tiers por modo · fuente {source}, {date} · temporada {saison}. ",
      noteTiersSansDate: "Tiers por modo · temporada {saison}. ",
      noteCartes: "Clasificaciones por mapa · fuente {source}, {date}. ",
      noteCartesSansDate: "Clasificaciones por mapa. ",
      noteMatchups: "Enfrentamientos: {n} {mot} · fuente {source}, {date} · criterio de expertos basado en las listas de SpenLC, no una medida estadística. ",
      noteMatchupsSansDate: "Enfrentamientos: {n} {mot} · criterio de expertos basado en las listas de SpenLC, no una medida estadística. ",
      noteMatchupsAbsents: "Sin tabla de enfrentamientos · la app recurre al ciclo agresión → control → alcance, una aproximación, no una medida. ",
      noteSynergie: "Sinergia de equipo · fuente {source}, {date} · añadida al equilibrio de roles. ",
      noteSynergieSansDate: "Sinergia de equipo · añadida al equilibrio de roles. ",
      noteSynergieAbsente: "Los picks aliados solo equilibran roles; no hay sinergia medida. ",
      noteApiHors: "Colores de rareza y clases no disponibles: la API no respondió. ",
      noteSupercell: "Las imágenes y los nombres de brawlers pertenecen a Supercell. Este contenido no está afiliado, respaldado ni patrocinado por Supercell — consulta la ",
      lienPolicy: "Fan Content Policy"
    }
  }
};

var ORDRE_LANGUES = ["fr", "en", "es"];
var LANGUE_DEFAUT = "en";

/* Langue choisie, retenue d'une visite à l'autre. Clé distincte de celle du
   roster : changer de langue ne doit jamais toucher aux brawlers cochés. */
var CLE_LANGUE = "manager:langue";
var langue = LANGUE_DEFAUT;

/* Au premier lancement, on suit la langue du téléphone si on la parle. */
function langueDuNavigateur() {
  var demandees = (navigator.languages || [navigator.language || ""]);
  for (var i = 0; i < demandees.length; i++) {
    var court = String(demandees[i]).slice(0, 2).toLowerCase();
    if (LANGUES[court]) return court;
  }
  return LANGUE_DEFAUT;
}

function chargerLangue() {
  var enregistree = null;
  try { enregistree = localStorage.getItem(CLE_LANGUE); } catch (e) { /* ignoré */ }
  langue = (enregistree && LANGUES[enregistree]) ? enregistree : langueDuNavigateur();
  appliquerLangue();
}

function definirLangue(code) {
  if (!LANGUES[code]) return;
  langue = code;
  try { localStorage.setItem(CLE_LANGUE, code); } catch (e) { /* ignoré */ }
  appliquerLangue();
}

function langueSuivante() {
  var i = ORDRE_LANGUES.indexOf(langue);
  return ORDRE_LANGUES[(i + 1) % ORDRE_LANGUES.length];
}

/* Répercute la langue sur la page elle-même : indispensable pour que le
   navigateur et les lecteurs d'écran sachent quoi annoncer. */
function appliquerLangue() {
  document.documentElement.setAttribute("lang", langue);
  document.title = t("titre");
}

/* Le texte d'une clé, dans la langue courante.
   Une clé absente retombe sur l'anglais, puis s'affiche telle quelle —
   visible, donc repérable, plutôt que silencieusement vide. */
function t(cle, valeurs) {
  var texte = LANGUES[langue].txt[cle];
  if (texte === undefined) texte = LANGUES[LANGUE_DEFAUT].txt[cle];
  if (texte === undefined) return cle;

  if (valeurs) {
    Object.keys(valeurs).forEach(function (nom) {
      texte = texte.split("{" + nom + "}").join(valeurs[nom]);
    });
  }
  return texte;
}

function pluriel(n) {
  return LANGUES[langue].pluriel(n);
}

/* Le mot « brawler » accordé, pour les phrases du pied de page. */
function motBrawler(n) {
  return t(pluriel(n) ? "motBrawlers" : "motBrawler");
}

/* Les phrases d'explication de COUNTERS viennent de brawlcalculator, en
   anglais, et sont traduites au fil de l'eau. Chaque entrée est donc soit
   une chaîne unique (ancien format), soit un objet {en, fr, es} dont
   certaines langues peuvent manquer.

   On sert la langue demandée, sinon l'anglais — la langue d'origine —,
   sinon la première disponible. Mieux vaut une phrase dans la mauvaise
   langue que pas d'explication du tout. */
function phraseCounter(phrase) {
  if (!phrase) return "";
  if (typeof phrase === "string") return phrase;
  if (phrase[langue]) return phrase[langue];
  if (phrase[LANGUE_DEFAUT]) return phrase[LANGUE_DEFAUT];
  var dispo = Object.keys(phrase);
  return dispo.length ? phrase[dispo[0]] : "";
}
