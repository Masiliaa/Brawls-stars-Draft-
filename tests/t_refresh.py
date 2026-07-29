#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôles hors-ligne de refresh.py : parseur, rendu, réécriture des blocs."""
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
html = open(R.INDEX, encoding="utf-8").read()
noms = R.noms_depuis_tiers(html)
check("noms uniques", len(noms) == len(set(R.clef(n) for n in noms)), len(noms))
check("nb brawlers plausible", 100 <= len(noms) <= 115, len(noms))
check("8-Bit present", "8-Bit" in noms)
check("Larry & Lawrie present", "Larry & Lawrie" in noms)
check("pas de tier parasite", not any(n in ("S","A","B","C","D") for n in noms))

ids = R.ids_cartes(html)
check("16 ids de cartes", len(ids) == 16, len(ids))
cartes = R.cartes_actuelles(html)
check("16 cartes relues", len(cartes) == 16, len(cartes))
check("Belle's Rock relue", any(c["nom"] == "Belle's Rock" for c in cartes))
check("modes valides", all(c["mode"] in R.MODES for c in cartes))

print("\n== rendu + reecriture (aller-retour) ==")
tmp = tempfile.mkdtemp()
cible = os.path.join(tmp, "index.html")
shutil.copy(R.INDEX, cible)

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

maj, saison = R.maj_actuelle(html)
check("MAJ relu : tiers", maj["tiers"] == ["29/07/2026", "Brawl Time Ninja"], maj)
check("MAJ relu : matchups vide", maj["matchups"] is None, maj)
check("saison relue", saison == "52", saison)

maj["matchups"] = ["01/09/2026", "brawlcalculator.com"]
h5 = R.ecrire_bloc(h4, "MAJ", R.rendre_maj(maj, "53"))
maj2, saison2 = R.maj_actuelle(h5)
check("MAJ aller-retour", maj2 == maj, maj2)
check("saison bumpee", saison2 == "53", saison2)
check("tiers non redate", maj2["tiers"] == ["29/07/2026", "Brawl Time Ninja"], maj2)
check("synergie reste null", "synergie:null" in R.lire_bloc(h5, "MAJ"),
      R.lire_bloc(h5, "MAJ"))

h6 = R.ecrire_bloc(h5, "ASSETS", "var ASSETS_LOCAUX=true;")
check("ASSETS reecrit", "true" in R.lire_bloc(h6, "ASSETS"))
check("idempotent", R.ecrire_bloc(h6, "ASSETS", "var ASSETS_LOCAUX=true;") == h6)

open(cible, "w", encoding="utf-8").write(h6)
print("\n  fichier de controle : %s" % cible)

print("\n== %d ok, %d echecs ==" % (ok, fail))
sys.exit(1 if fail else 0)
