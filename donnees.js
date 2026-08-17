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
var MAJ={tiers:["17/08/2026","brawltime.ninja (vote communautaire)"],
         cartes:["17/08/2026","topbrawl.com"],
         matchups:["17/08/2026","brawlcalculator.com"],
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
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène","es":"Palco central"},mode:"brawlBall",top:[["Ash",62.6,5.82],["Bibi",57.9,16.33],["Jacky",58.88,2.24],["Rico",55.47,32.79],["Rosa",57.65,1.9],["Gale",55.64,6.04],["Buster",57.75,1.58],["Nita",55.4,6.49]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Ash",58.88,5.76],["Bibi",57.56,15.68],["Juju",69.7,0.38],["Alli",66.67,0.46],["Shade",55.42,9.28],["Jacky",58.76,1.08],["Damian",54.65,7.63],["Griff",54.06,38.26]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",noms:{"fr":"Champs sournois","es":"Campos furtivos"},mode:"brawlBall",top:[["Jacky",61.38,4.46],["Rosa",58.72,3.53],["Rico",55.72,33.58],["Draco",63.64,0.65],["Doug",56.0,7.66],["Bull",55.49,22.97],["Nita",55.56,11.3],["Ash",55.62,8.06]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Jacky",64.15,2.56],["Bibi",56.38,20.78],["Tick",56.87,3.78],["Larry & Lawrie",57.21,2.44],["Carl",55.89,6.42],["Nita",54.89,7.49],["Sirius",54.78,6.44],["Clancy",55.56,2.83]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",63.92,5.42],["Brock",56.4,39.71],["Carl",56.69,8.72],["Mico",58.06,1.77],["Mr. P",56.22,2.48],["Bibi",56.58,1.74],["Pearl",54.53,9.34],["Sandy",63.16,0.43]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",59.25,7.11],["Pearl",58.07,10.07],["Tick",56.76,9.0],["Sprout",58.42,2.1],["Mr. P",57.66,2.45],["Leon",55.35,20.65],["Brock",55.04,38.96],["Glowy",59.0,1.11]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",62.08,3.81],["Brock",58.38,38.87],["Tick",57.46,15.68],["Penny",55.21,11.07],["Doug",56.65,2.36],["Mortis",54.91,18.01],["Grom",55.17,6.75],["Ash",57.36,1.5]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",62.39,6.87],["Brock",56.62,37.94],["Pearl",56.9,7.07],["Bo",56.12,5.35],["Piper",55.03,47.37],["Sprout",55.2,5.16],["8-Bit",53.95,11.77],["Angelo",53.83,14.31]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Grom",58.14,9.82],["Brock",57.24,40.06],["Bolt",58.52,4.37],["Ollie",63.89,0.8],["Edgar",55.74,22.34],["Sprout",55.82,14.88],["Bonnie",60.0,1.05],["Pearl",55.5,6.27]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant","es":"Fénix en llamas"},mode:"knockout",top:[["Brock",59.02,37.35],["Grom",57.62,9.25],["Pearl",56.87,12.15],["Edgar",56.3,22.44],["Tick",56.04,15.46],["Sprout",55.22,11.09],["Doug",56.36,3.0],["Buster",55.31,5.03]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Mico",59.69,4.94],["Bolt",58.17,5.58],["Brock",56.41,37.36],["Juju",61.96,1.0],["Mr. P",56.69,3.08],["Pearl",55.52,10.23],["Grom",55.77,5.18],["Doug",57.85,1.31]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Brock",59.14,32.85],["Pearl",58.3,20.44],["Mr. P",60.62,2.16],["Bolt",58.82,3.61],["Doug",62.69,0.76],["Tick",55.91,7.11],["Cordelius",59.14,1.04],["Angelo",54.9,19.32]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Bolt",62.27,8.18],["Bo",56.26,20.35],["Draco",66.67,0.48],["Ash",54.74,7.02],["Grom",60.0,0.63],["Stu",53.59,23.5],["Nori",53.62,13.92],["Surge",53.29,30.18]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Bolt",59.61,7.1],["Mico",61.04,0.89],["Mr. P",60.24,0.96],["Moe",57.0,2.31],["Carl",55.35,8.66],["Ash",55.32,4.45],["Starr Nova",54.49,16.35],["Damian",54.84,6.1]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",59.01,7.08],["Rosa",59.49,4.11],["Sandy",58.31,5.4],["Bo",55.21,23.13],["Ash",55.37,6.91],["Emz",54.49,26.25],["Doug",55.56,3.05],["Buster",55.26,1.98]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",noms:{"fr":"Fort de gemmes","es":"Fuerte de gemas"},mode:"gemGrab",top:[["Bolt",58.43,7.35],["Clancy",58.89,3.32],["Janet",59.52,2.43],["Bo",55.33,21.71],["Ash",55.75,7.14],["R-T",60.0,0.75],["Surge",54.17,30.0],["Pearl",54.56,6.72]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Ash",58.88,6.38],["Rico",56.24,35.16],["Bolt",56.81,6.2],["Bibi",56.04,7.86],["Kenji",56.2,5.0],["Pearl",56.09,5.19],["Nita",56.49,3.15],["Shade",55.4,7.57]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique"},mode:"gemGrab",top:[["Bolt",59.14,10.41],["Mr. P",64.71,0.96],["Bo",57.05,20.76],["Buster",68.57,0.39],["Mortis",55.46,15.67],["Stu",55.18,26.65],["8-Bit",55.05,19.29],["Pam",62.5,0.54]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Pam",70.0,0.54],["Bolt",57.82,6.19],["Ash",56.6,6.85],["Bo",55.12,21.25],["Starr Nova",54.17,15.79],["Buster",57.78,0.98],["Maisie",57.0,1.09],["Damian",53.96,6.88]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["Nori",67.29,18.1],["8-Bit",59.35,24.2],["Eve",58.59,5.45],["Colt",55.83,53.18],["Chuck",55.67,16.82],["Melodie",54.16,15.1],["Bibi",55.17,2.95],["Lola",54.17,3.79]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate","es":"Patata caliente"},mode:"heist",top:[["Nori",63.96,18.82],["Nita",59.38,18.56],["Bibi",59.16,11.37],["Gigi",60.3,2.38],["Edgar",57.31,32.9],["Ash",75.0,0.33],["Bull",56.52,17.15],["Carl",55.51,12.35]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Nori",66.58,18.23],["Carl",57.38,13.35],["Jessie",56.51,16.49],["Bea",59.32,1.38],["Edgar",55.3,26.03],["Mico",55.3,20.01],["Shade",57.04,1.6],["Kaze",54.47,14.96]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",noms:{"fr":"Zone sécurisée","es":"Refugio"},mode:"heist",top:[["Nori",66.35,18.45],["Chuck",62.43,15.78],["Bolt",57.06,4.26],["Mico",55.83,21.3],["Jessie",55.49,19.59],["Carl",54.68,16.63],["Mina",63.64,0.39],["Edgar",53.51,27.65]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Ash",63.13,2.59],["Kenji",57.74,9.11],["Bibi",56.74,13.11],["Tick",56.22,11.24],["Poco",56.3,5.51],["Griff",55.44,37.52],["Jessie",55.79,7.21],["Maisie",62.96,0.64]]},
{id:"open-business",img:15000292,nom:"Open Business",noms:{"fr":"C'est ouvert !","es":"Campo abierto"},mode:"hotZone",top:[["Ash",60.28,3.35],["Kenji",57.45,8.59],["Sandy",58.36,3.83],["Hank",66.67,0.63],["Emz",56.25,28.98],["Bibi",56.44,9.23],["Tick",55.85,10.85],["Jessie",55.76,6.98]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",noms:{"es":"Estrategias paralelas"},mode:"hotZone",top:[["Trunk",59.59,7.58],["Bibi",58.6,25.94],["Doug",58.42,13.74],["Larry & Lawrie",58.67,4.44],["R-T",57.94,7.81],["Hank",57.87,6.75],["Lou",58.5,3.61],["Bolt",57.14,2.33]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Bolt",60.33,5.42],["Bo",57.25,31.74],["Chuck",58.76,3.29],["Meg",56.58,30.19],["Gray",57.83,3.98],["Mina",57.2,5.35],["Jessie",56.82,8.04],["Draco",60.17,1.33]]}];
/* @END:MAPS */

/* Classement S/A/B/C/D par mode. Chaîne de noms séparés par des virgules,
   volontairement compacte : c'est de la donnée brute, pas du code. */
/* @DATA:TIERS */
var TIERS={
brawlBall:{S:"Surge,Nori",A:"Bibi,Damian,Starr Nova,Griff,Chester,Mortis,Bull,Edgar",B:"Mina,Kenji,Bolt,Crow,Stu,Rico,Emz,Sirius,Max,Cordelius,Fang,Colette,Meg,Shade,Otis,Buzz,Colt,Lumi,Spike,Frank,Melodie,Pierce,Clancy,Leon",C:"Kaze,Meeple,Tara,8-Bit,Gale,Dynamike,Brock,Shelly,Darryl,Nita,Lou,Carl,Bo,El Primo,Buster,Maisie,Jacky,Doug,Najia,Draco,Sandy,Alli,Finx,Lily,Kit,Moe,Poco,Ash,Trunk,Pearl,Willow,Amber,Gigi",D:"Ruffs,Charlie,Bea,Squeak,Hank,Tick,Berry,Ollie,R-T,Byron,Gray,Larry & Lawrie,Gus,Jessie,Sam,Glowy,Rosa,Jae-yong,Barley,Penny,Ziggy,Gene,Mico,Mandy,Juju,Nani,Sprout,Janet,Lola,Bonnie,Grom,Pam,Belle,Mr. P,Eve,Piper,Chuck,Angelo"},
bounty:{S:"Pierce,Brock",A:"Byron,Nori,Piper,Najia,Mandy,8-Bit,Crow,Starr Nova,Belle,Meeple,Leon",B:"Surge,Bea,Angelo,Edgar,Colt,Nani,Bolt,Gus,Mina,Max,Otis,Gray,Colette,Gene,Fang,Griff,Carl,Ruffs,Lumi,Squeak,Kit,Rico,Meg,Mortis,Tick",C:"Spike,Kaze,Lily,Sirius,R-T,Stu,Damian,Bo,Shade,Chester,Finx,Kenji,Lou,Pearl,Charlie,Emz,Janet,Penny,Grom,Cordelius,Maisie,Ziggy,Glowy,Jae-yong,Sprout,Eve,Bonnie,Alli,Willow,Larry & Lawrie,Mico,Gigi,Mr. P,Juju,Tara,Melodie",D:"Amber,Dynamike,Bibi,Darryl,Buster,Barley,Buzz,Gale,Lola,Moe,Clancy,Berry,Bull,Ollie,Sandy,Frank,Jessie,Doug,Pam,Poco,Draco,Ash,Hank,Nita,Shelly,Trunk,Sam,El Primo,Rosa,Chuck,Jacky"},
knockout:{S:"Pierce,Brock",A:"Najia,Piper,Nori,Byron,Leon,Mandy,Starr Nova,Bea",B:"Belle,Meeple,Edgar,Nani,Crow,Colt,Surge,Sirius,8-Bit,Angelo,Gus,Spike,Rico,Bolt,Gene,Gray,Griff,Mina,Tick,Kit,Chester,Otis,Colette,Squeak,Max,Lily,Mr. P",C:"Carl,Damian,Mortis,Ruffs,Lumi,Charlie,Stu,Fang,R-T,Kaze,Mico,Finx,Bo,Sprout,Lou,Meg,Cordelius,Dynamike,Emz,Alli,Ziggy,Pearl,Kenji,Grom,Bonnie,Janet,Penny,Maisie,Shade,Juju,Amber,Glowy,Jae-yong,Eve,Gale",D:"Darryl,Larry & Lawrie,Tara,Willow,Barley,Lola,Moe,Berry,Bibi,Poco,Buster,Melodie,Gigi,Clancy,Buzz,Draco,Doug,Sandy,Shelly,Pam,Jessie,Ollie,Bull,Frank,Hank,Trunk,Nita,Rosa,Chuck,Ash,Sam,El Primo,Jacky"},
gemGrab:{S:"8-Bit,Surge",A:"Starr Nova,Crow,Damian,Nori,Bolt,Griff,Meg,Bo,Emz,Edgar",B:"Otis,Chester,Leon,Tara,Mortis,Sirius,Lumi,Max,Cordelius,Brock,Pierce,Mina,Lily,Kenji,Bibi,Colette,Meeple,Shade,Rico,Spike,Sandy,Charlie,Lou",C:"Squeak,Ruffs,Stu,Najia,Alli,Janet,Finx,Buzz,Kaze,Gene,Carl,Fang,Byron,Penny,Buster,Clancy,Bull,Kit,Colt,Gale,Nita,Amber,Gray,Pearl,Poco,Jessie,Glowy,Gus,Tick,Dynamike,Moe,Darryl,Ash",D:"Mr. P,Melodie,Mico,Bea,Draco,Doug,Berry,R-T,Frank,Willow,Belle,Ollie,Lola,Trunk,Mandy,Larry & Lawrie,Gigi,Pam,Nani,Barley,Maisie,Jae-yong,Juju,Sprout,Grom,Bonnie,Ziggy,Piper,Eve,Jacky,Shelly,Angelo,El Primo,Hank,Rosa,Sam,Chuck"},
heist:{S:"8-Bit,Chuck",A:"Colette,Colt,Mico,Melodie,Brock,Edgar,Crow,Griff,Nita,Jessie,Kaze,Bull,Penny",B:"Nori,Pierce,Amber,Emz,Starr Nova,Berry,Mandy,Rico,Spike,Carl,Sirius,Lumi,Meg,Otis,Nani,Bolt,Surge,Bibi",C:"Bo,Squeak,Barley,Lola,Chester,Cordelius,Darryl,Najia,Shade,Angelo,Piper,Max,Dynamike,Clancy,Pearl,Tara,Damian,Larry & Lawrie,Leon,Lily,Tick,Draco,R-T,Grom,Byron,Buzz,Mina,Gigi,Kenji,Ziggy",D:"Lou,Charlie,Moe,Meeple,Ruffs,Belle,Eve,Alli,Juju,Fang,Bea,Bonnie,Trunk,Gale,Frank,Doug,Mr. P,El Primo,Kit,Gus,Hank,Maisie,Sprout,Glowy,Stu,Mortis,Finx,Ash,Shelly,Janet,Willow,Sam,Gray,Buster,Jae-yong,Sandy,Pam,Rosa,Jacky,Ollie,Gene,Poco"},
hotZone:{S:"Griff,Bo",A:"Emz,Lou,8-Bit,Meg,Chester,Damian,Surge",B:"Squeak,Crow,Starr Nova,Berry,Nori,Otis,Tick,Gale,Sirius,Finx,Sandy,Brock,Kenji,Pierce,Jessie,Lumi,Penny,Spike,Mina,Shade,Edgar,Amber,Tara,Leon,Carl",C:"Colette,Meeple,Barley,Najia,Stu,Melodie,Poco,Max,Ruffs,Bolt,Bibi,Cordelius,Fang,Buster,Kaze,Clancy,Juju,Larry & Lawrie,Frank,Glowy,Gray,Grom,Nita,Draco,Dynamike,Pearl,Ziggy,Ash,Charlie,R-T,Chuck,Willow,Rico,Mortis,Jae-yong,Bea,Byron,Hank",D:"Pam,Doug,Sprout,Buzz,Trunk,Ollie,Gus,Colt,Janet,Lily,Rosa,Moe,Gigi,Darryl,Mr. P,Bull,Lola,Maisie,Mico,Kit,El Primo,Alli,Jacky,Gene,Nani,Belle,Piper,Eve,Shelly,Bonnie,Mandy,Sam,Angelo"}};
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
