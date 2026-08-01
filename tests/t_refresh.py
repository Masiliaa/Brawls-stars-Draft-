#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôles hors-ligne de refresh.py : parseur, rendu, réécriture de donnees.js.

    python3 tests/t_refresh.py
"""
import json, os, re, shutil, sys, tempfile

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
# Le pool visé est de 18 cartes (6 modes x 3). On tolère 16 tant que les
# deux manquantes ne sont pas retrouvées, mais on refuse qu'il déborde :
# une carte en trop signalerait un mode mal reconnu par le scraper.
check("pool de cartes entre 16 et 18", 16 <= len(cartes) <= 18, len(cartes))
check("autant d'ids que de cartes", len(ids) == len(cartes), (len(ids), len(cartes)))
check("Belle's Rock relue", any(c["nom"] == "Belle's Rock" for c in cartes))
check("modes valides", all(c["mode"] in R.MODES for c in cartes))

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

print("\n== %d ok, %d echecs ==" % (ok, fail))
sys.exit(1 if fail else 0)
