#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Demande une partie classée à Supercell et montre ce qu'elle contient.

    export BS_CLE="la longue clé copiée sur developer.brawlstars.com"
    python3 outils/sonde_api.py

Pourquoi ce fichier existe
--------------------------
Une seule question, à laquelle personne n'a su répondre sans regarder :
**est-ce que Supercell dit à quel palier de classé une partie a été jouée ?**

Si oui, l'app peut un jour dire « 57 % en Master » au lieu de « 57 % toutes
parties confondues ». Si non, personne ne peut le faire honnêtement, et la
question est close pour de bon — pas par supposition, par lecture.

La documentation officielle est derrière un compte, donc elle ne se lit pas
à distance. Une partie réelle, si.

Ce script ne modifie rien, n'enregistre rien, et n'affiche jamais la clé.
Il fait deux appels : un joueur du classement mondial, puis ses dernières
parties. Aucun compte personnel n'est nécessaire.
"""
import json
import os
import ssl
import sys
import urllib.error
import urllib.request

BASE = "https://api.brawlstars.com/v1"


def appeler(chemin, cle):
    requete = urllib.request.Request(
        BASE + chemin,
        headers={"Authorization": "Bearer " + cle, "Accept": "application/json"})
    with urllib.request.urlopen(requete, timeout=25,
                                context=ssl.create_default_context()) as r:
        return json.loads(r.read().decode("utf-8"))


def expliquer_erreur(e):
    """Les trois échecs possibles, dits en français plutôt qu'en code HTTP."""
    if getattr(e, "code", None) == 403:
        return ("Clé refusée. C'est presque toujours l'adresse IP : une clé "
                "Supercell n'est valable que depuis l'adresse déclarée en la "
                "créant. Ouvre developer.brawlstars.com, regarde l'adresse "
                "que le site affiche, et vérifie qu'elle correspond à celle "
                "de la clé. Si tu as changé de réseau ou de box, il faut la "
                "mettre à jour.")
    if getattr(e, "code", None) == 429:
        return "Trop d'appels d'un coup. Attends une minute et relance."
    if getattr(e, "code", None) == 503:
        return "L'API est en maintenance (souvent pendant les mises à jour du jeu)."
    return "Échec réseau : %s" % e


def chemins_interessants(objet, prefixe=""):
    """Aplatit un objet JSON en « chemin = valeur », pour tout voir d'un coup."""
    sortie = []
    if isinstance(objet, dict):
        for k, v in objet.items():
            sortie += chemins_interessants(v, prefixe + "." + k if prefixe else k)
    elif isinstance(objet, list):
        # Une seule entrée par liste suffit à en montrer la forme.
        if objet:
            sortie += chemins_interessants(objet[0], prefixe + "[0]")
    else:
        sortie.append((prefixe, objet))
    return sortie


def main():
    cle = (os.environ.get("BS_CLE") or "").strip()
    if not cle:
        print("Aucune clé trouvée.\n")
        print("1. Va sur https://developer.brawlstars.com et crée un compte.")
        print("2. My Account → Create New Key. Le site propose déjà ton")
        print("   adresse IP : accepte-la telle quelle.")
        print("3. Copie la clé, puis dans ce Terminal :\n")
        print('   export BS_CLE="colle-la-clé-ici"')
        print("   python3 outils/sonde_api.py\n")
        print("La clé reste sur ta machine. Ne l'envoie à personne, moi compris.")
        return 2

    try:
        print("→ un joueur du classement mondial…")
        classement = appeler("/rankings/global/players?limit=1", cle)
        joueurs = classement.get("items") or []
        if not joueurs:
            print("Le classement est vide, ce qui n'arrive normalement jamais.")
            return 1
        tag = joueurs[0]["tag"]
        print("  %s (%s)" % (joueurs[0].get("name", "?"), tag))

        print("→ ses dernières parties…")
        journal = appeler("/players/%s/battlelog" % tag.replace("#", "%23"), cle)
    except urllib.error.HTTPError as e:
        print("\n" + expliquer_erreur(e))
        return 1
    except Exception as e:
        print("\nÉchec : %s: %s" % (e.__class__.__name__, e))
        return 1

    parties = journal.get("items") or []
    print("  %d partie(s) reçues\n" % len(parties))

    # On cherche une partie classée : c'est le seul cas qui nous intéresse.
    classees = [p for p in parties
                if "ranked" in str((p.get("battle") or {}).get("type", "")).lower()]
    echantillon = classees[0] if classees else (parties[0] if parties else None)
    if not echantillon:
        print("Aucune partie à montrer. Relance plus tard.")
        return 1

    if not classees:
        print("⚠ Aucune partie CLASSÉE dans ce journal — ce joueur n'en a pas")
        print("  joué récemment. La partie ci-dessous est d'un autre mode :")
        print("  relance le script, il prendra un autre joueur.\n")

    print("=" * 72)
    print("CE QUE SUPERCELL DONNE POUR UNE PARTIE")
    print("=" * 72)
    for chemin, valeur in chemins_interessants(echantillon):
        print("  %-46s %s" % (chemin, valeur))

    print("\n" + "=" * 72)
    print("LA RÉPONSE À LA QUESTION")
    print("=" * 72)
    plat = dict(chemins_interessants(echantillon))
    mots = ("rank", "league", "tier", "trophy", "trophies")
    pistes = [(c, v) for c, v in plat.items()
              if any(m in c.lower() for m in mots)]
    if pistes:
        print("Champs qui pourraient porter le palier :")
        for c, v in pistes:
            print("  %-46s %s" % (c, v))
        print("\nCopie ces lignes dans la conversation — pas la clé.")
    else:
        print("Aucun champ de palier, de ligue ou de trophée dans cette partie.")
        print("Si c'était bien une partie classée, la réponse est donc non :")
        print("le palier n'est pas publié, et personne ne peut le calculer")
        print("honnêtement à partir de cette source.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
