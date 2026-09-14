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
var MAJ={tiers:["14/09/2026","brawltime.ninja (vote communautaire)"],
         cartes:["24/08/2026","topbrawl.com"],
         matchups:["14/09/2026","brawlcalculator.com"],
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
brawlBall:{"8bit":0.03,"alli":0.04,"amber":0.72,"angelo":0.0,"ash":0.57,"barley":0.12,"bea":0.03,"belle":0.0,"berry":0.01,"bibi":0.17,"bo":0.08,"bolt":0.01,"bonnie":0.0,"brock":0.22,"bull":0.21,"buster":0.02,"buzz":0.21,"byron":0.03,"carl":0.19,"charlie":0.05,"chester":0.17,"chuck":0.03,"clancy":0.04,"colette":1.29,"colt":0.25,"cordelius":0.15,"crow":0.06,"damian":0.06,"darryl":0.03,"doug":0.03,"draco":0.01,"dynamike":0.12,"edgar":0.51,"elprimo":1.17,"emz":0.87,"eve":0.0,"fang":0.04,"finx":0.01,"frank":0.11,"gale":0.06,"gene":0.0,"gigi":0.06,"glowy":0.01,"gray":0.02,"griff":1.45,"grom":0.01,"gus":1.47,"hank":0.02,"jacky":0.02,"jaeyong":0.0,"janet":0.01,"jessie":0.01,"juju":0.01,"kaze":0.03,"kenji":0.08,"kit":0.01,"larrylawrie":0.04,"leon":0.01,"lily":0.01,"lola":0.01,"lou":0.1,"lumi":0.42,"maisie":0.47,"mandy":0.01,"max":0.55,"meeple":0.6,"meg":0.38,"melodie":0.02,"mico":0.01,"mina":0.2,"moe":0.19,"mortis":0.27,"mrp":0.0,"najia":0.02,"nani":0.0,"nita":0.1,"nori":0.93,"ollie":0.01,"otis":0.28,"pam":0.0,"pearl":0.1,"penny":0.01,"pierce":0.15,"piper":0.01,"poco":0.09,"rico":2.0,"rosa":0.02,"rt":0.01,"ruffs":0.23,"sam":0.01,"sandy":0.02,"shade":0.39,"shelly":0.07,"sirius":0.37,"spike":0.11,"sprout":0.01,"squeak":0.02,"starrnova":0.2,"stu":1.3,"surge":0.84,"tara":0.09,"tick":0.02,"trunk":0.16,"willow":0.39,"ziggy":0.02},
bounty:{"8bit":0.12,"alli":0.02,"amber":0.53,"angelo":0.13,"ash":0.04,"barley":0.01,"bea":0.05,"belle":0.17,"berry":0.01,"bibi":0.02,"bo":0.04,"bolt":0.05,"bonnie":0.02,"brock":1.62,"bull":0.02,"buster":0.01,"buzz":0.03,"byron":0.65,"carl":0.11,"charlie":0.06,"chester":0.01,"chuck":0.02,"clancy":0.0,"colette":0.41,"colt":0.12,"cordelius":0.03,"crow":0.04,"damian":0.03,"darryl":0.01,"doug":0.03,"draco":0.0,"dynamike":0.02,"edgar":0.22,"elprimo":0.27,"emz":0.04,"eve":0.02,"fang":0.11,"finx":0.01,"frank":0.01,"gale":0.01,"gene":0.5,"gigi":0.06,"glowy":0.04,"gray":0.36,"griff":0.15,"grom":0.03,"gus":0.6,"hank":0.01,"jacky":0.0,"jaeyong":0.06,"janet":0.01,"jessie":0.01,"juju":0.01,"kaze":0.25,"kenji":0.03,"kit":0.07,"larrylawrie":0.0,"leon":0.16,"lily":0.03,"lola":0.01,"lou":0.02,"lumi":0.03,"maisie":0.1,"mandy":0.18,"max":1.21,"meeple":0.35,"meg":0.12,"melodie":0.01,"mico":0.01,"mina":0.5,"moe":0.01,"mortis":0.48,"mrp":0.02,"najia":0.19,"nani":0.3,"nita":0.0,"nori":0.48,"ollie":0.01,"otis":0.05,"pam":0.0,"pearl":0.4,"penny":0.1,"pierce":0.74,"piper":0.85,"poco":0.03,"rico":0.25,"rosa":0.01,"rt":0.02,"ruffs":0.06,"sam":0.0,"sandy":0.0,"shade":0.5,"shelly":0.01,"sirius":0.06,"spike":0.05,"sprout":0.13,"squeak":0.04,"starrnova":0.07,"stu":0.1,"surge":0.13,"tara":0.0,"tick":0.06,"trunk":0.03,"willow":0.04,"ziggy":0.02},
knockout:{"8bit":0.11,"alli":0.01,"amber":0.57,"angelo":0.2,"ash":0.01,"barley":0.01,"bea":0.03,"belle":0.18,"berry":0.01,"bibi":0.01,"bo":0.04,"bolt":0.03,"bonnie":0.02,"brock":1.85,"bull":0.02,"buster":0.07,"buzz":0.02,"byron":0.58,"carl":0.1,"charlie":0.07,"chester":0.01,"chuck":0.02,"clancy":0.0,"colette":0.33,"colt":0.18,"cordelius":0.03,"crow":0.03,"damian":0.02,"darryl":0.03,"doug":0.06,"draco":0.0,"dynamike":0.03,"edgar":0.28,"elprimo":0.26,"emz":0.02,"eve":0.05,"fang":0.06,"finx":0.01,"frank":0.01,"gale":0.01,"gene":0.75,"gigi":0.09,"glowy":0.03,"gray":0.61,"griff":0.17,"grom":0.04,"gus":0.6,"hank":0.01,"jacky":0.0,"jaeyong":0.06,"janet":0.01,"jessie":0.0,"juju":0.01,"kaze":0.04,"kenji":0.02,"kit":0.08,"larrylawrie":0.01,"leon":0.12,"lily":0.02,"lola":0.0,"lou":0.03,"lumi":0.03,"maisie":0.07,"mandy":0.24,"max":1.05,"meeple":0.38,"meg":0.16,"melodie":0.01,"mico":0.02,"mina":0.46,"moe":0.0,"mortis":0.17,"mrp":0.02,"najia":0.24,"nani":0.11,"nita":0.0,"nori":0.33,"ollie":0.02,"otis":0.05,"pam":0.0,"pearl":0.6,"penny":0.04,"pierce":0.64,"piper":0.87,"poco":0.03,"rico":0.58,"rosa":0.01,"rt":0.03,"ruffs":0.14,"sam":0.0,"sandy":0.0,"shade":0.54,"shelly":0.01,"sirius":0.04,"spike":0.07,"sprout":0.27,"squeak":0.09,"starrnova":0.06,"stu":0.06,"surge":0.07,"tara":0.0,"tick":0.1,"trunk":0.03,"willow":0.05,"ziggy":0.02},
gemGrab:{"8bit":0.12,"alli":0.12,"amber":0.42,"angelo":0.0,"ash":0.46,"barley":0.0,"bea":0.01,"belle":0.0,"berry":0.0,"bibi":0.06,"bo":0.27,"bolt":0.04,"bonnie":0.0,"brock":0.14,"bull":0.12,"buster":0.02,"buzz":0.18,"byron":0.03,"carl":0.1,"charlie":0.06,"chester":0.15,"chuck":0.02,"clancy":0.03,"colette":0.88,"colt":0.05,"cordelius":0.07,"crow":0.15,"damian":0.04,"darryl":0.01,"doug":0.01,"draco":0.0,"dynamike":0.02,"edgar":0.28,"elprimo":0.72,"emz":0.44,"eve":0.0,"fang":0.04,"finx":0.02,"frank":0.03,"gale":0.03,"gene":0.02,"gigi":0.04,"glowy":0.01,"gray":0.01,"griff":0.74,"grom":0.0,"gus":0.83,"hank":0.01,"jacky":0.01,"jaeyong":0.0,"janet":0.07,"jessie":0.01,"juju":0.0,"kaze":0.04,"kenji":0.05,"kit":0.06,"larrylawrie":0.0,"leon":0.02,"lily":0.06,"lola":0.01,"lou":0.06,"lumi":0.19,"maisie":0.2,"mandy":0.0,"max":0.46,"meeple":0.25,"meg":0.33,"melodie":0.01,"mico":0.01,"mina":0.14,"moe":0.12,"mortis":0.33,"mrp":0.0,"najia":0.01,"nani":0.0,"nita":0.04,"nori":0.71,"ollie":0.01,"otis":0.21,"pam":0.01,"pearl":0.22,"penny":0.03,"pierce":0.1,"piper":0.01,"poco":0.05,"rico":1.17,"rosa":0.02,"rt":0.01,"ruffs":0.16,"sam":0.01,"sandy":0.03,"shade":0.37,"shelly":0.03,"sirius":0.12,"spike":0.06,"sprout":0.0,"squeak":0.01,"starrnova":0.16,"stu":0.73,"surge":0.49,"tara":0.19,"tick":0.01,"trunk":0.13,"willow":0.01,"ziggy":0.0},
heist:{"8bit":0.76,"alli":0.04,"amber":0.41,"angelo":0.16,"ash":0.01,"barley":0.01,"bea":0.02,"belle":0.06,"berry":0.04,"bibi":0.07,"bo":0.06,"bolt":0.02,"bonnie":0.01,"brock":1.11,"bull":0.14,"buster":0.0,"buzz":0.06,"byron":0.08,"carl":0.24,"charlie":0.04,"chester":0.01,"chuck":0.18,"clancy":0.02,"colette":1.35,"colt":1.11,"cordelius":0.12,"crow":0.12,"damian":0.0,"darryl":0.04,"doug":0.0,"draco":0.0,"dynamike":0.02,"edgar":0.35,"elprimo":0.28,"emz":0.05,"eve":0.07,"fang":0.02,"finx":0.03,"frank":0.01,"gale":0.01,"gene":0.0,"gigi":0.04,"glowy":0.01,"gray":0.0,"griff":0.41,"grom":0.0,"gus":1.07,"hank":0.0,"jacky":0.0,"jaeyong":0.0,"janet":0.0,"jessie":0.06,"juju":0.0,"kaze":0.94,"kenji":0.0,"kit":0.01,"larrylawrie":0.0,"leon":0.0,"lily":0.04,"lola":0.07,"lou":0.01,"lumi":0.08,"maisie":0.08,"mandy":0.04,"max":0.12,"meeple":0.01,"meg":0.06,"melodie":0.46,"mico":0.32,"mina":0.01,"moe":0.0,"mortis":0.01,"mrp":0.0,"najia":0.01,"nani":0.08,"nita":0.07,"nori":0.93,"otis":0.16,"pam":0.0,"pearl":0.03,"penny":0.22,"pierce":0.63,"piper":0.3,"poco":0.0,"rico":0.53,"rosa":0.0,"rt":0.03,"ruffs":0.01,"sam":0.0,"sandy":0.0,"shade":0.49,"shelly":0.01,"sirius":0.03,"spike":0.03,"sprout":0.0,"squeak":0.01,"starrnova":0.06,"stu":0.01,"surge":0.09,"tara":0.01,"tick":0.0,"trunk":0.02,"willow":0.01,"ziggy":0.0},
hotZone:{"8bit":0.18,"alli":0.02,"amber":0.44,"angelo":0.0,"ash":0.23,"barley":0.11,"bea":0.03,"belle":0.01,"berry":0.03,"bibi":0.11,"bo":0.36,"bolt":0.02,"bonnie":0.0,"brock":0.16,"bull":0.06,"buster":0.01,"buzz":0.08,"byron":0.05,"carl":0.06,"charlie":0.03,"chester":0.06,"chuck":0.12,"clancy":0.02,"colette":0.89,"colt":0.04,"cordelius":0.1,"crow":0.06,"damian":0.04,"darryl":0.01,"doug":0.04,"draco":0.02,"dynamike":0.05,"edgar":0.35,"elprimo":0.6,"emz":0.6,"eve":0.0,"fang":0.06,"finx":0.07,"frank":0.04,"gale":0.03,"gene":0.0,"gigi":0.02,"glowy":0.02,"gray":0.24,"griff":0.76,"grom":0.01,"gus":0.88,"hank":0.03,"jacky":0.01,"jaeyong":0.0,"janet":0.0,"jessie":0.03,"juju":0.08,"kaze":0.04,"kenji":0.13,"kit":0.02,"larrylawrie":0.02,"leon":0.01,"lily":0.02,"lola":0.01,"lou":0.36,"lumi":0.29,"maisie":0.18,"mandy":0.0,"max":0.31,"meeple":0.38,"meg":0.36,"melodie":0.01,"mico":0.03,"mina":0.18,"moe":0.03,"mortis":0.23,"mrp":0.0,"najia":0.01,"nani":0.0,"nita":0.05,"nori":0.68,"ollie":0.0,"otis":0.07,"pam":0.01,"pearl":0.06,"penny":0.14,"pierce":0.42,"piper":0.02,"poco":0.22,"rico":0.21,"rosa":0.01,"rt":0.04,"ruffs":0.09,"sam":0.0,"sandy":0.01,"shade":0.36,"shelly":0.02,"sirius":0.25,"spike":0.06,"sprout":0.01,"squeak":0.02,"starrnova":0.13,"stu":0.68,"surge":0.45,"tara":0.02,"tick":0.03,"trunk":0.17,"willow":0.12,"ziggy":0.01}};
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
brawlBall:{S:"Bibi,Griff",A:"Surge,Nori,Edgar,Shade,Mortis,Starr Nova,Damian,Stu,Chester,Bull,Kenji,Rico",B:"Mina,Emz,Colette,Meg,Max,El Primo,Colt,Otis,Buzz,Cordelius,Fang,Crow,Amber,Lumi,Spike,Gale,Melodie,Frank,Sirius,Pierce,Brock",C:"Kaze,Tara,Darryl,Clancy,Bolt,Ash,Gus,Lou,Shelly,Leon,Carl,Poco,Bo,Maisie,Nita,Meeple,Trunk,8-Bit,Moe,Sandy,Dynamike,Pearl,Jacky,Doug,Draco,Buster,Ruffs,Gigi,Lily,Willow",D:"Kit,Charlie,Alli,Gray,Bea,Larry & Lawrie,Najia,Finx,Byron,Ollie,Squeak,Barley,Sprout,Hank,R-T,Tick,Jae-yong,Rosa,Berry,Jessie,Sam,Penny,Glowy,Mandy,Lola,Janet,Nani,Piper,Mico,Ziggy,Gene,Belle,Juju,Chuck,Pam,Bonnie,Mr. P,Grom,Eve,Angelo"},
bounty:{S:"Gus,Brock",A:"Pierce,Gene,Piper,Leon,Gray",B:"Byron,Nani,Shade,Bolt,Crow,Meeple,Belle,Nori,Najia,Colt,8-Bit,Mandy,Mina,Max,Angelo,Starr Nova,Bea,Stu,Pearl,Squeak,Otis,Chester,Edgar",C:"Spike,Tick,R-T,Surge,Amber,Kaze,Rico,Grom,Meg,Bo,Ruffs,Penny,Mortis,Fang,Griff,Sirius,Bonnie,Carl,Sandy,Kit,Charlie,Lumi,Colette,Jae-yong,Lou,Kenji,Sprout,Alli,Janet,Emz,Lily,Melodie,Maisie,Finx,Bull,Lola,Moe,Dynamike,Eve,Willow,Juju,Damian",D:"Glowy,Barley,El Primo,Gigi,Mr. P,Bibi,Mico,Darryl,Cordelius,Jacky,Buzz,Gale,Ollie,Ziggy,Jessie,Tara,Pam,Trunk,Clancy,Larry & Lawrie,Berry,Poco,Doug,Sam,Frank,Buster,Chuck,Draco,Ash,Shelly,Nita,Hank,Rosa"},
knockout:{S:"Brock,Byron",A:"Pierce,Mandy,Gus,Nori,Piper,Najia,Leon,Edgar,Meeple,Starr Nova,Crow",B:"Belle,Bea,Surge,Gray,Colt,Squeak,Rico,Angelo,Nani,Tick,Spike,Gene,Chester,Griff,Otis,Mina,Lily,Sirius,Shade,Fang,8-Bit",C:"Kit,Max,Grom,Stu,Bo,Amber,Bolt,Colette,Lumi,Kaze,Janet,Carl,Bonnie,R-T,Mortis,Emz,Lou,Kenji,Ruffs,Charlie,Cordelius,Meg,Maisie,Pearl,Ziggy,Mico,Penny,Finx,Sprout,Alli,Larry & Lawrie,Gale,Dynamike,Glowy,Juju,Damian,Buzz,Mr. P,Eve,Lola",D:"Tara,Barley,Bibi,Willow,Melodie,Jessie,Moe,Gigi,Jae-yong,Berry,Poco,Darryl,Sandy,Buster,Bull,Clancy,El Primo,Ollie,Nita,Frank,Doug,Ash,Draco,Shelly,Chuck,Trunk,Hank,Rosa,Pam,Jacky,Sam"},
gemGrab:{S:"Mortis,8-Bit",A:"Nori,Amber,Bo,Emz",B:"Meg,Griff,Rico,Starr Nova,Bolt,Meeple,Tara,Max,Crow,Stu,Surge,Chester,Colette,Gus,Brock,Shade,Edgar,Cordelius,Ruffs,Bibi,Byron,Ash,Spike,Pierce,Lou,Buzz,Leon",C:"Otis,Damian,Sirius,Penny,Mina,Lumi,Gene,Kaze,Squeak,Bea,Janet,Nita,Gray,Charlie,Carl,Lily,Sandy,Moe,Pearl,Frank,Juju,Clancy,Poco,Pam,Larry & Lawrie,Kenji,Colt,Melodie,Jae-yong,Gale,Najia,Alli,Fang,Bull,Finx,Lola,Gigi",D:"Darryl,Kit,El Primo,Tick,Rosa,Hank,Trunk,Sprout,Jessie,R-T,Berry,Maisie,Draco,Chuck,Glowy,Barley,Ziggy,Buster,Doug,Mandy,Belle,Piper,Eve,Mr. P,Willow,Bonnie,Angelo,Nani,Grom,Jacky,Ollie,Sam,Mico,Dynamike,Shelly"},
heist:{S:"8-Bit,Chuck",A:"Colt,Crow,Colette,Amber,Griff,Nori,Brock,Edgar,Melodie",B:"Kaze,Spike,Mico,Pierce,Carl,Jessie,Penny,Bull,Rico,Starr Nova,Lumi,Shade,Nita",C:"Nani,Otis,Darryl,Lola,Bibi,Bo,Angelo,Bolt,Piper,Emz,Berry,Mandy,Dynamike,Chester,Alli,Surge,Pearl,Meg,Eve,Grom,El Primo,Sirius,Clancy,Lou,Byron,Max,Najia,Cordelius,Squeak,Charlie,Gigi,Belle,Draco,Kit,Moe,Barley",D:"Tick,Stu,Finx,Gus,R-T,Kenji,Buzz,Lily,Glowy,Fang,Larry & Lawrie,Ruffs,Juju,Frank,Bonnie,Pam,Ash,Leon,Tara,Mr. P,Damian,Doug,Meeple,Maisie,Ziggy,Bea,Hank,Mina,Shelly,Jae-yong,Trunk,Gale,Gray,Mortis,Janet,Sam,Ollie,Sprout,Sandy,Willow,Jacky,Gene,Rosa,Buster,Poco"},
hotZone:{S:"Bo,Mr. P",A:"8-Bit,Emz,Berry,Nori,Amber,Griff,Lou,Squeak,Shade",B:"Tick,Bibi,Starr Nova,Lumi,Chester,Poco,Damian,Mina,Tara,Pierce,Rico,Pearl,Meg,Gus,Edgar,Penny,Chuck,Surge,Doug,Gale,Brock,Colette,El Primo,Crow",C:"Jessie,Frank,Barley,Finx,Meeple,Kaze,Sirius,Sandy,Trunk,Gray,Kenji,Glowy,Spike,Stu,Ash,Cordelius,Dynamike,Pam,Hank,Carl,Darryl,Ruffs,Otis,Byron,Buster,Nita,Larry & Lawrie,R-T",D:"Willow,Charlie,Mortis,Maisie,Clancy,Buzz,Najia,Bea,Max,Juju,Sprout,Draco,Ziggy,Kit,Gigi,Jae-yong,Fang,Moe,Belle,Ollie,Leon,Janet,Lola,Eve,Melodie,Colt,Jacky,Mico,Mandy,Grom,Bolt,Lily,Gene,Bull,Rosa,Nani,Alli,Shelly,Sam,Bonnie,Angelo,Piper"}};
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
