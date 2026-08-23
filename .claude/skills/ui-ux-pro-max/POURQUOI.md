# Pourquoi cette compétence est dans le dépôt

Elle vient de <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>,
sous licence MIT (voir `LICENSE`). Elle n'est pas de nous.

Elle est **copiée ici plutôt qu'installée** parce que `/plugin` n'existe pas
dans Claude Code sur le web : un greffon installé ailleurs ne reviendrait pas
à la session suivante, alors que le conteneur est effacé à chaque fois. Ce qui
est commité revient — c'est la règle 2 de `CLAUDE.md`.

## Ce qu'on en garde, et ce qu'on en fait

Sa fonction phare — le « générateur de design system » — vise les **pages de
vente** : conversion, appel à l'action, témoignages. Ça ne nous concerne pas,
et ses 192 types de produits ne contiennent aucun outil compagnon de jeu.

Ce qui sert vraiment, c'est `data/ux-guidelines.csv` : 119 règles classées.
`outils/audit_ux.js` en vérifie mécaniquement treize dans le navigateur, sur
l'app réelle. Le reste (styles, palettes, associations de polices) sert de
référence quand il faut choisir, plutôt que de choisir de mémoire.

## Ce qu'elle ne remplace pas

Aucune de ces règles n'aurait trouvé les deux vrais défauts de l'app : les
trois « + » à trois abscisses différentes, et les 162 px de hauteur que la
nouvelle matière a coûtés. Ça se mesure, ça ne se déduit pas d'une liste.

Elle oriente la mesure. Elle ne la remplace pas.

Les tests du greffon (`scripts/tests/`) ont été retirés : ils ne servent qu'à
ses auteurs.
