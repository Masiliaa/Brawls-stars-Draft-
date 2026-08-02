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

## 8. Phrases de rappel

L'utilisateur peut écrire à tout moment :

- **« les options d'abord »** → arrêter, lister les chemins possibles
  avec leurs inconvénients, attendre le choix.
- **« la solution durable »** → refaire le choix en ne regardant que le
  long terme, quitte à défaire ce qui vient d'être fait.
