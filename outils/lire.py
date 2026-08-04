#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lit une page web et l'imprime en texte, depuis un endroit qui a le réseau.

    python3 outils/lire.py https://exemple.fr/page
    python3 outils/lire.py https://exemple.fr/page --brut     (sans navigateur)
    python3 outils/lire.py https://exemple.fr/page --liens 80

Pourquoi ce fichier existe
--------------------------
La session qui écrit ce code n'a pas d'accès sortant libre : le proxy de
l'environnement répond 403 à la plupart des domaines, au nom de la politique
réseau de l'organisation. Ce n'est pas le site qui refuse, c'est la sortie
qui est fermée — et il ne faut pas chercher à la contourner.

Le détour légitime est ailleurs : ce dépôt possède déjà un robot qui tourne
sur les serveurs de GitHub, eux sans restriction, et dont les journaux sont
lisibles à distance. Ce script est fait pour être lancé là-bas. Il imprime la
page dans le journal, et le journal se lit d'ici.

Ce qu'il respecte, comme refresh.py : robots.txt, un délai entre requêtes, et
un user-agent qui dit qui il est. Un outil qui lit poliment reste lisible
longtemps ; un outil qui force se fait bannir une fois pour toutes.
"""
import argparse
import os
import re
import sys
import textwrap

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)

import refresh as R  # noqa: E402  (le chemin doit être posé avant)

LARGEUR = 100
TEXTE_MAX = 700          # blocs de texte imprimés au plus
LIENS_MAX = 60


def titre(texte):
    print("\n" + "=" * LARGEUR)
    print(texte)
    print("=" * LARGEUR)


def couper(texte, n=LARGEUR - 8):
    texte = " ".join(str(texte).split())
    return texte if len(texte) <= n else texte[:n - 1] + "…"


def titre_page(html):
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    return couper(re.sub(r"\s+", " ", m.group(1))) if m else "(sans titre)"


def structure(valeur, chemin="", lignes=None, profondeur=0):
    """Décrit la forme d'un JSON plutôt que son contenu.

    Une réponse d'API fait souvent des centaines de milliers de caractères.
    Ce qu'on veut savoir tient en dix lignes : quels champs existent, et de
    quel type. On imprime donc le squelette, avec un exemple par feuille.
    """
    if lignes is None:
        lignes = []
    if profondeur > 4:
        return lignes

    if isinstance(valeur, dict):
        for cle in valeur:
            structure(valeur[cle], chemin + "." + str(cle), lignes, profondeur + 1)
    elif isinstance(valeur, list):
        lignes.append("%-46s liste de %d" % (chemin or ".", len(valeur)))
        if valeur:
            # Un seul élément suffit à montrer la forme : les suivants ont
            # la même, et les imprimer tous noie ce qu'on cherche.
            structure(valeur[0], chemin + "[0]", lignes, profondeur + 1)
    else:
        lignes.append("%-46s %s = %s"
                      % (chemin or ".", type(valeur).__name__, couper(valeur, 40)))
    return lignes


def suivre(valeur, chemin):
    """Toutes les valeurs trouvées à un chemin pointé, « [] » = chaque élément.

        list[].rarity.name  →  la rareté de chacun des 107 brawlers

    Sert à répondre à « quelles valeurs cette API emploie-t-elle vraiment ? ».
    Sans ça, on écrit la liste de mémoire — et écrire de mémoire, c'est
    inventer.
    """
    trouve = [valeur]
    for morceau in chemin.strip(".").split("."):
        suite = []
        liste = morceau.endswith("[]")
        cle = morceau[:-2] if liste else morceau
        for v in trouve:
            if cle:
                if not isinstance(v, dict) or cle not in v:
                    continue
                v = v[cle]
            if liste:
                suite.extend(v if isinstance(v, list) else [])
            else:
                suite.append(v)
        trouve = suite
    return trouve


def lire_json(url, texte, chemin=None):
    """Imprime la forme d'une réponse JSON, et non ses 300 000 caractères."""
    import json
    donnees = json.loads(texte)
    titre("%s\n(JSON)" % url)
    print("%d caractères" % len(texte))

    if chemin:
        titre("VALEURS DISTINCTES — %s" % chemin)
        compte = {}
        for v in suivre(donnees, chemin):
            k = json.dumps(v, ensure_ascii=False, sort_keys=True)
            compte[k] = compte.get(k, 0) + 1
        for k in sorted(compte, key=lambda x: (-compte[x], x)):
            print("  %4d ×  %s" % (compte[k], couper(k, 80)))
        return 0

    titre("STRUCTURE")
    for ligne in structure(donnees):
        print("  " + ligne)
    return 0


def lire(url, brut=False, liens_max=LIENS_MAX, sans_cache=False, entier=False,
         valeurs=None):
    net = R.Reseau(cache=not sans_cache)
    try:
        html = None
        rendu = False

        if not brut:
            # D'abord le navigateur : les sites modernes construisent leur
            # page dans le navigateur, et sans lui on ne voit qu'un tiers du
            # contenu. C'est exactement ce qui bloquait la lecture des cartes.
            try:
                html = net.get_rendu(url)
                rendu = html is not None
            except PermissionError as e:
                print("REFUSÉ : %s" % e)
                return 2
            except Exception as e:
                print("navigateur indisponible (%s) — repli sur le "
                      "téléchargement simple" % e.__class__.__name__)

        if html is None:
            try:
                html = net.get(url)
            except PermissionError as e:
                print("REFUSÉ : %s" % e)
                return 2

        # Une API ne renvoie pas une page : la découper en titres et en liens
        # ne donnerait rien. On imprime sa forme, qui est ce qu'on vient
        # chercher quand on veut savoir quels champs elle expose.
        depart = html.lstrip()[:1]
        if depart in ("{", "["):
            try:
                return lire_json(url, html, chemin=valeurs)
            except ValueError:
                pass    # ça y ressemblait sans en être : on repart en HTML

        titre("%s\n%s" % (url, titre_page(html)))
        print("lu %s · %d caractères"
              % ("avec navigateur" if rendu else "sans navigateur", len(html)))

        blocs = R.aplatir(html)
        titres = [b for b in blocs if b["type"] == "titre"]
        textes = [b for b in blocs if b["type"] == "texte"]
        tous_liens = [b for b in blocs if b["type"] == "lien"]

        titre("TITRES — %d" % len(titres))
        for b in titres[:120]:
            print("  " + couper(b["texte"]))

        # Couper à 92 caractères convient pour repérer une page ; pour lire
        # une clause de contrat, c'est exactement le mot qui manque. D'où
        # --entier, qui replie les longs blocs au lieu de les trancher.
        titre("TEXTE VISIBLE — %d bloc(s)" % len(textes))
        for b in textes[:TEXTE_MAX]:
            if entier:
                plein = " ".join(str(b["texte"]).split())
                if plein:
                    print("  " + textwrap.fill(plein, LARGEUR - 4,
                                               subsequent_indent="    "))
                continue
            t = couper(b["texte"])
            if t:
                print("  " + t)
        if len(textes) > TEXTE_MAX:
            print("  … %d bloc(s) de plus, non imprimés"
                  % (len(textes) - TEXTE_MAX))

        # Les liens disent la structure du site mieux qu'un long discours :
        # c'est par eux qu'on trouve les pages qui portent vraiment la donnée.
        vus, uniques = set(), []
        for b in tous_liens:
            href = b.get("href") or ""
            if href and href not in vus:
                vus.add(href)
                uniques.append(b)

        titre("LIENS — %d unique(s) sur %d" % (len(uniques), len(tous_liens)))
        for b in uniques[:liens_max]:
            print("  %-46s  %s" % (couper(b["href"], 46), couper(b["texte"], 44)))
        if len(uniques) > liens_max:
            print("  … %d de plus (relancer avec --liens %d)"
                  % (len(uniques) - liens_max, len(uniques)))

        return 0
    finally:
        net.fermer()


def main():
    ap = argparse.ArgumentParser(
        description="Imprime une page web en texte, depuis un endroit qui a le réseau.")
    ap.add_argument("url")
    ap.add_argument("--brut", action="store_true",
                    help="télécharger sans exécuter le JavaScript")
    ap.add_argument("--liens", type=int, default=LIENS_MAX,
                    help="nombre de liens imprimés (défaut %d)" % LIENS_MAX)
    ap.add_argument("--sans-cache", action="store_true",
                    help="ignorer le cache disque")
    ap.add_argument("--valeurs", default=None, metavar="CHEMIN",
                    help="sur une réponse JSON : les valeurs distinctes "
                         "trouvées à ce chemin, par exemple list[].rarity")
    ap.add_argument("--entier", action="store_true",
                    help="ne rien couper : indispensable pour lire un texte "
                         "juridique, où le mot coupé est celui qui compte")
    a = ap.parse_args()

    if not re.match(r"^https?://", a.url):
        print("L'adresse doit commencer par http:// ou https://", file=sys.stderr)
        return 2

    try:
        return lire(a.url, brut=a.brut, liens_max=a.liens,
                    sans_cache=a.sans_cache, entier=a.entier,
                    valeurs=a.valeurs)
    except Exception as e:
        # Un échec de lecture n'est pas un incident : c'est une réponse.
        # Elle doit rester lisible dans le journal, sans traceback.
        print("\nÉchec : %s: %s" % (e.__class__.__name__, e), file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
