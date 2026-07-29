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
         cartes:["29/07/2026","Brawl Time Ninja"],
         matchups:null,
         synergie:null},SAISON=52;
/* @END:MAJ */

/* Passe à true quand refresh.py --assets a rapatrié les images dans
   assets/. L'app essaie alors le fichier local avant les CDN. */
/* @DATA:ASSETS */
var ASSETS_LOCAUX=false;
/* @END:ASSETS */

/* Les 6 modes du classé, avec la couleur qui les identifie à l'écran. */
/* @DATA:MODES */
var MODES={brawlBall:{nom:"Brawl Ball",c:"#5EC8F5"},bounty:{nom:"Prime",c:"#FFB020"},knockout:{nom:"Hors-jeu",c:"#FF7A5C"},
gemGrab:{nom:"Razzia de gemmes",c:"#B98BFF"},heist:{nom:"Braquage",c:"#57D9A3"},hotZone:{nom:"Zone réservée",c:"#FF5D8F"}};
/* @END:MODES */

/* Le pool de cartes du classé.
   top : les meilleurs brawlers de la carte, sous la forme
     [nom, taux de victoire]  ou  [nom, taux de victoire, taux de sélection].
   La 3e valeur apparaît dès que les taux de sélection ont pu être relevés. */
/* @DATA:MAPS */
var MAPS=[
{id:"center-stage",img:15000132,nom:"Center Stage",mode:"brawlBall",top:[["Bolt",73.1],["Sam",72.5],["Eve",71.9]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Bolt",81.2],["Chuck",76.0],["Juju",75.4]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",mode:"brawlBall",top:[["Bolt",77.7],["Eve",75.8],["Chuck",75.4]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Rosa",77.3],["Ollie",76.6],["Buster",74.3]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Ash",76.9],["Rosa",76.9],["Buster",76.0]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",72.2],["Ollie",71.4],["Ash",71.4]]},
{id:"belles-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Ash",78.8],["Bolt",76.9],["Rosa",76.4]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",mode:"knockout",top:[["Sam",78.4],["Clancy",76.8],["Ash",76.6]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Bolt",78.4],["Rosa",76.4],["Ash",75.2]]},
{id:"crystal-arcade",img:15000008,nom:"Crystal Arcade",mode:"gemGrab",top:[["Eve",82.0],["Sam",79.2],["Buster",78.0]]},
{id:"deathcap-trap",img:15000009,nom:"Deathcap Trap",mode:"gemGrab",top:[["Sam",79.8],["Ollie",79.6],["Eve",78.8]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",mode:"gemGrab",top:[["Nori",77.8],["Ollie",75.9],["Bolt",75.4]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",mode:"heist",top:[["Nori",76.4],["Sam",76.1],["Trunk",71.9]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",mode:"heist",top:[["Sam",80.1],["Finx",76.9],["Glowy",76.3]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Sam",76.6],["Nori",74.0],["Ollie",72.7]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",mode:"hotZone",top:[["Sam",76.5],["Nori",74.6],["Bolt",74.3]]}];
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

/* Qui bat qui. Clés normalisées par clef().
     "mortis": { perd: [[cle, phrase], ...],   <- ceux qui battent Mortis
                 bat:  [[cle, phrase], ...] }  <- ceux que Mortis bat
   Tant que l'objet est vide, le moteur retombe sur le cycle de familles
   et le pied de page le signale à l'utilisateur. */
/* @DATA:COUNTERS */
var COUNTERS={};
/* @END:COUNTERS */

/* Duos qui gagnent plus souvent ensemble.
     "cleA|cleB": écart de taux de victoire en équipe, en points
   Les deux clés sont triées par ordre alphabétique. Tant que l'objet est
   vide, les alliés ne servent qu'à l'équilibre des rôles. */
/* @DATA:SYNERGIE */
var SYNERGIE={};
/* @END:SYNERGIE */
