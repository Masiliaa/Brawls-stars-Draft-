# Les maquettes

Ce dossier contient les **sources** d'une planche de maquettes — un écran
par fichier `.dc.html`, plus `canvas.json` qui les dispose côte à côte et
porte les notes.

Elles ne sont pas l'app : ce sont des dessins, faits pour comparer des
options avant de toucher au code. Les valeurs (couleurs, espacements,
tailles de texte) sont recopiées de `style.css` pour que la comparaison
soit honnête ; si `style.css` change, elles vieillissent.

## Ce qu'il y a dedans, et pourquoi

Relevé du 12/08/2026, dans le navigateur, sur un iPhone de 390 px :
**10 des 16 boutons de l'écran de draft sont sous les 44 px** que
`style.css` se donne lui-même comme règle (« 44 px est une taille de
pouce, pas un rythme visuel »). Les plus petits — retirer un ennemi,
« + » — font 36 px, et ce sont ceux qu'on touche le plus.

En dessinant, un second défaut est apparu : les trois « + » tombent à
**190, 146 et 102 px** du bord selon le nombre de portraits déjà posés
devant eux. Trois abscisses, donc aucune habitude possible.

| fichier | ce qu'il montre |
|---|---|
| `Main.dc.html` | l'écran tel qu'il est, les trois abscisses marquées |
| `OptionA.dc.html` | zones sensibles à 44 px, dessin inchangé |
| `OptionB.dc.html` | le « + » calé au bord droit, une seule abscisse |

Aucune des deux options ne touche au parti pris visuel — noir profond,
typographie système, pas d'effets. C'est un choix écrit dans `DONNEES.md`,
et rien dans la mesure ne le contredit : ce qui est corrigé ici est
ergonomique, pas décoratif.

## Reconstruire la planche

Le fichier assemblé (`ergonomie-du-draft.html`, 2,2 Mo) n'est pas versionné :
c'est du code d'éditeur engendré. Il se refabrique à partir des sources.
