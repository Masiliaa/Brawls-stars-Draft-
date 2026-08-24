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


/* Taux d'utilisation par mode, en pourcentage des equipes.
   Sert a ranger la grille des ennemis par « ce qui a des chances de
   tomber » — pas a juger la force, voir refresh.py. */
/* @DATA:USAGE */
var USAGE={
brawlBall:{"8bit":0.09,"alli":0.07,"amber":0.02,"angelo":0.0,"ash":0.44,"barley":0.08,"bea":0.04,"belle":0.0,"berry":0.02,"bibi":0.28,"bo":0.06,"bolt":0.05,"bonnie":0.0,"brock":0.32,"bull":0.24,"buster":0.03,"buzz":0.21,"byron":0.03,"carl":0.29,"charlie":0.05,"chester":0.35,"chuck":0.0,"clancy":0.05,"colette":0.05,"colt":0.33,"cordelius":0.1,"crow":0.23,"damian":0.2,"darryl":0.05,"doug":0.04,"draco":0.01,"dynamike":0.12,"edgar":0.48,"elprimo":0.06,"emz":0.67,"eve":0.0,"fang":0.08,"finx":0.01,"frank":0.14,"gale":0.08,"gene":0.0,"gigi":0.06,"glowy":0.01,"gray":0.03,"griff":1.15,"grom":0.01,"gus":0.01,"hank":0.03,"jacky":0.03,"jaeyong":0.0,"janet":0.01,"jessie":0.02,"juju":0.01,"kaze":0.09,"kenji":0.17,"kit":0.03,"larrylawrie":0.03,"leon":0.02,"lily":0.03,"lola":0.01,"lou":0.08,"lumi":0.6,"maisie":0.04,"mandy":0.01,"max":0.71,"meeple":0.78,"meg":0.54,"melodie":0.03,"mico":0.01,"mina":0.31,"moe":0.16,"mortis":0.42,"mrp":0.0,"najia":0.02,"nani":0.0,"nita":0.12,"nori":0.24,"ollie":0.01,"otis":0.4,"pam":0.0,"pearl":0.12,"penny":0.02,"pierce":0.19,"piper":0.01,"poco":0.03,"rico":1.15,"rosa":0.04,"rt":0.01,"ruffs":0.54,"sam":0.01,"sandy":0.04,"shade":0.3,"shelly":0.09,"sirius":0.11,"spike":0.18,"sprout":0.01,"squeak":0.03,"starrnova":0.51,"stu":1.36,"surge":0.89,"tara":0.11,"tick":0.03,"trunk":0.24,"willow":0.37,"ziggy":0.02},
bounty:{"8bit":0.25,"alli":0.03,"amber":0.01,"angelo":0.16,"ash":0.03,"barley":0.01,"bea":0.08,"belle":0.2,"berry":0.01,"bibi":0.03,"bo":0.04,"bolt":0.17,"bonnie":0.02,"brock":1.01,"bull":0.04,"buster":0.02,"buzz":0.05,"byron":0.7,"carl":0.18,"charlie":0.08,"chester":0.03,"chuck":0.01,"clancy":0.0,"colette":0.03,"colt":0.2,"cordelius":0.04,"crow":0.1,"damian":0.09,"darryl":0.02,"doug":0.04,"draco":0.0,"dynamike":0.04,"edgar":0.26,"elprimo":0.01,"emz":0.05,"eve":0.01,"fang":0.18,"finx":0.01,"frank":0.01,"gale":0.02,"gene":0.61,"gigi":0.08,"glowy":0.04,"gray":0.36,"griff":0.2,"grom":0.04,"gus":0.18,"hank":0.01,"jacky":0.0,"jaeyong":0.03,"janet":0.01,"jessie":0.01,"juju":0.02,"kaze":0.4,"kenji":0.06,"kit":0.17,"larrylawrie":0.01,"leon":0.28,"lily":0.05,"lola":0.01,"lou":0.03,"lumi":0.04,"maisie":0.01,"mandy":0.21,"max":0.96,"meeple":0.45,"meg":0.14,"melodie":0.01,"mico":0.03,"mina":0.54,"moe":0.01,"mortis":0.71,"mrp":0.03,"najia":0.17,"nani":0.33,"nita":0.01,"nori":0.21,"ollie":0.02,"otis":0.09,"pam":0.0,"pearl":0.37,"penny":0.14,"pierce":0.7,"piper":0.8,"poco":0.01,"rico":0.23,"rosa":0.02,"rt":0.03,"ruffs":0.16,"sam":0.01,"sandy":0.0,"shade":0.1,"shelly":0.02,"sirius":0.03,"spike":0.08,"sprout":0.13,"squeak":0.07,"starrnova":0.23,"stu":0.18,"surge":0.28,"tara":0.0,"tick":0.09,"trunk":0.05,"willow":0.09,"ziggy":0.02},
knockout:{"8bit":0.24,"alli":0.02,"amber":0.01,"angelo":0.24,"ash":0.01,"barley":0.02,"bea":0.05,"belle":0.23,"berry":0.02,"bibi":0.02,"bo":0.03,"bolt":0.13,"bonnie":0.03,"brock":0.9,"bull":0.03,"buster":0.1,"buzz":0.03,"byron":0.69,"carl":0.15,"charlie":0.09,"chester":0.03,"chuck":0.01,"clancy":0.0,"colette":0.03,"colt":0.23,"cordelius":0.04,"crow":0.07,"damian":0.1,"darryl":0.05,"doug":0.08,"draco":0.0,"dynamike":0.05,"edgar":0.34,"elprimo":0.01,"emz":0.03,"eve":0.04,"fang":0.1,"finx":0.02,"frank":0.02,"gale":0.01,"gene":0.81,"gigi":0.12,"glowy":0.03,"gray":0.62,"griff":0.2,"grom":0.06,"gus":0.19,"hank":0.01,"jacky":0.0,"jaeyong":0.03,"janet":0.01,"jessie":0.01,"juju":0.01,"kaze":0.1,"kenji":0.02,"kit":0.19,"larrylawrie":0.01,"leon":0.24,"lily":0.05,"lola":0.01,"lou":0.03,"lumi":0.03,"maisie":0.01,"mandy":0.29,"max":0.8,"meeple":0.49,"meg":0.19,"melodie":0.01,"mico":0.06,"mina":0.51,"moe":0.01,"mortis":0.33,"mrp":0.04,"najia":0.21,"nani":0.14,"nita":0.0,"nori":0.2,"ollie":0.03,"otis":0.09,"pam":0.0,"pearl":0.55,"penny":0.06,"pierce":0.65,"piper":0.83,"poco":0.01,"rico":0.49,"rosa":0.02,"rt":0.04,"ruffs":0.31,"sam":0.01,"sandy":0.0,"shade":0.02,"shelly":0.02,"sirius":0.03,"spike":0.12,"sprout":0.28,"squeak":0.15,"starrnova":0.19,"stu":0.12,"surge":0.18,"tara":0.0,"tick":0.13,"trunk":0.03,"willow":0.12,"ziggy":0.03},
gemGrab:{"8bit":0.42,"alli":0.17,"amber":0.06,"angelo":0.01,"ash":0.45,"barley":0.0,"bea":0.04,"belle":0.02,"berry":0.0,"bibi":0.13,"bo":0.33,"bolt":0.24,"bonnie":0.01,"brock":0.39,"bull":0.15,"buster":0.03,"buzz":0.17,"byron":0.17,"carl":0.23,"charlie":0.1,"chester":0.32,"chuck":0.01,"clancy":0.05,"colette":0.05,"colt":0.14,"cordelius":0.07,"crow":0.54,"damian":0.19,"darryl":0.02,"doug":0.02,"draco":0.02,"dynamike":0.02,"edgar":0.35,"elprimo":0.02,"emz":0.41,"eve":0.0,"fang":0.14,"finx":0.03,"frank":0.04,"gale":0.05,"gene":0.06,"gigi":0.07,"glowy":0.02,"gray":0.04,"griff":0.9,"grom":0.0,"gus":0.05,"hank":0.01,"jacky":0.01,"jaeyong":0.01,"janet":0.06,"jessie":0.03,"juju":0.0,"kaze":0.15,"kenji":0.12,"kit":0.09,"larrylawrie":0.0,"leon":0.11,"lily":0.09,"lola":0.02,"lou":0.07,"lumi":0.27,"maisie":0.02,"mandy":0.02,"max":0.95,"meeple":0.47,"meg":0.57,"melodie":0.02,"mico":0.01,"mina":0.38,"moe":0.12,"mortis":0.65,"mrp":0.01,"najia":0.02,"nani":0.02,"nita":0.05,"nori":0.28,"ollie":0.01,"otis":0.33,"pam":0.01,"pearl":0.36,"penny":0.07,"pierce":0.36,"piper":0.18,"poco":0.03,"rico":0.95,"rosa":0.06,"rt":0.01,"ruffs":0.49,"sam":0.01,"sandy":0.07,"shade":0.11,"shelly":0.05,"sirius":0.04,"spike":0.12,"sprout":0.01,"squeak":0.03,"starrnova":0.52,"stu":1.24,"surge":0.78,"tara":0.23,"tick":0.02,"trunk":0.2,"willow":0.04,"ziggy":0.0},
heist:{"8bit":0.84,"alli":0.09,"amber":0.1,"angelo":0.36,"ash":0.02,"barley":0.03,"bea":0.03,"belle":0.11,"berry":0.14,"bibi":0.22,"bo":0.09,"bolt":0.14,"bonnie":0.03,"brock":1.28,"bull":0.33,"buster":0.0,"buzz":0.21,"byron":0.18,"carl":0.64,"charlie":0.06,"chester":0.03,"chuck":0.56,"clancy":0.03,"colette":0.32,"colt":1.78,"cordelius":0.35,"crow":0.49,"damian":0.01,"darryl":0.09,"doug":0.01,"draco":0.01,"dynamike":0.07,"edgar":0.81,"elprimo":0.02,"emz":0.11,"eve":0.07,"fang":0.06,"finx":0.05,"frank":0.02,"gale":0.01,"gene":0.0,"gigi":0.08,"glowy":0.02,"gray":0.01,"griff":0.83,"grom":0.01,"gus":0.01,"hank":0.01,"jacky":0.0,"jaeyong":0.0,"janet":0.0,"jessie":0.17,"juju":0.01,"kaze":1.6,"kenji":0.01,"kit":0.07,"larrylawrie":0.01,"leon":0.01,"lily":0.11,"lola":0.09,"lou":0.02,"lumi":0.25,"maisie":0.01,"mandy":0.12,"max":0.33,"meeple":0.04,"meg":0.15,"melodie":0.66,"mico":0.71,"mina":0.03,"moe":0.01,"mortis":0.03,"mrp":0.0,"najia":0.03,"nani":0.16,"nita":0.2,"nori":0.51,"ollie":0.0,"otis":0.37,"pam":0.0,"pearl":0.06,"penny":0.51,"pierce":0.86,"piper":0.52,"poco":0.0,"rico":0.76,"rosa":0.01,"rt":0.06,"ruffs":0.05,"sam":0.01,"sandy":0.0,"shade":0.29,"shelly":0.02,"sirius":0.03,"spike":0.08,"sprout":0.01,"squeak":0.02,"starrnova":0.3,"stu":0.02,"surge":0.47,"tara":0.01,"tick":0.01,"trunk":0.07,"willow":0.06,"ziggy":0.0},
hotZone:{"8bit":0.28,"alli":0.03,"amber":0.03,"angelo":0.0,"ash":0.2,"barley":0.1,"bea":0.04,"belle":0.02,"berry":0.07,"bibi":0.18,"bo":0.32,"bolt":0.11,"bonnie":0.0,"brock":0.23,"bull":0.08,"buster":0.01,"buzz":0.1,"byron":0.06,"carl":0.11,"charlie":0.03,"chester":0.13,"chuck":0.04,"clancy":0.02,"colette":0.04,"colt":0.07,"cordelius":0.08,"crow":0.22,"damian":0.16,"darryl":0.01,"doug":0.06,"draco":0.04,"dynamike":0.07,"edgar":0.4,"elprimo":0.02,"emz":0.59,"eve":0.0,"fang":0.12,"finx":0.09,"frank":0.06,"gale":0.05,"gene":0.0,"gigi":0.03,"glowy":0.03,"gray":0.27,"griff":0.81,"grom":0.01,"gus":0.01,"hank":0.05,"jacky":0.02,"jaeyong":0.0,"janet":0.0,"jessie":0.04,"juju":0.1,"kaze":0.11,"kenji":0.26,"kit":0.04,"larrylawrie":0.02,"leon":0.02,"lily":0.03,"lola":0.01,"lou":0.34,"lumi":0.4,"maisie":0.01,"mandy":0.01,"max":0.47,"meeple":0.55,"meg":0.5,"melodie":0.01,"mico":0.05,"mina":0.3,"moe":0.03,"mortis":0.38,"mrp":0.0,"najia":0.01,"nani":0.0,"nita":0.06,"nori":0.22,"ollie":0.0,"otis":0.11,"pam":0.02,"pearl":0.08,"penny":0.22,"pierce":0.42,"piper":0.03,"poco":0.09,"rico":0.22,"rosa":0.02,"rt":0.05,"ruffs":0.24,"sam":0.01,"sandy":0.03,"shade":0.17,"shelly":0.03,"sirius":0.11,"spike":0.1,"sprout":0.02,"squeak":0.03,"starrnova":0.36,"stu":0.95,"surge":0.62,"tara":0.03,"tick":0.07,"trunk":0.24,"willow":0.18,"ziggy":0.01}};
/* @END:USAGE */

/* Duels mesures : "a|b" -> [ecart en points du point de vue de A, echantillon].
   +7 sur "bibi|surge" veut dire : quand Bibi affronte Surge, Bibi gagne
   57 % du temps. Corrige des petits echantillons — voir refresh.py. */
/* @DATA:DUELS */
var DUELS={};
/* @END:DUELS */

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
