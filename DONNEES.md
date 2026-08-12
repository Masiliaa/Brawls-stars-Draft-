# État des données et des sources

Ce fichier dit, pour chaque bloc de `donnees.js`, d'où viennent les chiffres
et à quel point ils sont vérifiés. Il sert de garde-fou : tant qu'une source
n'est pas confirmée, le bloc correspondant reste vide et le pied de page de
l'app le dit à l'utilisateur.

## Où en sont les données (12/08/2026)

Ce fichier a longtemps dit que rien n'avait pu être relevé. C'était vrai le
29/07 ; ça ne l'est plus, et le laisser en l'état a induit en erreur — il a
été réécrit pour redire la vérité, et doit être tenu à jour à chaque fois
qu'un bloc change de statut.

Le relevé tourne **chaque lundi sur les serveurs de GitHub** (flux
« Données », `.github/workflows/donnees.yml`), qui ont le réseau. Il commite
lui-même ce qui a changé. L'environnement où le code s'écrit, lui, reste
filtré (403 sur les quatre sources) : un scraper ne peut pas s'y essayer, il
s'essaie dans le flux, avec l'entrée « blanc » pour relever sans rien écrire.
Pour lire une page à la main : flux « Lire une page ».

Pour accélérer le développement, l'option reste ouverte d'autoriser les
domaines dans les réglages de l'environnement —
<https://code.claude.com/docs/en/claude-code-on-the-web>.

## Sources, par bloc

| Bloc | Source | Nature | État |
|---|---|---|---|
| `TIERS` | brawltime.ninja | **vote de la communauté** (~48 000 votes/saison), pas une mesure | relevé automatique hebdo depuis le 12/08 (`--tiers`) |
| `MAPS` | topbrawl.com | taux de victoire et d'utilisation mesurés | 27 cartes, relevé hebdo ; le moteur amortit les faibles échantillons |
| `COUNTERS` | brawlcalculator.com | **jugement d'experts**, constitué à la main | 1 132 duels, relevé hebdo — mais la source elle-même bouge peu |
| `SYNERGIE` | brawlstats.net | annoncée mesurée, jamais confirmée | **vide depuis le premier jour** — l'étape tourne et ne produit rien |
| images | `assets/` en local (via api.brawlapi.com puis media.brawltime.ninja) | — | complètes : 105 portraits, 27 vignettes, `ASSETS_LOCAUX=true` |

La couverture de `COUNTERS` est mesurée : 1 132 paires sur 10 920 possibles,
soit **10,4 %**. Les 89,6 % restants passent par le cycle des trois familles,
qui a besoin de la classe de chaque brawler, donc de l'API. C'est la donnée
la plus faible du conseil — chantier ouvert.

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

1. `assets/{slug}.png` en local — **c'est le cas nominal depuis le 07/08** :
   le jeu est complet (105 + 27) et `ASSETS_LOCAUX` vaut `true` ; le service
   worker garde au vol ce qui a été regardé, pour le hors-ligne ;
2. l'adresse renvoyée par `api.brawlapi.com` ;
3. `media.brawltime.ninja/brawlers/{slug}/avatar.png` — ne connaît pas
   toujours les brawlers récents ;
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

### Sur les faibles taux d'utilisation

Les taux d'utilisation sont relevés avec les taux de victoire et stockés en
troisième position dans `MAPS[].top`. Un taux de victoire assis sur trop peu
de parties ne vaut pas un taux assis sur beaucoup : sous `SEUIL_FIABLE`
(5 % d'utilisation — un seuil **choisi**, pas mesuré), `moteur.js` amortit le
bonus de carte au lieu d'écarter la ligne. Le chiffre affiché reste celui de
la source ; c'est la pondération qui est un jugement.

## Utilisation de `refresh.py`

```bash
python3 refresh.py --tout          # tout relever
python3 refresh.py --tiers         # tiers par mode (vote brawltime)
python3 refresh.py --counters      # table de matchups
python3 refresh.py --cartes        # pool de cartes + classements
python3 refresh.py --synergie      # duos (source muette à ce jour)
python3 refresh.py --assets        # images en local (--sans-bascule : sans
                                   # toucher ASSETS_LOCAUX)
python3 refresh.py --blanc         # tout relever sans rien écrire
python3 refresh.py --debug tiers   # montre ce que le parseur lit
```

Bibliothèque standard, plus Chromium via Playwright **quand il est là** :
certains sites construisent leur page dans le navigateur, et sans lui on ne
voit qu'une fraction du contenu. Sans Chromium, le script se rabat sur le
téléchargement brut et le dit. Il respecte `robots.txt`, espace ses requêtes
(`--delai`, 1,5 s par défaut) et met les réponses en cache dans `.cache/`
(`--ttl`, 7 jours).

**Codes de sortie** : `0` rien à signaler · `2` avertissements, blocs
concernés laissés en l'état · `3` échec inattendu, `donnees.js` non modifié.

### Si le parseur ne trouve rien

Les parseurs ont été mis au point contre les vraies pages, mais un site qui
change de mise en page les casse sans prévenir. Le script est volontairement
tolérant — des titres par expression régulière plutôt que des classes CSS —
et chaque source a sa sonde :

```bash
python3 refresh.py --debug counters   # ou tiers, maps, pool, ranked…
```

affiche les blocs vus par le parseur (type, texte, lien). Depuis
l'environnement filtré, la même sonde se lance par le flux « Données »,
champ « diagnostic », et se lit dans le journal.

## Traduction des explications

Les phrases de brawlcalculator sont en anglais. `refresh.py` ne traduit pas
tout seul :

- il réutilise `data/traductions.json`, au format
  `{"English sentence": {"fr": "…", "es": "…"}}` ;
- il dépose les phrases et les langues manquantes dans
  `data/a_traduire.json`, prêtes à être remplies ;
- **l'anglais d'origine est toujours conservé** dans `counters.js` (le
  fichier source, toutes langues), et l'app s'en sert en repli. Une phrase
  non traduite s'affiche donc en anglais — visible, donc corrigeable,
  plutôt que faussement traduite ;
- l'app, elle, ne charge que `counters-<langue>.js`, engendré par
  `outils/counters_par_langue.py` — une langue au lieu de trois, mesuré
  à −47 % sur la charge initiale.

Pour les traduire, remplir les valeurs vides de `data/a_traduire.json`,
recopier le tout dans `data/traductions.json`, relancer. Le cache est
persistant : une phrase traduite une fois ne revient plus.

## Tests

```bash
python3 tests/t_refresh.py            # parseurs et réécriture des blocs

(python3 -m http.server 8765 &)       # les suivants ont besoin d'un serveur
node tests/t_app.js                   # moteur de calcul
node tests/t_parcours.js              # parcours utilisateur complet
node tests/t_langues.js               # audit des traductions
node tests/t_ecrans.js                # mise en page aux tailles d'iPhone
node outils/audit.js                  # textes en dur, clés, régressions
```

Les suites navigateur exigent Playwright et un Chromium —
`CHROME=/chemin/vers/chrome` si Playwright ne trouve pas le sien,
`PORT=...` pour changer de port. Elles tournent aussi en CI
(`.github/workflows/tests.yml`), à chaque poussée.

**684 contrôles au total** (208 + 160 + 189 + 72 + 55), plus l'audit.
Le détail de ce que chaque suite couvre est dans son fichier — le tenir
à jour ici doublonnait, et ce fichier a déjà menti une fois en retard
d'une version.

## Bans conseillés

Une phase entière du draft était ignorée : l'app enregistrait les bans
**subis** sans jamais dire quoi bannir.

Un bon ban retire du draft ce qui te ferait mal. `bansConseilles()` note donc
chaque brawler sur trois critères :

- **sa force sur la carte** — même barème que pour les picks (tier + rang) ;
- **ce qu'il punit chez toi** (`PT_BAN_MENACE`) — combien de brawlers de ton
  roster il bat, d'après `COUNTERS`. Nul tant que la table est vide ;
- **le fait que tu le joues** (`PT_BAN_TIEN`) — un ban retire le brawler pour
  les **deux** équipes, donc bannir un de tes propres choix te prive aussi.

Deux garde-fous :

- Les brawlers déjà bannis ou déjà pris ne sont plus proposés.
- **Les picks conseillés non plus.** Sans ça, l'app pouvait dire « prends
  Bull » puis « bannis Bull » à deux lignes d'intervalle.

Le bloc n'apparaît que pendant la phase de ban — aucun pick saisi et les
6 bans pas encore connus. Dès le premier pick, il disparaît de lui-même.

## Ordre de pick

En classé, l'ordre du draft est fixe. Chaque pick adverse déjà saisi est donc
un pick qui **ne viendra plus après le tien** : le nombre de réponses encore
possibles vaut exactement `3 − ennemis saisis`.

L'app le déduit seule — **aucun réglage à demander**, ce qui compte quand on
a 25 secondes. La situation est affichée sous la carte (« 3 picks adverses
après le tien » / « Dernier pick »), pour que le changement de ton des
conseils ne paraisse pas arbitraire.

Deux effets opposés, dans `moteur.js` :

- **Fiabilité du contre** (`FIABILITE_MATCHUP`) — un contre vaut d'autant
  plus que l'adversaire a moins de marge pour s'adapter. En dernier pick le
  matchup est majoré ; plus tôt, il est minoré.
- **Exposition** (`pointsExposition`) — un brawler que beaucoup de monde
  contre est un pari tant que l'adversaire peut répondre. Ce malus **a besoin
  de `COUNTERS`** pour compter les brawlers qui le battent : table vide, malus
  nul. Il s'activera tout seul le jour où `refresh.py --counters` tournera.

Sans cette règle, l'app pouvait conseiller un contre-pick parfait en
**premier** pick — c'est-à-dire au moment où il sera puni.

## Deux modes d'affichage

Le même calcul, lu de deux façons. Le bouton **Rapide / Analyse** en haut à
droite ouvre un menu où l'on choisit ; le choix est retenu sous `manager:mode`.

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

## Menus de la barre du haut

Les deux réglages (affichage, langue) passent par un **menu déroulant**, pas
par un bouton qui bascule. Un bouton qui change tout au clic oblige à
deviner ce qui va arriver et à passer par les options intermédiaires ; un
menu montre les choix et permet d'aller droit au but.

Le menu se ferme au choix, au clic à côté, ou avec Échap. Un seul ouvert à
la fois, via la variable `menuOuvert`.

**Vocabulaire** : on dit « brawler », pas « perso ». C'est le terme du jeu.
Un contrôle vérifie qu'aucun « persos » ne réapparaît à l'écran.

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
- Le bouton `FR` / `EN` / `ES` ouvre un menu listant les trois langues en
  toutes lettres, avec un ✓ sur celle en cours. On va directement à celle
  qu'on veut, sans passer par les autres.
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

| Fichier | À quoi il sert |
|---|---|
| `index.html` | la page, presque vide : elle ne fait que charger le reste |
| `style.css` | toute l'apparence |
| `outils.js` | petites fonctions de base (nettoyer un nom, échapper du texte) |
| `langues.js` | tous les textes affichés, dans les trois langues |
| `donnees.js` | **d'où viennent les chiffres** — réécrit par `refresh.py` |
| `counters-fr/en/es.js` | les duels et leurs explications, une langue par fichier — engendrés, ne pas éditer à la main |
| `etat.js` | ce que l'app retient : carte choisie, picks, brawlers cochés |
| `moteur.js` | **comment le brawler conseillé est calculé** |
| `vues.js` | comment tout ça est affiché |
| `app.js` | ce qui se passe quand on touche l'écran |
| `sw.js` | pour que l'app s'ouvre même sans réseau |

(Les nombres de lignes qui figuraient ici sont partis : ils étaient déjà
faux, et ils le redeviendraient.)

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
- Ce qui est déployé : `index.html`, `style.css`, `manifest.webmanifest`,
  `sw.js`, les fichiers `.js` du tableau ci-dessus et `assets/`.
  `refresh.py`, `counters.js` (le fichier source des trois langues),
  `tests/`, `outils/` et `data/` sont des outils de développement, ils ne
  sont pas nécessaires en ligne.
- Le pied de page ne doit jamais présenter une heuristique comme une mesure.
