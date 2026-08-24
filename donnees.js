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
var MAJ={tiers:["24/08/2026","brawltime.ninja (vote communautaire)"],
         cartes:["24/08/2026","topbrawl.com"],
         matchups:["24/08/2026","brawlcalculator.com"],
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
{id:"center-stage",img:15000132,nom:"Center Stage",noms:{"fr":"Milieu de scène","es":"Palco central"},mode:"brawlBall",top:[["Jacky",59.42,2.96],["Rico",57.19,40.77],["Bibi",55.82,22.26],["Griff",55.46,38.41],["Bolt",57.14,2.33],["Nita",55.76,6.02],["Doug",55.68,4.12],["Damian",54.19,7.04]]},
{id:"pinball-dreams",img:15000118,nom:"Pinball Dreams",mode:"brawlBall",top:[["Shade",58.65,7.82],["Ash",58.57,4.65],["Bibi",55.6,20.35],["Rico",55.11,33.05],["Draco",64.06,0.5],["Bull",54.81,10.61],["Damian",54.6,6.05],["Frank",53.58,12.51]]},
{id:"sneaky-fields",img:15000050,nom:"Sneaky Fields",noms:{"fr":"Champs sournois","es":"Campos furtivos"},mode:"brawlBall",top:[["Bibi",57.36,32.19],["Ash",57.23,8.2],["Griff",56.32,37.09],["Doug",56.45,8.32],["Bull",55.86,30.24],["R-T",59.79,0.94],["Damian",54.66,9.63],["Rico",54.26,33.2]]},
{id:"spiraling-out",img:15001021,nom:"Spiraling Out",mode:"brawlBall",top:[["Bibi",56.9,21.91],["Jacky",59.82,1.74],["Ash",57.34,3.39],["Stu",54.47,24.29],["Frank",54.15,11.42],["Draco",59.74,0.59],["Starr Nova",53.88,13.29],["Griff",53.55,38.66]]},
{id:"triple-dribble",img:15000025,nom:"Triple Dribble",mode:"brawlBall",top:[["Jacky",61.75,3.19],["Bibi",56.36,29.39],["Hank",58.16,2.71],["Ash",56.64,5.19],["Doug",55.4,3.44],["Lumi",54.59,8.45],["Barley",54.5,5.86],["Shade",54.07,16.03]]},
{id:"dry-season",img:15000083,nom:"Dry Season",mode:"bounty",top:[["Bolt",64.34,5.9],["Brock",56.2,44.52],["Najia",55.15,10.01],["Carl",55.09,8.94],["Sprout",55.56,2.39],["Mr. P",54.93,2.86],["Tick",53.46,13.26],["Gus",53.62,7.78]]},
{id:"hideout",img:15000022,nom:"Hideout",mode:"bounty",top:[["Bolt",62.89,9.35],["Pearl",57.77,7.62],["Brock",55.25,42.08],["Tick",55.32,12.46],["Mortis",54.61,18.86],["Mico",56.57,1.96],["Bo",55.15,5.37],["Leon",54.11,16.49]]},
{id:"layer-cake",img:15000082,nom:"Layer Cake",mode:"bounty",top:[["Bolt",60.31,4.17],["Tick",58.3,21.04],["Brock",56.53,33.72],["Grom",55.5,6.85],["Mortis",54.17,20.31],["Penny",54.04,8.13],["Edgar",53.69,35.96],["Carl",53.8,7.46]]},
{id:"shooting-star",img:15000005,nom:"Shooting Star",mode:"bounty",top:[["Bolt",64.35,8.93],["Sprout",57.71,4.4],["Brock",55.76,42.49],["Nani",55.47,20.05],["Piper",55.22,50.99],["Najia",54.76,9.76],["Tick",54.03,12.15],["Juju",60.32,0.53]]},
{id:"belle-s-rock",img:15000368,nom:"Belle's Rock",mode:"knockout",top:[["Bolt",61.67,4.84],["Sprout",57.49,12.49],["Brock",56.53,40.18],["Edgar",56.53,31.92],["Mico",56.51,9.39],["Tick",56.04,18.91],["Grom",56.0,10.62],["Gray",54.9,16.91]]},
{id:"flaring-phoenix",img:15000440,nom:"Flaring Phoenix",noms:{"fr":"Phénix flamboyant","es":"Fénix en llamas"},mode:"knockout",top:[["Pearl",57.8,10.88],["Sprout",57.65,9.13],["Brock",57.03,44.84],["Buster",58.23,3.82],["Doug",58.81,2.71],["Lily",55.11,10.97],["Grom",55.18,9.19],["Bolt",55.46,4.36]]},
{id:"new-horizons",img:15000703,nom:"New Horizons",mode:"knockout",top:[["Bolt",60.07,6.23],["Sprout",60.2,4.62],["Pearl",58.24,9.13],["Brock",57.42,42.61],["Mico",56.06,5.35],["Carl",55.56,6.71],["Tick",55.15,9.71],["Edgar",54.47,25.9]]},
{id:"out-in-the-open",img:15000548,nom:"Out in the Open",mode:"knockout",top:[["Pearl",60.12,16.2],["Brock",58.09,47.0],["Buster",61.88,1.73],["Bolt",58.04,4.33],["Angelo",56.01,15.7],["Mico",59.03,1.11],["Carl",54.92,6.44],["Bo",54.87,4.6]]},
{id:"double-swoosh",img:15000115,nom:"Double Swoosh",mode:"gemGrab",top:[["Bolt",62.92,9.89],["Bo",56.75,20.74],["Nita",56.96,4.99],["Doug",57.38,3.37],["Clancy",56.98,4.33],["Griff",55.3,34.87],["Ash",55.94,6.19],["R-T",64.18,0.55]]},
{id:"gem-fort",img:15000010,nom:"Gem Fort",noms:{"fr":"Fort de gemmes","es":"Fuerte de gemas"},mode:"gemGrab",top:[["Bolt",63.38,7.82],["Ash",60.29,7.0],["Bo",55.51,20.99],["Draco",59.04,0.65],["Chuck",59.46,0.58],["Griff",53.5,33.35],["Janet",55.02,1.78],["Surge",53.23,28.53]]},
{id:"hard-rock-mine",img:15000007,nom:"Hard Rock Mine",mode:"gemGrab",top:[["Ash",58.48,6.56],["Bolt",57.94,6.21],["Shade",56.35,5.91],["Bo",55.49,21.65],["Rico",55.36,35.45],["Carl",54.95,7.32],["Nita",54.93,3.42],["Bibi",54.14,10.18]]},
{id:"rustic-arcade",img:15000343,nom:"Rustic Arcade",noms:{"fr":"Arcade rustique","es":"Salón recreativo rústico"},mode:"gemGrab",top:[["Bolt",67.96,11.65],["Stu",55.49,23.1],["8-Bit",55.37,17.91],["Mina",55.34,9.26],["Mortis",54.8,19.04],["Bo",54.78,19.77],["Max",53.97,21.08],["Damian",55.47,1.99]]},
{id:"undermine",img:15000011,nom:"Undermine",mode:"gemGrab",top:[["Bolt",61.9,7.39],["Bo",55.08,20.4],["Clancy",56.25,2.94],["Ash",54.48,6.25],["Starr Nova",54.13,13.27],["Damian",54.5,4.98],["Jessie",54.55,4.4],["Gigi",55.29,1.66]]},
{id:"bridge-too-far",img:15000072,nom:"Bridge Too Far",mode:"heist",top:[["Nori",63.98,19.49],["Jessie",58.06,19.65],["8-Bit",57.58,27.37],["Chuck",56.94,20.98],["Colt",56.56,59.36],["Eve",54.19,5.25],["Bo",53.83,6.78],["Melodie",53.45,13.79]]},
{id:"hot-potato",img:15000053,nom:"Hot Potato",noms:{"fr":"C'est chaud patate","es":"Patata caliente"},mode:"heist",top:[["Nori",63.27,20.32],["Nita",58.7,19.56],["Bull",57.4,17.48],["Bibi",57.19,11.88],["Carl",55.79,9.8],["Jessie",55.36,22.1],["Doug",60.32,0.98],["Sam",67.39,0.36]]},
{id:"kaboom-canyon",img:15000018,nom:"Kaboom Canyon",mode:"heist",top:[["Nori",66.28,22.32],["Mico",56.97,20.1],["Carl",55.64,12.88],["Jessie",55.2,21.4],["Nita",55.38,9.25],["Gigi",58.1,1.42],["Melodie",54.83,12.68],["Edgar",54.22,35.41]]},
{id:"pit-stop",img:15000137,nom:"Pit Stop",noms:{"fr":"Arrêt au stand","es":"Neumáticos maniáticos"},mode:"heist",top:[["Nori",64.38,25.86],["Mico",60.22,24.82],["Nita",58.44,21.86],["Edgar",57.93,50.77],["Shade",55.99,16.78],["Bibi",54.95,14.95],["Bull",54.75,17.11],["Dynamike",53.6,17.69]]},
{id:"safe-zone",img:15000019,nom:"Safe Zone",noms:{"fr":"Zone sécurisée","es":"Refugio"},mode:"heist",top:[["Nori",64.94,21.6],["Chuck",64.03,24.07],["Bolt",63.13,4.14],["Jessie",58.27,22.59],["Mico",56.46,18.88],["Starr Nova",55.3,5.28],["8-Bit",54.01,26.77],["Melodie",53.83,9.08]]},
{id:"safe-r-zone",img:15000886,nom:"Safe(r) Zone",mode:"heist",top:[["Chuck",65.37,24.25],["Nori",63.36,21.62],["Mico",60.08,19.01],["Jessie",56.82,22.98],["Penny",56.69,24.35],["Carl",56.09,13.25],["Melodie",55.65,9.52],["Shade",57.04,2.2]]},
{id:"dueling-beetles",img:15000306,nom:"Dueling Beetles",mode:"hotZone",top:[["Hank",70.86,1.17],["Bolt",63.56,2.75],["Chuck",60.97,2.09],["Kenji",56.94,9.17],["Bo",56.16,25.76],["Tick",55.56,19.42],["Griff",55.33,33.91],["Nori",55.37,13.79]]},
{id:"open-business",img:15000292,nom:"Open Business",noms:{"fr":"C'est ouvert !","es":"Campo abierto"},mode:"hotZone",top:[["Tick",57.51,17.36],["Bibi",57.45,10.74],["Nori",56.72,13.43],["Poco",56.69,6.53],["Bo",55.4,27.15],["Gray",55.78,5.38],["Jessie",55.4,8.09],["Mortis",55.08,14.87]]},
{id:"parallel-plays",img:15000293,nom:"Parallel Plays",noms:{"es":"Estrategias paralelas","fr":"Stratégies parallèles"},mode:"hotZone",top:[["Doug",61.95,16.92],["R-T",61.75,7.03],["Bibi",58.63,25.86],["Juju",58.13,11.74],["Hank",58.37,6.69],["Bolt",60.17,1.86],["Jacky",56.39,7.84],["Sirius",56.04,9.87]]},
{id:"ring-of-fire",img:15000300,nom:"Ring of Fire",mode:"hotZone",top:[["Mina",61.21,6.56],["Bolt",61.37,5.34],["Bo",59.72,34.21],["Tick",57.49,22.85],["Chuck",58.94,3.22],["Stu",56.67,11.67],["Griff",56.29,33.53],["Draco",60.65,1.21]]}];
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
brawlBall:{S:"Surge,Bibi",A:"Nori,Damian,Griff,Starr Nova,Chester,Edgar,Mortis,Bull,Rico,Kenji,Mina",B:"Stu,Emz,Bolt,Crow,Max,Meg,Otis,Cordelius,Sirius,Fang,Lumi,Shade,Buzz,Colette,Colt,Frank,Spike,Pierce,Melodie,Meeple,Tara,Clancy,Brock,Kaze,Gale",C:"Leon,Shelly,8-Bit,Darryl,Lou,Bo,Carl,Dynamike,Nita,El Primo,Buster,Alli,Doug,Moe,Maisie,Jacky,Sandy,Finx,Draco,Ash,Kit,Poco,Trunk,Lily,Najia,Gigi,Willow,Pearl,Ruffs,Ollie,Hank,Charlie",D:"Amber,Bea,Squeak,Gray,Larry & Lawrie,R-T,Gus,Berry,Byron,Tick,Jessie,Barley,Rosa,Jae-yong,Sam,Glowy,Ziggy,Mandy,Sprout,Mico,Penny,Juju,Gene,Lola,Nani,Janet,Grom,Mr. P,Pam,Eve,Bonnie,Belle,Piper,Angelo,Chuck"},
bounty:{S:"Pierce,Brock",A:"Byron,Piper,Najia,Meeple,Nori,8-Bit,Crow,Mandy,Belle",B:"Colt,Nani,Leon,Bea,Surge,Bolt,Edgar,Starr Nova,Angelo,Gus,Mina,Otis,Max,Fang,Carl,Gene,Griff,Tick,Rico,Gray,Lumi,Stu,Bo,Ruffs,Spike,Kaze",C:"Kit,Lily,R-T,Mortis,Squeak,Colette,Janet,Meg,Charlie,Pearl,Sirius,Kenji,Penny,Bonnie,Sprout,Emz,Grom,Chester,Lou,Glowy,Damian,Shade,Maisie,Cordelius,Finx,Ziggy,Tara,Alli,Jae-yong,Jessie,Moe,Melodie,Eve,Larry & Lawrie",D:"Mr. P,Gigi,Buzz,Bibi,Lola,Juju,Amber,Willow,Mico,Barley,Gale,Ollie,Darryl,Dynamike,Berry,Buster,Clancy,Bull,Sandy,Poco,El Primo,Shelly,Nita,Pam,Draco,Frank,Doug,Hank,Trunk,Sam,Jacky,Ash,Chuck,Rosa"},
knockout:{S:"Pierce,Brock",A:"Spike,Najia,Byron,Piper,Nori,Leon,Mandy,Meeple,Colt,Nani",B:"Bea,Starr Nova,Edgar,Crow,Belle,Tick,Gray,Surge,Griff,8-Bit,Rico,Chester,Mina,Gus,Sirius,Max,Kit,Gene,Angelo,Bolt,Lily,Otis,Squeak,Colette,Carl,Sprout",C:"Meg,Stu,Damian,Charlie,R-T,Kaze,Ruffs,Lumi,Amber,Mico,Lou,Kenji,Mortis,Alli,Fang,Shade,Emz,Finx,Dynamike,Bo,Pearl,Grom,Mr. P,Maisie,Glowy,Ziggy,Jae-yong,Cordelius,Penny,Janet,Bonnie,Darryl,Juju,Barley,Willow,Larry & Lawrie",D:"Gale,Tara,Poco,Eve,Moe,Bibi,Lola,Melodie,Berry,Buster,Buzz,Gigi,Jessie,Draco,Doug,Bull,Nita,Clancy,Shelly,Sandy,Frank,Hank,Ollie,Trunk,El Primo,Rosa,Pam,Chuck,Ash,Jacky,Sam"},
gemGrab:{S:"8-Bit,Surge",A:"Nori,Starr Nova,Meg,Griff,Crow,Bolt,Emz,Bo,Damian",B:"Chester,Otis,Max,Tara,Edgar,Mortis,Leon,Bibi,Sirius,Stu,Brock,Kenji,Cordelius,Meeple,Sandy,Pierce,Mina,Lumi,Lou,Rico,Lily,Spike",C:"Squeak,Carl,Kaze,Shade,Alli,Buzz,Ruffs,Colette,Finx,Kit,Najia,Charlie,Bull,Gene,Fang,Gus,Byron,Pearl,Gale,Clancy,Janet,Colt,Penny,Jessie,Nita,Gray,Poco,Nani,Darryl,Moe,Ash,Buster",D:"Amber,Melodie,Trunk,Dynamike,Draco,Glowy,Tick,Lola,Berry,Mandy,Barley,Ollie,Frank,Willow,Mico,Bea,Gigi,Mr. P,Maisie,Belle,R-T,Doug,Larry & Lawrie,Pam,Bonnie,Ziggy,Jae-yong,Sprout,Piper,Shelly,Angelo,Jacky,Grom,Juju,Rosa,Eve,Chuck,El Primo,Hank,Sam"},
heist:{S:"8-Bit,Colt",A:"Chuck,Brock,Colette,Melodie,Mico,Crow,Griff,Jessie,Edgar,Amber,Nori",B:"Kaze,Rico,Pierce,Penny,Emz,Nita,Bull,Mandy,Berry,Starr Nova,Meg,Carl,Sirius,Lumi,Spike,Surge,Bolt,Otis,Nani,Darryl",C:"Bo,Squeak,Bibi,Lola,Barley,Cordelius,Angelo,Piper,Dynamike,Chester,Leon,Shade,Belle,Najia,Max,Byron,Larry & Lawrie,Lily,Pearl,Clancy,Tick,R-T,Moe,Damian,Juju,Ruffs,Draco,Buzz,Charlie,Gigi,Bonnie,Ziggy",D:"Eve,Grom,Kenji,Bea,Mina,Meeple,Finx,Alli,Tara,Lou,Ash,Fang,Willow,El Primo,Trunk,Sprout,Gus,Kit,Frank,Doug,Mr. P,Shelly,Maisie,Janet,Gale,Pam,Hank,Sandy,Glowy,Stu,Mortis,Sam,Jacky,Jae-yong,Rosa,Gray,Buster,Ollie,Poco,Gene"},
hotZone:{S:"Bo,Emz",A:"Griff,8-Bit,Meg,Surge,Lou,Damian,Nori,Squeak",B:"Starr Nova,Chester,Crow,Berry,Pierce,Sirius,Kenji,Tick,Sandy,Mina,Brock,Gale,Lumi,Jessie,Finx,Otis,Spike,Shade,Edgar,Tara,Melodie,Penny,Amber,Carl,Leon,Bibi",C:"Poco,Colette,Meeple,Stu,Barley,Najia,Bolt,Ruffs,Clancy,Fang,Kaze,Max,Buster,Gray,Cordelius,Frank,Grom,Dynamike,Draco,Juju,Pearl,Chuck,R-T,Ziggy,Charlie,Willow,Glowy,Byron,Nita,Larry & Lawrie,Jae-yong,Hank,Sprout,Ash,Moe,Buzz,Trunk,Bea,Rico,Pam",D:"Doug,Gus,Bull,Mortis,Lola,Maisie,Ollie,Rosa,Alli,Janet,Mr. P,Lily,Gigi,Darryl,Belle,Colt,El Primo,Mico,Jacky,Piper,Kit,Nani,Gene,Eve,Bonnie,Shelly,Mandy,Sam,Angelo"}};
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
