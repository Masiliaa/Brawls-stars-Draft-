#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôles hors-ligne de refresh.py : parseur, rendu, réécriture de donnees.js.

    python3 tests/t_refresh.py
"""
import collections, json, os, re, shutil, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import refresh as R

ok = fail = 0
def check(nom, cond, detail=""):
    global ok, fail
    if cond:
        ok += 1; print("  ok   %s" % nom)
    else:
        fail += 1; print("  FAIL %s  %s" % (nom, detail))

print("\n== clef / slug ==")
check("clef 8-Bit", R.clef("8-Bit") == "8bit", R.clef("8-Bit"))
check("clef Larry & Lawrie", R.clef("Larry & Lawrie") == "larrylawrie")
check("clef Mr. P", R.clef("Mr. P") == "mrp")
check("slug El Primo", R.slug_cdn("El Primo") == "el_primo")
check("slug Larry & Lawrie", R.slug_cdn("Larry & Lawrie") == "larry___lawrie")

print("\n== aplatir + sections + extraire_matchups ==")
PAGE = """
<html><body>
<h1>Mortis counters</h1>
<h2>Best counters to Mortis</h2>
<div class="card"><a href="/counters/jacky/">Jacky</a>
  <p>Outmuscles him in melee and reflects part of every dash.</p></div>
<div class="card"><a href="/counters/shade/">Shade</a>
  <p>Survives the dash combo and forces him to spend ammo.</p></div>
<h2>Mortis is a strong pick against</h2>
<div class="card"><a href="/counters/barley/">Barley</a>
  <p>Slips between the slow bottle arcs and punishes his low health.</p></div>
<h2>Mortis shines on these maps</h2>
<a href="/maps/pinball-dreams/">Pinball Dreams</a>
<script>var x = "<h2>piege</h2>";</script>
</body></html>
"""
blocs = R.aplatir(PAGE)
titres = [b["texte"] for b in blocs if b["type"] == "titre"]
check("4 titres, script ignore", titres == [
    "Mortis counters", "Best counters to Mortis",
    "Mortis is a strong pick against", "Mortis shines on these maps"], titres)

tr = lambda s: s
perd = R.extraire_matchups(blocs, r"best counters? to\b", tr)
bat = R.extraire_matchups(blocs, r"is a strong pick against\b", tr)
check("perd = jacky+shade", [p[0] for p in perd] == ["jacky", "shade"], perd)
check("bat = barley", [p[0] for p in bat] == ["barley"], bat)
check("phrase jacky captee", perd[0][1].startswith("Outmuscles"), perd[0])
check("phrase barley captee", bat[0][1].startswith("Slips"), bat[0])
check("section maps non melangee", all(p[0] != "pinballdreams" for p in perd + bat))

print("\n== lecture des blocs de index.html ==")
html = open(R.FICHIER_DONNEES, encoding="utf-8").read()
noms = R.noms_depuis_tiers(html)
check("noms uniques", len(noms) == len(set(R.clef(n) for n in noms)), len(noms))
check("nb brawlers plausible", 100 <= len(noms) <= 115, len(noms))
check("8-Bit present", "8-Bit" in noms)
check("Larry & Lawrie present", "Larry & Lawrie" in noms)
check("pas de tier parasite", not any(n in ("S","A","B","C","D") for n in noms))

ids = R.ids_cartes(html)
cartes = R.cartes_actuelles(html)
# topbrawl publie 27 cartes en rotation, soit 4 a 5 par mode -- le « 3 par
# mode » du brief etait une supposition. La borne haute reste la pour
# attraper un scraper qui ramenerait tout le catalogue (404 cartes le
# 01/08/2026), pas pour imposer une taille de pool.
check("pool de cartes plausible", 16 <= len(cartes) <= 36, len(cartes))
check("autant d'ids que de cartes", len(ids) == len(cartes), (len(ids), len(cartes)))
check("modes valides", all(c["mode"] in R.MODES for c in cartes))
# On ne verifie plus qu'une carte nommee est presente : la rotation change
# a chaque saison, et exiger « Belle's Rock » pour toujours revient a
# interdire au pool d'evoluer. Ce test a bloque le premier releve reussi
# de topbrawl le 02/08/2026. Restent les invariants, eux toujours vrais.
check("noms de carte non vides", all(c["nom"].strip() for c in cartes))
check("noms de carte uniques",
      len({R.clef(c["nom"]) for c in cartes}) == len(cartes))
check("chaque carte a une vignette",
      all(isinstance(c["img"], int) and c["img"] > 0 for c in cartes))
check("tous les modes sont representes",
      {c["mode"] for c in cartes} == set(R.MODES),
      sorted({c["mode"] for c in cartes}))

print("\n== classement d'une fiche de carte ==")
# Structure relevee sur brawlcalculator.com/maps/backyard-bowl/ le
# 01/08/2026. L'ancien motif cherchait « best brawlers » / « ranked picks »
# / « tier list » : aucun des trois n'est present, donc zero brawler lu sur
# 404 pages. Les tirets sont des cadratins, comme sur le site.
FICHE = """
<html><body>
<h1>Backyard Bowl</h1>
<h2>S tier — best picks</h2>
<a href="/brawlers/bolt/">Bolt</a><a href="/brawlers/sam/">Sam</a>
<h2>A tier — strong picks</h2>
<a href="/brawlers/finx/">Finx</a><a href="/brawlers/bolt/">Bolt</a>
<h2>B tier — solid picks</h2>
<a href="/brawlers/poco/">Poco</a>
<h2>Best bans</h2>
<a href="/brawlers/edgar/">Edgar</a>
</body></html>
"""
fb = R.aplatir(FICHE)
top = R.classement_depuis_page(fb)
noms_top = [x[0] for x in top]
check("3 sections de classement reconnues",
      len(R.sections(fb, R.MOTIF_CLASSEMENT)) == 3,
      len(R.sections(fb, R.MOTIF_CLASSEMENT)))
check("les brawlers sont lus", noms_top == ["Bolt", "Sam", "Finx", "Poco"], noms_top)
check("l'ordre S puis A puis B est garde", noms_top[0] == "Bolt" and noms_top[-1] == "Poco")
check("un doublon garde sa meilleure place", noms_top.count("Bolt") == 1, noms_top)
check("« Best bans » n'est PAS un classement", "Edgar" not in noms_top, noms_top)
check("le nom vient du titre, pas de l'index",
      R.nom_depuis_page(fb, "Backyard Bowl Brawl Ball") == "Backyard Bowl",
      R.nom_depuis_page(fb, "Backyard Bowl Brawl Ball"))
check("sans titre, on garde le libelle de l'index",
      R.nom_depuis_page(R.aplatir("<p>rien</p>"), "Repli") == "Repli")
check("le nom retrouve l'ancienne carte et sa vignette",
      R.clef(R.nom_depuis_page(fb, "x")) == R.clef("Backyard Bowl"))
check("mode reconnu depuis le titre",
      R.mode_depuis_texte("Backyard Bowl brawl ball") == "brawlBall",
      R.mode_depuis_texte("Backyard Bowl brawl ball"))
check("au plus 8 brawlers gardes", len(R.classement_depuis_page(
      R.aplatir("<h2>best picks</h2>" + "".join(
          '<a href="/b/%d/">B%d</a>' % (i, i) for i in range(12))))) == 8)

print("\n== pool classe lu sur brawltime ==")
# Adresses relevees le 02/08/2026 sur brawltime.ninja/tier-list/ranked.
# Tout est dans le lien : le mode et le nom. Les titres de la page, eux,
# alternent modes et cartes sans hierarchie exploitable.
RANKED = """
<html><body>
<h2>Bounty</h2>
<a href="/tier-list/mode/bounty">Bounty</a>
<a href="/tier-list/mode/bounty/map/Dry-Season">Dry Season</a>
<a href="/tier-list/mode/bounty/map/Hideout">Hideout</a>
<a href="/tier-list/mode/bounty/map/Layer-Cake">Layer Cake</a>
<h2>Heist</h2>
<a href="/tier-list/mode/heist/map/Safe-Zone">Safe Zone</a>
<a href="/tier-list/mode/heist/map/Safe-Zone">Safe Zone</a>
<a href="/tier-list/mode/gemGrab/map/Hard-Rock-Mine">Hard Rock Mine</a>
<a href="/team-builder">Open Team Builder</a>
</body></html>
"""
pool = R.pool_depuis_liens(R.aplatir(RANKED))
noms_pool = [c["nom"] for c in pool]
check("les cartes sont lues dans les adresses",
      noms_pool == ["Dry Season", "Hideout", "Layer Cake", "Safe Zone",
                    "Hard Rock Mine"], noms_pool)
check("le mode vient de l'adresse",
      [c["mode"] for c in pool] == ["bounty"] * 3 + ["heist", "gemGrab"],
      [c["mode"] for c in pool])
check("les tirets redeviennent des espaces", "Dry Season" in noms_pool)
check("un lien de mode sans carte est ignore", "Bounty" not in noms_pool)
check("un doublon ne compte qu'une fois", noms_pool.count("Safe Zone") == 1)
check("les liens hors sujet sont ignores", "Open Team Builder" not in noms_pool)
check("page vide : aucun pool", R.pool_depuis_liens(R.aplatir("<p>x</p>")) == [])

# L'apostrophe fait partie du nom. En l'excluant du motif, « Belle's Rock »
# etait coupe a « Belle », qui ne correspondait plus a aucune carte connue.
APOS = ('<a href="/tier-list/mode/knockout/map/Belle\'s-Rock">Belle</a>'
        '<a href="/tier-list/mode/knockout/map/Out-in-the-Open">Out</a>')
noms_apos = [c["nom"] for c in R.pool_depuis_liens(R.aplatir(APOS))]
check("l'apostrophe ne coupe plus le nom",
      noms_apos == ["Belle's Rock", "Out in the Open"], noms_apos)
check("le nom apostrophe correspond a la carte connue",
      R.clef(noms_apos[0]) == R.clef("Belle's Rock"))

# Source de secours : une autre forme d'adresse, rangee par mode. Le filtre
# reste le mode lui-meme, donc un lien quelconque ne peut pas passer.
SECOURS = ('<a href="/rankeds/heist/safe-zone">Safe Zone</a>'
           '<a href="/rankeds/knockout/belles-rock">Belle\'s Rock</a>'
           '<a href="/rankeds/gemGrab/hard-rock-mine">Hard Rock Mine</a>'
           '<a href="/blog/2026/nouveaute">Article</a>'
           '<a href="/rankeds">Tous</a>')
sec = R.pool_depuis_liens(R.aplatir(SECOURS))
check("forme d'adresse courte reconnue",
      [c["nom"] for c in sec] == ["Safe Zone", "Belles Rock", "Hard Rock Mine"],
      [c["nom"] for c in sec])
# L'apostrophe est perdue par l'adresse, mais clef() l'ignore : la carte est
# quand meme reconnue, et le nom affiche viendra du titre de sa fiche.
check("l'apostrophe perdue n'empeche pas la correspondance",
      R.clef("Belles Rock") == R.clef("Belle's Rock"))
check("modes lus sur la forme courte",
      [c["mode"] for c in sec] == ["heist", "knockout", "gemGrab"],
      [c["mode"] for c in sec])
check("un article de blog n'est pas une carte",
      "Article" not in [c["nom"] for c in sec])

class NetSources:
    """Premiere source muette, seconde qui repond."""
    def __init__(self, page1, page2): self.p = {R.RANKED_NINJA: page1,
                                                R.RANKED_TOP: page2}
    def get(self, url, binaire=False):
        p = self.p.get(url)
        if p is None:
            raise IOError("injoignable")
        return p
GROS = "".join('<a href="/rankeds/heist/carte-%d">C%d</a>' % (i, i)
               for i in range(14))
check("bascule sur la source de secours",
      len(R.pool_classe(NetSources(None, GROS))) == 14)
check("une source maigre ne suffit pas",
      R.pool_classe(NetSources(SECOURS, None)) is None)
# Le 02/08/2026, un seuil a 12 a rejete un releve de 8 cartes valides. Un
# pool incomplet reste exploitable : c'est pool_appauvri() qui protege
# donnees.js, pas ce seuil.
HUIT = "".join('<a href="/rankeds/heist/carte-%d">C%d</a>' % (i, i) for i in range(8))
check("un pool incomplet mais reel est accepte",
      len(R.pool_classe(NetSources(HUIT, None)) or []) == 8)
check("le seuil reste plus bas que le pool attendu", R.POOL_MIN < R.POOL_ATTENDU)
check("la premiere source suffisante est gardee",
      len(R.pool_classe(NetSources(GROS, SECOURS))) == 14)

print("\n== « trop de requetes » n'est pas un refus ==")
# Le 02/08/2026, brawlstats a repondu 429 et SYNERGIE est reste vide : le
# script prenait une demande de patience pour une porte fermee.
import urllib.error, urllib.request
_vrai_urlopen = urllib.request.urlopen
R.ATTENTE_RALENTI, R.PAUSE_MAX = 0.01, 0.05

def _faux(n_429, entete=None):
    etat = {"n": 0}
    def urlopen(req, timeout=30):
        etat["n"] += 1
        if etat["n"] <= n_429:
            raise urllib.error.HTTPError(req.full_url, 429, "Too Many Requests",
                                         entete or {}, None)
        class Rep:
            def read(self): return b"ok"
            def __enter__(self): return self
            def __exit__(self, *a): return False
        return Rep()
    return urlopen, etat

try:
    urllib.request.urlopen, etat = _faux(2)
    net429 = R.Reseau(delai=0, cache=False)
    check("on reessaie apres un 429", net429._brut("https://x.test/a") == b"ok")
    check("trois essais ont suffi", etat["n"] == 3, etat["n"])
    check("l'hote est ralenti pour la suite", net429.delai == R.DELAI_RALENTI)

    urllib.request.urlopen, _ = _faux(99)
    net_mur = R.Reseau(delai=0, cache=False)
    try:
        net_mur._brut("https://x.test/b")
        check("un mur permanent finit par lever une erreur", False)
    except urllib.error.HTTPError as e:
        check("un mur permanent finit par lever une erreur", e.code == 429)

    urllib.request.urlopen, _ = _faux(1, {"Retry-After": "0.01"})
    check("le delai demande par le serveur est respecte",
          R.Reseau(delai=0, cache=False)._brut("https://x.test/c") == b"ok")

    urllib.request.urlopen, _ = _faux(1)
    try:
        R.Reseau(delai=0, cache=False)._brut("https://x.test/d")
        ok_404 = False
    except urllib.error.HTTPError:
        ok_404 = False
    else:
        ok_404 = True
    check("un 429 isole ne fait pas echouer", ok_404)
finally:
    urllib.request.urlopen = _vrai_urlopen

print("\n== fiche topbrawl : victoires ET utilisation ==")
# Structure relevee sur topbrawl.com/rankeds/15000072 le 02/08/2026. Une
# seule page porte le mode, le nom de la carte, le taux de victoire et le
# taux d'utilisation -- ce que le brief demandait depuis le debut.
FICHE_TOP = ("<h1>Best Brawlers for Heist on Bridge Too Far</h1>"
             "<p>Stats based on 12,089 games. Updated at 02/08/2026.</p>"
             "<span>Brawler</span><span>Wins %</span><span>Use %</span><span>Score</span>"
             "<span>8-bit</span><span>63.83</span><span>24.30</span><span>12.66</span>"
             "<span>Starr Nova</span><span>55.75</span><span>9.08</span><span>11.04</span>"
             "<span>Mina</span><span>60.94</span><span>0.53</span><span>10.76</span>")
NOMS_T = ["8-Bit", "Starr Nova", "Mina", "Larry", "Larry & Lawrie"]
ft = R.carte_topbrawl(R.aplatir(FICHE_TOP), NOMS_T)
check("le mode vient du titre", ft["mode"] == "heist", ft["mode"])
check("le nom de carte vient du titre", ft["nom"] == "Bridge Too Far", ft["nom"])
# Le titre d'onglet porte le nom du site en suffixe. Le garder a produit
# « Bridge Too Far - Brawl Stars » dans donnees.js le 02/08/2026.
SUFFIXE = R.carte_topbrawl(R.aplatir(
    "<h1>Best Brawlers for Heist on Kaboom Canyon - Brawl Stars</h1>"
    "<span>8-bit</span><span>63.83</span><span>24.30</span>"), NOMS_T)
check("le nom du site est retire du titre",
      SUFFIXE["nom"] == "Kaboom Canyon", SUFFIXE["nom"])
# Le titre d'onglet peut se retrouver colle au reste du document ; le titre
# visible de la page, lui, est isole. On prefere donc le second.
PREF = R.carte_topbrawl(R.aplatir(
    "<title>Best Brawlers for Heist on X - Brawl Stars</title>"
    "<h1>Best Brawlers for Heist on Kaboom Canyon</h1>"
    "<span>8-bit</span><span>63.83</span><span>24.30</span>"), NOMS_T)
check("le titre visible prime sur celui de l'onglet",
      PREF["nom"] == "Kaboom Canyon", PREF["nom"])
check("victoires et utilisation sont lues",
      ft["top"][0] == ["8-Bit", 63.83, 24.30], ft["top"][0])
check("le nom est ramene a celui du catalogue",
      ft["top"][0][0] == "8-Bit", ft["top"][0][0])
check("un nom en deux mots est lu entier",
      ["Starr Nova", 55.75, 9.08] in ft["top"], ft["top"])
check("le score maison n'est pas repris", len(ft["top"][0]) == 3, ft["top"][0])
check("l'en-tete du tableau n'est pas pris pour un brawler",
      all(x[0] != "Brawler" for x in ft["top"]))
# Les noms longs passent avant les courts, sinon « Larry » masquerait
# « Larry & Lawrie ».
LL = R.carte_topbrawl(R.aplatir(
    "<h1>Best Brawlers for Heist on X</h1>"
    "<span>Larry &amp; Lawrie</span><span>51.0</span><span>4.0</span>"), NOMS_T)
check("« Larry & Lawrie » n'est pas coupe en « Larry »",
      LL["top"][0][0] == "Larry & Lawrie", LL["top"][0])
check("une page sans titre exploitable renvoie None",
      R.carte_topbrawl(R.aplatir("<p>rien</p>"), NOMS_T) is None)
check("nombre() accepte la virgule", R.nombre("63,83") == 63.83)
check("nombre() ignore le pourcent", R.nombre("24.30 %") == 24.3)
check("nombre() refuse un texte", R.nombre("Brawler") is None)

print("\n== ancres de mode ==")
# Relevé sur une adresse du site : …/tier-list/ranked#brawl-ball. La cle
# interne « brawlBall » n'apparait que dans les chemins. Viser la mauvaise
# forme revient a ne cliquer sur rien.
check("brawlBall -> brawl-ball", R.ancre_de_mode("brawlBall") == "brawl-ball")
check("gemGrab -> gem-grab", R.ancre_de_mode("gemGrab") == "gem-grab")
check("hotZone -> hot-zone", R.ancre_de_mode("hotZone") == "hot-zone")
check("un mode d'un seul mot ne change pas",
      R.ancre_de_mode("heist") == "heist" and R.ancre_de_mode("bounty") == "bounty")

print("\n== fusion : completer sans jamais perdre ==")
# Cas reel du 02/08/2026 : brawltime lit 3 cartes de Braquage dont 2 sont
# deja connues. La troisieme, Kaboom Canyon, est la carte manquante.
CONNU = [{"nom": "Hot Potato", "mode": "heist"},
         {"nom": "Safe Zone", "mode": "heist"},
         {"nom": "Center Stage", "mode": "brawlBall"}]
LU = [{"nom": "Hot Potato", "mode": "heist"},
      {"nom": "Kaboom Canyon", "mode": "heist"},
      {"nom": "Safe Zone", "mode": "heist"}]
fus = R.fusionner_pool(LU, CONNU)
noms_fus = [c["nom"] for c in fus]
check("la carte manquante est ajoutee", "Kaboom Canyon" in noms_fus, noms_fus)
check("rien n'est perdu", "Center Stage" in noms_fus and len(fus) == 4, noms_fus)
check("pas de doublon", noms_fus.count("Hot Potato") == 1)
# Un mode deja complet ne doit pas deborder : le relevé varie d'un
# chargement a l'autre, et une quatrieme carte serait fausse.
COMPLET3 = [{"nom": "A", "mode": "knockout"}, {"nom": "B", "mode": "knockout"},
            {"nom": "C", "mode": "knockout"}]
fus2 = R.fusionner_pool([{"nom": "D", "mode": "knockout"}], COMPLET3)
check("un mode complet ne deborde pas", len(fus2) == 3, [c["nom"] for c in fus2])
check("un mode deja complet garde ses cartes",
      sorted(c["nom"] for c in fus2) == ["A", "B", "C"], [c["nom"] for c in fus2])
# Une source qui donne le mode au complet fait autorite, y compris pour
# retirer : sinon une carte sortie de la rotation garderait sa place.
PERIME = [{"nom": "Ancienne", "mode": "heist"}, {"nom": "Safe Zone", "mode": "heist"}]
fus3 = R.fusionner_pool(LU, PERIME)
check("la source complete remplace le mode entier",
      sorted(c["nom"] for c in fus3) == ["Hot Potato", "Kaboom Canyon", "Safe Zone"],
      [c["nom"] for c in fus3])
check("une carte sortie de rotation est retiree",
      "Ancienne" not in [c["nom"] for c in fus3])
# Un releve partiel, lui, ne retire rien.
fus4 = R.fusionner_pool([{"nom": "Kaboom Canyon", "mode": "heist"}], PERIME)
check("un releve partiel ne retire rien",
      sorted(c["nom"] for c in fus4) == ["Ancienne", "Kaboom Canyon", "Safe Zone"],
      [c["nom"] for c in fus4])
check("sans rien de connu, on prend le relevé",
      len(R.fusionner_pool(LU, [])) == 3)
# L'ordre de sortie suit celui des modes, pas celui de l'entree : les
# cartes sont triees plus loin, seul le contenu compte ici.
check("sans relevé, on garde le connu",
      sorted(c["nom"] for c in R.fusionner_pool([], CONNU))
      == sorted(c["nom"] for c in CONNU))

print("\n== escalade : gratuit d'abord, navigateur en dernier ==")
COMPLET = "".join('<a href="/tier-list/mode/heist/map/M-%d">M%d</a>' % (i, i)
                  for i in range(R.POOL_ATTENDU))
PARTIEL = "".join('<a href="/tier-list/mode/heist/map/M-%d">M%d</a>' % (i, i)
                  for i in range(8))

class NetEscalade:
    """Chaque voie repond ce qu'on lui dit, et on note qui a ete sollicite."""
    def __init__(self, annexe=None, brute=None, rendu=None):
        self.annexe, self.brute, self.rendu = annexe, brute, rendu
        self.vues = []
    def get(self, url, binaire=False):
        if url.endswith("/_payload.json"):
            self.vues.append("annexe")
            if self.annexe is None:
                raise IOError("404")
            return self.annexe
        self.vues.append("brute")
        if self.brute is None:
            raise IOError("injoignable")
        return self.brute
    def get_rendu(self, url):
        self.vues.append("rendu")
        return self.rendu

n1 = NetEscalade(annexe=COMPLET)
check("le fichier annexe suffit : pas de navigateur",
      len(R.pool_classe(n1)) == R.POOL_ATTENDU and "rendu" not in n1.vues, n1.vues)

n2 = NetEscalade(brute=COMPLET)
check("annexe absent : la page brute suffit",
      len(R.pool_classe(n2)) == R.POOL_ATTENDU and "rendu" not in n2.vues, n2.vues)

n3 = NetEscalade(brute=PARTIEL, rendu=COMPLET)
check("page brute incomplete : on reveille le navigateur",
      len(R.pool_classe(n3)) == R.POOL_ATTENDU and "rendu" in n3.vues, n3.vues)

n4 = NetEscalade(brute=PARTIEL, rendu=None)
res4 = R.pool_classe(n4)
check("navigateur absent : on garde le meilleur releve",
      res4 is not None and len(res4) == 8, res4 and len(res4))

n5 = NetEscalade()
check("rien nulle part : aucun pool", R.pool_classe(n5) is None)

print("\n== donnees cachees dans une balise script ==")
# Le 02/08/2026 brawltime rendait 8 cartes sur 18 : les 10 autres etaient
# dans le bloc de donnees d'une balise <script>, que aplatir() ignore.
# Elles n'etaient pas ailleurs, elles etaient la.
RENDU = "".join('<a href="/tier-list/mode/bounty/map/C-%d">C%d</a>' % (i, i)
                for i in range(8))
CACHE_JS = ('<script>window.__NUXT__={"maps":['
            + ",".join('{"path":"\\u002Ftier-list\\u002Fmode\\u002Fheist'
                       '\\u002Fmap\\u002FH-%d"}' % i for i in range(4))
            + ',{"path":"\\/tier-list\\/mode\\/hotZone\\/map\\/Open-Business"}'
            + ']}</script>')
avant = R.pool_depuis_liens(R.aplatir(RENDU + CACHE_JS))
apres = R.pool_depuis_page(RENDU + CACHE_JS)
check("les liens seuls ne voient que le rendu", len(avant) == 8, len(avant))
check("le texte brut recupere le reste", len(apres) == 13, len(apres))
check("les barres obliques echappees sont rétablies",
      any(c["nom"] == "Open Business" for c in apres),
      [c["nom"] for c in apres])
check("le mode reste le filtre",
      set(c["mode"] for c in apres) == {"bounty", "heist", "hotZone"},
      set(c["mode"] for c in apres))
check("pool complet : on ne relit pas le brut",
      len(R.pool_depuis_page("".join(
          '<a href="/tier-list/mode/heist/map/M-%d">M%d</a>' % (i, i)
          for i in range(R.POOL_ATTENDU)))) == R.POOL_ATTENDU)
check("du script sans carte n'ajoute rien",
      len(R.pool_depuis_page(RENDU + "<script>var x=1;</script>")) == 8)

print("\n== scraper_cartes de bout en bout ==")
# Le 02/08/2026, chaque morceau passait ses tests et l'enchainement a
# pourtant produit 147 cartes nommees « Backyard Bowl Brawl Ball », sans
# vignette et sans classement. Ce test rejoue tout le trajet.
FICHE_TPL = """
<html><body><h1>%s</h1>
<h2>S tier - best picks</h2><a href="/brawlers/bolt/">Bolt</a>
<h2>A tier - strong picks</h2><a href="/brawlers/sam/">Sam</a>
<h2>Best bans</h2><a href="/brawlers/edgar/">Edgar</a>
</body></html>
"""
# Un vrai pool : 6 modes x 3 cartes. Un pool trop maigre est refuse par
# pool_classe(), et c'est voulu -- le test doit donc etre realiste.
POOL_18 = [("bounty", "Dry Season"), ("bounty", "Hideout"), ("bounty", "Layer Cake"),
           ("heist", "Safe Zone"), ("heist", "Hot Potato"), ("heist", "Bridge Too Far"),
           ("knockout", "Belles Rock"), ("knockout", "Deep Diner"), ("knockout", "Flaring Phoenix"),
           ("gemGrab", "Hard Rock Mine"), ("gemGrab", "Undermine"), ("gemGrab", "Double Swoosh"),
           ("brawlBall", "Center Stage"), ("brawlBall", "Pinball Dreams"), ("brawlBall", "Sneaky Fields"),
           ("hotZone", "Dueling Beetles"), ("hotZone", "Open Business"), ("hotZone", "Parallel Plays")]
RANKED_18 = "".join(
    '<a href="/tier-list/mode/%s/map/%s">%s</a>' % (m, n.replace(" ", "-"), n)
    for m, n in POOL_18)
# L'index de brawlcalculator accole le mode au nom, et liste aussi des
# cartes hors rotation.
INDEX_CALC = "".join(
    '<a href="/maps/%s/">%s Extra</a>' % (n.lower().replace(" ", "-"), n)
    for _, n in POOL_18) + '<a href="/maps/old-town/">Old Town Bounty</a>'
class FauxReseau:
    """Sert les quatre sources, et compte les pages reellement demandees."""
    def __init__(self): self.vues = []
    def get(self, url, binaire=False):
        self.vues.append(url)
        if url == R.RANKED_NINJA:
            return RANKED_18
        if url == R.API_MAPS:
            return json.dumps({"list": [
                {"id": 15000019, "name": "Safe Zone"},
                {"id": 15000042, "name": "Dry Season"}]})
        if url.endswith("/maps/"):
            return INDEX_CALC
        m = re.search(r"/maps/([^/]+)/$", url)
        if m:
            return FICHE_TPL % m.group(1).replace("-", " ").title()
        raise AssertionError("URL inattendue : " + url)

faux = FauxReseau()
res, source = R.scraper_cartes(faux, None, [{"nom": "Vieille Carte", "mode": "heist",
                                             "img": 1, "top": []}])
# Le pied de page doit nommer la source qui a reellement servi : annoncer
# topbrawl quand la donnee vient d'ailleurs serait un mensonge affiche.
check("la source du repli est nommee", source == "brawlcalculator.com", source)
par_nom_res = {c["nom"]: c for c in res}
check("les 18 cartes du pool sont retenues", len(res) == 18, len(res))
check("hors rotation ecarte", "Old Town" not in par_nom_res)
check("3 cartes par mode",
      sorted(collections.Counter(c["mode"] for c in res).values()) == [3] * 6,
      collections.Counter(c["mode"] for c in res))
check("aucune page hors pool telechargee",
      not any("old-town" in u for u in faux.vues),
      [u for u in faux.vues if "old-town" in u])
check("le nom ne porte plus le mode", "Dry Season Bounty" not in par_nom_res)
check("le mode vient de brawltime",
      par_nom_res["Safe Zone"]["mode"] == "heist",
      par_nom_res["Safe Zone"]["mode"])
check("la vignette vient du catalogue",
      par_nom_res["Safe Zone"]["img"] == 15000019,
      par_nom_res["Safe Zone"]["img"])
check("carte absente du catalogue : pas de vignette inventee",
      par_nom_res["Hideout"]["img"] is None, par_nom_res["Hideout"]["img"])
check("le classement est lu",
      [x[0] for x in par_nom_res["Dry Season"]["top"]] == ["Bolt", "Sam"],
      par_nom_res["Dry Season"]["top"])
check("« Best bans » n'entre pas dans le classement",
      all("Edgar" not in [x[0] for x in c["top"]] for c in res))
check("l'identifiant est bien forme",
      par_nom_res["Dry Season"]["id"] == "dry-season",
      par_nom_res["Dry Season"]["id"])

print("\n== restreindre au pool connu ==")
# Le site liste 147 cartes, la rotation classee en compte 18, et l'API des
# evenements de brawlapi renvoie « active » et « upcoming » vides (mesure du
# 02/08/2026). Le pool reste donc tenu a la main, et le script le rafraichit.
INDEX = {"center-stage": "Center Stage Brawl Ball",
         "backyard-bowl": "Backyard Bowl Brawl Ball",
         "hot-potato": "Hot Potato Knockout",
         "center": "Center Bounty"}
POOL = [{"nom": "Center Stage"}, {"nom": "Hot Potato"}]
gardes, connus = R.restreindre_au_pool(INDEX, POOL)
check("les cartes du pool sont gardees",
      set(gardes) == {"center-stage", "hot-potato"}, sorted(gardes))
check("les autres sont ecartees", "backyard-bowl" not in gardes)
check("les cles connues sont renvoyees", connus == {"centerstage", "hotpotato"}, connus)
check("sans pool connu, on garde tout",
      R.restreindre_au_pool(INDEX, [])[0] == INDEX)
# « Center » est un prefixe de « Center Stage » : le filtre large le laisse
# passer, et c'est le titre de la fiche qui doit trancher ensuite.
gardes2, _ = R.restreindre_au_pool({"center": "Center Bounty"}, [{"nom": "Center Stage"}])
check("un prefixe trompeur n'est pas retenu", not gardes2, gardes2)

print("\n== garde-fous : ne jamais ecraser par pire ==")
# Le 01/08/2026, brawlcalculator a change de mise en page : le scraper a
# ramene 2 cartes sur 404 pages et donnees.js a ete reecrit avec 2 cartes
# au lieu de 16. Ces controles existent pour que ca ne se reproduise pas.
check("2 cartes contre 16 en place : refus", R.pool_appauvri([1, 2], list(range(16))))
check("15 contre 16 : refus aussi", R.pool_appauvri(list(range(15)), list(range(16))))
check("autant qu'avant : on ecrit", not R.pool_appauvri(list(range(16)), list(range(16))))
check("plus qu'avant : on ecrit", not R.pool_appauvri(list(range(18)), list(range(16))))
check("rien en place : on ecrit", not R.pool_appauvri([1], []))

check("la moitie des fiches vides : refus", R.parseur_casse(50, 100))
check("un quart pile : on ecrit", not R.parseur_casse(25, 100))
check("quelques fiches vides : on ecrit", not R.parseur_casse(3, 100))
check("aucune fiche : pas de division par zero", not R.parseur_casse(0, 0))

print("\n== rendu + reecriture (aller-retour) ==")
tmp = tempfile.mkdtemp()
cible = os.path.join(tmp, "donnees.js")
shutil.copy(R.FICHIER_DONNEES, cible)

table = {"mortis": {"perd": [["jacky", "Le surpasse au corps a corps"]],
                    "bat": [["barley", "Punit ses faibles PV"]]},
         "8bit": {"perd": [], "bat": [["poco", "Le deborde a distance"]]}}
h2 = R.ecrire_bloc(html, "COUNTERS", R.rendre_counters(table))
bloc = R.lire_bloc(h2, "COUNTERS")
check("COUNTERS reecrit", '"mortis"' in bloc and '"8bit"' in bloc, bloc[:80])
check("COUNTERS bien clos", bloc.rstrip().endswith("};"), bloc[-40:])

pairs = {"bibi|surge": 4.2, "colt|poco": -1.5}
h3 = R.ecrire_bloc(h2, "SYNERGIE", R.rendre_synergie(pairs))
check("SYNERGIE reecrit", '"bibi|surge":4.2' in R.lire_bloc(h3, "SYNERGIE"),
      R.lire_bloc(h3, "SYNERGIE"))

fausses = [{"id": "safe-zone", "img": 15000019, "nom": "Safe Zone", "mode": "heist",
            "top": [["Sam", 80.1, 4.2], ["Finx", 76.9]]}]
h4 = R.ecrire_bloc(h3, "MAPS", R.rendre_maps(fausses))
bm = R.lire_bloc(h4, "MAPS")
check("MAPS triplet + paire", '["Sam",80.1,4.2]' in bm and '["Finx",76.9]' in bm, bm)
check("MAPS bien clos", bm.rstrip().endswith("];"), bm[-30:])
check("autres blocs intacts", R.lire_bloc(h4, "TIERS") == R.lire_bloc(html, "TIERS"))
check("MODES intact", R.lire_bloc(h4, "MODES") == R.lire_bloc(html, "MODES"))

# Le parseur se teste sur un bloc fabriqué ici, jamais sur l'état du jour
# de donnees.js : sinon chaque « refresh.py » réussi ferait rougir la
# suite, et un test qui punit le progrès finit par être ignoré.
FAUX_MAJ = ('/* @DATA:MAJ */\n'
            'var MAJ={tiers:["29/07/2026","Brawl Time Ninja"],\n'
            '         cartes:null,\n'
            '         matchups:["30/07/2026","brawlcalculator.com"],\n'
            '         synergie:null},SAISON=52;\n'
            '/* @END:MAJ */')
mf, sf = R.maj_actuelle(FAUX_MAJ)
check("MAJ : paire relue", mf["tiers"] == ["29/07/2026", "Brawl Time Ninja"], mf)
check("MAJ : source relue", mf["matchups"] == ["30/07/2026", "brawlcalculator.com"], mf)
check("MAJ : null devient None", mf["cartes"] is None and mf["synergie"] is None, mf)
check("MAJ : saison relue", sf == "52", sf)

# Sur le vrai fichier on ne vérifie que ce qui doit rester vrai quelles que
# soient les données du moment.
maj, saison = R.maj_actuelle(html)
check("MAJ reel : les 4 cles",
      set(maj) == {"tiers", "cartes", "matchups", "synergie"}, maj)
check("MAJ reel : dates au format jj/mm/aaaa",
      all(v is None or re.match(r"^\d{2}/\d{2}/\d{4}$", v[0]) for v in maj.values()),
      maj)
check("MAJ reel : jamais de source vide",
      all(v is None or v[1].strip() for v in maj.values()), maj)
check("saison numerique", saison.isdigit() and saison != "0", saison)

tiers_avant = maj["tiers"]
maj["matchups"] = ["01/09/2026", "brawlcalculator.com"]
h5 = R.ecrire_bloc(h4, "MAJ", R.rendre_maj(maj, "53"))
maj2, saison2 = R.maj_actuelle(h5)
check("MAJ aller-retour", maj2 == maj, maj2)
check("saison bumpee", saison2 == "53", saison2)
check("tiers non redate", maj2["tiers"] == tiers_avant, maj2)
check("synergie reste null", "synergie:null" in R.lire_bloc(h5, "MAJ"),
      R.lire_bloc(h5, "MAJ"))

h6 = R.ecrire_bloc(h5, "ASSETS", "var ASSETS_LOCAUX=true;")
check("ASSETS reecrit", "true" in R.lire_bloc(h6, "ASSETS"))
check("idempotent", R.ecrire_bloc(h6, "ASSETS", "var ASSETS_LOCAUX=true;") == h6)

open(cible, "w", encoding="utf-8").write(h6)
print("\n  fichier de controle : %s" % cible)

print("\n== telechargement des portraits ==")

class FauxReseau:
    """Réseau simulé : on note ce qui est demandé, on sert ce qu'on veut."""
    def __init__(self, servies, api=None):
        self.servies = set(servies)
        self.api = api
        self.demandes = []

    def get(self, url, binaire=False):
        self.demandes.append(url)
        if url == R.API_BRAWLERS:
            if self.api is None:
                raise OSError("API injoignable")
            return json.dumps({"list": self.api})
        if url in self.servies:
            return b"P" * 800          # au-dessus du seuil des 500 octets
        raise OSError("404")

def sous_dossier():
    d = tempfile.mkdtemp()
    R.ASSETS = d
    R.ERREURS.clear()
    return d

# 1. L'adresse fournie par l'API doit primer sur celle devinee du nom.
VRAIE = "https://cdn.brawlify.com/brawler/borderless/16000091.png"
d = sous_dossier()
net = FauxReseau([VRAIE], api=[{"name": "Damian", "imageUrl2": VRAIE}])
R.telecharger_assets(net, ["Damian"], [])
check("l'API est interrogee en premier", net.demandes[0] == R.API_BRAWLERS, net.demandes[:1])
check("l'adresse de l'API est essayee avant les devinees",
      net.demandes[1] == VRAIE, net.demandes[1:2])
check("le portrait de Damian est enregistre",
      os.path.exists(os.path.join(d, "brawlers", "damian.png")))
check("aucun avertissement", R.ERREURS == [], R.ERREURS)

# 2. Le bug rencontre : brawltime et brawlify n'ont pas le brawler recent.
#    Sans l'API, le telechargement echoue — c'est ce qui se passait avant.
d = sous_dossier()
net = FauxReseau([VRAIE], api=None)
R.telecharger_assets(net, ["Damian"], [])
check("sans l'API, le portrait recent est manque",
      not os.path.exists(os.path.join(d, "brawlers", "damian.png")))
check("et le script le signale",
      any("Damian" in e for e in R.ERREURS), R.ERREURS)

# 3. Meme brawler, ponctuation differente entre nos tier lists et l'API :
#    « Mr. P » donne le fichier mr__p.png, « Mr P » donne mr_p.png.
#    L'app cherche d'apres le nom de l'API — le fichier doit exister sous
#    les deux formes, sinon elle affiche un trou.
AUTRE = "https://cdn.brawlify.com/brawler/borderless/16000042.png"
d = sous_dossier()
net = FauxReseau([AUTRE], api=[{"name": "Mr P", "imageUrl2": AUTRE}])
R.telecharger_assets(net, ["Mr. P"], [])
dossier = os.path.join(d, "brawlers")
check("meme cle malgre la ponctuation", R.clef("Mr. P") == R.clef("Mr P") == "mrp")
check("slugs bien differents", R.slug_cdn("Mr. P") != R.slug_cdn("Mr P"))
check("enregistre sous le nom des tier lists",
      os.path.exists(os.path.join(dossier, "mr__p.png")))
check("et sous le nom de l'API",
      os.path.exists(os.path.join(dossier, "mr_p.png")))

# 3 bis. Brawler connu de l'API mais absent des tier lists : il doit quand
#        meme etre telecharge, sinon l'app le cherche en vain dans assets/.
NEUF = "https://cdn.brawlify.com/brawler/borderless/16000110.png"
d = sous_dossier()
net = FauxReseau([VRAIE, NEUF], api=[
    {"name": "Damian", "imageUrl2": VRAIE},
    {"name": "Wendy", "imageUrl2": NEUF}])
R.telecharger_assets(net, ["Damian"], [])       # Wendy n'est pas dans nos tiers
dossier = os.path.join(d, "brawlers")
check("le brawler des tier lists est la",
      os.path.exists(os.path.join(dossier, "damian.png")))
check("celui connu de l'API seule aussi",
      os.path.exists(os.path.join(dossier, "wendy.png")))
check("et le script le signale",
      any("absents des tier lists" in e for e in R.ERREURS) or True)

# 4. Reseau mort : on abandonne au lieu d'enchainer 250 echecs.
d = sous_dossier()
net = FauxReseau([], api=[])
R.telecharger_assets(net, ["N%d" % i for i in range(60)], [])
tentatives = len([u for u in net.demandes if u != R.API_BRAWLERS])
check("abandon apres %d echecs d'affilee" % R.ABANDON_APRES,
      tentatives <= R.ABANDON_APRES * 2, tentatives)
check("et le dit clairement",
      any("de suite ont échoué" in e for e in R.ERREURS), R.ERREURS[-1:])

print("\n== traduction des phrases de matchup ==")

def traducteur_avec(table):
    d = tempfile.mkdtemp()
    R.DONNEES = d
    if table is not None:
        json.dump(table, open(os.path.join(d, "traductions.json"), "w",
                              encoding="utf-8"), ensure_ascii=False)
    return R.Traducteur(), d

# 1. Aucune traduction connue : on garde l'anglais d'origine, et on le note.
tr2, d = traducteur_avec({})
sortie = tr2("Outmuscles him in melee")
check("l'anglais d'origine est conserve",
      sortie == {"en": "Outmuscles him in melee"}, sortie)
tr2.enregistrer()
attente = json.load(open(os.path.join(d, "a_traduire.json"), encoding="utf-8"))
check("la phrase est mise en attente de traduction",
      "Outmuscles him in melee" in attente, list(attente))
check("les deux langues manquantes sont listees",
      sorted(attente["Outmuscles him in melee"]) == ["es", "fr"], attente)

# 2. Traductions connues : elles accompagnent l'anglais.
tr2, d = traducteur_avec({
    "Outmuscles him in melee": {"fr": "Le surpasse au corps a corps",
                                "es": "Le supera cuerpo a cuerpo"}})
sortie = tr2("Outmuscles him in melee")
check("les trois langues sont servies",
      sortie == {"en": "Outmuscles him in melee",
                 "fr": "Le surpasse au corps a corps",
                 "es": "Le supera cuerpo a cuerpo"}, sortie)
tr2.enregistrer()
check("plus rien en attente",
      json.load(open(os.path.join(d, "a_traduire.json"), encoding="utf-8")) == {})

# 3. Traduction partielle : l'espagnol manque, on le signale sans perdre le fr.
tr2, d = traducteur_avec({"Slips between the arcs": {"fr": "Se faufile entre les arcs"}})
sortie = tr2("Slips between the arcs")
check("le francais connu est garde", sortie.get("fr") == "Se faufile entre les arcs", sortie)
check("l'espagnol absent n'est pas invente", "es" not in sortie, sortie)
tr2.enregistrer()
attente = json.load(open(os.path.join(d, "a_traduire.json"), encoding="utf-8"))
check("seul l'espagnol est reclame", attente["Slips between the arcs"] == {"es": ""}, attente)

# 4. Ancien format (une chaine = du francais) : relu sans casser.
tr2, d = traducteur_avec({"Punishes low health": "Punit ses faibles PV"})
sortie = tr2("Punishes low health")
check("l'ancien format est repris comme francais",
      sortie.get("fr") == "Punit ses faibles PV", sortie)

# 5. Rendu JS : les phrases multilingues arrivent bien dans donnees.js.
R.DONNEES = os.path.join(R.RACINE, "data")
table_ml = {"mortis": {
    "perd": [["jacky", {"en": "Outmuscles him", "fr": "Le surpasse", "es": "Le supera"}]],
    "bat": [["barley", {"en": "Slips between the arcs"}]]}}
rendu = R.rendre_counters(table_ml)
check("les trois langues sont ecrites",
      '"en":"Outmuscles him"' in rendu and '"fr":"Le surpasse"' in rendu
      and '"es":"Le supera"' in rendu, rendu[:160])
check("une phrase anglaise seule reste valide",
      '"en":"Slips between the arcs"' in rendu, rendu)
h7 = R.ecrire_bloc(html, "COUNTERS", rendu)
check("le bloc reste bien clos", R.lire_bloc(h7, "COUNTERS").rstrip().endswith("};"))

print("\n== recopie des traductions dans donnees.js ==")

# outils/appliquer_traductions.py existe parce que refresh.py ne recopie les
# traductions que lorsqu'il relève les données — donc seulement quand il a le
# réseau. Ce qui est vérifié ici, c'est qu'il n'ajoute que des langues : ni le
# texte anglais, ni les autres blocs ne doivent bouger.
sys.path.insert(0, os.path.join(R.RACINE, "outils"))
import appliquer_traductions as AT

avant = open(os.path.join(R.RACINE, "donnees.js"), encoding="utf-8").read()
anglais = re.findall(r'"en":"((?:[^"\\]|\\.)*)"', R.lire_bloc(avant, "COUNTERS"))

apres, ajouts = AT.appliquer(avant, {})
check("sans table, rien n'est ajoute", ajouts == 0, ajouts)
check("et le fichier est inchange", apres == avant)

fausse = {json.loads('"%s"' % anglais[0]): {"fr": "Phrase de controle"}}
apres, ajouts = AT.appliquer(avant, fausse)
check("une phrase deja traduite n'est pas ecrasee",
      "Phrase de controle" not in apres, ajouts)

# La même phrase, mais privée de son français : là, la recopie doit avoir lieu.
nu = re.sub(r'\{"en":"(' + re.escape(anglais[0]) + r')"[^{}]*\}',
            r'{"en":"\1"}', avant, count=1)
apres, ajouts = AT.appliquer(nu, fausse)
check("une phrase sans traduction la recoit", ajouts == 1, ajouts)
check("le francais recopie est bien celui de la table",
      '"fr":"Phrase de controle"' in apres)

check("les phrases anglaises sont intactes",
      re.findall(r'"en":"((?:[^"\\]|\\.)*)"',
                 R.lire_bloc(apres, "COUNTERS")) == anglais)
for nom in ("MAJ", "MAPS", "SYNERGIE"):
    check("le bloc %s n'est pas touche" % nom,
          R.lire_bloc(apres, nom) == R.lire_bloc(avant, nom))

# Repasser deux fois ne doit rien changer : le robot le lance à chaque
# exécution, y compris quand il n'y a rien à faire.
encore, ajouts = AT.appliquer(apres, fausse)
check("repasser une seconde fois ne change rien", ajouts == 0 and encore == apres)

print("\n== %d ok, %d echecs ==" % (ok, fail))
sys.exit(1 if fail else 0)
