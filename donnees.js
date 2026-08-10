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
         cartes:["10/08/2026","topbrawl.com"],
         matchups:["10/08/2026","brawlcalculator.com"],
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
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène","es":"Palco central"},mode:"brawlBall",top:[["Doug",57.36,4.02],["Griff",55.74,40.56],["Ash",57.18,3.45],["Bull",55.37,15.66],["Buzz",55.62,5.33],["Nita",55.41,6.0],["Bibi",54.37,16.99],["Rico",54.2,34.83]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Ash",60.06,3.08],["Bibi",55.75,15.37],["Doug",56.77,1.56],["Shade",54.11,8.97],["Damian",53.85,9.44],["Maisie",54.55,2.1],["Buster",57.35,0.68],["Griff",53.03,40.02]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",noms:{"fr":"Champs sournois","es":"Campos furtivos"},mode:"brawlBall",top:[["Jacky",60.85,4.21],["Nita",57.05,11.12],["Bibi",56.53,24.2],["Doug",56.14,7.6],["Rosa",56.25,3.4],["Ash",55.12,6.02],["Rico",54.11,31.75],["Sandy",54.95,2.19]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Jacky",63.01,2.98],["Bibi",58.53,22.55],["Larry & Lawrie",57.21,2.71],["Kenji",55.47,8.38],["Barley",55.47,5.51],["Juju",59.68,0.84],["Nita",54.91,7.83],["Ash",55.3,3.53]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",59.83,5.86],["Doug",68.0,0.73],["Brock",57.59,40.74],["Pearl",57.46,6.68],["Sprout",56.95,2.88],["Carl",55.66,7.34],["Tick",54.6,10.61],["Grom",54.53,4.86]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",61.19,7.5],["Brock",55.49,40.21],["Penny",55.14,2.9],["Max",53.69,23.31],["Tick",53.8,9.68],["Piper",53.36,41.14],["Leon",53.4,20.73],["Amber",57.53,0.73]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",61.74,4.22],["Carl",58.38,7.07],["Mr. P",59.68,2.53],["Sprout",57.92,4.9],["Brock",55.79,38.46],["Pearl",56.52,4.46],["Penny",55.58,9.52],["Tick",55.02,14.95]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",59.25,7.42],["Pearl",56.28,5.07],["Piper",55.12,45.79],["Brock",54.94,39.35],["Grom",55.54,6.02],["Max",54.23,21.35],["Sprout",54.18,4.54],["8-Bit",53.41,12.94]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Brock",57.44,39.45],["Grom",57.18,9.97],["Bolt",56.29,6.2],["Pearl",56.17,5.08],["Sprout",55.3,14.36],["Gray",55.06,17.31],["Doug",57.36,1.65],["Edgar",54.39,23.46]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant","es":"Fénix en llamas"},mode:"knockout",top:[["Buster",60.57,4.34],["Pearl",58.55,8.95],["Brock",57.28,39.91],["Grom",57.6,9.31],["Edgar",56.46,21.69],["Darryl",56.62,3.68],["Tick",54.52,14.27],["Gray",54.11,11.88]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Brock",57.3,39.73],["Ollie",66.13,0.61],["Juju",63.89,0.7],["Mr. P",56.87,2.55],["Carl",55.78,5.81],["Bolt",55.43,7.08],["Pearl",54.86,8.42],["Ziggy",58.18,1.07]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Brock",59.88,34.92],["Pearl",56.72,15.58],["Bolt",56.92,4.35],["Carl",56.4,5.71],["R-T",58.93,1.11],["Eve",55.14,5.85],["Buster",55.44,1.9],["Stu",54.04,3.91]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Bolt",62.05,8.39],["Bo",55.39,20.18],["Buster",60.47,0.94],["Mortis",54.16,15.7],["Jessie",54.66,3.38],["Lily",54.29,4.31],["Surge",53.4,27.68],["Glowy",58.82,0.55]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Bolt",59.91,7.21],["Surge",54.62,28.9],["Mina",55.04,6.36],["Penny",54.87,6.47],["Starr Nova",54.18,18.22],["8-Bit",54.11,18.28],["Tara",53.62,15.09],["Bo",53.16,21.93]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",60.77,8.17],["Nita",56.25,4.4],["Bo",55.15,24.99],["Bull",54.8,9.98],["Mr. P",62.5,0.49],["Ash",55.1,3.7],["Damian",54.06,9.66],["Draco",58.02,0.82]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",noms:{"fr":"Fort de gemmes","es":"Fuerte de gemas"},mode:"gemGrab",top:[["Bolt",59.54,7.22],["Ash",56.89,4.63],["Jessie",56.07,3.98],["Bo",54.12,23.51],["Surge",53.97,27.59],["Carl",54.37,5.3],["Finx",57.29,0.99],["Tara",53.6,22.16]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Ash",60.44,4.21],["Clancy",58.33,2.78],["Bolt",56.93,6.26],["Rico",55.1,34.35],["Bo",54.97,21.75],["Lily",54.82,5.76],["Buster",57.5,0.93],["Kenji",54.11,5.49]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique"},mode:"gemGrab",top:[["Bolt",63.32,10.14],["Bo",55.81,20.49],["Carl",56.17,7.27],["Damian",55.89,4.96],["8-Bit",54.82,19.75],["Pearl",54.46,6.78],["Stu",53.55,18.75],["Tara",53.22,8.6]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Ash",60.41,4.06],["Bolt",57.98,6.93],["Bo",55.8,21.51],["Mr. P",60.49,0.85],["Buster",58.33,1.25],["Jessie",54.95,3.8],["8-Bit",53.87,16.61],["Ruffs",53.92,6.93]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["Nori",65.72,15.16],["8-Bit",58.96,24.28],["Colt",56.69,53.35],["Eve",56.9,6.65],["Mico",55.98,15.07],["Kaze",55.78,14.59],["Chuck",55.14,16.32],["Melodie",54.1,14.21]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate","es":"Patata caliente"},mode:"heist",top:[["Nori",65.45,15.4],["Bibi",62.41,10.69],["Carl",57.18,8.94],["Nita",56.76,18.09],["Edgar",55.88,32.48],["Bull",55.0,18.26],["Melodie",55.07,9.56],["Kit",58.56,1.16]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Nori",67.1,17.44],["Mico",57.1,20.05],["Jessie",56.94,16.61],["Nita",57.24,9.13],["Glowy",71.79,0.42],["Carl",55.87,12.1],["Edgar",53.84,28.79],["Melodie",53.72,12.26]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",noms:{"fr":"Zone sécurisée","es":"Refugio"},mode:"heist",top:[["Nori",65.34,16.71],["Chuck",64.73,15.83],["Starr Nova",57.1,10.36],["Juju",70.73,0.44],["Mico",56.35,22.05],["Jessie",56.37,18.98],["Carl",54.81,15.29],["Penny",54.53,25.87]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Kenji",59.13,9.08],["Tick",58.82,12.45],["Sandy",61.09,2.66],["Bo",56.5,25.68],["Jessie",56.26,6.38],["Nita",56.57,3.09],["Rosa",60.26,0.81],["Griff",54.25,39.15]]},
{id:"open-business",img:15000292,nom:"Open Business",noms:{"fr":"C'est ouvert !","es":"Campo abierto"},mode:"hotZone",top:[["Stu",57.87,16.78],["Poco",58.27,5.81],["Jessie",57.52,6.53],["Ash",59.47,1.94],["Sandy",57.93,3.55],["Bibi",56.77,8.69],["Bolt",57.14,4.94],["Juju",68.09,0.48]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",noms:{"es":"Estrategias paralelas"},mode:"hotZone",top:[["Bibi",60.57,27.37],["Doug",58.95,13.46],["Juju",58.94,13.68],["Trunk",58.68,7.25],["R-T",58.01,7.33],["El Primo",57.75,2.81],["Jacky",56.32,8.26],["Hank",56.11,7.82]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Bo",60.56,30.53],["Bolt",59.77,6.14],["Ash",63.64,1.24],["Glowy",61.84,1.56],["Griff",56.34,33.31],["Gray",58.44,2.49],["Poco",57.0,6.01],["Meg",55.68,29.79]]}];
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
