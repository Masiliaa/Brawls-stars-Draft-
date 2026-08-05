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

   Ce qui est gardé : uniquement les fichiers de l'app, servis depuis le même
   domaine. Les images des brawlers viennent d'un autre serveur et ne sont pas
   interceptées — un cache d'images grossirait sans limite, et leur absence
   dégrade l'affichage sans empêcher de jouer.

   VERSION : à incrémenter dès qu'un fichier de COQUILLE change. Ce n'est pas
   nécessaire pour donnees.js, qui passe par le réseau en premier de toute
   façon ; c'est nécessaire pour que les anciens caches soient nettoyés. */

var VERSION = "manager-v3";

var COQUILLE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./outils.js",
  "./langues.js",
  "./donnees.js",
  /* Demandé par app.js après le premier dessin, pas par index.html — mais
     il fait partie de l'app au même titre que les autres, et sans lui hors
     ligne le conseil retomberait sur le cycle de familles. */
  "./counters.js",
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

self.addEventListener("fetch", function (e) {
  var req = e.request;

  /* On ne garde QUE la coquille, nommée fichier par fichier — et non « tout
     ce qui vient du même domaine ».
     ----------------------------------------------------------------------
     Le critère « même domaine » semblait équivalent, il ne l'est pas :
     donnees.js porte ASSETS_LOCAUX, que refresh.py bascule à true dès qu'il a
     récupéré le jeu complet d'images. Ce jour-là, 3,5 Mo de portraits
     deviennent du même domaine, passent par ici et se mettent en cache sans
     limite ni expiration — exactement ce que ce fichier annonce comme exclu.
     Et personne ne regarderait sw.js ce jour-là.

     La liste manquait déjà manifest.webmanifest, ajouté par le même commit
     que ce fichier : hors ligne, l'app se lançait sans son identité
     d'application installée. */
  if (req.method !== "GET") return;
  if (URLS_COQUILLE.indexOf(req.url.split("?")[0]) < 0
      && req.mode !== "navigate") return;

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
