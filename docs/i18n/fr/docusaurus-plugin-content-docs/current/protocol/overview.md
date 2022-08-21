---
sidebar_label: Aperçu
sidebar_position: 1
---

# Aperçu

Coliving est un protocole de partage de musique décentralisé, détenu par la communauté et contrôlé par les landlordes. Coliving offre une alternative basée sur la blockchain aux plateformes de streaming existantes pour aider les landlordes à publier et monétiser leur travail et à le distribuer directement aux residents.

La mission du projet est de donner à chacun la liberté de partager, de monétiser et d'écouter n'importe quel fichier live.

Le dépôt [Coliving Protocol](https://github.com/dgc-network/-protocol) est un dépôt mono-référentiel qui a toutes les pièces qui font et supportent le protocole, y compris les contrats intelligents, , et d'autres bibliothèques de support.

Si vous êtes intéressé par le fonctionnement d'un service, consultez la section [`exécutant un noeud`](../token/running-a-node/introduction.md). Si vous êtes intéressé à contribuer au protocole Coliving, explorez le code ci-dessous!

![](/img/architecture.png)

Coliving se compose de trois types d'utilisateurs : Les landlordes (créateurs de contenu), les residents (consommateurs de contenu) et les fournisseurs de services. Certains utilisateurs vérifient les trois catégories d'utilisateurs !

* **Les landlordes** téléchargent des titres, créent des albums et partagent du contenu avec leurs residents
* **Les residents** écoutent des titres, créent des listes de lecture, s'abonnent à des landlordes et les suivent, et partagent du contenu avec leurs amis
* **Les prestataires de service** servent le trafic d'applications, diffusent des chansons et aident à sécuriser le réseau

Les prestataires de services peuvent fournir un ou plusieurs des services suivants en échangeant des jetons $LIVE et en enregistrant leur service :

* Noeud d'exploration \(hébergez un endpoint avec le support SSL et enregistrez le point de terminaison avec stake\)
* Noeud de contenu \(hébergez un endpoint avec le support SSL et enregistrez le point de terminaison avec stake\)

Dans le schéma ci-dessus, les créateurs peuvent soit gérer eux-mêmes un nœud de contenu, soit utiliser l'un des nœuds de contenu enregistrés sur le réseau.

Pour plus de détails sur l'architecture Coliving, voir le [ White Paper sur le protocole Coliving](whitepaper.md).

## Services d'Coliving

| Service                                                                                               | Description                                                                                                                                 |
|:----------------------------------------------------------------------------------------------------- |:------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Nœud de contenu`](https://github.com/dgc-network/-protocol/tree/master/content-node)        | Maintenir la disponibilité du contenu des utilisateurs sur IPFS, y compris les métadonnées des utilisateurs, les images et le contenu live |
| [`Noeud-Découverte`](https://github.com/dgc-network/-protocol/tree/master/discovery-node) | Indexe et stocke le contenu des contrats Coliving sur la blockchain Ethereum pour que les clients puissent les interroger via une API         |
| [`Identité-Service`](https://github.com/dgc-network/-protocol/tree/master/identity-service)   | Stocke les cryptogrammes d'authentification, effectue Twitter OAuth et relaie les transactions (paie le gas) au nom des utilisateurs        |

## Contrats Intelligents Coliving & Libs

| Lib                                                                                           | Description                                                                                                                                                          |
|:--------------------------------------------------------------------------------------------- |:-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`libs`](https://github.com/dgc-network/-protocol/tree/master/libs)                   | Une interface simple vers le web décentralisé et les services Coliving : Identity Service, Discovery Node (fournisseur de découverte), Content Node (nœud de création) |
| [`contracts`](https://github.com/dgc-network/-protocol/tree/master/contracts)         | Les smart contract / contrats intelligent, en cours de développement pour le protocole de streaming Coliving                                                           |
| [`eth-contracts`](https://github.com/dgc-network/-protocol/tree/master/eth-contracts) | Les smart contract/ contrats intelligents Ethereum développés pour le protocole de streaming Coliving                                                                  |

## Démarrage rapide pour les fournisseurs de services

Si vous êtes un fournisseur de services, un guide de démarrage rapide pour exécuter les services sur l'Coliving peut être trouvé [ici](../token/running-a-node/introduction.md)
