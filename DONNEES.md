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
| images | `api.brawlapi.com` puis `media.brawltime.ninja` | **testées le 29/07/2026 depuis un poste non filtré** | brawltime répond ; l'API reste à confirmer |

### Sur la nature de `COUNTERS`

Les matchups de brawlcalculator sont **un jugement d'experts** adossé aux
classements SpenLC, constitué à la main. Ce n'est pas une mesure statistique,
et le pied de page de l'app doit continuer de le dire. Ne pas reformuler
cette phrase en quelque chose qui sonnerait comme une mesure.

### Adresses d'image : ce qui a été vérifié

`cdn.brawlify.com/brawlers/borderless/{nom}.png` était une adresse **devinée,
jamais contrôlée**. Testée le 29/07/2026 dans un navigateur : elle répond
`404` pour tous les brawlers. Elle a été retirée de l'app et de `refresh.py`
— la garder ne faisait que retarder l'affichage des initiales d'une requête
inutile. Un contrôle empêche désormais sa réapparition.

Ce qui reste, dans l'ordre d'essai :

1. `assets/{slug}.png` en local, si `ASSETS_LOCAUX` vaut `true` ;
2. l'adresse renvoyée par `api.brawlapi.com` — la seule certaine ;
3. `media.brawltime.ninja/brawlers/{slug}/avatar.png` — **confirmée** : elle a
   servi à télécharger la plupart des portraits depuis un vrai poste, mais
   elle ne connaît pas les brawlers récents (Damian, Nori) ;
4. les initiales.

Le CDN brawlify range bien les portraits sous `/brawlers/borderless/`, mais
**par identifiant numérique** (`16000085.png`), pas par nom. C'est là que
l'adresse devinée se trompait. Ces identifiants ne figurent nulle part dans
`donnees.js` : ils viennent de l'API, qui fournit alors directement l'adresse
complète. Reconstruire l'adresse serait donc redondant — sauf à stocker les
identifiants dans `donnees.js` pour disposer d'un repli hors API. Piste
ouverte, pas encore nécessaire.

`cdn.brawlify.com/maps/regular/{id}.png` est **encore une adresse devinée**
pour les vignettes de carte, et souffre peut-être du même défaut. À tester
de la même façon.

## Droits sur les images

Les portraits appartiennent à Supercell et sont servis par le CDN de
Brawlify. Cet usage — outil personnel, non monétisé, assets non modifiés —
relève de la [Fan Content Policy](https://supercell.com/fan-content-policy),
qui exige d'afficher la mention de non-affiliation. Elle est dans le pied de
page de l'app, avec le lien vers la policy.

**Si l'app est un jour monétisée ou porte de la publicité, cela change de
catégorie** et la policy doit être relue.

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

- il réutilise `data/traductions.json`, au format
  `{"English sentence": {"fr": "…", "es": "…"}}` ;
- il dépose les phrases et les langues manquantes dans
  `data/a_traduire.json`, prêtes à être remplies ;
- **l'anglais d'origine est toujours conservé** dans `donnees.js`, et l'app
  s'en sert en repli. Une phrase non traduite s'affiche donc en anglais —
  visible, donc corrigeable, plutôt que faussement traduite.

Pour les traduire, remplir les valeurs vides de `data/a_traduire.json`,
recopier le tout dans `data/traductions.json`, relancer. Le cache est
persistant : une phrase traduite une fois ne revient plus.

## Tests

```bash
python3 tests/t_refresh.py            # parseur et réécriture de donnees.js

(python3 -m http.server 8765 &)       # les suivants ont besoin d'un serveur
node tests/t_app.js                   # moteur de calcul
node tests/t_parcours.js              # parcours utilisateur complet
node tests/t_langues.js               # audit des traductions
```

Les deux derniers exigent `npm i playwright` et un Chromium —
`CHROME=/chemin/vers/chrome` si Playwright ne trouve pas le sien,
`PORT=...` pour changer de port.

**229 contrôles au total, tous verts.**

| Suite | Ce qu'elle vérifie | Nb |
|---|---|---|
| `t_refresh.py` | parseur HTML tolérant, aller-retour de réécriture des blocs, dates par source, téléchargement des portraits (API prioritaire, abandon si réseau mort), traduction des phrases de matchup | 60 |
| `t_app.js` | tri des conseils, exclusion des bans et picks, repli du cycle de familles, bonus et malus de matchup, plafond de synergie, formulations du pied de page, chaîne de repli des images, cohérence du détail en mode Analyse | 53 |
| `t_parcours.js` | chaque fichier servi, cocher/décocher, recherche, roster qui survit au rechargement, limites de picks, annuler, nouveau draft, changement de carte, bascule Rapide/Analyse, changement de langue | 59 |
| `t_langues.js` | mêmes clés dans les 3 langues, aucun texte vide ou oublié en français, {accolades} préservées, repli de `t()`, séparateur décimal, chaque écran traduit y compris le mode Analyse, aucun débordement de la barre de 320 à 430 px | 57 |

Ils ont servi de filet lors du découpage en fichiers : le comportement est
resté identique d'un bout à l'autre de la réorganisation.

## Deux modes d'affichage

Le même calcul, lu de deux façons. Le bouton **Rapide / Analyse** en haut à
droite bascule ; le choix est retenu sous `manager:mode`.

- **Rapide** — un nom en très gros, sa meilleure raison, trois suivants.
  Fait pour décider en une seconde, une main sur l'écran.
- **Analyse** — les 10 meilleurs du roster, avec pour chacun le score,
  **toutes** les raisons retenues, et le détail des points par règle
  (`tier +82 · face −9 · équipe +6`).

Le moteur calcule tout dans les deux cas : `evaluer()` renvoie le score, la
liste complète des raisons et le détail par règle. C'est l'affichage qui
choisit ce qu'il en montre. Faire autrement ferait diverger les deux modes.

Un contrôle vérifie en permanence que **la somme du détail égale le score**,
pour chaque brawler : le mode Analyse ne peut donc pas mentir sur le calcul.

## Style

Noir profond, typographie système, aucun effet. Pas de police display, pas
de capitales forcées, pas d'ombre portée, filets de 1 px.

C'est un choix assumé : l'ancienne version employait le vocabulaire d'une
interface de jeu mobile (gros contours noirs, ombres décalées, coins très
arrondis) là où il fallait celui d'un outil.

Les seuls styles posés en ligne par le JavaScript sont ceux qui dépendent de
la donnée : `--r` (couleur de rareté d'un brawler), `--m` (couleur du mode
de jeu), et les dimensions d'un portrait. Tout le reste est dans
`style.css` — c'est ce qui permet de changer d'apparence sans toucher au JS.

## Langues

L'app est en français, anglais et espagnol. **Tous les textes affichés sont
dans `langues.js`, et nulle part ailleurs** — un contrôle automatique le
vérifie et signale tout texte en dur oublié dans le code.

- La langue de départ suit celle du téléphone ; si elle n'est pas gérée,
  l'app démarre en anglais.
- Le bouton `FR` / `EN` / `ES` en haut à droite fait défiler les trois.
- Le choix est retenu sous la clé `manager:langue`, **distincte de celle du
  roster** : changer de langue ne touche jamais aux brawlers cochés.

**Pour ajouter une langue** : recopier un bloc entier de `LANGUES`, traduire
les valeurs, garder les clés identiques, ajouter le code à `ORDRE_LANGUES`.
Le test `t_langues.js` refusera toute clé manquante ou en trop.

Ce qui n'est pas traduit, volontairement : les noms de brawlers et de cartes
sont des noms propres, identiques dans toutes les langues du jeu.

Les phrases d'explication des matchups sont des objets `{en, fr, es}` :
l'anglais est la langue d'origine de brawlcalculator, et sert de repli quand
une traduction manque. Voir « Traduction des explications » ci-dessus.

## Comment le code est organisé

Chaque fichier répond à une seule question. Ils se chargent dans cet ordre,
déclaré en bas de `index.html`.

| Fichier | À quoi il sert | Lignes |
|---|---|---|
| `index.html` | la page, presque vide : elle ne fait que charger le reste | 47 |
| `style.css` | toute l'apparence | 154 |
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
