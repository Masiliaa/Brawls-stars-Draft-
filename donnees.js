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
         cartes:["03/08/2026","topbrawl.com"],
         matchups:["03/08/2026","brawlcalculator.com"],
         synergie:null},SAISON=52;
/* @END:MAJ */

/* Passe à true quand refresh.py --assets a rapatrié les images dans
   assets/. L'app essaie alors le fichier local avant les CDN. */
/* @DATA:ASSETS */
var ASSETS_LOCAUX=false;
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
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène"},mode:"brawlBall",top:[["Damian",57.91,14.28],["Griff",57.25,41.31],["Jacky",57.72,2.45],["Bolt",57.01,3.45],["Surge",55.29,24.26],["Rico",54.24,35.38],["Bibi",54.14,17.69],["Ash",55.56,2.33]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Damian",57.94,14.32],["Surge",55.7,22.25],["Starr Nova",55.49,17.15],["Shade",55.42,10.21],["8-Bit",55.29,10.19],["Griff",54.42,42.94],["Doug",56.03,1.87],["Ash",54.87,1.81]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",mode:"brawlBall",top:[["Damian",58.09,16.48],["Rosa",59.45,2.93],["Doug",56.32,8.04],["Maisie",58.71,1.64],["Jacky",56.37,4.5],["Griff",55.1,41.98],["Bibi",54.31,23.91],["Jessie",55.71,1.69]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Surge",57.17,24.44],["Larry & Lawrie",58.55,3.41],["Ziggy",60.82,1.4],["Barley",57.12,5.97],["Damian",56.44,15.73],["Jacky",56.6,3.05],["Ash",57.2,1.99],["Lou",56.49,2.34]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",63.81,7.76],["Brock",54.79,41.62],["Sprout",56.16,2.8],["Mr. P",55.42,3.92],["Carl",54.89,6.72],["8-Bit",54.34,14.24],["Starr Nova",54.31,13.68],["Juju",66.67,0.31]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",65.49,9.14],["Pearl",58.04,4.64],["Brock",55.93,40.45],["Mico",56.55,2.45],["Maisie",61.45,0.65],["Mortis",54.44,16.42],["Damian",54.56,6.02],["Max",54.04,19.61]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",65.99,4.96],["Mr. P",61.28,3.68],["Brock",55.5,35.56],["Surge",54.88,24.57],["Tick",54.91,17.7],["Grom",54.5,8.95],["Starr Nova",53.62,16.56],["Ash",57.45,0.79]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",66.12,8.65],["Grom",57.65,7.53],["Sprout",57.65,4.55],["Brock",56.36,39.79],["Nani",55.98,26.07],["Piper",53.55,47.99],["Gigi",55.62,1.43],["Angelo",53.36,13.29]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Bolt",59.12,6.96],["Brock",57.83,39.18],["Grom",56.29,11.46],["Pearl",56.79,2.98],["Tick",54.94,16.29],["Sprout",54.85,12.01],["Mr. P",55.35,4.76],["Gray",54.65,13.66]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant"},mode:"knockout",top:[["Bolt",61.19,5.78],["Grom",57.48,9.9],["Brock",55.89,41.03],["Pearl",56.69,5.94],["Sprout",55.58,7.78],["Tick",55.15,16.51],["Gray",55.17,10.13],["Doug",55.89,2.68]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Pearl",61.54,5.21],["Bolt",59.59,7.72],["Brock",57.83,39.55],["Mr. P",58.33,3.29],["Sprout",57.26,3.83],["Grom",55.73,5.4],["Gray",54.67,11.43],["Starr Nova",54.36,13.97]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Brock",61.34,37.1],["Bolt",59.39,5.39],["Eve",56.32,6.16],["Pearl",55.6,11.64],["8-Bit",55.38,12.98],["Mr. P",53.9,2.81],["Carl",53.09,5.32],["Squeak",52.85,10.38]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Bolt",62.83,8.74],["Damian",57.9,12.78],["Starr Nova",56.79,18.5],["Bo",55.66,21.76],["Clancy",56.93,3.33],["Mr. P",59.84,1.05],["Ash",56.34,2.79],["Surge",54.48,25.58]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Bolt",62.67,8.64],["Surge",58.32,26.03],["Damian",58.43,12.19],["Starr Nova",57.44,19.01],["8-Bit",55.78,18.43],["Bo",54.33,23.41],["Penny",54.4,7.25],["Crow",53.33,36.39]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",64.52,9.7],["Damian",59.06,12.6],["Bo",56.67,25.04],["Clancy",57.25,4.53],["Griff",54.35,40.49],["Tara",54.36,30.98],["Surge",54.33,25.33],["Jessie",55.65,2.76]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",mode:"gemGrab",top:[["Bolt",66.09,9.04],["Surge",57.57,26.99],["Damian",57.37,14.77],["Bo",56.67,22.47],["8-Bit",55.22,15.43],["Rosa",57.21,1.93],["Janet",55.97,2.33],["Trunk",56.15,1.13]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Bolt",62.08,6.79],["Damian",61.07,13.91],["8-Bit",58.91,17.39],["Mr. P",60.8,1.09],["Surge",55.56,26.42],["Starr Nova",55.64,17.8],["Gigi",57.46,1.99],["Carl",55.11,5.64]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique"},mode:"gemGrab",top:[["Bolt",66.22,10.33],["Starr Nova",58.26,16.78],["8-Bit",57.47,19.31],["Bo",56.11,21.86],["Damian",55.86,8.37],["Stu",54.46,13.66],["Surge",54.24,23.79],["Chuck",56.56,1.0]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Bolt",62.45,7.88],["Janet",59.57,3.01],["Starr Nova",57.13,18.42],["Damian",57.29,12.85],["Surge",56.28,26.14],["Bo",55.83,23.93],["Bea",57.3,1.44],["Buster",57.93,1.18]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["8-Bit",65.33,23.74],["Colt",57.23,53.49],["Chuck",57.11,16.4],["Mico",57.08,14.37],["Carl",56.47,7.53],["Starr Nova",55.89,9.48],["Eve",55.99,6.43],["Alli",54.93,3.02]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate"},mode:"heist",top:[["Bibi",59.21,11.74],["Nita",57.05,20.19],["Carl",56.88,8.63],["Shade",56.72,5.11],["Edgar",55.66,34.91],["Mico",55.75,19.86],["8-Bit",55.69,21.65],["Bull",55.62,17.32]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Starr Nova",60.0,14.39],["Mico",59.49,19.82],["8-Bit",58.57,22.55],["Bolt",58.61,7.83],["Carl",56.5,10.92],["Jessie",54.57,18.83],["Surge",54.43,19.21],["Nita",54.55,9.35]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",mode:"heist",top:[["Chuck",64.78,17.1],["Bolt",62.66,6.77],["Starr Nova",60.17,12.17],["Mico",56.75,22.31],["8-Bit",56.58,23.84],["Jessie",56.32,20.87],["Melodie",54.76,10.07],["Eve",54.27,4.49]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Damian",59.51,13.8],["Bolt",59.55,5.16],["Starr Nova",57.98,16.03],["Sandy",58.39,3.8],["Surge",55.57,22.74],["Bo",55.37,27.2],["Griff",55.12,40.22],["Bibi",54.84,12.58]]},
{id:"open-business",img:15000292,nom:"Open Business",mode:"hotZone",top:[["Starr Nova",61.09,16.96],["Surge",60.46,23.29],["Bolt",59.44,6.01],["Damian",56.6,12.64],["Tick",56.33,12.86],["Sandy",56.54,4.53],["Bibi",55.51,9.92],["Kenji",55.03,7.46]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",mode:"hotZone",top:[["Hank",58.77,8.06],["Damian",57.26,13.61],["R-T",57.24,8.36],["Doug",56.81,15.83],["Bolt",58.25,3.41],["Bibi",56.58,26.89],["Juju",56.71,16.28],["Surge",56.05,27.01]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Damian",62.87,10.3],["Bolt",62.63,7.69],["Starr Nova",60.09,13.69],["8-Bit",58.36,20.65],["Surge",57.84,22.43],["Bo",56.97,34.17],["Mina",58.02,4.71],["Poco",57.1,6.2]]}];
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
