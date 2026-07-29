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
    """Cache de traductions sur disque + glossaire de secours.

    Le script ne traduit pas tout seul : il réutilise ce qui est déjà dans
    data/traductions.json et dépose le reste dans data/a_traduire.json.
    Les phrases non traduites restent en anglais dans donnees.js — visible,
    donc corrigeable, plutôt que faussement français."""

    def __init__(self):
        self.fichier = os.path.join(DONNEES, "traductions.json")
        os.makedirs(DONNEES, exist_ok=True)
        self.table = {}
        if os.path.exists(self.fichier):
            try:
                self.table = json.load(open(self.fichier, encoding="utf-8"))
            except Exception as e:
                souci("traductions.json illisible (%s), on repart de zéro" % e)
        self.manquantes = []

    def __call__(self, phrase):
        p = " ".join(str(phrase).split())
        if not p:
            return ""
        if p in self.table:
            return self.table[p]
        self.manquantes.append(p)
        return p

    def enregistrer(self):
        json.dump(self.table, open(self.fichier, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1, sort_keys=True)
        cible = os.path.join(DONNEES, "a_traduire.json")
        restant = sorted(set(self.manquantes))
        json.dump(restant, open(cible, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        if restant:
            note("%d phrases restent en anglais → %s"
                 % (len(restant), os.path.relpath(cible, RACINE)))
            note("  pour les traduire : remplis data/traductions.json "
                 "(clé = phrase anglaise) puis relance le script")


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
    for i, (s, nom) in enumerate(sorted(fiches.items()), 1):
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
        if i % 10 == 0:
            note("%d/%d…" % (i, len(fiches)))

    if vides:
        souci("%d fiches sans aucun matchup (ex. %s) — titres introuvables, "
              "la mise en page a peut-être changé" % (len(vides), ", ".join(vides[:5])))
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
                        out.append([courant, ""])
                else:
                    courant = None
            elif b["type"] == "texte" and courant and out and out[-1][0] == courant:
                if not out[-1][1] and len(b["texte"]) > 12:
                    out[-1][1] = tr(b["texte"])
    return [[k, p] for k, p in out if p] or [[k, p] for k, p in out]


# ---------------------------------------------------------------------------
# Tâches 4 et 5 — pool de cartes et classements par carte
# ---------------------------------------------------------------------------

def mode_depuis_texte(texte):
    t = (texte or "").lower()
    for cle, (_, motifs) in MODES.items():
        for m in motifs:
            if m in t:
                return cle
    return None


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

    # index des anciennes entrées, pour retrouver l'identifiant d'image
    par_nom = {clef(c["nom"]): c for c in anciennes}

    cartes = []
    for s, nom in sorted(liens.items()):
        url = "%s/maps/%s/" % (BASE_CALC, s)
        try:
            page = net.get(url)
        except Exception as e:
            souci("%s : %s" % (url, e))
            continue
        pb = aplatir(page)
        texte_page = " ".join(b["texte"] for b in pb[:40])
        mode = mode_depuis_texte(nom + " " + texte_page)
        if not mode:
            continue

        top = []
        for sec in sections(pb, r"(best|top) brawlers?|ranked picks?|tier list"):
            for b in sec:
                if b["type"] == "lien" and b["texte"]:
                    k = clef(b["texte"])
                    if k and k not in [clef(x[0]) for x in top]:
                        top.append([b["texte"], None])
        if not top:
            continue

        ancienne = par_nom.get(clef(nom))
        cartes.append({
            "id": re.sub(r"[^a-z0-9]+", "-", nom.lower()).strip("-"),
            "img": ancienne["img"] if ancienne else None,
            "nom": nom,
            "mode": mode,
            "top": top[:8],
        })

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
    return json.dumps(valeur, ensure_ascii=False)


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


def deboguer(net, quoi):
    """Affiche ce que le parseur voit, pour ajuster vite si le site change."""
    url = {"counters": BASE_CALC + "/counters/mortis/",
           "maps": BASE_CALC + "/maps/"}.get(quoi)
    if not url:
        raise SystemExit("--debug attend 'counters' ou 'maps'")
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
    ap.add_argument("--debug", metavar="PAGE", help="'counters' ou 'maps'")
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
        cartes = scraper_cartes(net, tr, cartes_actuelles(html))
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
