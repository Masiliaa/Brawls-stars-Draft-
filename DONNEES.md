# État des données et des sources

Ce fichier dit, pour chaque bloc de `donnees.js`, d'où viennent les chiffres
et à quel point ils sont vérifiés. Il sert de garde-fou : tant qu'une source
n'est pas confirmée, le bloc correspondant reste vide et le pied de page de
l'app le dit à l'utilisateur.

## Ce qui bloque aujourd'hui

Les tâches 2 à 5 du brief demandent de récupérer des données sur
`brawlcalculator.com`, `brawlstats.net` et `brawltime.ninja`. **Aucun de ces
domaines n'est joignable depuis l'environnement où le code a été écrit** :
la passerelle réseau répond `403 Forbidden` à chaque tentative, y compris
sur `api.brawlapi.com` et les deux CDN d'images.

```
$ curl -sS https://brawlcalculator.com/counters/
curl: (56) CONNECT tunnel failed, response 403
```

Rien n'a donc été relevé, et **rien n'a été inventé pour compenser** :
`COUNTERS` et `SYNERGIE` sont livrés vides, `MAPS` est inchangé. Le travail
livré est la mécanique complète — moteur de score, format des données,
scraper, contrôles — prête à se remplir dès qu'elle tourne depuis un poste
non filtré.

Pour débloquer, au choix :

1. **Lancer `refresh.py` depuis ta machine.** C'est le chemin prévu. Une
   commande, aucune dépendance à installer.
2. **Autoriser les domaines dans l'environnement d'exécution.** Ils se
   règlent à la création de l'environnement — voir
   <https://code.claude.com/docs/en/claude-code-on-the-web>. Une fois
   ouverts, une nouvelle session peut faire le relevé elle-même.

## Sources, par bloc

| Bloc | Source | Vérifiée ? | État |
|---|---|---|---|
| `TIERS` | Brawl Time Ninja, saison 52 | oui, relevé manuel du 29/07/2026 | en place, non re-scrapé par `refresh.py` |
| `MAPS` | Brawl Time Ninja | oui, relevé manuel du 29/07/2026 | en place, **16 cartes sur 18**, sans taux d'utilisation |
| `COUNTERS` | `brawlcalculator.com/counters/` | structure décrite dans le brief, **jamais atteinte depuis ici** | vide |
| `SYNERGIE` | `brawlstats.net` | non vérifiée | vide |
| images | `media.brawltime.ninja`, `cdn.brawlify.com` | non joignables | chargées depuis les CDN, repli sur les initiales |

### Sur la nature de `COUNTERS`

Les matchups de brawlcalculator sont **un jugement d'experts** adossé aux
classements SpenLC, constitué à la main. Ce n'est pas une mesure statistique,
et le pied de page de l'app doit continuer de le dire. Ne pas reformuler
cette phrase en quelque chose qui sonnerait comme une mesure.

### Sur le seuil de 0,3 %

La tâche 4 demande d'écarter les brawlers sous 0,3 % de taux d'utilisation.
`refresh.py` sait appliquer ce filtre mais a besoin des taux, qu'aucune
source scrapée ne fournit encore. Tant que `data/userates.json` n'existe pas,
le script **le signale explicitement** au lieu de laisser croire que le
critère est tenu. Format attendu :

```json
{ "center-stage": { "bolt": { "wr": 73.1, "ur": 4.2 } } }
```

## Utilisation de `refresh.py`

```bash
python3 refresh.py --tout          # tâches 1 à 5
python3 refresh.py --counters      # table de matchups seule
python3 refresh.py --cartes        # pool de cartes + classements
python3 refresh.py --assets        # images en local, bascule ASSETS_LOCAUX
python3 refresh.py --blanc         # tout scraper sans écrire donnees.js
python3 refresh.py --debug counters # montre ce que le parseur lit
```

Bibliothèque standard uniquement — pas de `pip install`. Le script respecte
`robots.txt`, espace ses requêtes (`--delai`, 1,5 s par défaut) et met les
réponses en cache dans `.cache/` (`--ttl`, 7 jours).

**Codes de sortie** : `0` rien à signaler · `2` avertissements, blocs
concernés laissés en l'état · `3` échec inattendu, `donnees.js` non modifié.

### Si le parseur ne trouve rien

Les sélecteurs de `refresh.py` sont écrits d'après la description du brief,
**pas d'après le HTML réel** — il n'a jamais pu être lu depuis ici. Le
script est volontairement tolérant : il cherche des titres par expression
régulière plutôt que des classes CSS. S'il rapporte « structure changée » :

```bash
python3 refresh.py --debug counters
```

affiche les blocs vus par le parseur (type, texte, lien). Les motifs à
ajuster sont les expressions passées à `sections()` dans
`scraper_counters()` et `scraper_cartes()`.

## Traduction des explications

Les phrases de brawlcalculator sont en anglais. `refresh.py` ne traduit pas
tout seul :

- il réutilise `data/traductions.json` (clé = phrase anglaise, valeur = phrase
  française) ;
- il dépose les phrases inconnues dans `data/a_traduire.json` ;
- **les phrases non traduites restent en anglais dans l'app** — visibles,
  donc corrigeables, plutôt que faussement françaises.

Pour les traduire, remplir `data/traductions.json` puis relancer. Le cache
est persistant : une phrase traduite une fois ne revient plus.

## Tests

```bash
python3 tests/t_refresh.py                              # parseur, rendu, réécriture
(python3 -m http.server 8765 &) && node tests/t_app.js  # moteur dans Chromium
```

Le second exige `npm i playwright` et un Chromium — `CHROME=/chemin/vers/chrome`
si Playwright ne trouve pas le sien, `PORT=...` pour changer de port.

79 contrôles au total (36 + 43) : parseur HTML et aller-retour de réécriture
des blocs côté Python ; côté navigateur, absence d'erreur JS, tri des
conseils, exclusion des bans et des picks, repli du cycle de familles, bonus
et malus de matchup, plafond de synergie, formulations du pied de page,
chaîne de repli des images jusqu'aux initiales, persistance du roster et
parcours complet à l'écran.

Ils ont servi de filet lors du découpage en fichiers : le comportement est
resté identique d'un bout à l'autre de la réorganisation.

## Comment le code est organisé

Chaque fichier répond à une seule question. Ils se chargent dans cet ordre,
déclaré en bas de `index.html`.

| Fichier | À quoi il sert | Lignes |
|---|---|---|
| `index.html` | la page, presque vide : elle ne fait que charger le reste | 43 |
| `style.css` | toute l'apparence | 77 |
| `outils.js` | petites fonctions de base (nettoyer un nom, échapper du texte) | 51 |
| `donnees.js` | **d'où viennent les chiffres** — seul fichier réécrit par `refresh.py` | 84 |
| `etat.js` | ce que l'app retient : carte choisie, picks, brawlers cochés | 112 |
| `moteur.js` | **comment le brawler conseillé est calculé** | 313 |
| `vues.js` | comment tout ça est affiché | 305 |
| `app.js` | ce qui se passe quand on touche l'écran | 114 |

Ce sont des scripts classiques, pas des modules : aucun outil de
construction, et le tout fonctionne aussi en ouvrant le fichier directement.

**Par où commencer selon ce que tu cherches :**

- changer un chiffre → `donnees.js`
- comprendre pourquoi tel brawler est conseillé → `moteur.js`, les quatre
  fonctions `pointsDe…` / `pointsContre…` / `pointsAvec…`
- changer un texte ou une couleur à l'écran → `vues.js`, puis `style.css`
- changer ce que fait un bouton → `app.js`, dictionnaire `ACTIONS`

## Ce qui ne doit pas changer

- La clé `localStorage` reste `manager:roster` — un roster existant est déjà
  enregistré chez l'utilisateur.
- Ce qui est déployé : `index.html`, `style.css`, les six fichiers `.js`, et
  `assets/` si les images sont rapatriées. `refresh.py`, `tests/` et `data/`
  sont des outils de développement, ils ne sont pas nécessaires en ligne.
- Le pied de page ne doit jamais présenter une heuristique comme une mesure.
