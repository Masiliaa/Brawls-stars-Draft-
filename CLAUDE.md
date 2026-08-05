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

Deux lectures de contrôle, réussies : `brawl360.com` (667 223 caractères) et
`metapick-ai.com/draft-tool`.

Autre voie, si l'utilisateur préfère : élargir la politique réseau de
l'environnement, dans les réglages de Claude Code sur le web.

**Donc : ne plus jamais écrire « leurs sites bloquent la lecture ». Lancer le
flux, ou dire précisément quel hôte la politique refuse.**

## 9. Pas de flotte d'agents. Verrouillé, pas promis.

Constaté le 05/08/2026. Une « recherche exhaustive des axes d'amélioration »
a été lancée sous forme de workflow multi-agents : **137 agents, 2,6 millions
de tokens, limite de session atteinte**. Les huit audits ont fini, mais les
vérificateurs et la synthèse sont tombés en route. Il en est sorti 64 pistes
**non vérifiées**, dont la moitié étaient fausses ou déjà corrigées.

C'est moi qui l'avais dimensionné : 2 vérificateurs × 64 pistes = 128 agents
de vérification, au-delà de ce que la session peut tenir. Le budget de
l'utilisateur a été détruit pour un résultat inexploitable.

Ce qui a marché, le même jour, pour un coût sans commune mesure : **mesurer
une chose à la fois dans le navigateur**, avant d'y toucher. C'est comme ça
qu'ont été trouvés la barre qui mentait, la grille coupée à 60, le rappel
« nouveaux brawlers » qui n'apparaissait chez personne — et c'est comme ça
qu'a été **écartée** une piste fausse (« la phase de ban est sous la ligne
de flottaison »), qui ne se reproduit sur aucune taille.

**Le verrou est dans `.claude/settings.json`, commité avec le dépôt :**

```json
"disableWorkflows": true,
"workflowKeywordTriggerEnabled": false,
"permissions": { "deny": ["Workflow", "Agent"] }
```

Ce n'est pas une consigne, c'est une absence : les outils ne sont pas
disponibles. Une consigne se serait appuyée sur le même jugement qui a
échoué. Le fichier est dans le dépôt et non dans `~/.claude/` **parce que le
conteneur est effacé après chaque session** — seul ce qui est commité revient.

Pour le rouvrir, il faut éditer ce fichier. C'est voulu : que ce soit un
geste, pas un réflexe. Et si l'utilisateur le demande, mesurer d'abord le
coût attendu et l'annoncer **avant** de lancer quoi que ce soit.

À la place : chercher soi-même (`Grep`, `Read`), mesurer soi-même dans le
navigateur, corriger **un point à la fois**, avec sa mesure avant/après dans
le message de commit. Et laisser l'intégration continue trouver le reste —
elle a débusqué en deux passages un vrai bug que trois mois d'audits n'ont
pas vu, parce qu'elle exécute le code là où l'API répond.

## 10. Phrases de rappel

L'utilisateur peut écrire à tout moment :

- **« les options d'abord »** → arrêter, lister les chemins possibles
  avec leurs inconvénients, attendre le choix.
- **« la solution durable »** → refaire le choix en ne regardant que le
  long terme, quitte à défaire ce qui vient d'être fait.
- **« combien ça coûte »** → avant de lancer quoi que ce soit de long,
  annoncer le nombre d'appels prévus et l'ordre de grandeur en tokens.
  Attendre le feu vert si c'est au-delà de l'ordinaire.
