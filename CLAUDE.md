# Règles de travail sur ce projet

Ce fichier est lu automatiquement au début de chaque session.
Il existe parce qu'une consigne donnée dans une conversation disparaît
avec elle. Ici, elle reste.

## 1. Les options avant les étapes

Dès qu'il y a **plus d'un chemin raisonnable** pour arriver au résultat
(authentification, hébergement, format de fichier, outil…), annoncer
d'abord les options, puis recommander, puis seulement donner les étapes.

Format obligatoire, court :

> Deux façons de faire :
> - **A** — avantage / inconvénient
> - **B** — avantage / inconvénient
> Je recommande **B** parce que […]. On part là-dessus ?

Ne jamais lancer directement dans une suite de commandes sans avoir dit
qu'il existait autre chose.

**Seuil, ajouté le 12/08/2026** — cette règle se déclenchait pour tout, et
posait à l'utilisateur des choix qu'il ne pouvait pas trancher (le A/B des
tiers a dû être réexpliqué deux fois). Elle ne vaut que si le choix est
**difficile à défaire** ou **coûte du temps ou de l'argent réels**. Sinon :
décider, faire, et dire en une phrase ce qui a été décidé et pourquoi —
l'utilisateur corrige après coup s'il n'est pas d'accord. Et avant de faire
trancher : vérifier soi-même tout ce qui peut l'être, pour que la question
posée soit la vraie (règle apprise le 11/08 : un des deux termes du choix
était faux faute d'avoir lu la page en entier).

## 2. Ce qui dure passe avant ce qui est rapide

Pour tout ce qui sera **refait plus d'une fois** (publier, mettre à jour,
relancer l'app), choisir la solution durable même si elle demande deux
minutes de plus au départ.

Une solution qui expire, qui casse au prochain redémarrage, ou qui oblige
à recommencer la manipulation, est une mauvaise solution — même si elle
marche tout de suite.

Test à se poser avant de proposer : *« est-ce qu'il devra refaire ça
dans trois mois ? »* Si oui, ce n'est pas la bonne.

## 3. Ne pas se laisser guider par ce qui est déjà à l'écran

Un terminal déjà ouvert sur une commande à moitié tapée n'est pas un
choix de l'utilisateur : c'est un hasard. Ne pas continuer dans cette
voie juste parce qu'elle est commencée. Reculer d'un pas et regarder si
c'est la bonne.

## 4. Expliquer comme à quelqu'un qui n'est pas développeur

Pas de jargon sans traduction. Une manipulation = une étape = une ligne
à copier. Dire à chaque fois **où** taper la commande, et si le terminal
est occupé par autre chose (un serveur qui tourne), le dire avant.

## 5. Sur les données

- Ne jamais inventer de valeurs. Si une source bloque le scraping, le
  dire et proposer une alternative.
- Ne jamais présenter une heuristique comme une mesure.
- Le pied de page doit refléter ce qui est **réellement** chargé.

## 6. Ne jamais casser

- La clé `manager:roster` du navigateur : la renommer efface le roster
  de l'utilisateur.
- La mention Supercell Fan Content Policy dans le pied de page.
- Les marqueurs `@DATA:` / `@END:` de `donnees.js`, utilisés par
  `refresh.py`.

## 7. Contraintes levées le 02/08/2026

`BRIEF.md` reste le document d'origine et n'est pas réécrit : c'est une
trace, pas une consigne. Ce qui suit le remplace.

**Levé — ces règles empêchaient le projet d'avancer :**

- *« Un seul fichier HTML hébergeable, rien d'autre. »* Le code est
  découpé par rôle, et il peut l'être davantage.
- *« Interface en français. »* Trois langues, et d'autres si besoin.
- *« Ni pip, ni node, ni navigateur headless »* pour `refresh.py`.
  **C'est cette règle qui bloquait la lecture des cartes** : les sites
  modernes construisent leurs pages dans le navigateur, et sans navigateur
  on ne voit qu'un tiers du contenu. Une dépendance est désormais
  acceptable si elle débloque une source — à condition de le dire, et de
  garder un repli quand elle n'est pas installée.
- *« Une seule commande, à relancer à chaque saison. »* Le rafraîchissement
  peut être automatique et programmé.
- *« Pas d'étape de build. »* Reste préférable, mais n'est plus interdit.

**Non levé — ces règles n'ont jamais rien bloqué :**

- Ne pas inventer de valeurs, ne pas présenter une estimation comme une
  mesure. C'est ce qui rend l'app utile ; l'enlever ne débloque rien, ça
  la rendrait juste fausse.
- La clé `manager:roster`, la Fan Content Policy, les marqueurs `@DATA:`.
- `robots.txt` et le délai entre requêtes : ne rien coûter en vitesse,
  et éviter de se faire bannir d'une source.
- Une main, moins de 25 secondes. Ce n'est pas une contrainte, c'est le
  but de l'app.

Si l'utilisateur veut lever l'une de ces quatre dernières, il le dira
explicitement — ce fichier sera alors modifié, pas contourné.

## 8. « Je ne peux pas lire cette page » — c'est faux

Constaté le 04/08/2026, après l'avoir dit à tort plusieurs fois.

Quand une page renvoie **403** depuis la session qui écrit ce code, ce n'est
**pas le site qui bloque**. C'est le proxy de l'environnement, qui applique
la politique réseau de l'organisation. Le diagnostic se lit :

```
curl -sS "$HTTPS_PROXY/__agentproxy/status"
```

`connect_rejected` + `gateway answered 403 to CONNECT` = la sortie est fermée
pour cet hôte. On ne cherche pas à contourner une politique. On déplace la
lecture là où elle est permise :

```
Onglet Actions → « Lire une page » → Run workflow → coller l'adresse
```

Le flux ouvre la page dans Chromium sur les serveurs de GitHub, et imprime
titres, texte visible et liens dans le journal — que Claude lit à distance.
Il ne commite rien (`permissions: contents: read`) et respecte robots.txt.

Depuis le 12/08, la case « Montrer les appels réseau » imprime à la place
les adresses que la page appelle pour se construire — c'est l'outil qui
répond à la question du niveau 2 de la section 10 : cette page a-t-elle un
robinet JSON ? (La politique réseau a aussi été élargie ce jour-là aux
quatre sources du robot : leurs pages se lisent désormais d'ici, en une
seconde. Les hôtes hors liste passent toujours par le flux.)

Deux lectures de contrôle, réussies : `brawl360.com` (667 223 caractères) et
`metapick-ai.com/draft-tool`.

Autre voie, si l'utilisateur préfère : élargir la politique réseau de
l'environnement, dans les réglages de Claude Code sur le web.

**Donc : ne plus jamais écrire « leurs sites bloquent la lecture ». Lancer le
flux, ou dire précisément quel hôte la politique refuse.**

## 9. Les workflows multi-agents : comment, pas si

Le 05/08/2026, une « recherche exhaustive des axes d'amélioration » a coûté
**137 agents et 2,6 millions de tokens**, a atteint la limite de session, et
n'a rien rendu d'utilisable : les huit audits ont fini, les vérificateurs et
la synthèse sont tombés en route. Il en est sorti 64 pistes **non vérifiées**,
dont la moitié fausses ou déjà corrigées.

L'outil n'était pas en cause. Le dimensionnement l'était, et c'est le mien.
Ce fichier dit donc comment s'en servir, pas de s'en priver.

### Ce qui a réellement coûté

Trois erreurs, dans l'ordre d'importance :

1. **L'éventail multiplié par l'éventail.** 8 audits ont produit 64 pistes,
   puis 64 × 2 vérificateurs = 128 agents de vérification. C'est ce produit
   qui explose, jamais le premier éventail. Huit chercheurs, c'est huit
   agents : négligeable.
2. **Aucun dédoublonnage avant la partie chère.** Les 64 pistes contenaient
   des doublons et des choses déjà corrigées. Dédoublonner et classer, c'est
   du code JavaScript ordinaire dans le script — **gratuit, zéro agent**. Fait
   avant, il restait une quinzaine de pistes réelles à vérifier.
3. **Tout rendu à la fin.** `parallel()` est une barrière : elle attend tout
   le monde. En atteignant la limite au milieu, on perd aussi ce qui était
   déjà fait. `pipeline()` fait descendre chaque piste seule jusqu'au bout —
   à la 40ᵉ qui meurt, les 39 premières sont déjà rendues.

### Les quatre règles

- **Dédoublonner et classer AVANT de vérifier**, en JavaScript dans le script.
  Puis ne vérifier que les 10 à 15 premières. Le reste attendra un autre tour.
- **`pipeline()` par défaut, `parallel()` seulement quand une étape a
  réellement besoin de TOUS les résultats de la précédente.**
- **La vérification est mécanique : elle ne mérite pas le gros modèle.**
  `{model: "haiku", effort: "low"}` sur les vérificateurs. Chercher demande du
  jugement ; contrôler qu'une chose se reproduit, non.
- **Pas d'agent de synthèse.** Je lis les résultats et je synthétise dans la
  boucle principale : c'est déjà payé.

Ce que ça donne sur le même travail : **5 chercheurs + dédoublonnage gratuit
+ 10 vérificateurs bon marché = 15 agents** au lieu de 137, avec un résultat
vérifié au lieu d'un tas de pistes brutes.

### Le plafond dur, et c'est l'utilisateur qui le tient

Écrire **`+300k`** (ou tout autre chiffre) dans la demande fixe un plafond de
tokens pour le tour. Ce n'est pas indicatif : au-delà, les appels d'agents
**échouent**. Le script doit s'y adapter :

```js
while (budget.total && budget.remaining() > 50_000) { … }
const FLOTTE = budget.total ? Math.floor(budget.total / 100_000) : 5
```

C'est le seul garde-fou qui ne dépende pas de mon jugement — celui qui a
échoué. Quand l'utilisateur ne donne pas de chiffre, annoncer le nombre
d'agents prévu et l'ordre de grandeur **avant** de lancer.

`.claude/settings.json`, commité avec le dépôt (le conteneur est effacé après
chaque session, seul ce qui est commité revient), porte deux réglages :
`workflowSizeGuideline: "small"` — viser moins de 5 agents plutôt que 15 — et
`workflowKeywordTriggerEnabled: false`, pour qu'un « ultracode » tapé par
hasard ne bascule pas tout un tour en orchestration.

### Et quand un workflow n'est pas la bonne réponse

Il ne l'est pas quand une mesure suffit. Le même jour, **mesurer une chose à
la fois dans le navigateur** a trouvé la barre du classement qui mentait, la
grille coupée à 60 sur 105, et le rappel « nouveaux brawlers » qui
n'apparaissait chez personne — pour une fraction du coût. Et surtout, ça a
permis d'**écarter** une piste fausse au lieu de la corriger pour rien.

Un workflow sert à couvrir large quand on ne sait pas où chercher. Il ne sert
pas à vérifier : ça, ça se mesure.

## 10. La hiérarchie des sources de données

Ajoutée le 12/08/2026. Avant d'écrire ou de modifier un scraper, vérifier
les niveaux dans l'ordre, et ne descendre qu'avec la preuve que le niveau
au-dessus n'existe pas :

1. **API publique documentée** — le mieux : stable, prévue pour ça.
2. **Endpoint JSON accessible** — les sites modernes peignent leurs pages à
   partir de données brutes ; le robinet est parfois lisible directement.
3. **Lecture des pages** (ce que fait `refresh.py`) — fragile : casse quand
   le site change d'habillage.
4. **Collecte maison** (API officielle Supercell) — le plus lourd ; demande
   une adresse IP fixe qu'on n'a pas. Pour plus tard.

Chaque vérification se note ici, datée, pour ne pas la refaire :

- brawltime.ninja — niveau 2 vérifié le 11-12/08 : `_payload.json` → 404 ;
  `cube.brawltime.ninja` (le service que leur site interroge) **existe mais
  son robots.txt l'interdit aux robots**. Leurs pages HTML, elles, sont
  autorisées. → niveau 3, et c'est le chemin légitime.
- api.brawlapi.com — niveau 1, utilisé. Catalogue seulement : noms, classes,
  raretés, images. **Aucune statistique** (vérifié le 11/08 : structure
  complète relue, pas de taux de victoire ni de tiers).

`robots.txt` tranche toujours : un robinet interdit aux robots est un
robinet fermé, on ne contourne pas — c'est la règle jamais levée de la
section 7, et c'est elle qui évite le bannissement.

## 11. Phrases de rappel

L'utilisateur peut écrire à tout moment :

- **« les options d'abord »** → arrêter, lister les chemins possibles
  avec leurs inconvénients, attendre le choix.
- **« la solution durable »** → refaire le choix en ne regardant que le
  long terme, quitte à défaire ce qui vient d'être fait.
- **« combien ça coûte »** → avant de lancer quoi que ce soit de long,
  annoncer le nombre d'agents prévus et l'ordre de grandeur en tokens.
  Attendre le feu vert si c'est au-delà de l'ordinaire.
- **`+300k`** (n'importe quel chiffre, dans la demande) → plafond DUR de
  tokens pour le tour. Au-delà, les appels d'agents échouent. C'est le seul
  garde-fou qui ne dépende pas du jugement de Claude. Voir section 9.
