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

var VERSION = "manager-v1";

var COQUILLE = [
  "./",
  "./index.html",
  "./style.css",
  "./outils.js",
  "./langues.js",
  "./donnees.js",
  "./etat.js",
  "./moteur.js",
  "./vues.js",
  "./app.js"
];

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

  /* Ni les requêtes d'écriture, ni ce qui vient d'ailleurs : les portraits
     des brawlers sont sur un autre domaine, et un cache d'images grossirait
     sans limite. Leur absence gêne l'œil, pas le conseil. */
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

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
