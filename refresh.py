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
# Le bloc COUNTERS a quitté donnees.js : il en faisait 322 Ko sur 335, et
# l'app l'attendait avant d'afficher quoi que ce soit. Format inchangé,
# marqueurs @DATA: inchangés — seul le fichier qui les porte a changé.
FICHIER_COUNTERS = os.path.join(RACINE, "counters.js")
CACHE = os.path.join(RACINE, ".cache")
DONNEES = os.path.join(RACINE, "data")
ASSETS = os.path.join(RACINE, "assets")

UA = ("LeManager/1.0 (outil personnel de draft Brawl Stars ; "
      "usage non commercial ; contact via le dépôt GitHub)")

BASE_CALC = "https://brawlcalculator.com"
BASE_STATS = "https://brawlstats.net"
# Source d'origine des 16 cartes classées, d'après le bloc MAJ de donnees.js.
#
# Ces sites collectent en continu, via l'API officielle de Supercell, les
# historiques de combat de milliers de joueurs, puis les agrègent. Le pool
# classé n'y est déclaré nulle part : il ressort des données, ce sont les
# cartes qui apparaissent réellement dans les matchs classés du moment.
# Reproduire ça demanderait une clé API liée à une IP fixe et une collecte
# permanente. On lit donc le résultat de leur travail au lieu de le refaire.
BASE_NINJA = "https://brawltime.ninja"
RANKED_NINJA = BASE_NINJA + "/tier-list/ranked"
BASE_TOP = "https://topbrawl.com"
RANKED_TOP = BASE_TOP + "/rankeds"

# Deux sources plutôt qu'une : le pool est la seule donnée sans repli
# possible — sans lui le script ne sait plus quelles cartes lire. Un site qui
# se refait, et tout s'arrête. On essaie donc la seconde avant d'abandonner.
# La version française de la page n'est pas forcément bâtie comme l'anglaise
# — adresse relevée à la main, pas devinée. Elle est essayée en second : si
# l'anglaise donne le pool complet, on ne la sollicite pas.
RANKED_NINJA_FR = BASE_NINJA + "/fr/tier-list/ranked"
SOURCES_POOL = (("brawltime.ninja", RANKED_NINJA),
                ("brawltime.ninja (fr)", RANKED_NINJA_FR),
                ("topbrawl.com", RANKED_TOP))
# Seuil de crédibilité du pool. Volontairement bas : un relevé incomplet
# reste exploitable, et ce n'est pas ici que donnees.js est protégé — c'est
# pool_appauvri(), plus loin, qui refuse d'écrire moins que l'existant. Mis
# à 12 au départ, ce seuil a rejeté un relevé de 8 cartes parfaitement
# valides : une protection qui jette de la donnée saine est mal placée.
POOL_MIN = 6
DEFILEMENTS = 8              # paliers de descente dans une page qui se
                             # construit au fur et à mesure du défilement
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
POOL_ATTENDU = CARTES_PAR_MODE * len(MODES)      # 18
SEUIL_USERATE = 0.3          # en dessous, c'est du bruit statistique
COUVERTURE_MIN = 100         # sur 105 brawlers, critère du brief
PART_VIDES_MAX = 0.25        # au-delà, ce n'est plus une donnée maigre mais
                             # un parseur cassé : on refuse d'écrire
ABANDON_APRES = 10           # images ratées d'affilée avant de conclure au réseau coupé
ESSAIS_RALENTI = 4           # tentatives quand un hôte demande de ralentir
ATTENTE_RALENTI = 20         # secondes avant le 2e essai, doublées ensuite
PAUSE_MAX = 120              # au-delà, la source est traitée comme fermée
DELAI_RALENTI = 5.0          # nouveau rythme après un « trop de requêtes »

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
        self._pw = self._nav = None
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
        # « 429 Too Many Requests » et « 503 » ne veulent pas dire « refusé »,
        # mais « tu vas trop vite ». Abandonner à la première réponse de ce
        # genre, c'est prendre une demande de patience pour une porte fermée :
        # c'est ce qui a laissé SYNERGIE vide le 02/08/2026.
        #
        # Le serveur indique parfois combien de temps attendre (« Retry-After
        # »). Quand il le fait, on l'écoute ; sinon on double l'attente à
        # chaque essai, et on ralentit durablement l'hôte pour la suite.
        attente_suivante = ATTENTE_RALENTI
        for essai in range(1, ESSAIS_RALENTI + 1):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = r.read()
                self.dernier[hote] = time.time()
                return data
            except urllib.error.HTTPError as e:
                self.dernier[hote] = time.time()
                if e.code not in (429, 503) or essai == ESSAIS_RALENTI:
                    raise
                demande = nombre(e.headers.get("Retry-After"))
                pause = demande if demande else attente_suivante
                note("%s répond %d — on patiente %d s (essai %d/%d)"
                     % (hote, e.code, pause, essai, ESSAIS_RALENTI))
                time.sleep(min(pause, PAUSE_MAX))
                attente_suivante *= 2
                # Le rythme de départ était trop soutenu pour cet hôte : on
                # le garde plus lent jusqu'à la fin, plutôt que de retomber
                # dans le même mur à la requête suivante.
                self.delai = max(self.delai, DELAI_RALENTI)
            except Exception:
                self.dernier[hote] = time.time()
                raise

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

    def poste(self, url, corps):
        """Une requête POST qui rend du JSON. Mêmes règles que get().

        Certaines API ne répondent qu'à des POST — celle de metapick attend
        la carte et le brawler dans le corps de la requête. Tout le reste est
        identique à une lecture ordinaire : robots.txt d'abord, délai entre
        deux requêtes au même hôte, et cache disque.

        Le cache mérite une explication : une adresse ne suffit plus à
        identifier une réponse, puisque deux POST vers la MÊME adresse
        rendent des choses différentes selon leur corps. La clé de cache
        prend donc le corps avec elle. Sans ça, le premier duel relevé
        répondrait pour tous les autres — et le fichier serait faux d'une
        façon indétectable à la relecture.
        """
        empreinte = hashlib.sha1(json.dumps(corps, sort_keys=True).encode()).hexdigest()[:12]
        chemin = self._chemin_cache(url + "#post" + empreinte)
        if self.cache and os.path.exists(chemin):
            if time.time() - os.path.getmtime(chemin) < self.ttl:
                return json.loads(open(chemin, "rb").read().decode("utf-8", "replace"))

        if not self.autorise(url):
            raise PermissionError("robots.txt interdit %s" % url)

        hote = urllib.parse.urlparse(url).netloc
        attente = self.delai - (time.time() - self.dernier.get(hote, 0))
        if attente > 0:
            time.sleep(attente)
        req = urllib.request.Request(
            url, data=json.dumps(corps).encode("utf-8"),
            headers={"User-Agent": UA, "Content-Type": "application/json",
                     "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
        finally:
            self.dernier[hote] = time.time()

        with open(chemin, "wb") as f:
            f.write(data)
        return json.loads(data.decode("utf-8", "replace"))

    # --- Pages construites dans le navigateur ------------------------------
    #
    # Un site moderne n'envoie qu'un squelette et un programme JavaScript ;
    # c'est le navigateur qui bâtit le reste. urlopen() ne voit donc qu'une
    # partie du contenu — 8 cartes sur 18 sur brawltime le 02/08/2026.
    # Ouvrir un vrai Chromium sans fenêtre donne exactement ce qu'un humain
    # voit. C'est lent et lourd : réservé aux pages qui en ont besoin.

    def _navigateur(self):
        """Chromium, ouvert à la première demande et gardé ouvert ensuite.

        Le relancer à chaque page coûterait quelques secondes par page pour
        rien. Renvoie None si Playwright n'est pas installé : c'est un
        supplément, jamais une condition de fonctionnement.
        """
        if self._nav is None:
            try:
                from playwright.sync_api import sync_playwright
            except ImportError:
                return None
            self._pw = sync_playwright().start()
            # CHROME : même variable que les tests Node. Sans elle, Playwright
            # prend son Chromium à lui ; avec elle, on peut pointer un
            # Chromium déjà présent quand les versions ne s'alignent pas.
            options = {}
            executable = os.environ.get("CHROME")
            if executable:
                options["executable_path"] = executable
            # Chromium ne lit pas HTTPS_PROXY tout seul. Là où un proxy de
            # sortie est imposé (l'environnement de développement), il faut
            # le lui passer ; là où il n'y en a pas (les serveurs de GitHub),
            # cette variable est absente et rien ne change. La confiance TLS,
            # elle, est déjà réglée côté système — on ne la désactive jamais.
            proxy = os.environ.get("HTTPS_PROXY")
            if proxy:
                options["proxy"] = {"server": proxy}
            self._nav = self._pw.chromium.launch(**options)
        return self._nav

    def get_rendu(self, url):
        """La page une fois son JavaScript exécuté, ou None si impossible."""
        # Cache séparé : ce n'est pas le même contenu que la page brute.
        chemin = self._chemin_cache(url + "#rendu")
        if self.cache and os.path.exists(chemin):
            if time.time() - os.path.getmtime(chemin) < self.ttl:
                return open(chemin, "rb").read().decode("utf-8", "replace")

        nav = self._navigateur()
        if nav is None:
            return None
        if not self.autorise(url):
            raise PermissionError("robots.txt interdit %s" % url)

        hote = urllib.parse.urlparse(url).netloc
        attente = self.delai - (time.time() - self.dernier.get(hote, 0))
        if attente > 0:
            time.sleep(attente)
        page = nav.new_page(user_agent=UA)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            # « networkidle » déclarait la page prête trop tôt : elle rendait
            # moins de contenu qu'un simple téléchargement (8 cartes contre 9
            # le 02/08/2026). Beaucoup de sites ne construisent une section
            # que lorsqu'elle approche de l'écran, et un navigateur qui ne
            # descend nulle part ne la voit jamais. On descend donc, par
            # paliers, en laissant le temps à chaque section d'arriver.
            page.wait_for_timeout(2000)
            for _ in range(DEFILEMENTS):
                page.mouse.wheel(0, 3000)
                page.wait_for_timeout(500)
            page.wait_for_timeout(1500)
            html = page.content()
        finally:
            page.close()
            self.dernier[hote] = time.time()

        with open(chemin, "wb") as f:
            f.write(html.encode("utf-8"))
        return html

    def get_reseau(self, url):
        """Rend la page en notant chaque réponse qu'elle reçoit.

        C'est l'« onglet réseau » d'un navigateur, en script. Il répond à la
        première question de la hiérarchie des sources (CLAUDE.md) : d'où
        cette page tire-t-elle ses chiffres, et le robinet est-il lisible
        directement ? Le brief le demandait dès juillet (« regarde l'onglet
        réseau ») — c'est resté lettre morte faute d'outil pour le faire.

        Renvoie [{url, statut, type}], dans l'ordre d'arrivée. Rien n'est mis
        en cache : on veut la liste des appels, pas leur contenu. On observe
        les appels que fait une page qu'on a le droit de lire ; interroger
        ensuite l'un de ces robinets directement redemandera son propre
        passage par autorise()."""
        nav = self._navigateur()
        if nav is None:
            return None
        if not self.autorise(url):
            raise PermissionError("robots.txt interdit %s" % url)

        hote = urllib.parse.urlparse(url).netloc
        attente = self.delai - (time.time() - self.dernier.get(hote, 0))
        if attente > 0:
            time.sleep(attente)
        appels = []
        page = nav.new_page(user_agent=UA)

        def noter(rep):
            try:
                appels.append({"url": rep.url, "statut": rep.status,
                               "type": (rep.headers or {}).get("content-type", "")})
            except Exception:
                pass    # une réponse illisible ne vaut pas un plantage

        page.on("response", noter)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            # Même défilement que get_rendu, et pour la même raison : une
            # section construite à l'approche de l'écran ne demande ses
            # données que si on descend jusqu'à elle.
            page.wait_for_timeout(2000)
            for _ in range(DEFILEMENTS):
                page.mouse.wheel(0, 3000)
                page.wait_for_timeout(500)
            page.wait_for_timeout(1500)
        finally:
            page.close()
            self.dernier[hote] = time.time()
        return appels

    def get_rendu_onglets(self, url, onglets):
        """La page vue après avoir ouvert chacun de ses onglets.

        Charger la page ne suffisait pas : trois modes n'apparaissent jamais,
        ni au téléchargement, ni avec un navigateur qui défile. Reste une
        possibilité — leur contenu n'est construit qu'au clic sur l'onglet
        correspondant. On visite donc chaque onglet et on empile ce qu'on
        voit à chaque étape.

        Renvoie la concaténation des états successifs : peu importe qu'un
        onglet remplace le précédent, on garde une trace de tous.
        """
        nav = self._navigateur()
        if nav is None:
            return None
        if not self.autorise(url):
            raise PermissionError("robots.txt interdit %s" % url)

        page = nav.new_page(user_agent=UA)
        morceaux = []
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(2500)
            morceaux.append(page.content())
            for ancre, libelle in onglets:
                # Deux façons d'ouvrir un onglet, et rien ne dit laquelle ce
                # site emploie : l'ancre dans l'adresse, ou le clic. On tente
                # les deux, l'échec de l'une n'empêchant pas l'autre.
                try:
                    page.evaluate("h => { location.hash = h; }", "#" + ancre)
                    page.wait_for_timeout(900)
                except Exception:
                    pass
                try:
                    page.get_by_text(libelle, exact=True).first.click(timeout=2500)
                    page.wait_for_timeout(900)
                except Exception:
                    pass
                for _ in range(3):
                    page.mouse.wheel(0, 3000)
                    page.wait_for_timeout(300)
                morceaux.append(page.content())
        finally:
            page.close()
            self.dernier[urllib.parse.urlparse(url).netloc] = time.time()
        return "\n".join(morceaux)

    def fermer(self):
        """À appeler en fin de course : un Chromium oublié reste en mémoire."""
        if self._nav is not None:
            self._nav.close()
            self._nav = None
        if self._pw is not None:
            self._pw.stop()
            self._pw = None


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


# brawltime : /tier-list/mode/bounty/map/Dry-Season
#
# Le nom s'arrête sur un guillemet, un chevron, une contre-oblique ou une
# espace : hors d'une balise, l'adresse est suivie du reste du document
# (« Dry-Season">Dry Season< »), et un motif plus permissif l'avalerait.
#
# L'apostrophe, elle, fait partie des noms : « Belle's Rock ». L'exclure
# coupait la carte à « Belle », qui ne correspondait alors à rien.
RX_POOL_LONG = re.compile(r"/mode/([^/]+)/map/([^/?#\"<>\\\s]+)")
# Forme courte, pour une source qui rangerait ses cartes par mode :
# /rankeds/heist/safe-zone. Sans danger : le premier segment doit être un des
# six modes connus, sinon le lien est écarté.
RX_POOL_COURT = re.compile(r"/([A-Za-z][A-Za-z ]*)/([^/?#]+?)/?$")


def pool_depuis_liens(blocs):
    """Le pool classé, lu dans les adresses plutôt que dans la mise en page.

    Chaque lien porte tout ce qu'il faut :
        /tier-list/mode/bounty/map/Dry-Season
    Le mode et le nom sont dans l'adresse. On ne lit donc ni les titres ni la
    structure : une formulation change, une adresse beaucoup moins. C'est
    aussi ce qui permet de lire une seconde source sans tout réécrire.
    """
    vus, pool = set(), []
    for b in blocs:
        if b["type"] != "lien" or not b["href"]:
            continue
        m = RX_POOL_LONG.search(b["href"]) or RX_POOL_COURT.search(b["href"])
        if not m:
            continue
        # Le filtre, c'est le mode : seuls les six modes connus passent. Un
        # motif large ne coûte donc rien, il ne peut pas inventer de carte.
        mode = mode_depuis_texte(m.group(1))
        nom = urllib.parse.unquote(m.group(2)).replace("-", " ").strip()
        # Une adresse en minuscules ne porte pas la casse du nom. On la
        # restitue, sans toucher à un nom déjà capitalisé : « Belle's Rock »
        # deviendrait « Belle'S Rock ». Ce nom ne sert de toute façon qu'à
        # reconnaître la carte — l'affiché vient du titre de sa fiche.
        if nom.islower():
            nom = nom.title()
        if not mode or not clef(nom) or clef(nom) in vus:
            continue
        vus.add(clef(nom))
        # On garde l'adresse telle quelle : la reconstruire à partir du nom
        # est une source d'erreurs (casse, apostrophes, accents) alors que le
        # site vient de nous la donner.
        pool.append({"mode": mode, "nom": nom, "href": b["href"]})
    return pool


# topbrawl range ses fiches par identifiant numérique de carte —
# /rankeds/15000072 — et non par mode et nom. C'est le même identifiant que
# celui déjà stocké dans donnees.js pour les vignettes, ce qui permet de
# reconnaître une carte sans se fier à son nom.
RX_TOP_ID = re.compile(r"/rankeds/(\d{4,})")
# « Best Brawlers for Heist on Bridge Too Far »
RX_TOP_TITRE = re.compile(r"best\s+brawlers?\s+for\s+(.+?)\s+on\s+(.+?)\s*$", re.I)


def nombre(texte):
    """« 63.83 », « 63,83 », « 24.30 % » → float. None si ce n'en est pas un."""
    t = str(texte or "").replace(",", ".").replace("%", "").strip()
    try:
        return float(t)
    except ValueError:
        return None


def carte_topbrawl(blocs, noms_connus):
    """Une fiche topbrawl : mode, nom de carte, et classement chiffré.

    Le titre porte le mode et la carte. Le tableau, lui, se lit par
    reconnaissance : un nom de brawler connu, suivi de ses nombres. On ne
    dépend ainsi d'aucune structure de tableau — seulement du fait qu'un
    brawler s'appelle par son nom, ce qui est autrement plus stable qu'une
    mise en page.

    Renvoie {mode, nom, top:[[nom, victoires, utilisation], …]} ou None.
    """
    textes = [b["texte"].strip() for b in blocs if (b["texte"] or "").strip()]

    # Les titres visibles d'abord, le reste ensuite. Le titre d'onglet du
    # navigateur dit la même chose mais avec le nom du site en suffixe, et il
    # peut se retrouver collé au reste du document — d'où un nom de carte qui
    # déborde. Le <h1> de la page, lui, est propre et isolé.
    titres = [b["texte"].strip() for b in blocs
              if b["type"] == "titre" and (b["texte"] or "").strip()]

    mode = nom_carte = None
    for t in titres + textes:
        m = RX_TOP_TITRE.search(t)
        if m:
            mode = mode_depuis_texte(m.group(1))
            # Le titre d'onglet du navigateur porte le nom du site en
            # suffixe — « Bridge Too Far - Brawl Stars ». Le garder donnait
            # des cartes nommées ainsi dans l'app, et des identifiants du
            # genre « bridge-too-far-brawl-stars ».
            nom_carte = re.sub(r"\s*[-–—|·:]\s*brawl\s*stars\s*$", "",
                               m.group(2), flags=re.I).strip()
            break
    if not mode or not nom_carte:
        return None

    # aplatir() regroupe les textes voisins : les valeurs d'un tableau
    # arrivent dans une seule longue chaîne, pas bloc par bloc. On lit donc
    # le texte joint, en cherchant « un brawler connu suivi de ses nombres ».
    # Les noms les plus longs d'abord, sinon « Larry » masquerait
    # « Larry & Lawrie ».
    joint = " ".join(textes)
    ordonnes = sorted(noms_connus, key=len, reverse=True)
    motif = re.compile(
        r"(" + "|".join(re.escape(n) for n in ordonnes) + r")"
        r"\s+([\d]+[.,]?[\d]*)\s*%?\s+([\d]+[.,]?[\d]*)\s*%?", re.I)

    # Le site écrit « 8-bit », le catalogue dit « 8-Bit ». On retient la
    # forme du catalogue : c'est elle qui sert à retrouver le portrait.
    canonique = {clef(n): n for n in noms_connus}

    top, vus = [], set()
    for m in motif.finditer(joint):
        k = clef(m.group(1))
        if k in vus:
            continue
        victoires, utilisation = nombre(m.group(2)), nombre(m.group(3))
        if victoires is None or utilisation is None:
            continue
        vus.add(k)
        # On garde les deux mesures séparées. Le troisième nombre affiché
        # par le site est un score maison qui les mélange : le reprendre
        # ferait passer un calcul d'autrui pour une mesure.
        top.append([canonique.get(k, m.group(1)), victoires, utilisation])
    if not top:
        return None
    return {"mode": mode, "nom": nom_carte, "top": top}


def pool_depuis_page(html):
    """Le pool d'une page, par ses liens puis par son texte brut.

    Les sites modernes n'envoient qu'une partie du HTML et laissent le
    navigateur bâtir le reste à partir d'un bloc de données rangé dans une
    balise <script>. aplatir() ignore les scripts — c'est voulu, ça évite de
    prendre du code pour du contenu — donc la lecture par les liens ne voit
    que la portion déjà rendue : 8 cartes sur 18 le 02/08/2026.

    Le reste n'est pas ailleurs, il est là, dans le texte de la page. On
    relit donc la source brute quand le compte n'y est pas. Les barres
    obliques y sont souvent échappées (\\/mode\\/) : on les rétablit d'abord.

    Le filtre reste le même — seuls les six modes connus passent — donc lire
    du script ne peut pas faire entrer n'importe quoi.
    """
    pool = pool_depuis_liens(aplatir(html))
    if len(pool) >= POOL_ATTENDU:
        return pool

    vus = {clef(c["nom"]) for c in pool}
    # Deux façons d'échapper la barre oblique dans du JSON embarqué : « \/ »
    # et « / ». Les deux se rencontrent sur la même page.
    brut = html.replace("\\/", "/")
    brut = re.sub(r"\\u002[fF]", "/", brut)
    for m in RX_POOL_LONG.finditer(brut):
        mode = mode_depuis_texte(m.group(1))
        nom = urllib.parse.unquote(m.group(2)).replace("-", " ").strip()
        if nom.islower():
            nom = nom.title()
        if not mode or not clef(nom) or clef(nom) in vus:
            continue
        vus.add(clef(nom))
        pool.append({"mode": mode, "nom": nom,
                     "href": m.group(0)})
    return pool


def cartes_topbrawl(net, noms_connus, ids_api=None):
    """Le pool classé complet, lu carte par carte sur topbrawl.

    Une seule source pour tout : le pool, les modes, les noms, les taux de
    victoire et les taux d'utilisation. C'est ce que le brief demandait
    depuis le début — « stocker [nom, winrate, userate] » — et ce que les
    détours par brawlcalculator et la page du classé de brawltime n'ont
    jamais pu donner.
    """
    print("\n[4+5] Pool de cartes — topbrawl.com")
    try:
        index = net.get(RANKED_TOP)
    except Exception as e:
        souci("index de topbrawl inaccessible : %s" % e)
        return None
    ids = list(dict.fromkeys(RX_TOP_ID.findall(index)))
    if not ids:
        souci("aucune fiche /rankeds/<id> sur l'index — page refaite ?")
        return None
    note("%d carte(s) dans la rotation" % len(ids))

    cartes, retires, depart = [], 0, time.time()
    for i, ident in enumerate(ids, 1):
        if i % 5 == 0:
            avancement(i, len(ids), depart, " — %d lue(s)" % len(cartes))
        url = "%s/rankeds/%s" % (BASE_TOP, ident)
        try:
            fiche = carte_topbrawl(aplatir(net.get(url)), noms_connus)
        except Exception as e:
            souci("%s : %s" % (url, e))
            continue
        if not fiche:
            souci("%s : ni mode ni classement lisibles" % url)
            continue
        # Le filtre du brief : un brawler joué une fois sur mille n'est pas
        # un bon choix, c'est du bruit statistique. Ici on peut enfin
        # l'appliquer, puisque le taux d'utilisation est publié.
        avant = len(fiche["top"])
        fiche["top"] = [t for t in fiche["top"] if t[2] >= SEUIL_USERATE][:TOP_PAR_CARTE]
        if not fiche["top"]:
            souci("%s : tout le classement est sous %.1f %% d'utilisation"
                  % (url, SEUIL_USERATE))
            continue
        retires += avant - len(fiche["top"])

        fiche["id"] = re.sub(r"[^a-z0-9]+", "-", fiche["nom"].lower()).strip("-")
        # L'identifiant de l'adresse est celui de la vignette : on le tient
        # sans avoir à le chercher ailleurs.
        fiche["img"] = int(ident)
        cartes.append(fiche)
    avancement(len(ids), len(ids), depart, " — %d lue(s)" % len(cartes))
    if retires:
        note("%d entrée(s) écartée(s) sous %.1f %% d'utilisation"
             % (retires, SEUIL_USERATE))
    return cartes or None


def fusionner_pool(lu, connu):
    """Complète le pool connu avec ce qu'une source a réussi à lire.

    Aucune source ne donne les 18 cartes : brawltime en expose 8 ou 9 selon
    les chargements, et trois modes n'y apparaissent jamais — page chargée,
    défilée, ou onglets ouverts un par un, le constat est le même.

    Remplacer le pool connu par ce relevé perdrait dix cartes justes.
    L'ignorer laisserait le pool incomplet pour toujours. On complète donc,
    mode par mode, sans dépasser trois cartes et sans jamais en retirer une.
    C'est ainsi qu'a été retrouvé Kaboom Canyon, la carte de Braquage
    manquante : deux des trois cartes lues étaient déjà connues.

    Limite assumée : une carte qui sort de la rotation ne disparaît pas
    toute seule. Il faudra la retirer à la main, et le script ne fera pas
    semblant du contraire.
    """
    par_mode_lu = {}
    for c in lu:
        par_mode_lu.setdefault(c["mode"], []).append(c)

    fusion, ajouts, sorties = [], [], []
    for mode in MODES:
        lus = par_mode_lu.get(mode, [])
        connus = [c for c in connu if c.get("mode") == mode]

        if len(lus) >= CARTES_PAR_MODE:
            # La source donne le mode au complet : elle fait autorité, y
            # compris pour retirer. Sans ça, une carte sortie de la rotation
            # garderait sa place et empêcherait la nouvelle d'entrer.
            retenues = lus[:CARTES_PAR_MODE]
            vues = {clef(c["nom"]) for c in retenues}
            sorties += ["%s (%s)" % (c["nom"], MODES[mode][0])
                        for c in connus if clef(c["nom"]) not in vues]
            ajouts += ["%s (%s)" % (c["nom"], MODES[mode][0])
                       for c in retenues
                       if clef(c["nom"]) not in {clef(x["nom"]) for x in connus}]
            fusion += retenues
            continue

        # Relevé partiel : il complète, il ne remplace pas.
        garde = list(connus)
        cles = {clef(c["nom"]) for c in garde}
        for c in lus:
            if len(garde) >= CARTES_PAR_MODE or clef(c["nom"]) in cles:
                continue
            garde.append(c)
            cles.add(clef(c["nom"]))
            ajouts.append("%s (%s)" % (c["nom"], MODES[mode][0]))
        fusion += garde

    # Une carte dont le mode n'est plus reconnu ne doit pas disparaître en
    # silence : on la garde et on laisse les contrôles la signaler.
    fusion += [c for c in connu if c.get("mode") not in MODES]

    if ajouts:
        note("entre(nt) dans le pool : " + ", ".join(ajouts))
    if sorties:
        souci("sortie(s) du pool d'après la source : %s" % ", ".join(sorties))
    return fusion


def acces_pool(net, url):
    """Les façons d'obtenir une page, de la moins chère à la plus lourde.

    Un site qui bâtit ses pages dans le navigateur range en général les
    mêmes données dans un fichier annexe à adresse prévisible. Quand il
    existe, il vaut mieux que tout le reste : rien à installer, rien à
    exécuter, et un format déjà structuré. On ne réveille Chromium que si
    les deux voies gratuites ont échoué.
    """
    nu = url.rstrip("/")
    return (("données annexes", lambda: net.get(nu + "/_payload.json")),
            ("page brute", lambda: net.get(url)),
            ("navigateur", lambda: net.get_rendu(url)))


def pool_classe(net):
    """Les cartes en rotation classée, ou None si aucune source ne répond.

    On escalade tant que le pool est incomplet, et on garde le meilleur
    relevé rencontré : une page partielle vaut mieux que rien, et c'est
    l'appelant qui décidera s'il s'en contente.
    """
    meilleur, provenance = [], ""
    for nom, url in SOURCES_POOL:
        for voie, recuperer in acces_pool(net, url):
            try:
                page = recuperer()
            except Exception as e:
                # Un fichier annexe absent répond 404 : c'est attendu, pas
                # un incident. Seul l'échec de toutes les voies compte.
                page = None
                if voie == "page brute":
                    souci("%s injoignable (%s)" % (nom, e))
            if not page:
                continue
            pool = pool_depuis_page(page)
            if len(pool) > len(meilleur):
                meilleur, provenance = pool, "%s, %s" % (nom, voie)
            if len(pool) >= POOL_ATTENDU:
                note("rotation classée : %d cartes (%s)" % (len(pool), provenance))
                return pool

    if len(meilleur) < POOL_MIN:
        souci("aucune source n'a donné le pool classé (le meilleur relevé "
              "n'a que %d carte(s)) — voir --debug pool" % len(meilleur))
        return None

    note("rotation classée : %d cartes (%s)" % (len(meilleur), provenance))
    # Incomplet n'est pas invalide : on s'en sert, mais on le dit. Une carte
    # manquante ici, c'est une carte que l'app ne proposera pas — mieux vaut
    # le savoir que le découvrir en draft.
    manque = [m for m in MODES
              if sum(1 for c in meilleur if c["mode"] == m) < CARTES_PAR_MODE]
    souci("pool incomplet : %d cartes sur %d attendues, modes sous-fournis : %s"
          % (len(meilleur), POOL_ATTENDU, ", ".join(MODES[m][0] for m in manque)))
    return meilleur


def ids_cartes_api(net):
    """{clef du nom: identifiant d'image}, d'après le catalogue de brawlapi.

    Sans ça, une carte qui entre en rotation arrive sans vignette et il faut
    relever son identifiant à la main. Le catalogue les publie tous.
    """
    try:
        lot = json.loads(net.get(API_MAPS)).get("list") or []
    except Exception as e:
        souci("catalogue des cartes injoignable (%s) : les nouvelles cartes "
              "arriveront sans vignette" % e)
        return {}
    return {clef(m["name"]): m["id"] for m in lot
            if m.get("name") and m.get("id")}


def restreindre_au_pool(liens, anciennes):
    """Ne garder que les cartes du pool déjà connu.

    Le site liste toutes les cartes jamais publiées — 147 au 02/08/2026 —
    alors que la rotation classée en compte 18. La liste de référence vient
    donc d'ailleurs — de brawltime, ou à défaut du pool déjà enregistré.

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
    """Deux sources, chacune pour ce qu'elle sait :

    brawltime dit QUELLES cartes sont en rotation classée, brawlcalculator
    dit QUI jouer dessus. Si brawltime devient illisible, on retombe sur le
    pool déjà enregistré — vieux d'une saison peut-être, mais jamais faux au
    point d'inventer des cartes.
    """
    # topbrawl donne tout d'un coup : pool, modes, noms, taux de victoire et
    # taux d'utilisation. On ne se rabat sur le montage à deux sources que
    # s'il devient illisible.
    noms_connus = noms_depuis_tiers(open(FICHIER_DONNEES, encoding="utf-8").read())
    cartes = cartes_topbrawl(net, noms_connus)
    if cartes:
        # Le pied de page doit nommer la source qui a réellement servi, pas
        # celle qu'on espérait utiliser.
        return cartes, "topbrawl.com"

    souci("topbrawl illisible — repli sur brawltime + brawlcalculator, "
          "sans taux d'utilisation")
    print("\n[4+5] Pool de cartes")
    pool = pool_classe(net)
    if pool:
        reference = fusionner_pool(pool, anciennes)
    else:
        souci("pool classé illisible : on garde les %d cartes déjà "
              "enregistrées, qui peuvent dater d'une saison précédente"
              % len(anciennes))
        reference = anciennes
    modes_connus = {clef(c["nom"]): c["mode"] for c in reference if c.get("mode")}
    ids_api = ids_cartes_api(net)

    try:
        index = net.get(BASE_CALC + "/maps/")
    except Exception as e:
        souci("index des cartes inaccessible : %s" % e)
        return None, None

    liens = {}
    for b in aplatir(index):
        if b["type"] == "lien":
            m = re.search(r"/maps/([^/?#]+)/?", b["href"] or "")
            if m and b["texte"]:
                liens[m.group(1).lower()] = b["texte"]
    if not liens:
        souci("aucun lien /maps/ trouvé — structure changée, voir --debug maps")
        return None, None
    note("%d cartes repérées" % len(liens))
    liens, connus = restreindre_au_pool(liens, reference)
    if connus:
        note("%d à examiner pour un pool de %d" % (len(liens), len(connus)))

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
        nom = nom_depuis_page(pb, nom)
        # Le préfixe pouvait retenir une carte homonyme ; le titre de la
        # fiche tranche.
        if connus and clef(nom) not in connus:
            continue
        # Le mode vient de la source qui le donne explicitement dans son
        # adresse ; la lecture du texte n'est qu'un repli.
        mode = (modes_connus.get(clef(nom))
                or mode_depuis_texte(nom + " " + texte_page))
        if not mode:
            continue

        top = classement_depuis_page(pb)
        if not top:
            continue

        ancienne = par_nom.get(clef(nom))
        cartes.append({
            "id": re.sub(r"[^a-z0-9]+", "-", nom.lower()).strip("-"),
            # Le catalogue de brawlapi d'abord : c'est lui qui permet à une
            # carte entrant en rotation d'avoir sa vignette sans intervention.
            "img": ids_api.get(clef(nom)) or (ancienne["img"] if ancienne else None),
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
    perdues = sorted(c["nom"] for c in reference
                     if clef(c["nom"]) not in trouvees)
    if perdues:
        souci("en rotation mais absente(s) de brawlcalculator : %s — "
              "carte(s) trop récente(s), renommée(s), ou fiche illisible"
              % ", ".join(perdues))

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
    return cartes, "brawlcalculator.com"


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
# Taux d'utilisation par mode — pour ordonner la grille des ennemis
# ---------------------------------------------------------------------------
#
# À quoi ça sert, et à quoi ça ne sert PAS
# ----------------------------------------
# Quand l'adversaire pique, il faut le désigner dans une grille de 105
# portraits, au chrono. ordreProbable() range cette grille par « ce qui a des
# chances de tomber » — mais faute de mieux, elle la rangeait par TIER, donc
# par ce qui est fort. Or ce n'est pas la même question : ce qu'on cherche des
# yeux, c'est ce que les gens JOUENT.
#
# Le taux d'utilisation répond exactement à ça, et il est solide : mesuré sur
# des centaines de milliers de parties par mode (2,8 millions au total le
# 23/08/2026), contre quelques centaines pour un duel isolé.
#
# Ce qu'on n'en fait PAS, et c'est mesuré : le taux de VICTOIRE de la même
# source ne sert à rien pour classer la force. Dans un jeu en équipes, si un
# brawler est disponible pour les deux camps, son taux tend mécaniquement vers
# 50 %. Relevé le 23/08 : Surge 50,5 %, Griff 49,8 %, Stu 50,1 % — tous sur des
# dizaines de milliers de parties. Le classement voté de brawltime reste donc
# la source des tiers ; metapick n'apporte ici que la popularité.

API_METAPICK = "https://api.metapick-ai.com"
# Les noms de mode tels que metapick les attend, depuis nos propres clés.
MODES_METAPICK = {"brawlBall": "Brawl Ball", "bounty": "Bounty",
                  "knockout": "Knockout", "gemGrab": "Gem Grab",
                  "heist": "Heist", "hotZone": "Hot Zone"}


def scraper_utilisation(net, noms):
    """{mode: {cle: taux d'utilisation en %}} — six appels, un par mode."""
    print("\n[4] Taux d'utilisation par mode — metapick-ai.com")
    par_cle = {clef(n): n for n in noms}
    sortie, inconnus = {}, set()
    for mode, libelle in MODES_METAPICK.items():
        try:
            liste = net.poste(API_METAPICK + "/mode_stats", {"mode": libelle})
        except Exception as e:
            souci("taux d'utilisation de %s illisibles (%s)"
                  % (mode, e.__class__.__name__))
            continue
        table = {}
        for b in liste or []:
            cle = clef(b.get("brawler"))
            if cle not in par_cle:
                if cle:
                    inconnus.add(b.get("brawler"))
                continue
            # Arrondi au centième : au-delà c'est du bruit, et chaque décimale
            # inutile pèse dans un fichier que l'app télécharge au démarrage.
            table[cle] = round(float(b.get("usage_rate") or 0), 2)
        if len(table) < COUVERTURE_MIN:
            souci("%s : %d taux d'utilisation seulement, mode ignoré"
                  % (mode, len(table)))
            continue
        sortie[mode] = table
        note("%s : %d brawlers, le plus joué à %.2f %%"
             % (mode, len(table), max(table.values())))
    if inconnus:
        note("%d nom(s) que metapick emploie et que nous ne connaissons pas : %s"
             % (len(inconnus), ", ".join(sorted(inconnus)[:6])))
    if not sortie:
        souci("aucun taux d'utilisation relevé — USAGE reste inchangé")
        return None
    return sortie


def rendre_usage(par_mode):
    lignes = []
    for mode in MODES:
        if mode in par_mode:
            lignes.append("%s:%s" % (mode, js(par_mode[mode])))
    return "var USAGE={\n" + ",\n".join(lignes) + "};"


# ---------------------------------------------------------------------------
# Tiers par mode — le dernier bloc encore tapé à la main
# ---------------------------------------------------------------------------
#
# Il l'est resté longtemps, et ça se voyait : relevé le 29/07, encore en place
# le 11/08. Les trois autres blocs se rafraîchissaient tout seuls chaque lundi
# pendant que celui-ci vieillissait — or c'est LUI qui donne le point de
# départ du score, avant même la carte et les ennemis.
#
# Ce qu'on recopie, et ce que ça vaut
# -----------------------------------
# La page dit d'elle-même : « This tier list was voted by the Brawl Time Ninja
# community ». C'est un avis collectif, pas une mesure — 48 000 votes, remis à
# zéro à chaque saison. On le recopie tel quel et le pied de page le dit ;
# le faire passer pour une statistique serait la règle 5 enfreinte.
#
# La même page porte aussi un tableau mesuré (33,6 M de parties). Il n'est pas
# lu ici : il ne sort que dix lignes à la fois, sur onze pages, et demande un
# navigateur. C'est le second choix, prévu séparément.
#
# Comment la page se lit
# ----------------------
# Vérifié par --debug tiers, pas supposé : dans le flux aplati chaque lettre
# est un bloc de texte qui ouvre son palier, et les liens qui suivent lui
# appartiennent. Un simple GET suffit — pas de navigateur.
#
# Deux pièges, tous deux mesurés :
#   — les tableaux qui SUIVENT la grille relient les mêmes brawlers, et ils
#     retombaient dans D : 116 rangés pour 105 existants. D'où la sentinelle,
#     la phrase du vote, qui ferme la grille.
#   — la page ne donne que des identifiants, jamais les noms affichés. On ne
#     les invente pas : on reprend ceux que porte déjà donnees.js, et on
#     signale ceux qu'on ne sait pas nommer plutôt que de les ranger au
#     hasard. Un brawler absent de TIERS est déjà prévu par le moteur —
#     POINTS_TIER_INCONNU — donc il est ignoré, pas perdu.

RX_LIEN_BRAWLER = re.compile(r"/tier-list/brawler/([^/?#\"]+)")
LETTRES_TIER = ("S", "A", "B", "C", "D")
RX_FIN_GRILLE = re.compile(r"tier list was voted|voted by the .{0,40}community",
                           re.I)


def tiers_depuis_page(page, nom_pour):
    """{lettre: [noms]} pour un mode. Vide si la page ne se lit plus.

    `nom_pour` traduit un identifiant de la page en nom affiché ; il rend
    None pour un brawler qu'on ne sait pas nommer."""
    courant, paliers, vus, inconnus = None, {}, set(), []
    for b in aplatir(page):
        texte = (b.get("texte") or "").strip()
        if b["type"] == "texte":
            if texte in LETTRES_TIER:
                courant = texte
                paliers.setdefault(courant, [])
                continue
            # La grille finie, tout ce qui suit relie les mêmes brawlers
            # depuis d'autres tableaux. On s'arrête là.
            if courant and RX_FIN_GRILLE.search(texte):
                break
        if b["type"] != "lien" or courant is None:
            continue
        m = RX_LIEN_BRAWLER.search(b.get("href") or "")
        if not m:
            continue
        cle = clef(m.group(1))
        if not cle or cle in vus:
            continue
        vus.add(cle)
        nom = nom_pour(cle)
        if nom:
            paliers[courant].append(nom)
        else:
            inconnus.append(m.group(1))
    return paliers, inconnus


def scraper_tiers(net, anciens, noms):
    """{mode: {lettre: "nom,nom,…"}} — les modes illisibles gardent l'existant.

    Un mode qui échoue ne doit pas en emporter cinq autres : on remplace ce
    qu'on a pu relire, on garde le reste, et on dit lesquels."""
    print("\n[0] Tiers par mode — brawltime.ninja (classement voté)")
    par_cle = {clef(n): n for n in noms}
    sortie, repris, tous_inconnus = {}, [], set()

    for mode in MODES:
        url = "%s/tier-list/mode/%s" % (BASE_NINJA, mode)
        try:
            page = net.get(url)
        except Exception as e:
            souci("tier list de %s illisible (%s)" % (mode, e.__class__.__name__))
            page = None

        paliers, inconnus = ({}, []) if not page else tiers_depuis_page(
            page, lambda c: par_cle.get(c))
        tous_inconnus.update(inconnus)
        ranges = sum(len(v) for v in paliers.values())

        # Le même seuil que pour les cartes : en dessous, ce n'est plus un
        # relevé maigre mais un parseur cassé, et on refuse d'écrire.
        if ranges < COUVERTURE_MIN or not all(paliers.get(L) for L in LETTRES_TIER):
            if paliers:
                souci("%s : %d brawler(s) rangé(s) sur %d attendus — le mode "
                      "garde ses tiers actuels" % (mode, ranges, COUVERTURE_MIN))
            repris.append(mode)
            if mode in anciens:
                sortie[mode] = anciens[mode]
            continue
        sortie[mode] = {L: ",".join(paliers[L]) for L in LETTRES_TIER}
        note("%s : %s" % (mode, " ".join("%s=%d" % (L, len(paliers[L]))
                                         for L in LETTRES_TIER)))

    if tous_inconnus:
        souci("%d brawler(s) de la page qu'on ne sait pas nommer, donc non "
              "rangés (ils gardent le tier inconnu) : %s"
              % (len(tous_inconnus), ", ".join(sorted(tous_inconnus)[:8])))
    if len(repris) == len(MODES):
        souci("aucun mode relu — TIERS reste inchangé")
        return None
    if repris:
        note("%d mode(s) repris tels quels : %s" % (len(repris), ", ".join(repris)))
    return sortie


def tiers_actuels(html):
    """Le bloc TIERS en place, {mode: {lettre: chaîne}}."""
    bloc = lire_bloc(html, "TIERS")
    out = {}
    for mode, corps in re.findall(r"(\w+):\{(.*?)\}", bloc, re.S):
        out[mode] = dict(re.findall(r'([SABCD]):"((?:[^"\\]|\\.)*)"', corps))
    return out


def rendre_tiers(par_mode):
    """Même mise en page que le bloc écrit à la main : un mode par ligne."""
    lignes = []
    for mode in MODES:
        if mode not in par_mode:
            continue
        corps = ",".join('%s:%s' % (L, js(par_mode[mode].get(L, "")))
                         for L in LETTRES_TIER)
        lignes.append("%s:{%s}" % (mode, corps))
    return "var TIERS={\n" + ",\n".join(lignes) + "};"


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
# Écriture dans les fichiers de données
#
# Deux fichiers portent des blocs @DATA: depuis que COUNTERS a quitté
# donnees.js — d'où le message d'erreur qui ne nomme plus un fichier en
# particulier : il nommerait le mauvais une fois sur deux.
# ---------------------------------------------------------------------------

def lire_bloc(html, nom):
    m = re.search(r"/\* @DATA:%s \*/\n(.*?)\n/\* @END:%s \*/" % (nom, nom),
                  html, re.S)
    if not m:
        raise SystemExit("marqueur @DATA:%s introuvable" % nom)
    return m.group(1)


def ecrire_bloc(html, nom, contenu):
    pat = re.compile(r"(/\* @DATA:%s \*/\n).*?(\n/\* @END:%s \*/)" % (nom, nom), re.S)
    if not pat.search(html):
        raise SystemExit("marqueur @DATA:%s introuvable" % nom)
    return pat.sub(lambda m: m.group(1) + contenu + m.group(2), html, count=1)


def js(valeur):
    """Sérialise en JS compact — même densité que le reste de donnees.js."""
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


# Le jeu traduit le nom de certaines cartes : « Center Stage » s'annonce
# « Milieu de scène » en français. L'app en affichait la version anglaise, et
# il fallait traduire de tête pendant les 25 secondes du draft.
#
# Brawl Time Ninja publie ses listes dans chaque langue, et la structure de
# ses liens donne la correspondance gratuitement : l'adresse porte le nom
# anglais, le texte du lien porte le nom traduit.
#
#     /fr/tier-list/mode/brawl-ball/map/Center-Stage   →   Milieu de scène
#
# On ne traduit donc rien : on recopie ce que le jeu affiche déjà.
LANGUES_CARTES = ("fr", "es")
RX_LIEN_CARTE = re.compile(r"/tier-list/mode/[^/]+/map/([^/?#\"]+)")


def noms_de_cartes(net, langue):
    """{identifiant de carte: nom affiché dans cette langue}."""
    url = BASE_NINJA + "/" + langue + "/tier-list/ranked"
    try:
        html = net.get_rendu(url) or net.get(url)
    except Exception as e:
        souci("noms de cartes en %s illisibles (%s) — on garde l'existant"
              % (langue, e.__class__.__name__))
        return {}

    trouves = {}
    for bloc in aplatir(html):
        if bloc["type"] != "lien":
            continue
        m = RX_LIEN_CARTE.search(bloc.get("href") or "")
        texte = " ".join((bloc.get("texte") or "").split())
        if not m or not texte:
            continue
        # L'adresse « Center-Stage » devient l'identifiant « center-stage »,
        # celui que porte déjà chaque carte de donnees.js.
        brut = urllib.parse.unquote(m.group(1))
        ident = re.sub(r"[^a-z0-9]+", "-", brut.lower()).strip("-")
        if ident:
            trouves[ident] = texte
    return trouves


def ajouter_noms_traduits(net, cartes, anciennes):
    """Complète chaque carte avec son nom dans les autres langues.

    Une source muette ne doit jamais effacer ce qui est déjà écrit : sans
    lecture, on recopie les noms de la version précédente."""
    connus = {c.get("id"): (c.get("noms") or {}) for c in (anciennes or [])}
    for c in cartes:
        c["noms"] = dict(connus.get(c["id"]) or {})

    for langue in LANGUES_CARTES:
        table = noms_de_cartes(net, langue)
        if not table:
            continue
        pris = 0
        for c in cartes:
            nom = table.get(c["id"])
            # Un nom identique à l'anglais n'apprend rien : beaucoup de cartes
            # gardent leur nom d'origine dans le jeu.
            if nom and nom != c["nom"]:
                c["noms"][langue] = nom
                pris += 1
        note("noms de cartes en %s : %d traduits sur %d"
             % (langue, pris, len(cartes)))

    for c in cartes:
        if not c["noms"]:
            c.pop("noms", None)
    return cartes


def rendre_maps(cartes):
    lignes = ["var MAPS=["]
    for i, c in enumerate(cartes):
        top = ",".join("[" + ",".join(js(x) for x in e if x is not None) + "]"
                       for e in c["top"])
        # « noms » n'apparaît que s'il y a vraiment quelque chose à dire :
        # la plupart des cartes gardent leur nom anglais dans le jeu, et
        # écrire noms:{} sur chaque ligne alourdirait le fichier pour rien.
        noms = c.get("noms") or {}
        bloc_noms = (",noms:" + js(noms)) if noms else ""
        lignes.append("{id:%s,img:%s,nom:%s%s,mode:%s,top:[%s]}%s"
                      % (js(c["id"]), c["img"] if c["img"] else "null",
                         js(c["nom"]), bloc_noms, js(c["mode"]), top,
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
    """Les cartes déjà en place, noms traduits compris.

    Le bloc « noms » est facultatif : la plupart des cartes gardent leur nom
    anglais dans le jeu. Le motif doit donc l'accepter présent ou absent —
    sinon plus aucune carte n'est relue, et la protection contre
    l'appauvrissement du pool compare le relevé à une liste vide, c'est-à-dire
    ne protège plus rien."""
    bloc = lire_bloc(html, "MAPS")
    out = []
    motif = re.compile(
        r'\{id:"([^"]+)",img:(\d+),nom:"([^"]+)"'
        r'(?:,noms:(\{[^}]*\}))?'
        r',mode:"([^"]+)"')
    for m in motif.finditer(bloc):
        try:
            noms = json.loads(m.group(4)) if m.group(4) else {}
        except Exception:
            noms = {}
        out.append({"id": m.group(1), "img": int(m.group(2)),
                    "nom": m.group(3), "noms": noms, "mode": m.group(5)})
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


def deboguer_pool(net):
    """Pourquoi le pool lu n'a-t-il pas la taille attendue ?

    Trois causes possibles, et elles ne se soignent pas pareil : la page ne
    contient pas les liens (rendu dans le navigateur), les liens sont là mais
    d'une autre forme (motif à corriger), ou le mode n'est pas reconnu
    (MODES à compléter). On les distingue en comptant à chaque étape.
    """
    for nom, url in SOURCES_POOL:
        print("\n--- %s" % url)
        # On rejoue exactement l'escalade du vrai code. Un diagnostic qui
        # teste autre chose que le code de production ne diagnostique rien.
        page, voie = None, None
        for etiquette, recuperer in acces_pool(net, url):
            try:
                candidat = recuperer()
            except Exception as e:
                print("  %-16s echec : %s" % (etiquette, e))
                continue
            if not candidat:
                print("  %-16s indisponible" % etiquette)
                continue
            n = len(pool_depuis_page(candidat))
            print("  %-16s %d carte(s)" % (etiquette, n))
            if page is None or n > len(pool_depuis_page(page)):
                page, voie = candidat, etiquette
            if n >= POOL_ATTENDU:
                break
        if page is None:
            print("  aucune voie n'a répondu")
            continue
        print("  -> meilleure voie : %s" % voie)
        blocs = aplatir(page)

        liens = [b["href"] for b in blocs if b["type"] == "lien" and b["href"]]
        avec_map = [h for h in liens if "/map" in h]
        reconnus = [h for h in liens
                    if RX_POOL_LONG.search(h) or RX_POOL_COURT.search(h)]
        print("  %d lien(s) au total, %d contenant « /map », %d de bonne forme"
              % (len(liens), len(avec_map), len(reconnus)))

        pool = pool_depuis_page(page)
        par_mode = {}
        for c in pool:
            par_mode.setdefault(c["mode"], []).append(c["nom"])
        print("  %d carte(s) retenue(s) sur %d attendues" % (len(pool), POOL_ATTENDU))
        for m in MODES:
            noms = par_mode.get(m, [])
            print("    %-18s %d : %s"
                  % (MODES[m][0], len(noms), ", ".join(noms)[:44] or "—"))

        # Les liens qui parlent de carte sans être retenus : c'est là que se
        # cache la différence entre 8 et 18.
        perdus = [h for h in avec_map if h not in reconnus]
        if perdus:
            print("  %d lien(s) « /map » non reconnu(s), ex. :" % len(perdus))
            for h in perdus[:5]:
                print("      " + h[:62])


# Intitulés anglais des modes, tels qu'affichés sur brawltime. Servent à
# retrouver l'onglet à ouvrir : la clé interne (« hotZone ») n'apparaît que
# dans les adresses, jamais à l'écran.
LIBELLES_EN = {"brawlBall": "Brawl Ball", "bounty": "Bounty",
               "knockout": "Knockout", "gemGrab": "Gem Grab",
               "heist": "Heist", "hotZone": "Hot Zone"}


def ancre_de_mode(mode):
    """« brawlBall » → « brawl-ball », la forme employée dans les ancres.

    Relevée sur une adresse du site (…/ranked#brawl-ball) : la clé interne
    n'apparaît que dans les chemins, jamais dans les ancres. Viser la
    mauvaise forme revient à ne cliquer sur rien, ce qui explique un essai
    resté sans effet le 02/08/2026.
    """
    return re.sub(r"(?<!^)([A-Z])", r"-\1", mode).lower()


SITE = "https://masiliaa.github.io/Brawls-stars-Draft-/"
FICHIERS_SITE = ("index.html", "style.css", "outils.js", "langues.js",
                 "donnees.js", "etat.js", "moteur.js", "vues.js", "app.js")


def deboguer_site(net):
    """Ce que le site publié affiche réellement, vu d'ailleurs.

    Le réseau de la session qui écrit ce script est fermé : impossible d'y
    ouvrir la page. Le robot, lui, a Internet. Il ouvre donc le site dans un
    vrai navigateur et écrit dans son journal ce qu'un visiteur verrait.

    C'est la seule façon de distinguer « le site est cassé » de « le
    navigateur de l'utilisateur montre une vieille copie » — et ça évite de
    lui demander une capture d'écran.
    """
    print("Site : " + SITE)
    for f in FICHIERS_SITE:
        try:
            print("  %-12s %7d octets" % (f, len(net.get(SITE + f))))
        except Exception as e:
            print("  %-12s ÉCHEC : %s" % (f, e))

    nav = net._navigateur()
    if nav is None:
        print("\n  navigateur indisponible : pas de rendu")
        return

    soucis = []

    def au_message(m):
        if m.type == "error":
            soucis.append("console : " + m.text)

    page = nav.new_page(user_agent=UA)
    page.on("pageerror", lambda e: soucis.append("pageerror : %s" % e))
    page.on("console", au_message)
    try:
        page.goto(SITE, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        print("\n  titre : %s" % page.title())
        texte = page.evaluate("() => document.body.innerText")
        lignes = [l.strip() for l in texte.splitlines() if l.strip()]
        print("  %d caractère(s) visible(s), %d ligne(s)" % (len(texte), len(lignes)))
        for l in lignes[:14]:
            print("    " + l[:68])
        for sel in (".logo", ".note", "[data-act]", ".box"):
            print("  %-12s %d élément(s)" % (sel, page.locator(sel).count()))
    finally:
        page.close()

    print("\n  %d erreur(s) JavaScript%s" % (len(soucis), " :" if soucis else ""))
    for s in soucis[:8]:
        print("    " + s[:110])


def deboguer_onglets(net):
    """Ouvrir les onglets de mode fait-il apparaître les cartes manquantes ?

    Dernier levier non testé. Charger la page, la faire défiler, lire son
    texte brut : trois modes restent introuvables par ces trois voies. Il
    reste la possibilité qu'ils ne soient construits qu'au clic.
    """
    onglets = [(ancre_de_mode(m), LIBELLES_EN[m]) for m in MODES]
    try:
        html = net.get_rendu_onglets(RANKED_NINJA, onglets)
    except Exception as e:
        print("  echec : %s: %s" % (e.__class__.__name__, e))
        return
    if not html:
        print("  navigateur indisponible")
        return

    pool = pool_depuis_page(html)
    print("Après ouverture des %d onglets : %d carte(s) sur %d"
          % (len(onglets), len(pool), POOL_ATTENDU))
    for m in MODES:
        noms = [c["nom"] for c in pool if c["mode"] == m]
        print("  %-18s %d : %s" % (MODES[m][0], len(noms), ", ".join(noms)[:52]))


def deboguer_modes(net):
    """Les pages par mode listent-elles la rotation, mode par mode ?

    La page du classé n'expose qu'une partie du pool — 9 cartes sur 18 le
    02/08/2026, et jamais les mêmes d'un chargement à l'autre. Trois modes
    y sont toujours absents. Ce n'est pas un défaut de rendu : Chromium,
    défilement compris, en voit encore moins que le téléchargement brut.

    Chaque mode a pourtant sa propre page, dont l'adresse est connue et non
    devinée : elle apparaît dans les liens de la page du classé.
    """
    for mode in MODES:
        url = "%s/tier-list/mode/%s" % (BASE_NINJA, mode)
        print("\n--- %s" % url)
        try:
            page = net.get(url)
        except Exception as e:
            print("  injoignable : %s: %s" % (e.__class__.__name__, e))
            continue
        cartes = [c for c in pool_depuis_page(page) if c["mode"] == mode]
        print("  %d carte(s) : %s"
              % (len(cartes), ", ".join(c["nom"] for c in cartes)[:88]))
        autres = [c["nom"] for c in pool_depuis_page(page) if c["mode"] != mode]
        if autres:
            print("  %d carte(s) d'autres modes sur la meme page, ex. : %s"
                  % (len(autres), ", ".join(autres[:4])))


def deboguer_tiers(net):
    """Où la page de brawltime coupe-t-elle entre S et A ?

    On connaît déjà l'ORDRE des brawlers : la page les liste du meilleur au
    pire, et un simple GET suffit à les lire tous — pas de navigateur. Ce
    qu'on ne connaît pas, c'est l'endroit des coupures. Sans elles, on a un
    classement continu et pas des paliers, or c'est la lettre que le moteur
    lit.

    L'hypothèse à vérifier, et c'est tout l'objet de cette sonde : dans le
    flux aplati, chaque lettre est un bloc de texte, suivi des liens de son
    palier. Si c'est vrai, le relevé automatique est une dizaine de lignes.
    Si c'est faux — les cinq lettres collées, puis tous les liens — alors la
    page range les paliers autrement et il faudra lire le HTML brut.

    On imprime donc les DEUX : ce que donne le découpage par lettre, et le
    nombre total de liens. L'écart entre les deux dit laquelle est vraie.
    """
    for mode in ("brawlBall", "knockout"):
        url = "%s/tier-list/mode/%s" % (BASE_NINJA, mode)
        print("\n--- %s" % url)
        try:
            page = net.get(url)
        except Exception as e:
            print("  injoignable : %s: %s" % (e.__class__.__name__, e))
            continue

        blocs = aplatir(page)
        tous = [m.group(1) for b in blocs if b["type"] == "lien"
                for m in [RX_LIEN_BRAWLER.search(b.get("href") or "")] if m]
        print("  %d lien(s) de brawler sur la page, %d distinct(s)"
              % (len(tous), len(set(tous))))

        # Découpage : une lettre ouvre un palier, les liens suivants lui
        # appartiennent jusqu'à la lettre d'après.
        courant, paliers = None, {}
        for b in blocs:
            texte = (b.get("texte") or "").strip()
            if b["type"] == "texte" and texte in LETTRES_TIER:
                courant = texte
                paliers.setdefault(courant, [])
                continue
            if b["type"] != "lien" or courant is None:
                continue
            m = RX_LIEN_BRAWLER.search(b.get("href") or "")
            if m and m.group(1) not in paliers[courant]:
                paliers[courant].append(m.group(1))

        if not paliers:
            print("  aucune lettre S/A/B/C/D isolée dans le flux"
                  "  <-- l'hypothèse est fausse")
            continue
        ranges = sum(len(v) for v in paliers.values())
        print("  paliers repérés : %s" % ", ".join(
            "%s=%d" % (L, len(paliers.get(L, []))) for L in LETTRES_TIER))
        print("  %d brawler(s) rangé(s) sur %d  <-- doit valoir 105 pour servir"
              % (ranges, len(set(tous))))
        for L in LETTRES_TIER:
            if paliers.get(L):
                print("    %s : %s" % (L, ", ".join(paliers[L])[:76]))


def deboguer_carte_ninja(net):
    """Une fiche de carte chez brawltime donne-t-elle les taux de victoire ?

    C'est cette source qui a produit les « 73,1 % » de donnees.js. Si sa
    fiche porte le classement ET le pourcentage, on n'a plus besoin de
    brawlcalculator pour les cartes — ni de changer ce que l'app affiche.
    Le pourcentage venant alors de la même source et de la même date que le
    rang, il redevient une mesure et pas un chiffre rapporté d'ailleurs.
    """
    pool = pool_classe(net)
    if not pool:
        print("  pool illisible : rien à sonder")
        return
    carte = pool[0]
    url = urllib.parse.urljoin(RANKED_NINJA, carte["href"])
    print("Fiche : %s  (%s, %s)" % (url, carte["nom"], carte["mode"]))

    blocs = aplatir(net.get(url))
    titres = [b["texte"].strip() for b in blocs
              if b["type"] == "titre" and (b["texte"] or "").strip()]
    print("  %d titre(s) : %s" % (len(titres), " | ".join(titres[:5])[:70]))

    # Un lien de brawler suivi de son pourcentage : c'est exactement ce
    # qu'il nous faut, et ça se voit sur les blocs qui suivent le lien.
    montres = 0
    for i, b in enumerate(blocs):
        if b["type"] != "lien" or not b["texte"] or "brawler" not in (b["href"] or ""):
            continue
        suite = [x["texte"].strip() for x in blocs[i + 1:i + 6]
                 if (x["texte"] or "").strip()]
        print("    %-16s %s" % (b["texte"][:16], " | ".join(suite)[:54]))
        montres += 1
        if montres >= 8:
            break
    if not montres:
        print("    aucun lien de brawler — page construite dans le navigateur ?")

    pourcents = [b["texte"].strip() for b in blocs
                 if re.search(r"\d+[.,]\d+\s*%", b["texte"] or "")]
    print("  %d bloc(s) avec un pourcentage%s"
          % (len(pourcents),
             (" — ex. « %s »" % pourcents[0][:34]) if pourcents else
             "  <-- pas de taux de victoire sur cette page"))


def deboguer_ranked(net, pages=None):
    """Un site annonce-t-il la rotation classée ?

    L'API publie le catalogue complet — 404 cartes non désactivées, soit
    exactement ce que liste brawlcalculator. Ni l'une ni l'autre ne distingue
    le pool classé, et brawlcalculator n'a pas de page pour ça (mesuré le
    02/08/2026 : les seuls liens attrapés étaient l'index et une carte
    nommée « Dry Season »).

    On explore donc les liens plutôt que de deviner des adresses : c'est la
    différence entre découvrir un chemin et en inventer un.
    """
    for url in (pages or (BASE_CALC + "/", BASE_CALC + "/maps/")):
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
        # Le schéma d'adresses du site, en une ligne : le premier segment de
        # chaque lien avec son nombre d'occurrences. C'est le plan du site,
        # et ça évite de deviner des adresses qui répondent 404 — ce que
        # « /maps » vient justement de faire sur brawltime.
        segments = {}
        for b in blocs:
            if b["type"] != "lien" or not b["href"]:
                continue
            chemin = urllib.parse.urlparse(b["href"]).path.strip("/")
            seg = chemin.split("/")[0] if chemin else "(racine)"
            segments[seg] = segments.get(seg, 0) + 1
        print("  schema d'adresses : %s"
              % (", ".join("%s (%d)" % (s, n) for s, n in
                           sorted(segments.items(), key=lambda kv: -kv[1])[:9])
                 or "aucun lien"))

        # Chaque titre avec les liens qui le suivent. Filtrer sur des
        # mots-clés ratait l'essentiel : sur la page du classé, les titres
        # sont les modes — « Heist », « Knockout » — et aucun ne contient
        # « ranked » ni « rotation ». La structure se montre, elle ne se
        # devine pas.
        courant, groupes = None, []
        for b in blocs:
            if b["type"] == "titre" and (b["texte"] or "").strip():
                courant = (b["texte"].strip(), [])
                groupes.append(courant)
            elif courant and b["type"] == "lien" and b["texte"] and b["href"]:
                courant[1].append((b["texte"], b["href"]))
        for titre, liens in groupes[:9]:
            if not liens:
                continue
            print("  %s — %d lien(s)" % (titre[:38], len(liens)))
            for texte, href in liens[:5]:
                print("      %-22s %s" % (str(texte)[:22], href[:44]))


def deboguer(net, quoi):
    """Affiche ce que le parseur voit, pour ajuster vite si le site change."""
    if quoi == "carte":
        return deboguer_carte(net)
    if quoi == "ranked":
        return deboguer_ranked(net)
    if quoi == "topbrawl":
        return deboguer_ranked(net, (BASE_TOP + "/", RANKED_TOP))
    if quoi == "site":
        return deboguer_site(net)
    if quoi == "onglets":
        return deboguer_onglets(net)
    if quoi == "modes":
        return deboguer_modes(net)
    if quoi == "pool":
        return deboguer_pool(net)
    if quoi == "carte-ninja":
        return deboguer_carte_ninja(net)
    if quoi == "tiers":
        return deboguer_tiers(net)
    if quoi == "ninja":
        # Adresses relevees a la main sur les sites, pas devinees : les trois
        # sondes precedentes ont echoue faute d'avoir su ou aller.
        return deboguer_ranked(net, (RANKED_NINJA, RANKED_TOP))
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
    ap.add_argument("--usage", action="store_true",
                    help="taux d'utilisation par mode (metapick)")
    ap.add_argument("--tiers", action="store_true",
                    help="tiers par mode (classement vote de brawltime)")
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
    ap.add_argument("--sans-bascule", action="store_true",
                    help="télécharge les images sans toucher à ASSETS_LOCAUX")
    ap.add_argument("--debug", metavar="PAGE",
                    help="'counters', 'maps', 'carte' (une fiche de carte), "
                         "'events', 'rotation', 'ranked', 'ninja', 'carte-ninja', 'pool' "
                         "(cherche le pool classe), 'tiers' (ou la page coupe "
                         "entre S et A), ou une adresse complète")
    a = ap.parse_args()

    net = Reseau(delai=a.delai, ttl_jours=a.ttl, cache=not a.sans_cache)

    if a.debug:
        try:
            deboguer(net, a.debug)
        finally:
            net.fermer()
        return 0

    if a.tout:
        a.tiers = a.counters = a.cartes = a.synergie = a.assets = True
        a.usage = True
    if not any([a.tiers, a.usage, a.counters, a.cartes, a.synergie, a.assets]):
        ap.print_help()
        return 1

    html = open(FICHIER_DONNEES, encoding="utf-8").read()
    counters_js = open(FICHIER_COUNTERS, encoding="utf-8").read()
    noms = noms_depuis_tiers(html)
    maj, saison = maj_actuelle(html)
    aujourdhui = dt.date.today().strftime("%d/%m/%Y")
    tr = Traducteur()
    touche = False
    counters_touche = False

    if a.tiers:
        table = scraper_tiers(net, tiers_actuels(html), noms)
        if table:
            html = ecrire_bloc(html, "TIERS", rendre_tiers(table))
            maj["tiers"] = [aujourdhui, "brawltime.ninja (vote communautaire)"]
            touche = True
            # Le bloc vient de changer : les noms qu'on en tire aussi.
            noms = noms_depuis_tiers(html)

    if a.usage:
        table = scraper_utilisation(net, noms)
        if table:
            html = ecrire_bloc(html, "USAGE", rendre_usage(table))
            maj["usage"] = [aujourdhui, "metapick-ai.com"]
            touche = True

    if a.cartes:
        anciennes = cartes_actuelles(html)
        cartes, source_cartes = scraper_cartes(net, tr, anciennes)
        if cartes and pool_appauvri(cartes, anciennes):
            souci("%d carte(s) récupérée(s) contre %d déjà en place : le pool "
                  "serait appauvri, MAPS reste inchangé. La mise en page du "
                  "site a probablement changé — voir --debug maps"
                  % (len(cartes), len(anciennes)))
            cartes = None
        if cartes:
            cartes = appliquer_userates(cartes, a.userates)
            cartes = ajouter_noms_traduits(net, cartes, anciennes)
            ordre = list(MODES)
            cartes.sort(key=lambda c: (ordre.index(c["mode"]), c["nom"]))
            html = ecrire_bloc(html, "MAPS", rendre_maps(cartes))
            maj["cartes"] = [aujourdhui, source_cartes]
            touche = True

    if a.counters:
        table = scraper_counters(net, tr)
        if table:
            controler_counters(table, noms)
            counters_js = ecrire_bloc(counters_js, "COUNTERS",
                                      rendre_counters(table))
            counters_touche = True
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
        if a.sans_bascule:
            note("--sans-bascule : les images sont téléchargées, ASSETS_LOCAUX "
                 "n'est pas touché. La bascule reste une décision à part, "
                 "prise en la mesurant.")
        else:
            html = ecrire_bloc(html, "ASSETS",
                               "var ASSETS_LOCAUX=%s;" % ("true" if complet else "false"))
            if not complet:
                souci("aucune image récupérée : ASSETS_LOCAUX reste à false, "
                      "l'app continue de charger les images depuis les CDN")
        touche = True

    tr.enregistrer()
    # Chromium reste en mémoire tant qu'on ne le ferme pas.
    net.fermer()

    # Seuls les blocs réellement rafraîchis sont redatés : le pied de page ne
    # doit jamais annoncer comme fraîche une donnée qui n'a pas été relevée.
    if touche and not a.blanc:
        html = ecrire_bloc(html, "MAJ", rendre_maj(maj, saison))
        open(FICHIER_DONNEES, "w", encoding="utf-8").write(html)
        print("\ndonnees.js réécrit.")
        if counters_touche:
            open(FICHIER_COUNTERS, "w", encoding="utf-8").write(counters_js)
            print("counters.js réécrit.")
    elif a.blanc:
        print("\n--blanc : donnees.js et counters.js laissés tels quels.")

    # Le récapitulatif, en TOUTE fin de sortie.
    # ----------------------------------------------------------------------
    # Un relevé complet imprime plusieurs centaines de lignes, et son issue
    # se trouvait quelque part au milieu. Le 12/08, pour savoir si les tiers
    # s'étaient relevés, il a fallu remonter 800 lignes de journal — et
    # renoncer. Quatre lignes à la fin répondent à la seule question qu'on se
    # pose en ouvrant ce journal : qu'est-ce qui a bougé, et qu'est-ce qui
    # n'a pas bougé ?
    print("\n" + "=" * 60)
    print("RÉCAPITULATIF" + ("  (--blanc : rien n'a été écrit)" if a.blanc else ""))
    demande = [("tiers", a.tiers), ("usage", a.usage), ("cartes", a.cartes),
               ("matchups", a.counters), ("synergie", a.synergie)]
    for nom, voulu in demande:
        if not voulu:
            continue
        bloc = maj.get(nom)
        frais = bool(bloc) and bloc[0] == aujourdhui
        print("  %-9s %s" % (nom, ("relevé le " + bloc[0] + " · " + bloc[1])
                             if frais else
                             ("INCHANGÉ" + (" (dernier relevé : %s)" % bloc[0] if bloc else " — jamais relevé"))))
    if a.assets:
        print("  %-9s %s" % ("images", "téléchargées"))

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
