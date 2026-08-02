#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ajoute un lot de traductions à data/traductions.json, sans rien écraser.

    python3 outils/fusionner_traductions.py lot.json
    python3 outils/fusionner_traductions.py --reste 60 fr   (phrases à faire)

Les 1129 phrases d'explication des matchups viennent de brawlcalculator, en
anglais. Les traduire se fait par lots : ce script les accumule, vérifie
qu'elles correspondent bien à une phrase réellement présente dans
donnees.js, et refuse silencieusement tout le reste plutôt que de laisser
entrer une clé mal recopiée qui ne servirait jamais.
"""
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DONNEES = os.path.join(RACINE, "data")
CIBLE = os.path.join(DONNEES, "traductions.json")
LANGUES = ("fr", "es")


def phrases_du_projet():
    """Les phrases anglaises réellement présentes dans donnees.js."""
    h = open(os.path.join(RACINE, "donnees.js"), encoding="utf-8").read()
    bloc = re.search(r"/\* @DATA:COUNTERS \*/(.*?)/\* @END:COUNTERS \*/",
                     h, re.S).group(1)
    brutes = re.findall(r'\{"en":"((?:[^"\\]|\\.)*)"\}', bloc)
    return {json.loads('"%s"' % p) for p in brutes}


def charger():
    if not os.path.exists(CIBLE):
        return {}
    return json.load(open(CIBLE, encoding="utf-8"))


def fusionner(lot):
    connues = phrases_du_projet()
    table = charger()
    ajouts = inconnues = 0
    for phrase, trads in lot.items():
        if phrase not in connues:
            # Une clé qui ne correspond à aucune phrase du projet ne servira
            # jamais : autant le dire tout de suite que la garder en base.
            print("  ⚠ absente de donnees.js : " + phrase[:70])
            inconnues += 1
            continue
        entree = table.setdefault(phrase, {})
        for code in LANGUES:
            if trads.get(code) and not entree.get(code):
                entree[code] = " ".join(trads[code].split())
                ajouts += 1
    os.makedirs(DONNEES, exist_ok=True)
    with open(CIBLE, "w", encoding="utf-8") as f:
        json.dump(table, f, ensure_ascii=False, indent=1, sort_keys=True)
    return table, ajouts, inconnues


def etat(table, connues):
    faits = {c: sum(1 for p in connues if (table.get(p) or {}).get(c))
             for c in LANGUES}
    for c in LANGUES:
        print("  %s : %d / %d" % (c, faits[c], len(connues)))
    return faits


def main():
    args = sys.argv[1:]
    connues = phrases_du_projet()

    if args and args[0] == "--reste":
        combien = int(args[1]) if len(args) > 1 else 40
        # Une langue peut être traitée seule : le français d'abord, puisque
        # c'est celle de l'utilisateur. Sans ce filtre, chaque phrase
        # resterait « à faire » tant que l'espagnol manque.
        voulues = tuple(args[2:]) or LANGUES
        table = charger()
        reste = sorted(p for p in connues
                       if not all((table.get(p) or {}).get(c) for c in voulues))
        print(json.dumps(reste[:combien], ensure_ascii=False, indent=1))
        print("\n# restant : %d phrase(s)" % len(reste), file=sys.stderr)
        return 0

    if not args:
        table = charger()
        print("état des traductions :")
        etat(table, connues)
        return 0

    lot = json.load(open(args[0], encoding="utf-8"))
    table, ajouts, inconnues = fusionner(lot)
    print("%d traduction(s) ajoutée(s), %d clé(s) ignorée(s)" % (ajouts, inconnues))
    etat(table, connues)
    return 0


if __name__ == "__main__":
    sys.exit(main())
