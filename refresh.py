#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
refresh.py — régénère les blocs de données de donnees.js.

Une seule commande, à relancer à chaque nouvelle saison :

    python3 refresh.py --tout

Le script ne dépend que de la bibliothèque standard : ni pip, ni node, ni
navigateur headless. Il respecte robots.txt, met en cache les réponses sur
disque et espace ses requêtes.

Il n'invente jamais de valeur. Quand une source est inaccessible ou que sa
structure a changé, il le dit, laisse le bloc concerné inchangé et sort en
erreur — de sorte qu'un donnees.js à moitié rempli ne puisse pas passer
pour un donnees.js à jour.

  --counters   table de matchups        (brawlcalculator.com/counters/)
  --cartes     pool + classements       (brawlcalculator.com/maps/)
  --synergie   duos gagnants            (brawlstats.net — non vérifié)
  --assets     images en local          (api.brawlapi.com puis brawltime)
  --tout       tout ce qui précède

Voir DONNEES.md pour l'état de vérification de chaque source.
"""

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser

RACINE = os.path.dirname(os.path.abspath(__file__))
# Seul fichier réécrit : toutes les données de l'app y sont regroupées.
FICHIER_DONNEES = os.path.join(RACINE, "donnees.js")
CACHE = os.path.join(RACINE, ".cache")
DONNEES = os.path.join(RACINE, "data")
ASSETS = os.path.join(RACINE, "assets")

UA = ("LeManager/1.0 (outil personnel de draft Brawl Stars ; "
      "usage non commercial ; contact via le dépôt GitHub)")

BASE_CALC = "https://brawlcalculator.com"
BASE_STATS = "https://brawlstats.net"
# L'API donne les vraies adresses d'image. Les deux motifs ci-dessous sont
# reconstruits à partir du nom : ils ne servent que si l'API ne répond pas,
# et ils échouent sur les brawlers récents ou aux noms inhabituels.
API_BRAWLERS = "https://api.brawlapi.com/v1/brawlers"
API_EVENTS = "https://api.brawlapi.com/v1/events"
API_MAPS = "https://api.brawlapi.com/v1/maps"
API_MODES = "https://api.brawlapi.com/v1/gamemodes"
IMG_BRAWLER = "https://media.brawltime.ninja/brawlers/{slug}/avatar.png?size=160"
IMG_CARTE = "https://media.brawltime.ninja/maps/{id}.png?size=200"
# Adresse devinee, jamais confirmee : a n'essayer qu'en dernier, et a
# retirer si elle se revele fausse comme l'equivalent brawler l'etait.
IMG_CARTE_ALT = "https://cdn.brawlify.com/maps/regular/{id}.png"

# Modes classés, dans l'ordre d'affichage de l'app. La clé de droite est
# celle qu'emploie brawlcalculator dans ses URL et ses intitulés.
MODES = {
    "brawlBall": ("Brawl Ball", ["brawl ball", "brawlball"]),
    "bounty": ("Prime", ["bounty"]),
    "knockout": ("Hors-jeu", ["knockout", "knock out"]),
    "gemGrab": ("Razzia de gemmes", ["gem grab", "gemgrab"]),
    "heist": ("Braquage", ["heist"]),
    "hotZone": ("Zone réservée", ["hot zone", "hotzone"]),
}
CARTES_PAR_MODE = 3          # le pool classé en compte 3 par mode, soit 18
SEUIL_USERATE = 0.3          # en dessous, c'est du bruit statistique
COUVERTURE_MIN = 100         # sur 105 brawlers, critère du brief
PART_VIDES_MAX = 0.25        # au-delà, ce n'est plus une donnée maigre mais
                             # un parseur cassé : on refuse d'écrire
ABANDON_APRES = 10           # images ratées d'affilée avant de conclure au réseau coupé

ERREURS = []


def clef(nom):
    """Même normalisation que la fonction clef() de outils.js."""
    return re.sub(r"[^a-z0-9]", "", str(nom or "").lower())


def slug_cdn(nom):
    """Même normalisation que slugCdn() de outils.js."""
    return re.sub(r"[^a-z0-9-]", "_", str(nom).lower())


def note(msg):
    print("  " + msg)


def souci(msg):
    ERREURS.append(msg)
    print("  ⚠ " + msg, file=sys.stderr)


def duree(secondes):
    """« 45 s », « 2 min 10 s »."""
    secondes = int(secondes)
    if secondes < 60:
        return "%d s" % secondes
    return "%d min %02d s" % (secondes // 60, secondes % 60)


def avancement(fait, total, depart, suffixe=""):
    """Une ligne d'avancement pendant les longues boucles de téléchargement.

    Sans ça, le script affiche un titre puis se tait plusieurs minutes, et
    rien ne distingue « ça travaille » de « c'est planté ».

    Le temps restant est extrapolé du rythme réellement observé depuis le
    début de la boucle, pas d'une constante : il se corrige tout seul quand
    les pages arrivent du cache et défilent d'un coup. C'est une estimation
    et pas une mesure — d'où le « ~ », qui doit rester.
    """
    ecoule = time.time() - depart
    reste = ""
    if fait and ecoule > 2 and fait < total:
        reste = " — reste ~" + duree(ecoule / fait * (total - fait))
    note("%d/%d%s%s" % (fait, total, suffixe, reste))


# --- Garde-fous : ne jamais remplacer une donnée correcte par une pire -----
#
# Quand un site change de mise en page, il ne renvoie pas d'erreur : il
# renvoie une page que le parseur ne reconnaît plus, donc une poignée de
# résultats au lieu de zéro. Sans ces deux tests, donnees.js est écrasé par
# le peu récolté et le travail des relevés précédents est perdu.
# En cas de doute on garde l'existant : une donnée un peu vieille vaut
# toujours mieux qu'une donnée amputée.

def pool_appauvri(nouvelles, anciennes):
    """Le relevé ramène-t-il moins que ce qui est déjà en place ?"""
    return bool(anciennes) and len(nouvelles) < len(anciennes)


def parseur_casse(nb_vides, total):
    """Une part anormale de pages n'a-t-elle rien donné ?"""
    return bool(total) and nb_vides > PART_VIDES_MAX * total


# ---------------------------------------------------------------------------
# Réseau : cache disque, politesse, robots.txt
# ---------------------------------------------------------------------------

class Reseau:
    def __init__(self, delai=1.5, ttl_jours=7, cache=True):
        self.delai = delai
        self.ttl = ttl_jours * 86400
        self.cache = cache
        self.dernier = {}
        self.robots = {}
        os.makedirs(CACHE, exist_ok=True)

    def _chemin_cache(self, url):
        h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
        hote = urllib.parse.urlparse(url).netloc.replace(":", "_")
        d = os.path.join(CACHE, hote)
        os.makedirs(d, exist_ok=True)
        return os.path.join(d, h + ".bin")

    def autorise(self, url):
        """robots.txt du domaine, mis en cache le temps du processus."""
        p = urllib.parse.urlparse(url)
        racine = p.scheme + "://" + p.netloc
        if racine not in self.robots:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(racine + "/robots.txt")
            try:
                brut = self._brut(racine + "/robots.txt", robots=True)
                rp.parse(brut.decode("utf-8", "replace").splitlines())
            except Exception as e:
                # Pas de robots.txt lisible : on considère l'accès permis,
                # mais on garde le délai entre requêtes.
                note("robots.txt illisible sur %s (%s) — on continue poliment"
                     % (p.netloc, e.__class__.__name__))
                rp = None
            self.robots[racine] = rp
        rp = self.robots[racine]
        return True if rp is None else rp.can_fetch(UA, url)

    def _brut(self, url, robots=False):
        """Requête HTTP nue, sans robots.txt ni cache."""
        hote = urllib.parse.urlparse(url).netloc
        attente = self.delai - (time.time() - self.dernier.get(hote, 0))
        if attente > 0:
            time.sleep(attente)
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en,fr;q=0.8",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
        finally:
            self.dernier[hote] = time.time()
        return data

    def get(self, url, binaire=False):
        """Renvoie le contenu de l'URL, depuis le cache si assez récent."""
        chemin = self._chemin_cache(url)
        if self.cache and os.path.exists(chemin):
            if time.time() - os.path.getmtime(chemin) < self.ttl:
                data = open(chemin, "rb").read()
                return data if binaire else data.decode("utf-8", "replace")

        if not self.autorise(url):
            raise PermissionError("robots.txt interdit %s" % url)

        data = self._brut(url)
        with open(chemin, "wb") as f:
            f.write(data)
        return data if binaire else data.decode("utf-8", "replace")


# ---------------------------------------------------------------------------
# Analyse HTML : on aplatit la page en une suite d'événements, puis on
# découpe par titres. Aucun sélecteur CSS rigide, pour survivre à une
# refonte cosmétique du site.
# ---------------------------------------------------------------------------

class Aplatisseur(HTMLParser):
    """Produit une liste d'événements ('titre'|'lien'|'texte', valeur, href)."""

    TITRES = {"h1", "h2", "h3", "h4"}
    IGNORE = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.evenements = []
        self.pile = []
        self.muet = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.IGNORE:
            self.muet += 1
            return
        if tag in self.TITRES:
            self.pile.append(("titre", None))
            self.evenements.append(["ouvre-titre", "", None])
        elif tag == "a":
            href = dict(attrs).get("href", "")
            self.pile.append(("lien", href))
            self.evenements.append(["ouvre-lien", "", href])

    def handle_endtag(self, tag):
        if tag in self.IGNORE:
            self.muet = max(0, self.muet - 1)
            return
        if tag in self.TITRES or tag == "a":
            if self.pile:
                self.pile.pop()
            self.evenements.append(["ferme", "", None])

    def handle_data(self, data):
        if self.muet:
            return
        t = " ".join(data.split())
        if t:
            self.evenements.append(["texte", t, None])


def aplatir(html):
    """Renvoie une liste de blocs : {'type','texte','href'}.

    'titre' pour un h1..h4, 'lien' pour un <a href>, 'texte' pour le reste.
    Les textes consécutifs sont fusionnés."""
    p = Aplatisseur()
    p.feed(html)
    blocs, ctx = [], []
    tampon = []

    def vider():
        if tampon:
            t = " ".join(tampon).strip()
            if t:
                blocs.append({"type": "texte", "texte": t, "href": None})
            tampon.clear()

    for kind, val, href in p.evenements:
        if kind == "ouvre-titre":
            vider()
            ctx.append(["titre", None, []])
        elif kind == "ouvre-lien":
            vider()
            ctx.append(["lien", href, []])
        elif kind == "ferme":
            if ctx:
                typ, href2, morceaux = ctx.pop()
                t = " ".join(morceaux).strip()
                cible = ctx[-1][2] if ctx else None
                blocs.append({"type": typ, "texte": t, "href": href2})
                if cible is not None:
                    cible.append(t)
        elif kind == "texte":
            if ctx:
                ctx[-1][2].append(val)
            else:
                tampon.append(val)
    vider()
    return blocs


def sections(blocs, motif):
    """Blocs suivant chaque titre correspondant au motif, jusqu'au titre suivant."""
    rx = re.compile(motif, re.I)
    out, prise = [], None
    for b in blocs:
        if b["type"] == "titre":
            if prise is not None:
                out.append(prise)
                prise = None
            if rx.search(b["texte"] or ""):
                prise = []
        elif prise is not None:
            prise.append(b)
    if prise is not None:
        out.append(prise)
    return out


# ---------------------------------------------------------------------------
# Traduction des phrases d'explication
# ---------------------------------------------------------------------------

class Traducteur:
    """Phrases d'explication, dans les langues de l'app.

    La source (brawlcalculator) est en anglais. Chaque phrase devient donc
    un objet {"en": original, "fr": ..., "es": ...}, où seules les langues
    réellement traduites figurent — l'app sert l'anglais en repli.

    Le script ne traduit pas tout seul : il réutilise data/traductions.json
    et dépose les phrases inconnues dans data/a_traduire.json.

    Format de data/traductions.json :
        {"English sentence": {"fr": "Phrase française", "es": "Frase"}}
    """

    LANGUES = ("fr", "es")

    def __init__(self):
        self.fichier = os.path.join(DONNEES, "traductions.json")
        os.makedirs(DONNEES, exist_ok=True)
        self.table = {}
        if os.path.exists(self.fichier):
            try:
                self.table = json.load(open(self.fichier, encoding="utf-8"))
            except Exception as e:
                souci("traductions.json illisible (%s), on repart de zéro" % e)
        self.manquantes = {}

    def __call__(self, phrase):
        original = " ".join(str(phrase).split())
        if not original:
            return {}

        out = {"en": original}
        connues = self.table.get(original) or {}
        if isinstance(connues, str):      # ancien format : une seule langue
            connues = {"fr": connues}

        absentes = []
        for code in self.LANGUES:
            if connues.get(code):
                out[code] = connues[code]
            else:
                absentes.append(code)
        if absentes:
            self.manquantes[original] = absentes
        return out

    def enregistrer(self):
        json.dump(self.table, open(self.fichier, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1, sort_keys=True)

        cible = os.path.join(DONNEES, "a_traduire.json")
        attente = {p: {c: "" for c in codes}
                   for p, codes in sorted(self.manquantes.items())}
        json.dump(attente, open(cible, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)

        if attente:
            note("%d phrases sans traduction → %s"
                 % (len(attente), os.path.relpath(cible, RACINE)))
            note("  elles resteront en anglais dans l'app. Pour les traduire :")
            note("  remplis les valeurs vides, recopie le tout dans "
                 "data/traductions.json, relance le script.")


# ---------------------------------------------------------------------------
# Tâche 2 — table de matchups
# ---------------------------------------------------------------------------

def slug_depuis_href(href):
    """/counters/mortis/ → mortis"""
    m = re.search(r"/counters/([^/?#]+)/?", href or "")
    return m.group(1).lower() if m else None


def scraper_counters(net, tr):
    print("\n[2] Table de matchups — brawlcalculator.com")
    try:
        index = net.get(BASE_CALC + "/counters/")
    except Exception as e:
        souci("index des counters inaccessible (%s) — COUNTERS reste inchangé. "
              "Si c'est un 403, le site refuse le script : voir DONNEES.md" % e)
        return None
    blocs = aplatir(index)

    fiches = {}
    for b in blocs:
        if b["type"] != "lien":
            continue
        s = slug_depuis_href(b["href"])
        if s and b["texte"]:
            fiches[s] = b["texte"]
    if len(fiches) < COUVERTURE_MIN:
        souci("l'index ne liste que %d brawlers (attendu ≥ %d) — la structure "
              "de la page a probablement changé, voir --debug counters"
              % (len(fiches), COUVERTURE_MIN))
        return None
    note("%d fiches repérées dans l'index" % len(fiches))

    table, vides = {}, []
    depart = time.time()
    for i, (s, nom) in enumerate(sorted(fiches.items()), 1):
        if i % 10 == 0:
            avancement(i, len(fiches), depart,
                       " — %d matchup(s)" % sum(len(v["perd"]) + len(v["bat"])
                                                for v in table.values()))
        url = "%s/counters/%s/" % (BASE_CALC, s)
        try:
            page = net.get(url)
        except Exception as e:
            souci("%s : %s" % (url, e))
            continue

        pb = aplatir(page)
        perd = extraire_matchups(pb, r"best counters? to\b", tr)
        bat = extraire_matchups(pb, r"is a strong pick against\b", tr)
        if not perd and not bat:
            vides.append(s)
        table[clef(nom)] = {"perd": perd, "bat": bat}

    avancement(len(fiches), len(fiches), depart)

    if vides:
        souci("%d fiches sans aucun matchup (ex. %s) — titres introuvables, "
              "la mise en page a peut-être changé" % (len(vides), ", ".join(vides[:5])))
    # Même raisonnement que pour les cartes : quand la majorité des fiches
    # ne donne rien, ce n'est pas la donnée qui est maigre, c'est le parseur
    # qui ne reconnaît plus la page. Écrire ce résultat effacerait une table
    # correcte au profit d'une table vide.
    if parseur_casse(len(vides), len(fiches)):
        souci("%d fiches vides sur %d : COUNTERS reste inchangé plutôt que "
              "d'être écrasé par un relevé incomplet — voir --debug counters"
              % (len(vides), len(fiches)))
        return None
    note("%d brawlers dans la table" % len(table))
    return table


def extraire_matchups(blocs, motif_titre, tr):
    """Liens /counters/X/ d'une section, avec la phrase qui suit chacun."""
    out, vus = [], set()
    for sec in sections(blocs, motif_titre):
        courant = None
        for b in sec:
            if b["type"] == "lien":
                s = slug_depuis_href(b["href"])
                if s and b["texte"]:
                    courant = clef(b["texte"])
                    if courant not in vus:
                        vus.add(courant)
                        out.append([courant, {}])
                else:
                    courant = None
            elif b["type"] == "texte" and courant and out and out[-1][0] == courant:
                if not out[-1][1] and len(b["texte"]) > 12:
                    out[-1][1] = tr(b["texte"])
    return [[k, p] for k, p in out if p] or [[k, p] for k, p in out]


# ---------------------------------------------------------------------------
# Tâches 4 et 5 — pool de cartes et classements par carte
# ---------------------------------------------------------------------------

# Titres qui introduisent un classement de brawlers sur une fiche de carte.
# Au 01/08/2026 brawlcalculator titre « S tier — best picks », « A tier —
# strong picks », « B tier — solid picks ». Les formulations précédentes sont
# gardées : elles ne coûtent rien et le site peut y revenir.
#
# « Best bans » ne doit surtout PAS correspondre : c'est une autre liste, et
# la confondre ferait conseiller de prendre les brawlers à bannir.
MOTIF_CLASSEMENT = (r"\b(?:best|top|strong|solid)\s+(?:picks?|brawlers?)\b"
                    r"|\branked\s+picks?\b|\btier\s+list\b")

TOP_PAR_CARTE = 8            # BONUS_CARTE de moteur.js en compte 8


def nom_depuis_page(blocs, defaut):
    """Le nom de la carte, pris sur son premier titre.

    Le libellé de l'index accole le mode au nom — « Backyard Bowl Brawl
    Ball » — alors que la fiche titre « Backyard Bowl ». Se fier à l'index
    donne un nom qui ne correspond à aucune carte connue, et fait donc perdre
    l'identifiant de vignette au passage.

    Le libellé de l'index reste utile pour reconnaître le mode : il le
    contient justement. On garde donc les deux, chacun pour son usage.
    """
    for b in blocs:
        if b["type"] == "titre" and (b["texte"] or "").strip():
            return b["texte"].strip()
    return defaut


def classement_depuis_page(blocs):
    """Les brawlers classés d'une fiche de carte, du meilleur au moins bon.

    Les sections sont lues dans l'ordre du document, donc S puis A puis B :
    le rang est porté par la position, pas par un score. Un même brawler cité
    dans deux sections n'est gardé qu'à sa meilleure place.
    """
    top = []
    vus = set()
    for sec in sections(blocs, MOTIF_CLASSEMENT):
        for b in sec:
            if b["type"] == "lien" and b["texte"]:
                k = clef(b["texte"])
                if k and k not in vus:
                    vus.add(k)
                    top.append([b["texte"], None])
    return top[:TOP_PAR_CARTE]


def mode_depuis_texte(texte):
    t = (texte or "").lower()
    for cle, (_, motifs) in MODES.items():
        for m in motifs:
            if m in t:
                return cle
    return None


def restreindre_au_pool(liens, anciennes):
    """Ne garder que les cartes du pool déjà connu.

    Le site liste toutes les cartes jamais publiées — 147 au 02/08/2026 —
    alors que la rotation classée en compte 18. Aucune source automatique ne
    dit lesquelles : l'API des événements de brawlapi répond bien, mais ses
    listes « active » et « upcoming » sont vides. Le pool reste donc tenu à
    la main dans donnees.js, et le script se contente de le rafraîchir.

    Le libellé de l'index accole le mode au nom (« Center Stage Brawl
    Ball »), d'où la comparaison par préfixe. Elle est volontairement large :
    une carte retenue à tort sera écartée plus tard, quand le titre de sa
    fiche ne correspondra à aucun nom connu. Trop large ici coûte une requête,
    trop étroit ferait disparaître une carte.
    """
    connus = {clef(c["nom"]) for c in anciennes}
    if not connus:
        return liens, connus
    return ({s: nom for s, nom in liens.items()
             if any(clef(nom).startswith(k) for k in connus)}, connus)


def scraper_cartes(net, tr, anciennes):
    print("\n[4+5] Pool de cartes — brawlcalculator.com")
    try:
        index = net.get(BASE_CALC + "/maps/")
    except Exception as e:
        souci("index des cartes inaccessible : %s" % e)
        return None

    liens = {}
    for b in aplatir(index):
        if b["type"] == "lien":
            m = re.search(r"/maps/([^/?#]+)/?", b["href"] or "")
            if m and b["texte"]:
                liens[m.group(1).lower()] = b["texte"]
    if not liens:
        souci("aucun lien /maps/ trouvé — structure changée, voir --debug maps")
        return None
    note("%d cartes repérées" % len(liens))
    liens, connus = restreindre_au_pool(liens, anciennes)
    if connus:
        note("%d à examiner, le pool connu en compte %d"
             % (len(liens), len(connus)))

    # index des anciennes entrées, pour retrouver l'identifiant d'image
    par_nom = {clef(c["nom"]): c for c in anciennes}

    cartes = []
    depart = time.time()
    for i, (s, nom) in enumerate(sorted(liens.items()), 1):
        # En tête de boucle : les « continue » plus bas sauteraient la ligne
        # d'avancement si elle était à la fin.
        if i % 20 == 0:
            avancement(i, len(liens), depart,
                       " — %d carte(s) retenue(s)" % len(cartes))
        url = "%s/maps/%s/" % (BASE_CALC, s)
        try:
            page = net.get(url)
        except Exception as e:
            souci("%s : %s" % (url, e))
            continue
        pb = aplatir(page)
        texte_page = " ".join(b["texte"] for b in pb[:40])
        # Le mode se lit sur le libellé de l'index, qui le contient ; le nom
        # se lit sur le titre de la fiche, qui ne le contient pas.
        mode = mode_depuis_texte(nom + " " + texte_page)
        if not mode:
            continue
        nom = nom_depuis_page(pb, nom)
        # Le préfixe pouvait retenir une carte homonyme ; le titre de la
        # fiche tranche.
        if connus and clef(nom) not in connus:
            continue

        top = classement_depuis_page(pb)
        if not top:
            continue

        ancienne = par_nom.get(clef(nom))
        cartes.append({
            "id": re.sub(r"[^a-z0-9]+", "-", nom.lower()).strip("-"),
            "img": ancienne["img"] if ancienne else None,
            "nom": nom,
            "mode": mode,
            "top": top,
        })

    avancement(len(liens), len(liens), depart,
               " — %d carte(s) retenue(s)" % len(cartes))

    # Une carte du pool que le site ne connaît plus est un signal, pas un
    # détail : elle est peut-être sortie de la rotation, et personne d'autre
    # ne le dira.
    trouvees = {clef(c["nom"]) for c in cartes}
    perdues = sorted(clef(c["nom"]) for c in anciennes
                     if clef(c["nom"]) not in trouvees)
    if perdues:
        souci("introuvable(s) sur le site : %s — carte(s) sortie(s) de la "
              "rotation, renommée(s), ou fiche illisible" % ", ".join(perdues))

    manquant_img = [c["nom"] for c in cartes if not c["img"]]
    if manquant_img:
        souci("identifiant d'image inconnu pour : %s — à relever une fois sur "
              "brawlify, sinon la vignette retombera sur un cadre vide"
              % ", ".join(manquant_img))

    par_mode = {}
    for c in cartes:
        par_mode.setdefault(c["mode"], []).append(c)
    for m, (nom_fr, _) in MODES.items():
        n = len(par_mode.get(m, []))
        if n < CARTES_PAR_MODE:
            souci("%s : %d carte(s) trouvée(s), %d attendues"
                  % (nom_fr, n, CARTES_PAR_MODE))
    return cartes


def appliquer_userates(cartes, chemin):
    """Filtre les classements avec un fichier de taux d'utilisation.

    Format attendu : {"center-stage": {"bolt": {"wr": 73.1, "ur": 4.2}}}.
    Tant que ce fichier n'existe pas, les classements restent des paires
    [nom, winrate] et le critère « rien sous 0,3 % » n'est pas tenu — le
    script le dit clairement plutôt que de laisser croire l'inverse."""
    if not os.path.exists(chemin):
        souci("pas de %s : taux d'utilisation inconnus, le filtre à %.1f %% "
              "n'est pas appliqué (tâche 4 incomplète)"
              % (os.path.relpath(chemin, RACINE), SEUIL_USERATE))
        return cartes
    stats = json.load(open(chemin, encoding="utf-8"))
    retires = 0
    for c in cartes:
        s = stats.get(c["id"]) or {}
        garde = []
        for entree in c["top"]:
            d = s.get(clef(entree[0]))
            if not d:
                garde.append(entree)
                continue
            if d.get("ur", 0) < SEUIL_USERATE:
                retires += 1
                continue
            garde.append([entree[0], d.get("wr", entree[1]), d["ur"]])
        c["top"] = garde[:8]
    note("%d entrées retirées sous %.1f %% de sélection" % (retires, SEUIL_USERATE))
    return cartes


# ---------------------------------------------------------------------------
# Tâche 3 — synergie alliée
# ---------------------------------------------------------------------------

def scraper_synergie(net, brawlers):
    print("\n[3] Synergie alliée — brawlstats.net (source non vérifiée)")
    try:
        page = net.get(BASE_STATS + "/")
    except Exception as e:
        souci("brawlstats.net inaccessible (%s) — SYNERGIE reste vide, "
              "l'app garde l'équilibre des rôles" % e)
        return None

    blocs = aplatir(page)
    paires = {}
    for sec in sections(blocs, r"best (partners?|teammates?)|synerg"):
        noms = [clef(b["texte"]) for b in sec
                if b["type"] == "lien" and clef(b["texte"]) in brawlers]
        chiffres = [float(m.group(1).replace(",", "."))
                    for b in sec if b["type"] == "texte"
                    for m in re.finditer(r"([+-]?\d+[.,]\d)\s*(?:%|pts?)", b["texte"])]
        if len(noms) >= 2 and len(chiffres) >= len(noms) - 1:
            base = noms[0]
            for n, v in zip(noms[1:], chiffres):
                paires["|".join(sorted([base, n]))] = round(v, 1)

    if not paires:
        souci("aucun taux de victoire en équipe exploitable sur brawlstats.net — "
              "SYNERGIE reste vide, l'app garde l'équilibre des rôles "
              "(comportement prévu par le brief, rien n'est inventé)")
        return None
    note("%d duos relevés" % len(paires))
    return paires


# ---------------------------------------------------------------------------
# Tâche 1 — images en local
# ---------------------------------------------------------------------------

class ReseauMort(Exception):
    """Trop d'échecs d'affilée : inutile d'attendre 250 fois le délai."""


def _recuperer_image(net, urls, cible, compteur):
    """Télécharge la première URL qui répond. True si le fichier est en place.

    `compteur` est une liste d'un élément : le nombre d'échecs consécutifs,
    partagé entre les deux boucles d'appel."""
    if os.path.exists(cible) and os.path.getsize(cible) > 500:
        return True

    for url in urls:
        try:
            data = net.get(url, binaire=True)
        except Exception:
            continue
        if len(data) > 500:
            with open(cible, "wb") as f:
                f.write(data)
            compteur[0] = 0
            return True

    compteur[0] += 1
    if compteur[0] >= ABANDON_APRES:
        raise ReseauMort(compteur[0])
    return False


def urls_depuis_api(net):
    """Adresses d'image officielles, par clé de brawler.

    C'est la seule source fiable : reconstruire l'adresse à partir du nom
    échoue sur les brawlers récents (Damian, Nori…) et sur les noms
    inhabituels. L'app fait déjà comme ça, le script doit en faire autant."""
    try:
        donnees = json.loads(net.get(API_BRAWLERS))
    except Exception as e:
        souci("api.brawlapi.com injoignable (%s) : on se rabat sur des "
              "adresses reconstruites à partir des noms, ce qui rate les "
              "brawlers récents" % e)
        return {}

    table = {}
    for b in donnees.get("list", []):
        cle = clef(b.get("name"))
        liens = [u for u in (b.get("imageUrl2"), b.get("imageUrl"), b.get("imageUrl3")) if u]
        if cle and liens:
            table[cle] = {"urls": liens, "nom": b["name"]}
    note("%d adresses d'image fournies par l'API" % len(table))
    return table


def telecharger_assets(net, noms, ids_cartes):
    print("\n[1] Images en local")
    api = urls_depuis_api(net)

    # Les tier lists retardent toujours d'un brawler ou deux sur le jeu.
    # L'app nomme ses fichiers d'après l'API : si on ne téléchargeait que les
    # noms des tier lists, les brawlers récents (Wendy…) resteraient en 404
    # dans assets/ et repartiraient chercher le CDN à chaque affichage.
    connus = {clef(n) for n in noms}
    en_plus = [fiche["nom"] for cle, fiche in sorted(api.items())
               if cle not in connus]
    if en_plus:
        note("%d brawler(s) connus de l'API mais absents des tier lists, "
             "ajoutés au téléchargement : %s"
             % (len(en_plus), ", ".join(en_plus[:6])))
        noms = list(noms) + en_plus

    ok_b = ok_c = 0
    echecs = [0]
    interrompu = False

    dossier = os.path.join(ASSETS, "brawlers")
    os.makedirs(dossier, exist_ok=True)
    try:
        for n in noms:
            fiche = api.get(clef(n))
            s = slug_cdn(n)

            # L'API d'abord, puis les adresses devinées en dernier recours.
            urls = tuple(fiche["urls"]) if fiche else ()
            urls += (IMG_BRAWLER.format(slug=s),)

            cible = os.path.join(dossier, s + ".png")
            if not _recuperer_image(net, urls, cible, echecs):
                souci("portrait introuvable pour %s" % n)
                continue
            ok_b += 1

            # L'app nomme le fichier d'après le nom que lui donne l'API. Si
            # ce nom s'écrit autrement que dans nos tier lists, on dépose une
            # copie sous les deux orthographes plutôt que d'afficher un trou.
            if fiche and slug_cdn(fiche["nom"]) != s:
                jumeau = os.path.join(dossier, slug_cdn(fiche["nom"]) + ".png")
                if not os.path.exists(jumeau):
                    with open(cible, "rb") as src, open(jumeau, "wb") as dst:
                        dst.write(src.read())

        dossier = os.path.join(ASSETS, "maps")
        os.makedirs(dossier, exist_ok=True)
        for i in ids_cartes:
            urls = (IMG_CARTE.format(id=i), IMG_CARTE_ALT.format(id=i))
            if _recuperer_image(net, urls, os.path.join(dossier, "%s.png" % i), echecs):
                ok_c += 1
            else:
                souci("vignette introuvable pour la carte %s" % i)
    except ReseauMort as e:
        interrompu = True
        souci("%d images de suite ont échoué : on arrête là plutôt que de "
              "poursuivre %d téléchargements voués à l'échec. Vérifie ta "
              "connexion, puis relance — les images déjà récupérées sont "
              "conservées." % (e.args[0], len(noms) + len(ids_cartes)))

    note("%d/%d portraits, %d/%d vignettes%s"
         % (ok_b, len(noms), ok_c, len(ids_cartes),
            " (interrompu)" if interrompu else ""))
    if ok_b < len(noms) or ok_c < len(ids_cartes):
        note("les manquants continueront d'être chargés depuis les CDN : la "
             "chaîne de repli se fait image par image")
    # Il suffit d'un fichier local pour que la bascule vaille le coup : une
    # image absente de assets/ retombe sur le CDN toute seule.
    return ok_b + ok_c > 0


# ---------------------------------------------------------------------------
# Écriture dans donnees.js
# ---------------------------------------------------------------------------

def lire_bloc(html, nom):
    m = re.search(r"/\* @DATA:%s \*/\n(.*?)\n/\* @END:%s \*/" % (nom, nom),
                  html, re.S)
    if not m:
        raise SystemExit("marqueur @DATA:%s introuvable dans donnees.js" % nom)
    return m.group(1)


def ecrire_bloc(html, nom, contenu):
    pat = re.compile(r"(/\* @DATA:%s \*/\n).*?(\n/\* @END:%s \*/)" % (nom, nom), re.S)
    if not pat.search(html):
        raise SystemExit("marqueur @DATA:%s introuvable dans donnees.js" % nom)
    return pat.sub(lambda m: m.group(1) + contenu + m.group(2), html, count=1)


def js(valeur):
    """Sérialise en JS compact — même densité que le reste de donnees.js."""
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


def rendre_maps(cartes):
    lignes = ["var MAPS=["]
    for i, c in enumerate(cartes):
        top = ",".join("[" + ",".join(js(x) for x in e if x is not None) + "]"
                       for e in c["top"])
        lignes.append("{id:%s,img:%s,nom:%s,mode:%s,top:[%s]}%s"
                      % (js(c["id"]), c["img"] if c["img"] else "null",
                         js(c["nom"]), js(c["mode"]), top,
                         "];" if i == len(cartes) - 1 else ","))
    return "\n".join(lignes)


def rendre_counters(table):
    """Les phrases sont des objets {en, fr, es} : l'app choisit la langue."""
    lignes = ["var COUNTERS={"]
    cles = sorted(table)
    for i, k in enumerate(cles):
        v = table[k]
        perd = ",".join("[%s,%s]" % (js(a), js(b)) for a, b in v["perd"])
        bat = ",".join("[%s,%s]" % (js(a), js(b)) for a, b in v["bat"])
        lignes.append("%s:{perd:[%s],bat:[%s]}%s"
                      % (js(k), perd, bat, "};" if i == len(cles) - 1 else ","))
    return "\n".join(lignes) if cles else "var COUNTERS={};"


def rendre_synergie(paires):
    if not paires:
        return "var SYNERGIE={};"
    corps = ",".join("%s:%s" % (js(k), v) for k, v in sorted(paires.items()))
    return "var SYNERGIE={" + corps + "};"


def maj_actuelle(html):
    """Relit le bloc MAJ. Format : {cle: [date, source] | None}."""
    bloc = lire_bloc(html, "MAJ")
    out = {"tiers": None, "cartes": None, "matchups": None, "synergie": None}
    for cle in out:
        m = re.search(r'%s:\["([^"]*)","([^"]*)"\]' % cle, bloc)
        if m:
            out[cle] = [m.group(1), m.group(2)]
    m = re.search(r"SAISON=(\d+)", bloc)
    return out, (m.group(1) if m else "0")


def rendre_maj(maj, saison):
    def val(x):
        return "null" if not x else "[%s,%s]" % (js(x[0]), js(x[1]))
    return ("var MAJ={tiers:%s,\n         cartes:%s,\n         matchups:%s,\n"
            "         synergie:%s},SAISON=%s;"
            % (val(maj["tiers"]), val(maj["cartes"]), val(maj["matchups"]),
               val(maj["synergie"]), saison))


def noms_depuis_tiers(html):
    """Liste dédoublonnée des brawlers, dans l'ordre du bloc TIERS."""
    bloc = lire_bloc(html, "TIERS")
    vus, out = set(), []
    for chaine in re.findall(r'"((?:[^"\\]|\\.)*)"', bloc):
        if "," not in chaine:
            continue
        for n in chaine.split(","):
            n = n.strip()
            k = clef(n)
            if k and k not in vus:
                vus.add(k)
                out.append(n)
    return out


def ids_cartes(html):
    return re.findall(r"img:(\d+)", lire_bloc(html, "MAPS"))


def cartes_actuelles(html):
    bloc = lire_bloc(html, "MAPS")
    out = []
    for m in re.finditer(r'\{id:"([^"]+)",img:(\d+),nom:"([^"]+)",mode:"([^"]+)"', bloc):
        out.append({"id": m.group(1), "img": int(m.group(2)),
                    "nom": m.group(3), "mode": m.group(4)})
    return out


# ---------------------------------------------------------------------------
# Contrôles
# ---------------------------------------------------------------------------

def controler_counters(table, noms):
    """Critères du brief : ≥ 100 brawlers, et de quoi vérifier à la main."""
    n = len(table)
    print("\n[contrôle] couverture : %d brawlers" % n)
    if n < COUVERTURE_MIN:
        souci("couverture insuffisante : %d < %d" % (n, COUVERTURE_MIN))
    connus = {clef(x) for x in noms}
    inconnus = sorted(set(table) - connus)
    if inconnus:
        souci("clés absentes des tier lists (nom mal lu ?) : %s"
              % ", ".join(inconnus[:8]))
    echantillon = sorted(table)[:5]
    print("  5 matchups à vérifier à la main sur brawlcalculator.com :")
    for k in echantillon:
        v = table[k]
        p = ", ".join(a for a, _ in v["perd"][:3]) or "—"
        b = ", ".join(a for a, _ in v["bat"][:3]) or "—"
        print("    %-14s battu par : %-34s bat : %s" % (k, p, b))


def deboguer_carte(net):
    """Diagnostic d'une fiche de carte, tenant sur un seul écran.

    L'index des cartes peut très bien répondre pendant que les fiches, elles,
    ne se lisent plus : c'est exactement ce qui est arrivé le 01/08/2026, avec
    404 liens trouvés et 2 cartes exploitables. On va donc chercher une vraie
    fiche, et on n'affiche que ce dont dépend la lecture — les titres et le
    mode reconnu. Un vidage de 200 lignes serait plus complet, mais on ne
    pourrait ni le lire ni le montrer, donc il ne servirait à rien.
    """
    hrefs = [b["href"] for b in aplatir(net.get(BASE_CALC + "/maps/"))
             if b["type"] == "lien"
             and re.search(r"/maps/[^/?#]+/?$", b["href"] or "")]
    if not hrefs:
        raise SystemExit("aucun lien /maps/ sur l'index — voir --debug maps")
    url = urllib.parse.urljoin(BASE_CALC + "/maps/", hrefs[0])
    print("Fiche de carte : " + url)

    blocs = aplatir(net.get(url))
    titres = [b["texte"] for b in blocs if b["type"] == "titre" and b["texte"]]
    print("\n  %d titre(s) sur la page :" % len(titres))
    for t in titres[:20]:
        print("    " + t[:68])

    mode = mode_depuis_texte(" ".join(b["texte"] for b in blocs[:40]))
    print("\n  mode reconnu : %s"
          % (mode or "AUCUN  <-- le scraper abandonne la carte ici"))

    secs = sections(blocs, MOTIF_CLASSEMENT)
    print("  sections « meilleurs brawlers » : %d%s"
          % (len(secs), "" if secs else "  <-- aucun titre ne correspond"))
    top = classement_depuis_page(blocs)
    print("  classement lu (%d) : %s"
          % (len(top), ", ".join(x[0] for x in top) or "AUCUN"))

    liens = [b["texte"] for b in blocs if b["type"] == "lien" and b["texte"]]
    print("  %d lien(s), dont : %s" % (len(liens), ", ".join(liens[:8])))


def deboguer_events(net):
    """Ce que l'API des événements sait de la rotation en cours.

    Question ouverte : brawlcalculator liste 147 cartes, le pool classé en
    compte 18. Personne ne sait aujourd'hui lesquelles, et une liste tenue à
    la main périme à chaque saison. Si cette API expose le mode classé, la
    rotation devient automatique ; sinon on saura que ce n'est pas la voie.
    On mesure avant de choisir.
    """
    print("API : " + API_EVENTS)
    try:
        data = json.loads(net.get(API_EVENTS))
    except Exception as e:
        print("  injoignable : %s: %s" % (e.__class__.__name__, e))
        return

    print("  clés à la racine : %s" % ", ".join(sorted(data)[:10]))
    for cle in sorted(data):
        lot = data[cle]
        if not isinstance(lot, list):
            continue
        print("\n  %s — %d entrée(s)" % (cle, len(lot)))
        for ev in lot[:12]:
            e = ev.get("event") or {}
            print("    %-18s %-24s %s"
                  % (str(ev.get("slot", {}).get("name") or ev.get("slotId"))[:18],
                     str((e.get("mode") or {}).get("name") or e.get("mode"))[:24],
                     str(e.get("map") or "")[:34]))


def deboguer_rotation(net):
    """Cherche une source automatique pour la rotation classée.

    /v1/events répond, mais ses listes « active » et « upcoming » sont vides.
    Vide ne veut pas dire impossible : ça peut aussi vouloir dire qu'on
    regarde au mauvais endroit. On interroge donc les autres points d'entrée,
    et on affiche la réponse brute avant toute interprétation — c'est la
    seule façon de distinguer « la donnée n'existe pas » de « notre lecture
    la rate ».

    Piste principale : /v1/maps expose « disabled » et « lastActive » par
    carte. Les cartes actives récemment sont, par définition, la rotation.
    """
    for url in (API_EVENTS, API_MAPS, API_MODES):
        print("\n--- " + url)
        try:
            brut = net.get(url)
        except Exception as e:
            print("  injoignable : %s: %s" % (e.__class__.__name__, e))
            continue
        print("  %d octets reçus" % len(brut))
        try:
            data = json.loads(brut)
        except ValueError:
            print("  reponse non-JSON : " + brut[:120].replace("\n", " "))
            continue

        lot = data.get("list") if isinstance(data, dict) else None
        if not isinstance(lot, list):
            print("  brut : " + brut[:200].replace("\n", " "))
            continue

        print("  %d entrée(s), champs : %s"
              % (len(lot), ", ".join(sorted(lot[0])[:12]) if lot else "—"))
        if not lot or "lastActive" not in lot[0]:
            continue

        actives = [m for m in lot if not m.get("disabled")]
        avec_date = [m for m in lot if m.get("lastActive")]
        print("  %d non désactivée(s), %d avec lastActive non vide"
              % (len(actives), len(avec_date)))
        # Valeurs brutes : « le champ est vide » et « je le lis mal » ne se
        # distinguent qu'en regardant ce qu'il contient vraiment.
        for m in lot[:3]:
            print("    %-24s disabled=%-6s new=%-6s lastActive=%r"
                  % (str(m.get("name"))[:24], m.get("disabled"),
                     m.get("new"), m.get("lastActive")))
        if not avec_date:
            print("    -> le champ existe mais reste vide : piste sans issue")
            continue
        recentes = sorted(avec_date, key=lambda m: m["lastActive"], reverse=True)
        recent = recentes[0]["lastActive"]
        # Une rotation dure une saison ; deux semaines suffisent à la cerner.
        fenetre = [m for m in recentes
                   if not m.get("disabled") and recent - m["lastActive"] < 14 * 86400]
        print("  %d carte(s) active(s) dans les 14 derniers jours :" % len(fenetre))
        for m in fenetre[:22]:
            print("    %-26s %s" % (str(m.get("name"))[:26],
                                    (m.get("gameMode") or {}).get("name", "?")))


def deboguer_ranked(net):
    """Le site annonce-t-il lui-même la rotation classée ?

    L'API publie le catalogue complet — 404 cartes non désactivées, soit
    exactement ce que liste brawlcalculator. Ni l'une ni l'autre ne distingue
    donc le pool classé. Mais un site dédié au draft classé a de bonnes
    raisons d'avoir une page pour la rotation en cours : on cherche le lien
    plutôt que de le supposer.
    """
    for url in (BASE_CALC + "/", BASE_CALC + "/maps/"):
        print("\n--- " + url)
        try:
            blocs = aplatir(net.get(url))
        except Exception as e:
            print("  injoignable : %s: %s" % (e.__class__.__name__, e))
            continue
        titres = [b["texte"].strip() for b in blocs
                  if b["type"] == "titre" and (b["texte"] or "").strip()]
        print("  %d titre(s) :" % len(titres))
        for t in titres[:12]:
            print("    " + t[:64])
        motif = r"rank|compet|rotation|current|season|active|pool"
        pistes = []
        for b in blocs:
            if b["type"] != "lien":
                continue
            cible = (b["href"] or "") + " " + (b["texte"] or "")
            if re.search(motif, cible, re.I) and b["href"] not in pistes:
                pistes.append(b["href"])
        print("  liens « ranked / rotation » : %s"
              % (", ".join(p[:40] for p in pistes[:6]) or "aucun"))


def deboguer(net, quoi):
    """Affiche ce que le parseur voit, pour ajuster vite si le site change."""
    if quoi == "carte":
        return deboguer_carte(net)
    if quoi == "ranked":
        return deboguer_ranked(net)
    if quoi == "events":
        return deboguer_events(net)
    if quoi == "rotation":
        return deboguer_rotation(net)
    url = {"counters": BASE_CALC + "/counters/mortis/",
           "maps": BASE_CALC + "/maps/"}.get(quoi)
    if not url:
        if not str(quoi).startswith("http"):
            raise SystemExit("--debug attend 'counters', 'maps', 'carte', "
                             "ou une adresse complète (https://…)")
        url = quoi
    print("Page : " + url)
    for b in aplatir(net.get(url))[:120]:
        print("  %-6s %-28s %s" % (b["type"], (b["texte"] or "")[:28],
                                   (b["href"] or "")[:44]))


# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tout", action="store_true", help="tâches 1 à 5")
    ap.add_argument("--counters", action="store_true", help="tâche 2")
    ap.add_argument("--cartes", action="store_true", help="tâches 4 et 5")
    ap.add_argument("--synergie", action="store_true", help="tâche 3")
    ap.add_argument("--assets", action="store_true", help="tâche 1")
    ap.add_argument("--userates", default=os.path.join(DONNEES, "userates.json"),
                    help="fichier de taux d'utilisation pour le filtre à 0,3 %%")
    ap.add_argument("--delai", type=float, default=1.5, help="secondes entre requêtes")
    ap.add_argument("--ttl", type=int, default=7, help="âge max du cache, en jours")
    ap.add_argument("--sans-cache", action="store_true")
    ap.add_argument("--blanc", action="store_true", help="n'écrit pas donnees.js")
    ap.add_argument("--debug", metavar="PAGE",
                    help="'counters', 'maps', 'carte' (une fiche de carte), "
                         "'events', 'rotation' (API), 'ranked' (le site "
                         "annonce-t-il le pool), ou une adresse complète")
    a = ap.parse_args()

    net = Reseau(delai=a.delai, ttl_jours=a.ttl, cache=not a.sans_cache)

    if a.debug:
        deboguer(net, a.debug)
        return 0

    if a.tout:
        a.counters = a.cartes = a.synergie = a.assets = True
    if not any([a.counters, a.cartes, a.synergie, a.assets]):
        ap.print_help()
        return 1

    html = open(FICHIER_DONNEES, encoding="utf-8").read()
    noms = noms_depuis_tiers(html)
    maj, saison = maj_actuelle(html)
    aujourdhui = dt.date.today().strftime("%d/%m/%Y")
    tr = Traducteur()
    touche = False

    if a.cartes:
        anciennes = cartes_actuelles(html)
        cartes = scraper_cartes(net, tr, anciennes)
        if cartes and pool_appauvri(cartes, anciennes):
            souci("%d carte(s) récupérée(s) contre %d déjà en place : le pool "
                  "serait appauvri, MAPS reste inchangé. La mise en page du "
                  "site a probablement changé — voir --debug maps"
                  % (len(cartes), len(anciennes)))
            cartes = None
        if cartes:
            cartes = appliquer_userates(cartes, a.userates)
            ordre = list(MODES)
            cartes.sort(key=lambda c: (ordre.index(c["mode"]), c["nom"]))
            html = ecrire_bloc(html, "MAPS", rendre_maps(cartes))
            maj["cartes"] = [aujourdhui, "brawlcalculator.com"]
            touche = True

    if a.counters:
        table = scraper_counters(net, tr)
        if table:
            controler_counters(table, noms)
            html = ecrire_bloc(html, "COUNTERS", rendre_counters(table))
            maj["matchups"] = [aujourdhui, "brawlcalculator.com"]
            touche = True

    if a.synergie:
        paires = scraper_synergie(net, {clef(n) for n in noms})
        if paires:
            html = ecrire_bloc(html, "SYNERGIE", rendre_synergie(paires))
            maj["synergie"] = [aujourdhui, "brawlstats.net"]
            touche = True

    if a.assets:
        complet = telecharger_assets(net, noms, ids_cartes(html))
        html = ecrire_bloc(html, "ASSETS",
                           "var ASSETS_LOCAUX=%s;" % ("true" if complet else "false"))
        if not complet:
            souci("aucune image récupérée : ASSETS_LOCAUX reste à false, l'app "
                  "continue de charger les images depuis les CDN")
        touche = True

    tr.enregistrer()

    # Seuls les blocs réellement rafraîchis sont redatés : le pied de page ne
    # doit jamais annoncer comme fraîche une donnée qui n'a pas été relevée.
    # TIERS n'est pas re-scrapé par ce script, sa date reste donc manuelle.
    if touche and not a.blanc:
        html = ecrire_bloc(html, "MAJ", rendre_maj(maj, saison))
        open(FICHIER_DONNEES, "w", encoding="utf-8").write(html)
        print("\ndonnees.js réécrit.")
    elif a.blanc:
        print("\n--blanc : donnees.js laissé tel quel.")

    if ERREURS:
        print("\n%d avertissement(s) :" % len(ERREURS))
        for e in ERREURS:
            print("  - " + e)
        return 2
    print("Rien à signaler.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nInterrompu. Le cache est conservé, relancer reprendra plus vite.")
        sys.exit(130)
    except Exception as e:
        # Rien ne doit sortir en traceback brut : le script est fait pour
        # être relancé chaque saison par quelqu'un qui ne lira pas le code.
        print("\nÉchec inattendu : %s: %s" % (e.__class__.__name__, e),
              file=sys.stderr)
        print("donnees.js n'a pas été modifié. Relancer avec --debug counters "
              "ou --debug maps pour voir ce que le parseur lit.", file=sys.stderr)
        sys.exit(3)
