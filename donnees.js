/* donnees.js — tous les chiffres de l'app, et rien d'autre.
   ------------------------------------------------------------------------
   C'est le SEUL fichier réécrit automatiquement par refresh.py.
   Les marqueurs @DATA:NOM et @END:NOM délimitent ce qu'il remplace :
   ne pas les déplacer, ne pas les reformater.

   Si tu veux corriger un chiffre à la main, c'est ici — et nulle part
   ailleurs. Aucun calcul dans ce fichier, uniquement des données.
   ------------------------------------------------------------------------ */

/* Date et source de chaque bloc, affichées en pied de page. null = bloc
   absent. Séparées volontairement : une donnée non relevée ne doit jamais
   hériter de la date d'une autre. */
/* @DATA:MAJ */
var MAJ={tiers:["29/07/2026","Brawl Time Ninja"],
         cartes:["07/08/2026","topbrawl.com"],
         matchups:["07/08/2026","brawlcalculator.com"],
         synergie:null},SAISON=52;
/* @END:MAJ */

/* Passe à true quand refresh.py --assets a rapatrié les images dans
   assets/. L'app essaie alors le fichier local avant les CDN. */
/* @DATA:ASSETS */
var ASSETS_LOCAUX=true;
/* @END:ASSETS */

/* Les 6 modes du classé, avec la couleur qui les identifie à l'écran.
   Leurs noms affichés sont dans langues.js (clés modeBrawlBall, modeBounty…),
   puisqu'ils changent selon la langue. */
/* @DATA:MODES */
var MODES={brawlBall:{c:"#5EC8F5"},bounty:{c:"#FFB020"},knockout:{c:"#FF7A5C"},
gemGrab:{c:"#B98BFF"},heist:{c:"#57D9A3"},hotZone:{c:"#FF5D8F"}};
/* @END:MODES */

/* Le pool de cartes du classé.
   top : les meilleurs brawlers de la carte, sous la forme
     [nom, taux de victoire]  ou  [nom, taux de victoire, taux de sélection].
   La 3e valeur apparaît dès que les taux de sélection ont pu être relevés. */
/* @DATA:MAPS */
var MAPS=[
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène","es":"Palco central"},mode:"brawlBall",top:[["Jacky",62.37,2.99],["Ash",60.96,2.59],["Bibi",55.98,19.03],["Rico",54.98,34.82],["Griff",54.86,40.48],["Buster",56.54,1.68],["Bolt",54.5,3.2],["Bull",53.2,16.64]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Bibi",57.23,19.36],["Doug",57.05,2.31],["Shade",55.4,9.19],["Ash",56.0,2.13],["Ollie",60.87,0.53],["Ziggy",59.3,0.68],["Rico",53.56,29.56],["Starr Nova",53.38,13.8]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",mode:"brawlBall",top:[["Jacky",57.28,4.78],["Bibi",55.85,28.01],["Ash",56.02,3.84],["Sandy",57.03,2.05],["Frank",54.65,15.48],["Nita",54.44,12.17],["Gigi",56.8,1.32],["Doug",54.21,8.31]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Willow",58.57,8.52],["Ash",60.34,2.34],["Bibi",56.79,25.13],["Jacky",58.37,3.33],["Shade",55.66,15.56],["Dynamike",54.61,19.93],["Larry & Lawrie",55.32,3.01],["Barley",53.97,5.81]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",62.3,6.66],["Grom",59.23,6.45],["Mico",59.2,2.31],["Brock",56.23,40.88],["Pearl",56.06,4.78],["Carl",55.3,7.07],["Tick",54.8,13.76],["Gigi",55.78,1.94]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",60.46,7.6],["Brock",56.36,40.36],["Mr. P",57.34,2.75],["Pearl",55.35,5.62],["Sprout",56.46,2.24],["Grom",54.96,8.13],["Janet",61.18,0.65],["Charlie",56.41,1.78]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Mr. P",62.63,3.75],["Bolt",59.71,3.77],["Carl",58.52,6.87],["Doug",59.11,2.07],["Tick",56.36,18.0],["Pearl",57.56,3.16],["Brock",55.51,34.97],["Ash",61.9,0.81]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",63.11,8.16],["Tick",57.17,13.12],["Grom",57.11,8.1],["Brock",55.47,38.83],["Sprout",56.09,3.61],["Glowy",59.09,0.91],["Willow",63.64,0.46],["Pearl",54.81,3.96]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Brock",57.37,39.29],["Sprout",57.3,10.8],["Bolt",57.78,5.98],["Mico",57.06,11.59],["Grom",56.74,13.41],["Doug",60.0,1.33],["Tick",55.72,17.22],["Carl",56.01,5.84]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant","es":"Fénix en llamas"},mode:"knockout",top:[["Pearl",61.03,6.21],["Grom",58.51,11.24],["Brock",57.58,40.34],["Tick",56.65,17.1],["Buster",57.4,3.53],["Sprout",55.61,7.48],["Doug",56.57,2.38],["Darryl",55.74,3.9]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Mico",58.29,6.47],["Sprout",58.82,3.93],["Grom",57.68,6.12],["Bolt",57.49,6.72],["Brock",56.09,39.17],["Pearl",56.53,5.77],["Piper",54.84,32.03],["Edgar",54.67,22.45]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Pearl",60.56,11.74],["Brock",59.4,36.88],["Angelo",57.29,16.55],["Eve",55.98,7.28],["Mr. P",56.58,2.68],["R-T",58.33,1.17],["Piper",53.93,35.44],["Carl",54.27,6.16]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Bolt",64.13,8.58],["Bo",57.86,22.41],["Ash",58.66,2.02],["Moe",56.62,1.74],["Jessie",55.15,3.94],["Nori",55.93,1.88],["Clancy",54.4,3.98],["Starr Nova",53.67,16.69]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Bolt",58.88,7.98],["Carl",57.11,6.95],["Bo",55.14,25.2],["Damian",54.79,9.23],["Moe",56.6,1.69],["Mr. P",57.34,1.14],["Stu",54.06,14.62],["Starr Nova",53.72,15.97]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",62.55,8.48],["Ash",60.06,2.72],["Bo",57.61,25.81],["Rosa",58.39,4.47],["Trunk",61.34,0.93],["Doug",56.44,3.83],["Moe",58.05,1.6],["Pearl",55.27,5.12]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",noms:{"fr":"Fort de gemmes","es":"Fuerte de gemas"},mode:"gemGrab",top:[["Bolt",62.85,7.84],["Ash",58.66,3.21],["Bo",55.99,23.94],["Clancy",55.88,4.12],["Jessie",55.16,4.92],["Buster",56.32,1.38],["R-T",59.21,0.6],["Tara",53.54,24.9]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Bolt",59.54,6.21],["Ash",59.71,2.78],["Doug",59.61,1.61],["Bo",56.08,24.84],["Rico",55.95,32.52],["Pearl",55.01,3.89],["Damian",54.18,11.12],["Carl",54.33,5.78]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique"},mode:"gemGrab",top:[["Bolt",65.26,9.56],["Bo",57.25,22.52],["Stu",56.16,14.66],["Finx",57.53,1.16],["Max",54.12,18.26],["Mr. P",56.96,1.25],["Pearl",54.62,5.06],["Carl",54.36,6.91]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Bolt",59.96,7.04],["Bo",56.05,24.89],["Clancy",56.87,3.29],["Starr Nova",54.7,15.84],["Surge",54.36,27.59],["Janet",54.79,2.65],["Gale",54.14,3.16],["Charlie",54.18,2.56]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["Eve",61.41,5.66],["8-Bit",59.14,23.53],["Nori",62.21,1.4],["Colt",56.92,52.04],["Kaze",57.07,12.98],["Chuck",55.24,16.24],["Gigi",58.87,1.14],["Jessie",54.5,19.98]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate","es":"Patata caliente"},mode:"heist",top:[["Bibi",60.14,11.69],["Nita",59.03,22.14],["Mico",57.89,20.39],["Edgar",57.37,34.8],["Bull",55.93,18.7],["Nori",59.01,1.31],["Carl",55.43,8.71],["Jessie",54.74,21.41]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Mico",63.01,20.42],["Nori",67.25,1.38],["Bibi",58.38,4.11],["Jessie",56.32,20.39],["Edgar",56.0,32.0],["Melodie",56.26,10.93],["Eve",57.17,3.92],["Carl",56.15,10.62]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",noms:{"fr":"Zone sécurisée","es":"Refugio"},mode:"heist",top:[["Chuck",64.2,17.89],["Mico",59.22,21.86],["Jessie",57.57,23.69],["Nori",59.81,1.68],["Bolt",56.96,5.02],["Carl",55.75,13.17],["8-Bit",54.68,22.98],["Starr Nova",54.68,10.0]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Jessie",59.94,8.04],["Doug",58.76,3.93],["Bibi",56.7,13.26],["Tick",56.19,15.58],["Bo",55.22,28.68],["Draco",58.06,1.51],["Mina",55.23,5.04],["Amber",56.23,2.28]]},
{id:"open-business",img:15000292,nom:"Open Business",noms:{"fr":"C'est ouvert !","es":"Campo abierto"},mode:"hotZone",top:[["Tick",57.45,13.43],["Sandy",58.54,4.23],["Jessie",57.55,8.15],["Mina",57.56,5.19],["Gray",57.93,2.15],["Hank",60.0,1.07],["Ash",58.33,1.52],["Surge",55.2,23.81]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",noms:{"es":"Estrategias paralelas"},mode:"hotZone",top:[["Trunk",59.59,7.63],["Doug",58.56,16.08],["Juju",58.24,14.17],["Bibi",57.54,28.77],["R-T",57.52,8.19],["Hank",57.55,7.57],["Surge",54.63,28.19],["Jacky",54.49,8.79]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Poco",61.96,6.93],["Bolt",61.12,6.88],["Bo",59.87,33.95],["Ash",66.67,0.78],["Griff",57.09,32.78],["Jessie",57.25,8.22],["Tick",56.15,16.42],["Draco",60.56,1.12]]}];
/* @END:MAPS */

/* Classement S/A/B/C/D par mode. Chaîne de noms séparés par des virgules,
   volontairement compacte : c'est de la donnée brute, pas du code. */
/* @DATA:TIERS */
var TIERS={
brawlBall:{S:"Surge,Bibi",A:"Damian,Mortis,Chester,Bull,Starr Nova,Edgar,Mina,Griff,Nori,Rico",B:"Colette,Bolt,Sirius,Stu,Kenji,Cordelius,Crow,Fang,Meg,Shade,Emz,Max,Buzz,Colt,Otis,Spike,Frank,Clancy,Melodie,Leon,Lumi,Tara,Pierce,Gale",C:"Kaze,Darryl,Brock,Dynamike,Shelly,8-Bit,Nita,Najia,Bo,Lou,Sandy,Meeple,Carl,Doug,Draco,Jacky,El Primo,Maisie,Trunk,Kit,Buster,Lily,Willow,Alli,Moe,Poco,Ollie,Finx,Amber,Ash",D:"Charlie,Bea,Gigi,Squeak,Pearl,Ruffs,Byron,R-T,Jae-yong,Hank,Tick,Glowy,Gus,Larry & Lawrie,Sam,Gray,Jessie,Mico,Berry,Barley,Ziggy,Rosa,Penny,Nani,Mandy,Gene,Juju,Janet,Sprout,Lola,Bonnie,Mr. P,Belle,Grom,Pam,Piper,Chuck,Eve,Angelo"},
bounty:{S:"Pierce,Brock",A:"Najia,Byron,Piper,Nori,Bolt,Belle,Angelo,Crow,Mandy,Meeple",B:"Leon,Gus,8-Bit,Starr Nova,Colette,Bea,Edgar,Nani,Kit,Colt,Mina,Max,Otis,Fang,Chester,Sirius,Mortis,Gray,Surge,Spike,Lumi,Ruffs,Griff,Meg,Gene,Lily,Carl",C:"Damian,Squeak,Stu,Kaze,Alli,Rico,Ziggy,Bonnie,Jae-yong,Penny,Shade,R-T,Charlie,Tick,Finx,Glowy,Cordelius,Grom,Kenji,Bo,Maisie,Lou,Janet,Mico,Pearl,Emz,Dynamike,Mr. P,Juju,Melodie,Tara,Eve",D:"Amber,Willow,Gale,Buzz,Larry & Lawrie,Lola,Buster,Gigi,Doug,Sprout,Bibi,Moe,Darryl,Barley,Ollie,Clancy,Sandy,Jessie,Berry,Frank,Bull,Pam,Nita,Hank,El Primo,Trunk,Draco,Shelly,Poco,Chuck,Ash,Rosa,Jacky,Sam"},
knockout:{S:"Pierce,Najia",A:"Brock,Piper,Byron,Mandy,Leon,Nani,Edgar,Belle,Starr Nova,Angelo,Colt,Meeple,Crow",B:"Bea,Nori,Sirius,8-Bit,Rico,Gene,Chester,Colette,Spike,Surge,Gus,Gray,Bolt,Mina,Kit,Lily,Otis,Squeak,Tick,Mortis,Max,Damian,Carl,Griff,Lumi,Mr. P",C:"R-T,Kaze,Fang,Bo,Cordelius,Ruffs,Meg,Stu,Charlie,Finx,Pearl,Mico,Grom,Alli,Emz,Sprout,Bonnie,Kenji,Maisie,Dynamike,Melodie,Lou,Ziggy,Janet,Shade,Jae-yong,Glowy,Eve,Penny,Juju,Amber,Tara,Lola,Larry & Lawrie,Bibi,Buster,Willow",D:"Gale,Gigi,Moe,Buzz,Darryl,Clancy,Bull,Poco,Berry,Pam,Sandy,Doug,Ollie,Jessie,Barley,Shelly,Draco,Nita,Frank,Hank,El Primo,Trunk,Chuck,Ash,Sam,Rosa,Jacky"},
gemGrab:{S:"Surge,8-Bit",A:"Crow,Starr Nova,Chester,Bo,Pierce,Damian,Colette,Griff,Bolt,Meg,Lumi,Edgar,Mina",B:"Meeple,Mortis,Otis,Emz,Max,Sirius,Rico,Tara,Lily,Nori,Leon,Brock,Cordelius,Najia,Ruffs,Shade,Kenji,Charlie,Alli,Sandy,Spike,Amber,Squeak,Byron",C:"Gene,Fang,Lou,Bibi,Stu,Finx,Colt,Gale,Kaze,Gus,Janet,Carl,Gray,Poco,Bull,Penny,Jessie,Moe,Nita,Buster,Frank,Mr. P,Pearl,Clancy,Kit,Melodie",D:"Belle,Tick,Ash,Buzz,Larry & Lawrie,Doug,Glowy,Draco,Trunk,Mico,Ollie,Bea,Darryl,Gigi,Rosa,Berry,Jae-yong,Pam,Lola,Dynamike,Grom,Ziggy,Nani,Barley,R-T,Juju,Bonnie,Eve,Jacky,Sprout,Shelly,Willow,El Primo,Maisie,Chuck,Mandy,Piper,Hank,Sam,Angelo"},
heist:{S:"8-Bit,Chuck",A:"Colt,Melodie,Crow,Edgar,Brock,Colette,Mico,Griff,Nita,Rico,Bull",B:"Penny,Pierce,Jessie,Kaze,Lumi,Berry,Mandy,Spike,Amber,Sirius,Emz,Starr Nova,Otis,Nani,Chester,Bo,Nori,Clancy,Carl,Meg",C:"Najia,Surge,Darryl,Lola,Cordelius,Dynamike,Barley,Tick,Bibi,Squeak,Piper,Leon,Grom,Bolt,Angelo,Byron,Belle,Eve,Larry & Lawrie,R-T,Damian,Moe,Shade,Pearl,Max,Buzz,Lily,Ruffs,Meeple,Tara,Juju,Bea,Draco",D:"Stu,Gigi,Kenji,Ziggy,Kit,Mina,Alli,Charlie,Finx,Lou,Fang,Maisie,Trunk,Sandy,Shelly,Willow,Janet,Glowy,Hank,Bonnie,Mr. P,Gale,El Primo,Doug,Sprout,Ash,Frank,Jae-yong,Sam,Gus,Gene,Buster,Mortis,Pam,Jacky,Poco,Gray,Rosa,Ollie"},
hotZone:{S:"Emz,Bo",A:"Lou,8-Bit,Griff,Damian,Crow,Mina,Pierce,Surge,Tick,Sirius",B:"Nori,Chester,Meg,Spike,Squeak,Jessie,Starr Nova,Sandy,Bibi,Edgar,Kenji,Colette,Tara,Otis,Lumi,Gale,Barley,Penny,Finx,Berry,Najia,Amber,Brock,Bolt",C:"Poco,Buster,Frank,Shade,Chuck,Nita,Hank,Meeple,Ziggy,Kaze,Fang,Clancy,Pearl,Rico,Cordelius,Byron,Stu,Trunk,Grom,Ruffs,R-T,Bea,Glowy,Larry & Lawrie,Draco,Gray,Pam,Doug,Max,Carl,Bull,Ollie,Dynamike,Gus",D:"Jae-yong,Juju,Jacky,Mortis,Colt,Leon,Eve,Charlie,Kit,Moe,Willow,Gigi,Janet,Buzz,Darryl,Alli,Mr. P,Lily,Sprout,Mico,Mandy,Melodie,Maisie,Ash,Gene,Lola,Rosa,El Primo,Belle,Shelly,Bonnie,Piper,Angelo,Nani,Sam"}};
/* @END:TIERS */

/* Qui bat qui : la table vit maintenant dans counters.js, chargé après le
   premier dessin — voir l'en-tête de ce fichier-là. Elle est déclarée vide
   ici pour que le moteur ait toujours quelque chose à lire, et COUNTERS_PRET
   dit si ce qu'il lit est la vraie table ou ce vide provisoire. */
var COUNTERS = {};
var COUNTERS_PRET = false;


/* Duos qui gagnent plus souvent ensemble.
     "cleA|cleB": écart de taux de victoire en équipe, en points
   Les deux clés sont triées par ordre alphabétique. Tant que l'objet est
   vide, les alliés ne servent qu'à l'équilibre des rôles. */
/* @DATA:SYNERGIE */
var SYNERGIE={};
/* @END:SYNERGIE */
