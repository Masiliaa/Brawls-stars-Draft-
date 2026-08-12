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
var MAJ={tiers:["12/08/2026","brawltime.ninja (vote communautaire)"],
         cartes:["12/08/2026","topbrawl.com"],
         matchups:["12/08/2026","brawlcalculator.com"],
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
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène","es":"Palco central"},mode:"brawlBall",top:[["Ash",61.86,3.77],["Jacky",60.74,2.21],["Buster",59.47,1.7],["Rico",55.7,35.58],["Buzz",55.96,5.83],["Griff",54.68,41.49],["Bolt",56.51,2.33],["Damian",54.56,10.01]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Bibi",56.6,13.83],["Clancy",56.89,3.37],["Damian",54.4,9.77],["Ash",54.2,4.01],["Shade",53.38,10.41],["Griff",53.11,40.75],["Grom",56.84,0.7],["Gray",56.98,0.63]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",noms:{"fr":"Champs sournois","es":"Campos furtivos"},mode:"brawlBall",top:[["Jacky",60.17,3.81],["Doug",58.19,6.53],["R-T",62.22,0.72],["Nita",55.45,12.44],["Bibi",54.82,21.49],["Trunk",56.34,2.29],["Rico",54.54,35.92],["Rosa",55.58,3.57]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Barley",58.64,6.86],["Jacky",59.88,2.55],["Bibi",57.11,19.84],["Ash",57.17,4.69],["Larry & Lawrie",56.63,2.73],["Emz",54.13,25.62],["Nita",54.4,8.15],["Willow",54.24,9.84]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",59.26,6.85],["Mr. P",59.2,3.81],["Grom",58.62,4.95],["Brock",56.7,41.72],["Sprout",57.17,3.46],["Pearl",54.85,7.44],["Bo",54.51,6.63],["Doug",58.76,0.71]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",61.63,8.28],["Lola",70.59,0.38],["Grom",56.19,5.17],["Brock",54.99,40.16],["Mortis",53.92,16.5],["Glowy",56.47,1.25],["Mr. P",54.87,2.49],["Leon",53.52,21.28]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",61.14,4.93],["Mr. P",61.87,3.07],["Brock",57.34,40.12],["Trunk",64.17,0.88],["Tick",55.45,13.58],["Carl",54.26,7.95],["Bo",54.38,6.31],["Penny",53.59,10.87]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",61.87,8.1],["Sprout",57.75,5.27],["Brock",55.52,40.11],["Grom",54.93,6.3],["Pearl",54.41,6.23],["Piper",53.86,47.44],["Angelo",53.94,15.3],["Mr. P",54.95,2.26]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Brock",58.59,40.65],["Bolt",57.86,6.52],["Sprout",56.35,15.3],["Gigi",55.65,2.63],["Grom",54.39,10.58],["Doug",55.94,1.51],["Gray",53.56,18.12],["Ziggy",54.74,2.43]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant","es":"Fénix en llamas"},mode:"knockout",top:[["Pearl",60.16,11.7],["Brock",59.17,40.36],["Grom",59.75,9.05],["Darryl",57.18,3.04],["Doug",57.21,2.92],["Edgar",55.63,20.53],["Bolt",54.96,5.1],["Buster",54.79,5.21]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Brock",57.64,39.85],["Alli",61.76,0.96],["Angelo",56.51,4.02],["Edgar",55.4,16.2],["Sprout",55.97,5.69],["Buster",57.58,1.88],["Pearl",55.33,10.57],["Doug",59.4,0.94]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Brock",59.86,34.09],["Pearl",57.77,20.25],["Mr. P",58.64,3.04],["Eve",57.24,7.05],["Bolt",56.89,4.88],["Angelo",54.09,21.78],["R-T",57.05,1.06],["Meg",53.12,14.77]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Bolt",61.25,9.21],["Bo",55.17,20.79],["Ash",55.54,5.53],["Carl",54.66,8.66],["Surge",53.82,29.7],["Mr. P",58.0,0.78],["Charlie",54.42,2.72],["Trunk",56.45,0.96]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Bolt",60.0,7.88],["Ash",57.58,2.71],["8-Bit",54.76,19.93],["Stu",54.47,23.57],["Surge",53.99,30.06],["Bull",54.84,3.71],["Moe",55.15,2.46],["Najia",55.6,1.87]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",60.54,8.25],["Buster",60.08,1.81],["Rosa",57.82,3.91],["Clancy",57.5,4.48],["Bo",54.84,24.59],["Ash",55.02,5.13],["Emz",54.13,23.84],["Surge",54.04,29.9]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",noms:{"fr":"Fort de gemmes","es":"Fuerte de gemas"},mode:"gemGrab",top:[["Bolt",62.35,7.37],["Ash",55.99,5.62],["Bo",55.11,21.51],["Rosa",57.2,1.95],["Edgar",54.1,20.3],["Jessie",54.92,3.61],["Tara",53.66,21.11],["Stu",53.42,14.73]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Ash",63.05,5.31],["Rosa",62.8,1.24],["Bolt",56.43,6.49],["Rico",55.49,37.75],["Mico",60.63,0.96],["Bo",55.04,22.94],["Starr Nova",53.45,18.92],["Carl",53.61,7.25]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique"},mode:"gemGrab",top:[["Bolt",64.88,10.29],["Mr. P",61.69,1.18],["Pearl",56.75,8.18],["Bo",55.65,19.98],["Melodie",60.82,0.74],["Mina",54.17,8.46],["Glowy",56.94,1.11],["Gray",55.02,2.06]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Bolt",57.75,7.67],["Tara",56.05,19.66],["Clancy",55.39,2.95],["Bo",53.64,22.73],["Surge",53.38,29.51],["Draco",58.21,0.49],["R-T",59.26,0.4],["Moe",53.42,2.81]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["Nori",65.67,18.16],["8-Bit",59.57,25.64],["Colt",55.63,54.05],["Eve",56.08,7.02],["Jessie",53.56,13.68],["Lola",54.0,4.44],["Chuck",53.31,16.31],["Darryl",54.12,2.11]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate","es":"Patata caliente"},mode:"heist",top:[["Nori",64.72,17.1],["Bibi",63.44,11.17],["Nita",57.06,17.83],["Carl",56.31,11.12],["Edgar",55.43,30.96],["Bull",54.61,18.92],["Melodie",54.39,10.24],["Mico",54.1,21.72]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Nori",68.36,19.21],["Carl",56.72,13.55],["Mico",56.12,21.22],["Starr Nova",55.23,11.92],["8-Bit",54.37,24.03],["Jessie",53.82,13.31],["Clancy",55.34,1.61],["Edgar",53.24,25.22]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",noms:{"fr":"Zone sécurisée","es":"Refugio"},mode:"heist",top:[["Nori",66.0,18.14],["Chuck",62.31,17.15],["Bolt",59.01,4.77],["Mico",56.85,22.7],["Ruffs",63.11,0.78],["8-Bit",55.94,27.06],["Jessie",55.78,16.08],["Carl",55.26,17.53]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Kenji",58.02,8.8],["Bibi",56.98,9.85],["Trunk",64.65,0.76],["Ash",57.93,2.07],["Bo",55.41,26.25],["Bolt",56.22,4.36],["Jessie",56.06,5.04],["Rosa",60.44,0.69]]},
{id:"open-business",img:15000292,nom:"Open Business",noms:{"fr":"C'est ouvert !","es":"Campo abierto"},mode:"hotZone",top:[["Ash",62.57,2.62],["Barley",59.12,4.33],["Sandy",58.17,3.61],["Kenji",55.64,8.09],["Juju",70.73,0.31],["Damian",55.35,8.74],["Tick",55.27,9.31],["Bibi",55.33,7.78]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",noms:{"es":"Estrategias paralelas"},mode:"hotZone",top:[["R-T",58.85,8.91],["Bolt",60.15,3.11],["Juju",57.69,16.71],["Nori",56.42,19.12],["Trunk",56.57,8.34],["Nita",56.24,8.54],["Bibi",55.7,26.12],["Hank",56.1,8.08]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Bolt",61.43,6.34],["Poco",61.2,5.75],["Ash",66.08,1.31],["Bo",57.6,33.28],["Draco",62.2,1.26],["Damian",57.21,6.49],["Meg",56.43,29.93],["Gray",56.98,4.12]]}];
/* @END:MAPS */

/* Classement S/A/B/C/D par mode. Chaîne de noms séparés par des virgules,
   volontairement compacte : c'est de la donnée brute, pas du code. */
/* @DATA:TIERS */
var TIERS={
brawlBall:{S:"Surge,Nori",A:"Bibi,Damian,Starr Nova,Chester,Griff,Mortis,Bull,Edgar",B:"Mina,Bolt,Kenji,Crow,Rico,Stu,Sirius,Emz,Fang,Max,Cordelius,Colette,Meg,Spike,Shade,Colt,Otis,Buzz,Lumi,Frank,Melodie,Pierce,Clancy,Leon",C:"Meeple,Gale,Kaze,8-Bit,Brock,Tara,Dynamike,Shelly,Darryl,Nita,Lou,Carl,Maisie,Bo,El Primo,Buster,Doug,Najia,Alli,Sandy,Draco,Jacky,Finx,Lily,Kit,Trunk,Moe,Poco,Ash,Pearl,Willow,Gigi",D:"Amber,Ruffs,Squeak,Charlie,Bea,Berry,Tick,Ollie,Hank,Byron,Gray,Larry & Lawrie,R-T,Jessie,Gus,Sam,Glowy,Rosa,Jae-yong,Penny,Barley,Mico,Ziggy,Mandy,Juju,Gene,Nani,Sprout,Janet,Lola,Grom,Bonnie,Belle,Mr. P,Piper,Pam,Eve,Angelo,Chuck"},
bounty:{S:"Pierce,Byron",A:"Brock,Nori,8-Bit,Najia,Mandy,Piper,Starr Nova,Crow,Belle,Leon,Edgar,Meeple",B:"Bea,Angelo,Surge,Bolt,Colt,Mina,Nani,Otis,Gray,Max,Colette,Gus,Gene,Fang,Ruffs,Griff,Kit,Squeak,Carl,Rico,Meg,Lumi,Lily",C:"Tick,Kaze,Spike,Shade,Sirius,Stu,Mortis,Damian,R-T,Chester,Bo,Finx,Kenji,Lou,Charlie,Grom,Glowy,Emz,Penny,Pearl,Janet,Maisie,Cordelius,Larry & Lawrie,Ziggy,Eve,Alli,Mico,Jae-yong,Willow,Gigi,Bonnie,Sprout,Juju,Mr. P,Tara,Dynamike,Melodie,Amber",D:"Bibi,Clancy,Buzz,Darryl,Lola,Moe,Gale,Buster,Bull,Sandy,Berry,Frank,Barley,Doug,Ollie,Jessie,Poco,Nita,Pam,Ash,Draco,Shelly,Hank,Trunk,El Primo,Rosa,Sam,Chuck,Jacky"},
knockout:{S:"Pierce,Brock",A:"Byron,Piper,Najia,Leon,Nori,Mandy,Starr Nova",B:"Bea,Edgar,Crow,Belle,Nani,Colt,Meeple,Surge,Sirius,Gus,Angelo,Spike,8-Bit,Bolt,Rico,Gray,Gene,Mina,Colette,Griff,Chester,Kit,Tick,Mr. P,Otis,Squeak,Max,Lily",C:"Mortis,Carl,Damian,Lumi,Ruffs,Charlie,Stu,Fang,Kaze,Mico,R-T,Sprout,Bo,Finx,Lou,Cordelius,Meg,Emz,Dynamike,Bonnie,Grom,Janet,Ziggy,Amber,Kenji,Pearl,Shade,Alli,Penny,Juju,Glowy,Maisie,Eve,Jae-yong",D:"Tara,Darryl,Gale,Willow,Larry & Lawrie,Moe,Bibi,Poco,Berry,Lola,Buster,Melodie,Gigi,Barley,Buzz,Clancy,Pam,Ollie,Sandy,Jessie,Doug,Shelly,Bull,Draco,Frank,Hank,Trunk,Nita,Rosa,Chuck,Ash,Sam,Jacky,El Primo"},
gemGrab:{S:"8-Bit,Surge",A:"Starr Nova,Crow,Damian,Bolt,Nori,Griff,Edgar,Bo,Leon,Chester",B:"Otis,Emz,Mortis,Meg,Tara,Sirius,Colette,Cordelius,Brock,Pierce,Lumi,Mina,Spike,Lily,Kenji,Max,Shade,Rico,Bibi,Meeple,Sandy,Squeak,Charlie,Najia",C:"Alli,Ruffs,Janet,Finx,Lou,Buzz,Kaze,Buster,Kit,Gene,Stu,Byron,Colt,Fang,Penny,Bull,Carl,Nita,Amber,Gray,Pearl,Gale,Mr. P,Jessie,Gus,Clancy,Moe,Glowy,Poco,Dynamike,Bea,Melodie,Mico,Ash",D:"Tick,Darryl,Doug,Belle,R-T,Frank,Berry,Willow,Lola,Draco,Sprout,Mandy,Ollie,Pam,Nani,Gigi,Trunk,Grom,Larry & Lawrie,Juju,Jae-yong,Barley,Maisie,Piper,Ziggy,Eve,Jacky,Shelly,Bonnie,El Primo,Sam,Rosa,Hank,Chuck,Angelo"},
heist:{S:"8-Bit,Chuck",A:"Colette,Colt,Edgar,Mico,Brock,Melodie,Crow,Nita,Jessie,Griff,Bull,Kaze,Penny,Nori",B:"Pierce,Emz,Amber,Berry,Starr Nova,Spike,Sirius,Mandy,Rico,Carl,Lumi,Meg,Otis,Nani,Surge,Bolt,Bibi,Bo",C:"Squeak,Chester,Barley,Lola,Shade,Cordelius,Darryl,Najia,Clancy,Max,Dynamike,Tara,Angelo,Piper,Damian,Pearl,Lily,Larry & Lawrie,Leon,Tick,Buzz,Byron,Grom,Draco,Gigi,Kenji,R-T,Mina,Ziggy,Lou",D:"Alli,Moe,Bea,Meeple,Fang,Bonnie,Charlie,Ruffs,Juju,Frank,Eve,Trunk,Belle,Gale,Sprout,Hank,Maisie,Kit,El Primo,Mr. P,Gus,Glowy,Mortis,Doug,Stu,Willow,Janet,Finx,Shelly,Sam,Ash,Gray,Buster,Sandy,Jae-yong,Pam,Jacky,Rosa,Gene,Poco,Ollie"},
hotZone:{S:"Griff,Lou,Emz",A:"8-Bit,Bo,Meg,Surge,Chester,Crow,Damian,Nori,Otis",B:"Starr Nova,Sandy,Sirius,Squeak,Pierce,Penny,Kenji,Berry,Brock,Gale,Edgar,Leon,Tick,Finx,Spike,Mina,Amber,Jessie,Lumi,Shade,Carl,Colette,Meeple,Ruffs,Stu,Max",C:"Tara,Bolt,Najia,Cordelius,Juju,Poco,Buster,Barley,Bibi,Glowy,Clancy,Kaze,Larry & Lawrie,Draco,Fang,Nita,Gray,Frank,Grom,Rico,Charlie,Pearl,Mortis,Byron,Ziggy,Ash,R-T,Doug,Dynamike,Chuck,Jae-yong,Pam,Bea",D:"Sprout,Janet,Ollie,Willow,Hank,Darryl,Lily,Gus,Trunk,Gigi,Rosa,Colt,Moe,Jacky,Buzz,Mr. P,Mico,Melodie,Maisie,Lola,Nani,Gene,Kit,Shelly,Piper,El Primo,Bull,Alli,Belle,Bonnie,Eve,Mandy,Sam,Angelo"}};
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
