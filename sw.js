/* sw.js — pour que l'app s'ouvre même sans réseau.
   ------------------------------------------------------------------------
   Pourquoi ce fichier existe
   --------------------------
   Le Manager s'emploie dans un salon d'attente de 25 secondes, sur un
   téléphone, souvent en 4G moyenne. Sans ce fichier, une connexion absente
   au mauvais moment ne dégradait pas l'app : elle l'empêchait de s'ouvrir.
   Un outil de draft qui faiblit quand le réseau faiblit rate exactement le
   moment pour lequel il existe.

   La stratégie, et pourquoi celle-là
   ----------------------------------
   Réseau d'abord, cache en secours. Le contraire — cache d'abord — serait
   plus rapide, mais figerait l'app sur une vieille version jusqu'à ce que le
   cache expire : les données de saison ne parviendraient plus à
   l'utilisateur, et il n'aurait aucun moyen de s'en rendre compte. Ici, une
   connexion normale sert toujours la dernière version ; le cache ne prend la
   main que lorsque le réseau ne répond pas.

   Ce qui est gardé : les fichiers de l'app, et depuis le 07/08/2026 les
   portraits et les vignettes, qui sont désormais les nôtres. Cette ligne
   disait l'inverse — « les images viennent d'un autre serveur et ne sont pas
   interceptées » — et c'était vrai tant qu'elles venaient de brawltime. Elles
   viennent de chez nous : hors ligne, il n'y avait plus aucune image du tout.
   Elles ne sont pas pré-chargées pour autant, seulement gardées au vol.

   VERSION : à incrémenter dès qu'un fichier de COQUILLE change. Ce n'est pas
   nécessaire pour donnees.js, qui passe par le réseau en premier de toute
   façon ; c'est nécessaire pour que les anciens caches soient nettoyés. */

var VERSION = "manager-v5";

var COQUILLE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./outils.js",
  "./langues.js",
  "./donnees.js",
  /* counters-<langue>.js n'est PAS ici, et c'est voulu : les pré-charger
     tous les trois à l'installation ferait télécharger les 460 Ko qu'on vient
     justement d'éviter. Celui qui est réellement demandé est gardé au vol —
     voir le gestionnaire de fetch. */
  "./etat.js",
  "./moteur.js",
  "./vues.js",
  "./app.js"
];

/* Les chemins de la coquille, tels qu'ils arriveront dans le fetch handler.
   Comparés à l'URL complète : « ./app.js » et « /app.js » doivent désigner la
   même chose selon l'endroit où le site est servi (racine ou sous-dossier). */
var URLS_COQUILLE = COQUILLE.map(function (c) {
  return new URL(c, self.location).href;
});

self.addEventListener("install", function (e) {
  /* On n'attend pas la fermeture des anciens onglets : il n'y a rien à
     migrer, et faire attendre l'utilisateur ne lui apporte rien. */
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* addAll échoue en bloc si un seul fichier manque. On garde donc
         fichier par fichier : mieux vaut une coquille partielle que pas de
         coquille du tout. */
      return Promise.all(COQUILLE.map(function (url) {
        return cache.add(url).catch(function () { /* celui-là, tant pis */ });
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (nom) {
        return nom === VERSION ? null : caches.delete(nom);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* La page dit quelle langue elle lit ; on garde ce fichier-là.
   ------------------------------------------------------------------------
   Mesuré : à la PREMIÈRE visite, le service worker ne contrôle pas encore la
   page au moment où app.js demande counters-<langue>.js. Le fichier passe donc
   à côté du gestionnaire de fetch et n'entre pas dans le cache. Quelqu'un qui
   ouvre l'app puis coupe le réseau sans jamais recharger se retrouvait sans
   aucun duel — c'est-à-dire sans la moitié du conseil.

   On ne peut pas le pré-charger à l'installation : le worker ne sait pas quelle
   langue sera lue, et pré-charger les trois annulerait tout le gain. C'est donc
   la page qui le dit, une fois le worker prêt.

   Le nom est vérifié avant d'être utilisé : un message vient de la page, donc
   d'ailleurs, et « garder ce que le message demande » sans regarder ferait de
   ce cache une décharge ouverte. */
self.addEventListener("message", function (e) {
  var nom = e.data && e.data.garder;
  if (typeof nom !== "string" || !/^counters-[a-z]{2}\.js$/.test(nom)) return;
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.match(nom).then(function (deja) {
      return deja ? null : c.add(nom).catch(function () { /* tant pis */ });
    });
  }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;

  /* On ne garde QUE ce qui est nommé ici — jamais « tout ce qui vient du même
     domaine ».
     ----------------------------------------------------------------------
     Le critère « même domaine » semblait équivalent, il ne l'est pas : il
     avalerait tout ce qu'on ajouterait au site un jour, sans limite ni
     expiration, et personne ne regarderait sw.js ce jour-là.

     Trois familles, chacune pour une raison différente :
       — la coquille, pré-chargée à l'installation ;
       — counters-<langue>.js, gardé au vol : les pré-charger tous les trois
         annulerait le gain du découpage par langue ;
       — assets/, gardé au vol AUSSI.

     Ce paragraphe a affirmé, du 07 au 23/08/2026, que « quelqu'un qui ouvre
     le draft garde six portraits, pas cent cinq » et que « ce qui borne le
     cache, c'est le défilement ». Les deux étaient faux, et personne ne
     l'avait vérifié. Compté le 23/08, en servant l'app pour de vrai :

         écran de draft   ..............   7 images,  46 Ko
         écran des brawlers, sans défiler   105 images, 438 Ko
         le même, après avoir tout fait défiler   105 images, 438 Ko

     Le défilement ne borne rien : loading="lazy" est une consigne, et sur une
     connexion rapide le navigateur voit large et va tout chercher d'un coup.
     Ce qui borne réellement le cache, ce sont les ÉCRANS ouverts — rester sur
     le draft coûte 46 Ko, ouvrir sa liste de brawlers en coûte 438.

     C'est une borne acceptable, et elle reste dite honnêtement : 438 Ko pour
     ne plus jamais dépendre du réseau sur l'écran le plus lourd, c'est le
     marché qu'on a choisi en rapatriant les images. Ce qui ne l'était pas,
     c'est de l'annoncer dix fois plus petit qu'il n'est. */
  if (req.method !== "GET") return;
  /* Le fichier d'explications de la langue lue : gardé au vol, sans être
     pré-chargé. Sans ça, hors ligne, le conseil perdrait ses explications —
     mais le pré-charger reviendrait à télécharger les trois langues, ce que
     tout ce découpage sert à éviter. */
  var sansParam = req.url.split("?")[0];
  var aGarder = /\/counters-[a-z]{2}\.js$/.test(sansParam)
             || /\/assets\/(brawlers|maps)\/[^/]+\.png$/.test(sansParam);
  if (URLS_COQUILLE.indexOf(sansParam) < 0
      && !aGarder && req.mode !== "navigate") return;

  e.respondWith(
    fetch(req).then(function (reponse) {
      /* Une réponse valable remplace la précédente : la prochaine coupure
         repartira de la version d'aujourd'hui, pas de celle d'il y a un mois. */
      if (reponse && reponse.ok) {
        var copie = reponse.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copie); });
      }
      return reponse;
    }).catch(function () {
      return caches.match(req).then(function (garde) {
        /* Une navigation qui échoue et dont l'adresse n'est pas en cache
           doit quand même ouvrir l'app : on sert la page d'accueil. */
        return garde || (req.mode === "navigate"
          ? caches.match("./index.html")
          : Promise.reject());
      });
    })
  );
});
