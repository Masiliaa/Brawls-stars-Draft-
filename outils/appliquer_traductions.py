#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recopie data/traductions.json dans le bloc COUNTERS de donnees.js.

    python3 outils/appliquer_traductions.py            # écrit
    python3 outils/appliquer_traductions.py --essai    # dit seulement ce qu'il ferait

refresh.py fait déjà ce travail, mais seulement quand il relève les données —
donc seulement quand il a le réseau. Traduire une phrase entre deux relevés
laissait la traduction dans data/traductions.json sans qu'elle arrive jamais
dans l'app. Ce script comble ce trou : il ne va sur aucun site, il ne touche
qu'aux objets {"en":…} déjà présents, et il n'ajoute que des langues — le
texte anglais d'origine, lui, n'est jamais réécrit.
"""
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Le bloc COUNTERS a quitté donnees.js — il en faisait 322 Ko sur 335, et
# l'app l'attendait avant d'afficher quoi que ce soit. Ce script ne touche
# qu'à ce bloc : seul le fichier qui le porte a changé, pas son format ni
# ses marqueurs.
CIBLE = os.path.join(RACINE, "counters.js")
TABLE = os.path.join(RACINE, "data", "traductions.json")
LANGUES = ("fr", "es")

# Un objet de phrase : {"en":"…"} ou {"en":"…","fr":"…"}. Pas d'accolade à
# l'intérieur, donc [^{}] suffit à en trouver la fin sans compter les niveaux.
MOTIF_PHRASE = re.compile(r'\{"en":"((?:[^"\\]|\\.)*)"([^{}]*)\}')


def js(valeur):
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


def appliquer(html, table):
    debut = html.index("/* @DATA:COUNTERS */")
    fin = html.index("/* @END:COUNTERS */")
    bloc = html[debut:fin]
    ajouts = [0]

    def remplacer(m):
        anglais = json.loads('"%s"' % m.group(1))
        deja = json.loads("{" + '"en":"%s"%s' % (m.group(1), m.group(2)) + "}")
        trads = table.get(anglais) or {}
        if isinstance(trads, str):          # ancien format : une seule langue
            trads = {"fr": trads}
        sortie = {"en": anglais}
        for code in LANGUES:
            valeur = deja.get(code) or trads.get(code)
            if valeur:
                sortie[code] = " ".join(valeur.split())
                if not deja.get(code):
                    ajouts[0] += 1
        return js(sortie)

    return html[:debut] + MOTIF_PHRASE.sub(remplacer, bloc) + html[fin:], ajouts[0]


def main():
    essai = "--essai" in sys.argv[1:]
    table = json.load(open(TABLE, encoding="utf-8")) if os.path.exists(TABLE) else {}
    html = open(CIBLE, encoding="utf-8").read()
    neuf, ajouts = appliquer(html, table)

    if not ajouts:
        print("donnees.js est déjà à jour — rien à recopier")
        return 0
    if essai:
        print("%d traduction(s) seraient recopiées dans donnees.js" % ajouts)
        return 0
    open(CIBLE, "w", encoding="utf-8").write(neuf)
    print("%d traduction(s) recopiées dans donnees.js" % ajouts)
    return 0


if __name__ == "__main__":
    sys.exit(main())
