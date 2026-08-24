/* Redonne PT_DUEL à partir de la table DUELS réellement en place.
 *
 * Pourquoi un outil plutôt qu'un nombre écrit une fois
 * ---------------------------------------------------
 * PT_DUEL convertit un écart de taux de victoire en points de score. Choisi à
 * la main, ce serait un réglage de plus qu'on n'ose plus toucher. Posé comme
 * une règle — « l'écart médian vaut autant qu'un "bat" de la table
 * communautaire » — il se recalcule, et il se justifie.
 *
 *   PT_DUEL = PT_MATCHUP / médiane(|écart|)
 *
 * À relancer quand la source des duels change, ou quand la collecte est
 * refaite sur un nombre de brawlers par carte différent :
 *
 *   node outils/echelle_duels.js
 */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../donnees.js', 'utf8');
const bloc = src.match(/@DATA:DUELS \*\/([\s\S]*?)\/\* @END:DUELS/);
if (!bloc) { console.error('bloc @DATA:DUELS introuvable'); process.exit(1); }

/* Le bloc déclare `var DUELS` : l'évaluer dans une fonction évite de se
   heurter à une variable du même nom ici. */
const DUELS = new Function(bloc[1] + '; return DUELS;')();
const cles = Object.keys(DUELS);
if (!cles.length) { console.log('DUELS est vide — rien à régler.'); process.exit(0); }

const PT_MATCHUP = 12;   /* doit rester égal à moteur.js */
const ecarts = cles.map(c => Math.abs(DUELS[c][0])).sort((a, b) => a - b);
const m = ecarts.length;
const mediane = m % 2 ? ecarts[(m - 1) / 2] : (ecarts[m / 2 - 1] + ecarts[m / 2]) / 2;
const q = p => ecarts[Math.min(m - 1, Math.floor(p * m))];

console.log(`${m} duels tranchés`);
console.log(`  écart  min ${ecarts[0].toFixed(1)}  q1 ${q(.25).toFixed(1)}` +
            `  médiane ${mediane.toFixed(1)}  q3 ${q(.75).toFixed(1)}` +
            `  max ${ecarts[m - 1].toFixed(1)} pts de victoires`);
const pt = PT_MATCHUP / mediane;
console.log(`\n  PT_DUEL = ${PT_MATCHUP} / ${mediane.toFixed(1)} = ${pt.toFixed(2)}`);
/* Le plafond est posé à deux « bat » : au-delà, une seule paire déciderait du
   conseil à elle seule, ce que même une mesure ne devrait pas pouvoir faire. */
console.log(`  DUEL_MAX = 2 x ${PT_MATCHUP} = ${2 * PT_MATCHUP}` +
            `  (atteint par ${ecarts.filter(e => e * pt > 2 * PT_MATCHUP).length} duel(s))`);
