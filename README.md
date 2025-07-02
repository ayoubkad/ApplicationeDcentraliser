# Application Décentralisée de Bibliothèque (Library DApp)

Une application décentralisée de gestion de bibliothèque basée sur la blockchain Ethereum, IPFS et React.

## Description

Cette application décentralisée (DApp) permet de gérer une bibliothèque universitaire sur la blockchain Ethereum. Elle offre un système complet pour l'enregistrement des utilisateurs, l'ajout de livres, les emprunts et les retours, le tout avec un système de réputation pour encourager les bonnes pratiques.

### Fonctionnalités principales

- **Gestion des utilisateurs** : Inscription avec différents rôles (Étudiant, Professeur)
- **Catalogue de livres** : Ajout, consultation et suppression de livres
- **Système d'emprunt** : Emprunt et retour de livres avec dates limites
- **Système de réputation** : Récompenses pour les retours à temps et pénalités pour les retards
- **Stockage décentralisé** : Utilisation d'IPFS pour stocker les couvertures des livres
- **Interface utilisateur intuitive** : Navigation facile entre les différentes fonctionnalités

## Architecture technique

### Frontend
- React.js pour l'interface utilisateur
- Web3.js pour l'interaction avec la blockchain
- IPFS pour le stockage décentralisé des images
- TailwindCSS pour le style

### Backend / Blockchain
- Smart Contract Solidity déployé sur Ethereum
- Truffle pour le développement, les tests et le déploiement
- Ganache pour le développement local

## Prérequis

- Node.js (v14 ou supérieur)
- NPM ou Yarn
- MetaMask ou un autre portefeuille Ethereum compatible avec les navigateurs
- Ganache pour le développement local

## Installation

1. Clonez ce dépôt :
   ```
   git clone https://github.com/votre-username/application-decentralis-.git
   cd application-decentralis-
   ```

2. Installez les dépendances :
   ```
   npm install
   ```

3. Démarrez Ganache (interface graphique ou CLI) :
   ```
   ganache-cli
   ```

4. Déployez les smart contracts :
   ```
   truffle migrate --reset
   ```

5. Démarrez l'application React :
   ```
   npm start
   ```

6. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Configuration de MetaMask

1. Installez l'extension MetaMask dans votre navigateur
2. Connectez MetaMask à votre réseau Ganache local (généralement http://127.0.0.1:7545 avec ID de chaîne 1337)
3. Importez un compte depuis Ganache en utilisant la clé privée

## Déploiement sur un réseau de test

Pour déployer sur un réseau de test comme Sepolia :

1. Configurez votre fichier `.env` avec votre clé privée et votre clé API Infura
2. Exécutez la commande de migration pour le réseau cible :
   ```
   truffle migrate --network sepolia
   ```
## Tests

Exécutez les tests avec Truffle :

```
npm test
```

ou

```
truffle test
```
## Contact

Pour toute question ou suggestion, veuillez ouvrir une issue sur GitHub.
