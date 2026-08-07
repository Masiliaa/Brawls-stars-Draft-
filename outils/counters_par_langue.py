#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère counters-fr.js, counters-en.js et counters-es.js depuis counters.js.

    python3 outils/counters_par_langue.py            # écrit
    python3 outils/counters_par_langue.py --essai    # dit seulement ce qu'il ferait

Pourquoi ce script existe
-------------------------
counters.js porte les explications de matchup dans les trois langues à la
fois : 155 Ko de français, 126 d'anglais, 6,6 d'espagnol. Un utilisateur n'en
lit qu'une. Les deux autres partaient quand même à chaque ouverture — 133 Ko
téléchargés pour rien sur un téléphone, en 4G, dans un salon d'attente.

L'app détecte déjà la langue (navigator.languages, ou le choix enregistré).
Il ne manquait que des données qui suivent cette langue.

Ce qu'il ne fait PAS, et c'est le point
---------------------------------------
Il ne restructure rien. counters.js reste la SOURCE, avec ses marqueurs
@DATA: et ses objets {"en":…,"fr":…} : refresh.py, appliquer_traductions.py
et fusionner_traductions.py continuent d'écrire exactement là où ils
écrivaient. C'est la chaîne qui garde les données honnêtes ; on ne la touche
pas pour gagner 133 Ko.

counters.js n'est simplement plus servi au navigateur : index.html ne le
charge pas, et app.js demande counters-<langue>.js.

Le repli entre langues est conservé
-----------------------------------
phraseCounter() servait la langue demandée, sinon l'anglais, sinon la
première disponible. Ce repli est appliqué ICI, à la génération : le fichier
français porte la phrase française quand elle existe, l'anglaise sinon. Le
comportement à l'écran est donc identique, à la lettre près.

Le décalage est impossible à oublier : tests/t_refresh.py régénère et compare.
Si counters.js change sans qu'on relance ce script, la CI le dit.
"""
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, "counters.js")
LANGUES = ("fr", "en", "es")
DEFAUT = "en"          # la langue d'origine des phrases

ENTETE = """/* counters-%(lg)s.js — qui bat qui, expliqué en %(nom)s.

   ENGENDRÉ par outils/counters_par_langue.py depuis counters.js.
   Ne pas modifier à la main : la prochaine génération écraserait tout.
   La source, celle qui porte les trois langues et que refresh.py écrit,
   c'est counters.js. Ce fichier-ci est ce que le navigateur télécharge.

   Il existe parce qu'un utilisateur ne lit qu'une langue : lui envoyer les
   trois, c'était 133 Ko pour rien à chaque ouverture. */

"""

NOMS = {"fr": "français", "en": "anglais", "es": "espagnol"}


def bloc_counters(source):
    m = re.search(r"/\* @DATA:COUNTERS \*/\n(.*?)\n/\* @END:COUNTERS \*/",
                  source, re.S)
    if not m:
        raise SystemExit("marqueur @DATA:COUNTERS introuvable dans counters.js")
    return m.group(1)


def lire_table(source):
    """La table COUNTERS, telle quelle. Le bloc est du JS très régulier :
    des clés entre guillemets, des tableaux, des objets JSON. On le convertit
    en JSON en ne touchant qu'aux deux noms de champ non guillemetés."""
    bloc = bloc_counters(source)
    corps = bloc[bloc.index("{"):bloc.rindex("}") + 1]
    corps = re.sub(r"(?<=[{,])(perd|bat):", r'"\1":', corps)
    return json.loads(corps)


def js(valeur):
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


def phrase_pour(texte, lg):
    """La phrase dans la langue voulue, sinon l'anglais, sinon la première.

    Reproduit exactement ce que phraseCounter() faisait à l'exécution — mieux
    vaut une phrase dans la mauvaise langue que pas d'explication du tout."""
    if isinstance(texte, str):
        return texte
    if not isinstance(texte, dict) or not texte:
        return ""
    if texte.get(lg):
        return texte[lg]
    if texte.get(DEFAUT):
        return texte[DEFAUT]
    for v in texte.values():
        if v:
            return v
    return ""


def rendre(table, lg):
    """Le même objet COUNTERS, avec une chaîne au lieu d'un objet de langues."""
    lignes = ["var COUNTERS={"]
    cles = sorted(table)
    for i, k in enumerate(cles):
        v = table[k]
        parts = []
        for sens in ("perd", "bat"):
            entrees = ",".join(
                "[%s,%s]" % (js(cible), js(phrase_pour(txt, lg)))
                for cible, txt in v.get(sens, []))
            parts.append("%s:[%s]" % (sens, entrees))
        lignes.append("%s:{%s}%s" % (js(k), ",".join(parts),
                                     "};" if i == len(cles) - 1 else ","))
    if not cles:
        return "var COUNTERS={};"
    return "\n".join(lignes)


def fichiers_attendus(source=None):
    """{nom de fichier: contenu} — sans rien écrire. Sert aussi aux tests."""
    if source is None:
        source = open(SOURCE, encoding="utf-8").read()
    table = lire_table(source)
    out = {}
    for lg in LANGUES:
        nom = "counters-%s.js" % lg
        out[nom] = (ENTETE % {"lg": lg, "nom": NOMS[lg]}
                    + rendre(table, lg) + "\nvar COUNTERS_PRET = true;\n")
    return out


def main():
    essai = "--essai" in sys.argv[1:]
    attendus = fichiers_attendus()
    change = 0
    for nom, contenu in sorted(attendus.items()):
        chemin = os.path.join(RACINE, nom)
        avant = open(chemin, encoding="utf-8").read() if os.path.exists(chemin) else ""
        etat = "inchangé" if avant == contenu else "à écrire"
        if avant != contenu:
            change += 1
            if not essai:
                open(chemin, "w", encoding="utf-8").write(contenu)
                etat = "écrit"
        print("  %-16s %8.1f Ko   %s" % (nom, len(contenu.encode()) / 1024, etat))
    if essai and change:
        print("\n--essai : %d fichier(s) seraient réécrits." % change)
        return 1
    print("\n%d fichier(s) modifié(s)." % change)
    return 0


if __name__ == "__main__":
    sys.exit(main())
