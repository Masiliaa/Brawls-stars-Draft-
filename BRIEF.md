# Brief — Le Manager (aide au draft Brawl Stars classé)

Joins `index.html` au dossier avant de lancer Claude Code, puis colle tout ce qui suit.

---

## Contexte

`index.html` est un fichier unique, autonome, en JavaScript vanilla. Aucun framework, aucune étape de build. Seule dépendance externe : Google Fonts. Il est destiné à être hébergé sur un hébergeur statique et ajouté à l'écran d'accueil d'un iPhone.

Il sert à choisir un brawler pendant la phase de draft en mode Classé, en moins de 25 secondes, une main sur l'écran.

### Ce qui existe déjà

**Blocs de données figés (relevés le 29/07/2026 sur brawltime.ninja, saison 52)**

- `MODES` — les 6 modes classés, avec une couleur d'interface.
- `MAPS` — 16 cartes : `{id, img (identifiant image), nom, mode, top:[[nom, winrate], ×3]}`.
- `TIERS` — par mode, 5 chaînes S/A/B/C/D listant les brawlers.
- `PTS` — points par tier : S 100, A 82, B 62, C 40, D 20.
- `FAMILLE` / `BAT` / `LFAM` — cycle à 3 familles : agression bat contrôle, contrôle bat portée, portée bat agression.

**État**

`vue`, `cible`, `carteId`, `q`, `ennemis[]` (max 3), `bans[]` (max 6), `allies[]` (max 2), `roster` (Set), `meta`.

**Persistance** — `localStorage`, clé `manager:roster`. Ne pas changer cette clé, un roster existant est déjà enregistré.

**Fonction de score** — `conseils()` : `PTS[tier]` + bonus carte (`+20/+15/+11` si le brawler est 1er/2e/3e sur la carte) + `±9` par ennemi selon le cycle de familles + `±6` selon l'équilibre des rôles de l'équipe. Renvoie les 4 meilleurs du roster.

**Images**

- Brawlers : `https://media.brawltime.ninja/brawlers/{slug}/avatar.png?size=160`, repli `https://cdn.brawlify.com/brawlers/borderless/{slug}.png`, puis initiales. Slug = nom en minuscules, tout caractère hors `[a-z0-9-]` remplacé par `_`.
- Cartes : `https://media.brawltime.ninja/maps/{img}.png?size=200`, repli `https://cdn.brawlify.com/maps/regular/{img}.png`.

**API** — `https://api.brawlapi.com/v1/brawlers` (sans clé, CORS ouvert) fournit la liste, la couleur de rareté et la classe. Si elle échoue, l'app bascule sur une liste de noms extraite des tier lists.

---

## Tâche 1 — Vérifier les images

Sers le fichier en local (`python3 -m http.server 8000`) et vérifie que portraits et vignettes de carte s'affichent réellement.

En cas de 403 ou de blocage : télécharge les images dans `assets/brawlers/{slug}.png` et `assets/maps/{img}.png`, réécris les URL en chemins relatifs, et garde la chaîne de repli.

**Critère de réussite** : aucune initiale visible à la place d'un portrait, aucun cadre de carte vide.

---

## Tâche 2 — Vraie table de counters *(la plus importante)*

Le cycle à 3 familles est une approximation grossière. Il faut le remplacer par de vraies données de matchups.

### Source vérifiée : brawlcalculator.com

J'ai contrôlé cette source manuellement. Elle est **rendue côté serveur**, donc un simple `GET` + parsing HTML suffit : pas besoin de navigateur headless.

- Index : `https://brawlcalculator.com/counters/` — liste les 105 brawlers avec leurs liens.
- Détail : `https://brawlcalculator.com/counters/{slug}/`
- Slugs à particularités : `8bit`, `el-primo`, `jae-yong`, `larry`, `mr-p`, `rt`, `starr-nova`. Les autres sont le nom en minuscules.

Structure de chaque page, exemple sur `/counters/mortis/` :

- Un `<h2>` **« Best counters to Mortis »** suivi d'une liste — les brawlers qui le battent. Chaque entrée : nom + lien + une phrase expliquant pourquoi.
- Un `<h2>` **« Mortis is a strong pick against »** suivi d'une liste — les brawlers qu'il bat, même format.
- Une section **« Mortis shines on these maps »** avec des liens `/maps/{slug}/`.

Données constituées à la main, adossées aux classements SpenLC, mises à jour en juillet 2026.

### Structure de sortie attendue

```js
var COUNTERS = {
  "mortis": {
    perd: [["jacky","Le surpasse au corps à corps et renvoie une partie des dégâts de chaque dash"],
           ["shade","Survit au combo de dash et le force à dépenser des munitions"]],
    bat:  [["barley","Se faufile entre les arcs lents des bouteilles et punit ses faibles PV"]]
  }
};
```

Clés normalisées avec la fonction `clef()` déjà présente. Les phrases sont à traduire en français, courtes — elles serviront de ligne d'explication dans l'app.

### Intégration dans `conseils()`

Pour chaque ennemi : `+12` si le candidat figure dans ses `perd` (le candidat le bat), `−12` s'il figure dans ses `bat`. Le cycle à 3 familles reste en repli pour les brawlers absents de la table. La raison affichée doit nommer l'ennemi et reprendre l'explication, par exemple « bat Mortis : le surpasse au corps à corps ».

**Critère de réussite** : au moins 100 des 105 brawlers dans la table, et 5 matchups connus vérifiés à la main.

### Sources secondaires, non vérifiées

- `metapick-ai.com/draft-tool` — rendu côté client, HTML vide. Inutilisable sans navigateur headless. Regarde l'onglet réseau : s'il existe un endpoint JSON, il sera plus propre que du parsing HTML.
- `brawlstats.net` — annonce des taux de victoire en matchup et en équipe. Non vérifié. À explorer surtout pour la tâche 3.
- `brawlvision.com/en/brawler` — counters lissés bayésiennement sur des matchs pro. Non vérifié.

---

## Tâche 3 — Synergie alliés

Aujourd'hui les picks alliés ne servent qu'à équilibrer les rôles. Cherche de vrais taux de victoire en équipe (`brawlstats.net` annonce « best partners by real same-team win rates ») et construis :

```js
var SYNERGIE = { "bibi|surge": 4.2 };  // écart de winrate, en points
```

Clé = les deux clés triées alphabétiquement, jointes par `|`. Bonus proportionnel dans `conseils()`, plafonné à `±10` pour ne pas écraser le tier.

Si aucune source fiable n'est trouvée, ne fabrique rien : garde l'équilibre des rôles actuel et signale-le.

**Critère de réussite** : ajouter un allié change visiblement l'ordre des recommandations sur au moins 3 cartes testées.

---

## Tâche 4 — Assainir les données de carte

Les `top` de `MAPS` viennent des winrates ajustés sans filtre sur le taux d'utilisation. Résultat : des brawlers à 0,1 % de picks dominent le classement, ce qui est du bruit statistique.

Deux pistes :

1. `brawlcalculator.com/maps/{slug}/` — sélections classées et bans conseillés par carte, issus du jeu compétitif. Même structure serveur que les pages counters, donc facile à parser.
2. Re-scraper brawltime.ninja en gardant le taux d'utilisation, en écartant tout ce qui est sous 0,3 %, et en conservant les 8 premiers par carte au lieu de 3. Stocker `[nom, winrate, userate]`.

**Critère de réussite** : plus aucun brawler sous 0,3 % de taux d'utilisation dans les données de carte.

---

## Tâche 5 — Compléter le pool de cartes

Le pool classé compte 3 cartes par mode, soit 18. Le fichier n'en a que 16 : il manque une carte en Braquage et une en Zone réservée.

Indice : la page Mortis de brawlcalculator mentionne « Choral Chambers Bounty », absente de notre liste. Leur index `/maps/` contient donc probablement le pool complet — commence par là.

---

## Tâche 6 — Script de régénération

Écris `refresh.py` (ou `refresh.js`) qui refait les tâches 2 à 5 et réécrit les blocs de données dans `index.html`, en mettant à jour la date affichée en pied de page.

Contraintes : mise en cache locale des réponses, délai entre requêtes, respect des `robots.txt`. Une seule commande, à relancer à chaque nouvelle saison.

---

## Contraintes générales

- Un seul fichier HTML hébergeable. Un dossier `assets/` à côté est acceptable, rien d'autre.
- Pas de framework, pas d'étape de build, pas de gestionnaire de paquets côté navigateur.
- Interface en français.
- Garder l'honnêteté affichée. Les counters de brawlcalculator sont un jugement d'experts, pas une mesure statistique : le pied de page doit le dire. Ne jamais présenter une heuristique comme une mesure.
- Ne pas casser la persistance du roster.
- Si une source bloque le scraping, le dire et proposer une alternative plutôt que d'inventer des valeurs.

---

## Ordre conseillé

Tâche 1, puis 2, puis 5, puis 4. Les tâches 3 et 6 ensuite. La tâche 2 est celle qui change réellement la qualité de l'outil ; le reste est du confort.
