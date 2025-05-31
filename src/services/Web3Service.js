import Web3 from 'web3';
import LibraryDAppABI from '../LibraryDAppABI.json';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.networkId = null;

    // Mapping des adresses du contrat par ID de réseau
    this.contractAddresses = {
      // Réseaux de production - à compléter après déploiement
      1: '', // Ethereum Mainnet
      5: '', // Goerli Testnet
      11155111: '', // Sepolia Testnet

      // Réseaux de développement - Vérifiez que ces adresses correspondent à votre déploiement local
      1337: '0xdAe919dC7fe4a27395C7667099b813ccF0336a53', // Localhost 8545 (Ganache) - Adresse déployée
      5777: '0xdAe919dC7fe4a27395C7667099b813ccF0336a53'  // Ganache - Adresse déployée
    };

    // Cache local des utilisateurs inscrits
    this.userRegisteredCache = new Map();

    // Configuration par défaut pour les appels de contrat
    this.defaultGasLimit = 3000000; // Limite de gas par défaut élevée
    this.defaultGasPrice = 20000000000; // Prix du gas par défaut (20 Gwei)

    // Adresse par défaut pour le développement local
    this.contractAddress = '0xdAe919dC7fe4a27395C7667099b813ccF0336a53';
    this.initialized = false;
    this.isGanache = false;
    this.ganacheUrl = 'http://127.0.0.1:7545';

    // Stockage des écouteurs d'événements du contrat
    this.eventListeners = [];

    // Réseaux supportés
    this.supportedNetworks = {
      // Ethereum Mainnet
      1: {
        name: 'Ethereum Mainnet',
        explorerUrl: 'https://etherscan.io',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
      },
      // Goerli Testnet
      5: {
        name: 'Goerli Testnet',
        explorerUrl: 'https://goerli.etherscan.io',
        rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY'
      },
      // Sepolia
      11155111: {
        name: 'Sepolia',
        explorerUrl: 'https://sepolia.etherscan.io',
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
      },
      // Local Networks
      1337: {
        name: 'Localhost 8545',
        explorerUrl: 'http://localhost:3000/explorer',
        rpcUrl: 'http://127.0.0.1:7545',
        symbol: 'ETH'
      },
      5777: {
        name: 'Ganache',
        explorerUrl: 'http://localhost:3000/explorer',
        rpcUrl: 'http://127.0.0.1:7545',
        symbol: 'ETH'
      }
    };

    // Configuration des écouteurs d'événements par défaut
    this.setupEventListeners();
  }

  // Configuration des écouteurs d'événements MetaMask
  setupEventListeners() {
    if (!window.ethereum) {
      console.warn("MetaMask non disponible, impossible de configurer les écouteurs d'événements");
      return;
    }

    // Suppression des écouteurs existants pour éviter les doublons
    this.removeAllEventListeners();

    // Écouter les changements de compte
    window.ethereum.on('accountsChanged', async (accounts) => {
      console.log('Changement de compte détecté:', accounts);

      if (accounts.length === 0) {
        // Déconnecté
        this.account = null;
        this.resetState();
        window.dispatchEvent(new CustomEvent('metamaskDisconnected'));
      } else {
        // Changement de compte
        const newAccount = accounts[0];
        const oldAccount = this.account;
        this.account = newAccount;

        // Vérifier si le nouvel utilisateur est déjà inscrit
        try {
          const isRegistered = await this.isUserRegistered(newAccount);

          // Informer l'application du changement de compte
          window.dispatchEvent(new CustomEvent('metamaskAccountChanged', {
            detail: {
              account: newAccount,
              oldAccount: oldAccount,
              isRegistered: isRegistered
            }
          }));

          // Si l'utilisateur n'est pas inscrit, réinitialiser certains états
          if (!isRegistered) {
            this.resetUserCache();
          }
        } catch (error) {
          console.error("Erreur lors de la vérification d'inscription après changement de compte:", error);
        }
      }
    });

    // Écouter les changements de réseau
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('Changement de réseau détecté:', chainId);

      // Conversion du chainId hex en décimal pour plus de lisibilité
      const networkId = parseInt(chainId, 16);

      // Initialiser à nouveau le contrat avec le nouveau réseau
      this.tryInitializeContract(networkId);

      // Informer l'application du changement de réseau
      window.dispatchEvent(new CustomEvent('metamaskNetworkChanged', {
        detail: {
          chainId: chainId,
          networkId: networkId,
          networkName: this.getNetworkName(networkId)
        }
      }));
    });

    console.log("Écouteurs d'événements MetaMask configurés avec succès");
  }

  // Nouvelle méthode pour réinitialiser le cache utilisateur
  resetUserCache() {
    // Ne rien faire - nous ne voulons plus réinitialiser le cache complet
    console.log("Demande de réinitialisation du cache ignorée pour préserver les inscriptions");
  }

  // Ajouter une méthode pour nettoyer toutes les données d'inscription locales
  clearAllUserData() {
    console.log("Suppression de toutes les données utilisateur locales");

    // Réinitialiser le cache en mémoire
    this.userRegisteredCache = new Map();

    // Nettoyer localStorage
    try {
      // Supprimer la liste des utilisateurs enregistrés
      localStorage.removeItem('registeredUsers');

      // Supprimer les données individuelles des utilisateurs
      const localStorageKeys = Object.keys(localStorage);
      for (const key of localStorageKeys) {
        if (key.startsWith('user_') || key.includes('registered') || key.includes('account')) {
          localStorage.removeItem(key);
          console.log(`Suppression de la clé ${key} du localStorage`);
        }
      }

      // Réinitialiser également l'état de l'application
      this.resetState(true);
      this.initialized = false;

      // Émettre un événement pour informer l'application du nettoyage
      window.dispatchEvent(new CustomEvent('userDataCleared'));

      console.log("Données utilisateur supprimées avec succès");
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression des données utilisateur:", error);
      return false;
    }
  }

  // Ajout d'une méthode pour ajouter le réseau Ganache à MetaMask
  async addGanacheNetwork() {
    if (!window.ethereum) {
      console.error("MetaMask n'est pas installé");
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x539', // 1337 en hexadécimal
            chainName: 'Ganache Local',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['http://127.0.0.1:7545'],
            blockExplorerUrls: ['http://localhost:3000/explorer']
          }
        ]
      });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'ajout du réseau Ganache:", error);
      return false;
    }
  }

  // Réinitialiser l'état du service
  resetState(resetAccount = true) {
    // Supprimer les écouteurs d'événements
    this.removeAllEventListeners();

    this.initialized = false;
    this.contract = null;

    if (resetAccount) {
      this.account = null;
    }
  }

  // Méthode pour déconnecter l'utilisateur
  disconnect() {
    this.resetState(true);
    console.log("Déconnexion de Web3Service");

    // Déclencher un événement de déconnexion pour informer l'application
    window.dispatchEvent(new CustomEvent('web3Disconnected'));

    return true;
  }

  // Obtenir le nom d'un réseau à partir de son ID
  getNetworkName(networkId) {
    if (networkId === 1337) return 'Localhost 8545';
    if (networkId === 5777) return 'Ganache';
    return this.supportedNetworks[networkId]?.name || `Réseau inconnu (${networkId})`;
  }

  // Vérifier si le réseau actuel est supporté
  isNetworkSupported(networkId) {
    // Accepter à la fois 1337 et 5777 comme réseaux locaux valides
    return networkId === 1337 || networkId === 5777 || !!this.supportedNetworks[networkId];
  }

  // Vérifier si MetaMask est installé
  isMetaMaskInstalled() {
    // Vérification plus robuste de la présence de MetaMask
    if (window.ethereum) {
      console.log("Ethereum provider détecté:", window.ethereum);
      return true;
    }

    console.warn("Aucun provider Ethereum détecté");
    return false;
  }

  // Vérifier si l'utilisateur est déjà connecté à MetaMask
  async checkIfConnected() {
    if (!this.isMetaMaskInstalled()) return false;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (accounts.length > 0) {
        this.account = accounts[0];
        this.networkId = parseInt(chainId, 16);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification de connexion MetaMask:', error);
      return false;
    }
  }

  // Initialisation principale
  async initialize(requestAccounts = false) {
    try {
      // Vérifier si déjà initialisé
      if (this.initialized && this.web3 && this.account) {
        console.log("Service Web3 déjà initialisé");
        return true;
      }

      console.log("Démarrage de l'initialisation de Web3Service");

      // Réinitialiser l'état
      this.resetState();

      // Vérifier l'installation de MetaMask
      if (!this.isMetaMaskInstalled()) {
        console.warn("MetaMask n'est pas installé");
        this.dispatchWeb3Event('no-metamask');
        return false;
      }

      try {
        // Se connecter à Web3
        this.web3 = new Web3(window.ethereum);
        console.log("Connexion à Web3 établie");

        let accounts = [];

        // Ne demander les comptes que si requestAccounts est true
        if (requestAccounts) {
          // Récupérer les comptes avec un délai pour éviter les conflits
          await new Promise(resolve => setTimeout(resolve, 1000));
          accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

          if (!accounts || accounts.length === 0) {
            console.warn("Aucun compte autorisé");
            this.dispatchWeb3Event('no-accounts');
            return false;
          }

          this.account = accounts[0];
          console.log("Compte connecté:", this.account);
        } else {
          // Vérifier si des comptes sont déjà connectés sans demander d'autorisation
          accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            this.account = accounts[0];
            console.log("Compte déjà connecté détecté:", this.account);
          } else {
            console.log("Aucun compte connecté, mais on continue l'initialisation");
          }
        }

        // Obtenir l'ID du réseau
        const networkId = await this.web3.eth.net.getId();
        console.log("Réseau détecté:", networkId);

        // Vérifier le support du réseau
        if (!this.isNetworkSupported(networkId)) {
          console.warn("Réseau non supporté:", networkId);
          this.dispatchWeb3Event('wrong-network', { networkId });

          // Ajouter un délai avant de demander le changement de réseau
          // Seulement si requestAccounts est true
          if (requestAccounts) {
            setTimeout(() => {
              this.switchNetwork(1337); // Essayer de basculer vers Ganache
            }, 2000);
          }

          return false;
        }

        // Si on est sur un réseau connu (Ganache), configurer le contrat
        const contractInitialized = await this.tryInitializeContract(networkId);

        if (!contractInitialized) {
          console.warn(`Le contrat n'a pas pu être initialisé pour le réseau ${networkId}`);

          // Tenter explicitement de détecter un contrat valide
          const detectedAddress = await this.detectDeployedContract(networkId);
          if (detectedAddress) {
            console.log(`Contrat détecté à l'adresse: ${detectedAddress}`);
            this.contractAddresses[networkId] = detectedAddress;
            this.contractAddress = detectedAddress;

            // Réessayer l'initialisation avec la nouvelle adresse
            const retryInitialized = await this.tryInitializeContract(networkId);
            if (!retryInitialized) {
              this.dispatchWeb3Event('contract-error');
              return false;
            }
          } else {
            this.dispatchWeb3Event('contract-error');
            return false;
          }
        }

        // Configurer les écouteurs d'événements
        this.setupEventListeners();

        // Configurer les écouteurs d'événements du contrat si un compte est connecté
        if (this.account) {
          this.setupContractEventListeners();
        }

        // Marquer comme initialisé
        this.initialized = true;
        console.log("Web3Service initialisé avec succès");

        // Déclencher l'événement connecté si un compte est connecté
        if (this.account) {
          this.dispatchWeb3Event('connected', {
            account: this.account,
            networkId: networkId
          });
        }

        return true;
      } catch (connectionError) {
        console.error("Erreur lors de la connexion à Web3:", connectionError);
        this.dispatchWeb3Event('connection-error', { error: connectionError.message });
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Web3Service:", error);
      this.dispatchWeb3Event('initialization-error', { error: error.message });
      return false;
    }
  }

  // Essayer d'initialiser le contrat, mais ne pas échouer si cela ne fonctionne pas
  async tryInitializeContract(networkId) {
    try {
      if (!this.web3) {
        console.warn("Web3 non initialisé");
        return false;
      }

      // Déterminer l'adresse du contrat à utiliser
      const contractAddress = this.contractAddresses[networkId] || this.contractAddress;
      console.log(`Tentative d'initialisation du contrat à l'adresse: ${contractAddress}`);

      // Vérifier si le contrat existe à cette adresse
      const code = await this.web3.eth.getCode(contractAddress);
      if (!code || code === '0x' || code === '0x0') {
        console.warn(`Aucun contrat déployé à cette adresse: ${contractAddress}`);
        console.log("Tentative de détection automatique du contrat déployé...");

        // Essayer de détecter le contrat automatiquement
        const detectedAddress = await this.detectDeployedContract(networkId);
        if (detectedAddress) {
          console.log(`Contrat détecté à l'adresse: ${detectedAddress}`);
          this.contractAddresses[networkId] = detectedAddress;
          this.contractAddress = detectedAddress;

          // Réessayer avec la nouvelle adresse
          return await this.tryInitializeContract(networkId);
        }

        return false;
      }

      // Initialiser le contrat
      this.contract = new this.web3.eth.Contract(
        LibraryDAppABI,
        contractAddress,
        {
          from: this.account,
          gas: this.defaultGasLimit,
          gasPrice: this.defaultGasPrice
        }
      );

      // Vérifier que le contrat est valide en appelant une méthode simple
      try {
        const adminAddress = await this.contract.methods.admin().call();
        console.log("Contrat initialisé avec succès. Admin:", adminAddress);
        return true;
      } catch (callError) {
        console.error("Erreur lors de l'appel au contrat:", callError);

        // Si l'erreur est liée au gas, essayer avec des paramètres différents
        if (callError.message.includes('Out of Gas')) {
          console.log("Tentative avec des paramètres de gas différents...");
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            contractAddress,
            {
              from: this.account,
              gas: this.defaultGasLimit * 2,
              gasPrice: this.defaultGasPrice * 2
            }
          );

          try {
            const adminAddress = await this.contract.methods.admin().call();
            console.log("Contrat initialisé avec succès après ajustement du gas. Admin:", adminAddress);
            return true;
          } catch (retryError) {
            console.error("Échec de la réinitialisation avec gas ajusté:", retryError);
            return false;
          }
        }

        return false;
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation du contrat:", error);
      return false;
    }
  }

  // Fonction pour détecter automatiquement l'adresse du contrat déployé
  async detectDeployedContract(networkId) {
    console.log(`Recherche du contrat déployé sur le réseau ${networkId} ...`);

    // Liste des adresses candidates à vérifier
    const candidateAddresses = [
      this.contractAddress,
      this.contractAddresses[networkId],
      '0xef344c1FA4054a56651b8006587ab7AeE3BbDB3c', // Adresse précédente
      '0x89F06E0A7930688B109FE6c91fbE8B3530Ca5150', // Autre adresse possible
      '0xf9a82C631f7C03bb2DCA0435C982826621966e15',  // Nouvelle adresse
      '0x5923bb90e3aAf575ca3cad97Cb6d8C1626a5EB95',  // Adresse de test locale
      '0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968',  // Adresse alternative récente
      '0x6d6da0F1Fb2CC85c2c1d813f7e1f532242499E1d'   // Adresse supplémentaire
    ];

    console.log("Vérification des adresses candidates:", candidateAddresses);

    // Vérifier chaque adresse candidate
    for (const address of candidateAddresses) {
      if (!address) continue;

      console.log(`Vérification de l'adresse candidate: ${address}`);

      try {
        // Vérifier si le code existe à cette adresse
        const code = await this.web3.eth.getCode(address);
        if (!code || code === '0x' || code === '0x0') {
          console.log(`Aucun code trouvé à l'adresse ${address}`);
          continue;
        }

        // Vérifier si c'est bien notre contrat en appelant une méthode
        const tempContract = new this.web3.eth.Contract(
          LibraryDAppABI,
          address,
          {
            from: this.account,
            gas: this.defaultGasLimit,
            gasPrice: this.defaultGasPrice
          }
        );

        // Essayer d'appeler une méthode simple
        const adminAddress = await tempContract.methods.admin().call();
        if (adminAddress) {
          console.log(`✅ Contrat valide trouvé à l'adresse: ${address}`);
          return address;
        }
      } catch (error) {
        console.log(`❌ Erreur avec l'adresse ${address}:`, error.message);
        continue;
      }
    }

    // Si aucune adresse candidate n'a fonctionné, chercher dans les transactions récentes
    console.log("Aucune adresse candidate n'a fonctionné, recherche dans les transactions récentes...");

    try {
      const currentBlock = await this.web3.eth.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - 100); // Regarder les 100 derniers blocs

      console.log(`Analyse des blocs ${startBlock} à ${currentBlock} pour trouver des transactions contractuelles...`);

      let interestingTransactions = [];

      // Analyser les blocs récents
      for (let i = startBlock; i <= currentBlock; i++) {
        const block = await this.web3.eth.getBlock(i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.to === null) { // Transaction de création de contrat
              interestingTransactions.push(tx);
            }
          }
        }
      }

      console.log(`${interestingTransactions.length} transactions intéressantes trouvées dans les blocs récents`);

      // Vérifier chaque transaction intéressante
      for (const tx of interestingTransactions) {
        try {
          const receipt = await this.web3.eth.getTransactionReceipt(tx.hash);
          if (receipt && receipt.contractAddress) {
            const tempContract = new this.web3.eth.Contract(
              LibraryDAppABI,
              receipt.contractAddress,
              {
                from: this.account,
                gas: this.defaultGasLimit,
                gasPrice: this.defaultGasPrice
              }
            );

            const adminAddress = await tempContract.methods.admin().call();
            if (adminAddress) {
              console.log(`✅ Contrat valide trouvé dans les transactions récentes: ${receipt.contractAddress}`);
              return receipt.contractAddress;
            }
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'analyse des transactions:", error);
    }

    console.log("⛔ Aucun contrat valide trouvé après analyse approfondie");
    return null;
  }

  // Configurer les écouteurs d'événements du contrat
  setupContractEventListeners() {
    if (!this.contract || !this.initialized) {
      console.warn("Impossible de configurer les écouteurs d'événements: contrat non initialisé");
      return;
    }

    try {
      // Nettoyer les anciens écouteurs d'événements s'il y en a
      this.removeAllEventListeners();

      // Écouter l'événement ReputationUpdated
      const reputationUpdatedListener = this.contract.events.ReputationUpdated({
        filter: { user: this.account } // Filtrer pour n'écouter que les événements concernant l'utilisateur connecté
      })
      .on('data', (event) => {
        console.log("Événement ReputationUpdated reçu:", event);
        const userAddress = event.returnValues.user;
        const newReputation = event.returnValues.newReputation;

        // Dispatch un événement personnalisé pour informer l'application
        window.dispatchEvent(new CustomEvent('reputationUpdated', {
          detail: {
            address: userAddress,
            reputation: newReputation
          }
        }));
      })
      .on('error', (error) => {
        console.error("Erreur lors de l'écoute de ReputationUpdated:", error);
      });

      // Stocker l'écouteur pour pouvoir le supprimer plus tard
      this.eventListeners.push({
        name: 'ReputationUpdated',
        listener: reputationUpdatedListener
      });

      console.log("Écouteurs d'événements du contrat configurés avec succès");
        } catch (error) {
      console.error("Erreur lors de la configuration des écouteurs d'événements:", error);
    }
  }

  // Supprimer tous les écouteurs d'événements
  removeAllEventListeners() {
    if (this.eventListeners.length > 0) {
      this.eventListeners.forEach(listener => {
        try {
          if (listener.listener && listener.listener.removeAllListeners) {
            listener.listener.removeAllListeners();
      }
    } catch (error) {
          console.warn(`Erreur lors de la suppression de l'écouteur ${listener.name}:`, error);
        }
      });

      this.eventListeners = [];
      console.log("Tous les écouteurs d'événements ont été supprimés");
    }
  }

  // Méthode pour dispatcher des événements Web3
  dispatchWeb3Event(eventName, eventData = {}) {
    console.log(`Dispatch de l'événement Web3: ${eventName}`, eventData);

    // Créer et dispatcher un CustomEvent
    const event = new CustomEvent(`web3-${eventName}`, {
      detail: {
        ...eventData,
        timestamp: Date.now()
      }
    });

    window.dispatchEvent(event);
  }

  async isUserRegistered() {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
      }

      // Si aucun compte n'est connecté, l'utilisateur n'est pas enregistré
      if (!this.account) {
        console.log("Aucun compte connecté - l'utilisateur ne peut pas être inscrit");
        return false;
      }

      // Vérifier le cache local d'abord
      const lowerCaseAddress = this.account.toLowerCase();
      if (this.userRegisteredCache.has(lowerCaseAddress)) {
        const isRegistered = this.userRegisteredCache.get(lowerCaseAddress);
        console.log(`Utilisateur ${isRegistered ? 'trouvé' : 'non trouvé'} dans le cache`);
        return isRegistered;
      }

      // Vérifier le stockage local
      try {
        const storedUsers = localStorage.getItem('registeredUsers');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          if (users.includes(lowerCaseAddress)) {
            console.log("Utilisateur trouvé dans localStorage");
            // Mettre à jour le cache
            this.userRegisteredCache.set(lowerCaseAddress, true);
            return true;
          }
        }

        // Vérifier aussi les données utilisateur spécifiques
        const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
        if (userData) {
          console.log("Données utilisateur trouvées dans localStorage");
          // Mettre à jour le cache
          this.userRegisteredCache.set(lowerCaseAddress, true);
          return true;
        }
      } catch (storageError) {
        console.warn("Erreur lors de la vérification dans localStorage:", storageError);
      }

      // Vérifier via le contrat si disponible
      if (this.contract && this.contract.methods.isUserRegistered) {
        try {
          console.log("Vérification via le contrat...");
          const result = await this.callViewMethod('isUserRegistered', [this.account]);
          console.log("Résultat de la vérification via contrat:", result);

          // Mettre à jour le cache avec le résultat du contrat
          this.userRegisteredCache.set(lowerCaseAddress, result);

          // Si l'utilisateur est inscrit, mettre à jour localStorage
          if (result) {
            try {
              let registeredUsers = [];
              const storedUsers = localStorage.getItem('registeredUsers');
              if (storedUsers) {
                registeredUsers = JSON.parse(storedUsers);
              }
              if (!registeredUsers.includes(lowerCaseAddress)) {
                registeredUsers.push(lowerCaseAddress);
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
              }
            } catch (error) {
              console.warn("Erreur lors de la mise à jour de localStorage:", error);
            }
          }

          return result;
        } catch (contractError) {
          console.warn("Erreur lors de l'appel au contrat:", contractError);
          // Continuer avec la vérification alternative
        }
      }

      // Si toutes les vérifications échouent, utiliser la méthode alternative
      return await this.checkLocalUserRegistration();
    } catch (error) {
      console.warn("Erreur lors de la vérification de l'enregistrement de l'utilisateur:", error);
      // En cas d'erreur, essayer la méthode alternative
      return await this.checkLocalUserRegistration();
    }
  }

  // Méthode alternative pour vérifier l'enregistrement de l'utilisateur
  async checkLocalUserRegistration() {
    try {
      // Si aucun compte n'est connecté, l'utilisateur n'est pas enregistré
      if (!this.account) {
        console.log("Aucun compte connecté - l'utilisateur ne peut pas être inscrit");
        return false;
      }

      const lowerCaseAddress = this.account.toLowerCase();

      // Vérifier d'abord le stockage local
      const localRegistration = localStorage.getItem(`user_registered_${lowerCaseAddress}`);
      if (localRegistration === 'true') {
        console.log("Utilisateur trouvé dans le stockage local");
        // Mettre à jour le cache
        this.userRegisteredCache.set(lowerCaseAddress, true);
        return true;
      }

      // Essayer de récupérer l'utilisateur par un autre moyen (par exemple, vérifier s'il a des emprunts)
      if (this.contract && this.contract.methods.getUserBorrowedBooks) {
        try {
          const borrowedBooks = await this.callViewMethod('getUserBorrowedBooks', [this.account]);
          if (borrowedBooks && borrowedBooks.length > 0) {
            // Si l'utilisateur a des livres empruntés, il est certainement enregistré
            console.log("Utilisateur identifié comme enregistré car il a des emprunts");
            localStorage.setItem(`user_registered_${this.account}`, 'true');
            return true;
          }
        } catch (e) {
          console.warn("Impossible de vérifier les emprunts de l'utilisateur:", e);
        }
      }

      // Vérifier si l'utilisateur a déjà effectué des transactions (méthode générale)
      try {
        const web3 = await this.getWeb3();
        const txCount = await web3.eth.getTransactionCount(this.account);
        if (txCount > 0) {
          console.log("Utilisateur identifié comme ayant effectué des transactions:", txCount);
          localStorage.setItem(`user_registered_${this.account}`, 'true');
          return true;
        }
      } catch (e) {
        console.warn("Impossible de vérifier l'historique des transactions:", e);
      }

      console.log("Aucune preuve d'enregistrement trouvée pour l'utilisateur");
      return false;
    } catch (error) {
      console.error("Erreur lors de la vérification locale de l'enregistrement:", error);
      return false;
    }
  }

  async registerUser(name, role) {
    console.log("Tentative d'inscription avec nom:", name, "rôle:", role);

    // Vérifier si web3 est initialisé
    if (!this.initialized) {
      console.log("Web3 n'est pas initialisé, tentative d'initialisation...");
      const success = await this.initialize();
      if (!success) {
        const error = new Error("Impossible d'initialiser Web3. Veuillez vérifier votre connexion à MetaMask.");
        error.code = "INITIALIZATION_FAILED";
        throw error;
      }
    }

    // Vérifier que le rôle est valide (0 = étudiant, 1 = professeur)
    if (role !== 0 && role !== 1) {
      console.error("Rôle invalide:", role);
      const error = new Error("Rôle invalide. Veuillez choisir Étudiant (0) ou Professeur (1).");
      error.code = "INVALID_ROLE";
      throw error;
    }

    // Vérifier que le nom est valide
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      console.error("Nom invalide:", name);
      const error = new Error("Nom invalide. Veuillez entrer un nom d'au moins 2 caractères.");
      error.code = "INVALID_NAME";
      throw error;
    }

    // Vérifier que nous avons un compte
    if (!this.account) {
      console.error("Pas de compte connecté");
      const error = new Error("Aucun compte connecté. Veuillez vous connecter à MetaMask.");
      error.code = "NO_ACCOUNT";
      throw error;
    }

    console.log("Vérification des prérequis terminée, tentative d'inscription...");

    // Vérifier le réseau
    try {
      const networkId = await this.web3.eth.net.getId();
      console.log("Réseau actuel:", networkId);

      if (!this.isNetworkSupported(networkId)) {
        const error = new Error(`Le réseau ${networkId} n'est pas supporté. Veuillez vous connecter à Ganache (1337).`);
        error.code = "UNSUPPORTED_NETWORK";
        error.networkId = networkId;
        error.networkName = this.getNetworkName(networkId);
        throw error;
      }
    } catch (networkError) {
      if (networkError.code === "UNSUPPORTED_NETWORK") {
        throw networkError;
      }
      console.error("Erreur lors de la vérification du réseau:", networkError);
    }

    // Vérifier si l'utilisateur est déjà inscrit (indépendamment du contrat)
    const lowerCaseAddress = this.account.toLowerCase();

    // *** VÉRIFICATION COMPLÈTE D'INSCRIPTION ***
    try {
      const isRegistered = await this.isUserRegistered();
      if (isRegistered) {
        console.log("L'utilisateur est déjà inscrit (détecté via isUserRegistered())");

        // Au lieu de lancer une erreur, nous retournons un objet indiquant que l'utilisateur existe déjà
        return {
          success: true,
          alreadyRegistered: true,
          userAddress: this.account,
          message: "L'utilisateur est déjà inscrit"
        };
      }
    } catch (checkError) {
      console.warn("Erreur lors de la vérification d'inscription:", checkError);
      // Continuer malgré l'erreur, car nous ferons une vérification supplémentaire plus tard
    }

    // Si le contrat n'est pas disponible, essayer de l'initialiser à nouveau avec détection
    if (!this.contract) {
      console.log("Contrat non disponible, tentative de récupération...");
      try {
        // Tenter une détection explicite du contrat
        const networkId = await this.web3.eth.net.getId();
        const detectedAddress = await this.detectDeployedContract(networkId);

        if (detectedAddress) {
          console.log(`Contrat détecté à l'adresse: ${detectedAddress}`);
          this.contractAddresses[networkId] = detectedAddress;
          this.contractAddress = detectedAddress;
          await this.tryInitializeContract(networkId);
        }
      } catch (detectionError) {
        console.error("Erreur lors de la détection du contrat:", detectionError);
      }

      // Si le contrat n'est toujours pas disponible, gérer le mode "hors ligne"
      if (!this.contract) {
        console.warn("Contrat non disponible - Inscription en mode local temporaire");

        // Stocker en cache local que l'utilisateur est "inscrit" (temporairement)
        this.userRegisteredCache.set(lowerCaseAddress, true);

        // Stocker dans localStorage pour persistance
        try {
          let registeredUsers = [];
          const storedUsers = localStorage.getItem('registeredUsers');
          if (storedUsers) {
            registeredUsers = JSON.parse(storedUsers);
          }
          if (!registeredUsers.includes(lowerCaseAddress)) {
            registeredUsers.push(lowerCaseAddress);
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
          }

          // Stocker également les informations d'utilisateur
          const userData = {
            address: this.account,
            name: name,
            role: role,
            reputation: 80,
            registrationTime: Date.now()
          };
          localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(userData));
        } catch (storageError) {
          console.warn("Erreur lors du stockage dans localStorage:", storageError);
        }

        // Créer un événement personnalisé pour simuler l'inscription
        window.dispatchEvent(new CustomEvent('userRegistered', {
          detail: {
            account: this.account,
            name: name,
            role: role,
            timestamp: Date.now()
          }
        }));

        // Retourner un objet simulant la réponse d'une transaction
        return {
          success: true,
          isOfflineMode: true,
          userName: name,
          userRole: role,
          userAddress: this.account,
          message: "Inscription temporaire (mode hors ligne) - Veuillez vous assurer que votre contrat est déployé"
        };
      }
    }

    // Faire une vérification complète d'inscription si le contrat est disponible
    if (this.contract && this.contract.methods) {
      try {
        // Vérifier d'abord si la méthode registerUser existe
        if (!this.contract.methods.registerUser) {
          console.error("La méthode registerUser n'existe pas dans le contrat");
          const error = new Error("La méthode d'inscription n'est pas disponible. Veuillez vérifier l'adresse du contrat.");
          error.code = "METHOD_NOT_FOUND";
          throw error;
        }

        // Double-vérification pour s'assurer que l'utilisateur n'est pas déjà inscrit
        try {
          const isRegistered = await this.contract.methods.isUserRegistered(this.account).call();
          if (isRegistered) {
            console.log("L'utilisateur est déjà inscrit (vérification via contrat)");
            return {
              success: true,
              alreadyRegistered: true,
              userAddress: this.account,
              message: "L'utilisateur est déjà inscrit"
            };
          }
        } catch (checkError) {
          console.warn("Erreur lors de la vérification d'inscription via le contrat:", checkError);
          // Continuer malgré l'erreur
        }

        // Si l'utilisateur n'existe pas, procéder à l'inscription
        console.log("Envoi de la transaction d'inscription...");

        // Ajouter des options explicites pour garantir le gas suffisant
        const receipt = await this.contract.methods.registerUser(name, role).send({
          from: this.account,
          gas: 500000,  // Limite de gas plus élevée
          gasPrice: this.web3.utils.toWei('20', 'gwei')  // Prix du gas explicite
        });

        console.log("Transaction d'inscription réussie:", receipt);

        // Mettre à jour le cache
        this.userRegisteredCache.set(lowerCaseAddress, true);

        // Mettre à jour le localStorage
        try {
          let registeredUsers = [];
          const storedUsers = localStorage.getItem('registeredUsers');
          if (storedUsers) {
            registeredUsers = JSON.parse(storedUsers);
          }
          if (!registeredUsers.includes(lowerCaseAddress)) {
            registeredUsers.push(lowerCaseAddress);
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
          }

          // Stocker également les informations d'utilisateur
          const userData = {
            address: this.account,
            name: name,
            role: role,
            reputation: 80,
            registrationTime: Date.now(),
            transactionHash: receipt.transactionHash
          };
          localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(userData));
        } catch (storageError) {
          console.warn("Erreur lors du stockage des données d'inscription:", storageError);
        }

        // Retourner un objet contenant les informations pertinentes
        return {
          success: true,
          transactionHash: receipt.transactionHash,
          userName: name,
          userRole: role,
          userAddress: this.account
        };
      } catch (contractError) {
        console.error("Erreur lors de l'inscription via le contrat:", contractError);

        // Analyser les erreurs de contrat
        if (contractError.message) {
          // Si l'erreur indique que l'utilisateur existe déjà
          if (contractError.message.includes("utilisateur deja inscrit") ||
              contractError.message.includes("already exists") ||
              contractError.message.includes("already registered")) {
            console.log("L'utilisateur est déjà inscrit (message d'erreur du contrat)");

            // Mettre à jour le cache pour indiquer que l'utilisateur est inscrit
            this.userRegisteredCache.set(lowerCaseAddress, true);

            // Retourner une réponse indiquant que l'utilisateur est déjà inscrit
            return {
              success: true,
              alreadyRegistered: true,
              userAddress: this.account,
              message: "L'utilisateur est déjà inscrit (détecté par erreur du contrat)"
            };
          }

          // Si l'erreur est liée à un gas insuffisant
          if (contractError.message.includes("gas") ||
              contractError.message.includes("Gas") ||
              contractError.message.includes("underpriced")) {
            const error = new Error("Transaction sous-financée. Veuillez augmenter la limite de gas dans MetaMask.");
            error.code = "GAS_ERROR";
            throw error;
          }
        }

        // Si le code d'erreur est 4001, c'est un rejet de l'utilisateur
        if (contractError.code === 4001) {
          const error = new Error("Transaction annulée par l'utilisateur");
          error.code = 4001;
          throw error;
        }

        // Autres erreurs de contrat
        throw contractError;
      }
    } else {
      const error = new Error("Le contrat n'est pas disponible. Veuillez vérifier votre connexion réseau et réessayer.");
      error.code = "CONTRACT_UNAVAILABLE";
      throw error;
    }
  }

  getAccount() {
    return this.account;
  }

  getNetworkDetails() {
    if (!this.networkId) return null;

    return {
      id: this.networkId,
      name: this.getNetworkName(this.networkId),
      supported: this.isNetworkSupported(),
      explorerUrl: this.supportedNetworks[this.networkId]?.explorerUrl || ''
    };
  }

  shortenAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  async getBook(bookId) {
    try {
      // Vérifier si l'ID du livre est valide
      if (bookId === undefined || bookId === null) {
        console.error("getBook: ID du livre non défini ou null");
        throw new Error("ID du livre requis pour récupérer les détails du livre");
      }

      console.log(`Récupération du livre avec ID: ${bookId}`);

      // Vérifier si le service est initialisé
      if (!this.isInitialized()) {
        console.log("Service Web3 non initialisé, tentative d'initialisation sans demander de connexion...");
        await this.initialize(false); // Ne pas forcer la connexion à MetaMask
      }

      // Vérifier si le contrat est disponible
      if (!this.contract || !this.contract.methods) {
        console.error("Contrat non disponible pour récupérer le livre");
        return null;
      }

      // Vérifier si le livre existe
      try {
        // Conversion explicite de bookId en nombre si c'est une chaîne
        const bookIdNumber = typeof bookId === 'string' ? parseInt(bookId, 10) : bookId;

        // La méthode peut s'appeler 'books' et non 'getBook' selon le contrat
        let bookData;

        try {
          bookData = await this.contract.methods.books(bookIdNumber).call();
        } catch (methodError) {
          console.warn("Méthode 'books' non disponible, tentative alternative...");

          // Tenter une approche alternative
          if (this.contract.methods.getBook) {
            bookData = await this.contract.methods.getBook(bookIdNumber).call();
          } else {
            throw new Error("Aucune méthode disponible pour récupérer le livre");
          }
        }

        // Vérifier si les données sont valides
        if (!bookData || !bookData.id || bookData.id === '0') {
          console.warn(`Aucun livre trouvé avec l'ID: ${bookId}`);
          return null;
        }

        // Formater les données du livre pour l'UI
        const book = {
          id: bookData.id,
          title: bookData.title,
          author: bookData.author,
          ipfsHash: bookData.ipfsHash,
          isAvailable: bookData.isAvailable,
          borrowedBy: bookData.borrowedBy,
          currentBorrowId: bookData.currentBorrowId
        };

        // Vérifier si le livre est masqué localement
        if (this.isBookHiddenLocally(bookIdNumber)) {
          console.log(`Le livre ${bookId} est masqué localement, mais récupéré pour les opérations système`);
          book.isHiddenLocally = true;
        }

        // Tenter de récupérer les métadonnées IPFS si un hash est disponible
        if (book.ipfsHash) {
          try {
            // Importer dynamiquement le service IPFS pour éviter les références circulaires
            const ipfsService = await import('./IPFSService').then(module => module.default);
            console.log(`Tentative de récupération des métadonnées IPFS pour le hash: ${book.ipfsHash}`);

            // Récupérer les métadonnées du livre depuis IPFS
            const ipfsMetadata = await ipfsService.getBookMetadata(book.ipfsHash);

            if (ipfsMetadata) {
              console.log(`Métadonnées IPFS récupérées avec succès pour le livre ${bookId}`);

              // Fusionner les métadonnées IPFS avec les données du livre
              book.category = ipfsMetadata.category || '';
              book.description = ipfsMetadata.description || '';
              book.isbn = ipfsMetadata.isbn || '';
              book.pageCount = ipfsMetadata.pageCount || '';
              book.publishedDate = ipfsMetadata.publishedDate || '';
              book.coverImageHash = ipfsMetadata.coverImageHash || book.ipfsHash;
              book.pdfHash = ipfsMetadata.pdfHash || book.ipfsHash;  // Utiliser l'ipfsHash comme fallback pour le PDF
            } else {
              // Si les métadonnées ne sont pas récupérables, utiliser l'ipfsHash comme pdfHash par défaut
              console.log(`Métadonnées IPFS non disponibles, utilisation de l'ipfsHash comme pdfHash pour le livre ${bookId}`);
              book.pdfHash = book.ipfsHash;
            }
          } catch (ipfsError) {
            console.warn(`Erreur lors de la récupération des métadonnées IPFS: ${ipfsError.message}`);
            // En cas d'erreur, définir le pdfHash au ipfsHash pour permettre le téléchargement direct
            book.pdfHash = book.ipfsHash;
          }
        }

        return book;
      } catch (error) {
        console.error(`Erreur lors de la récupération du livre ${bookId}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`Erreur générale lors de la récupération du livre ${bookId}:`, error);
      return null;
    }
  }

  async borrowBook(bookId) {
    if (!this.initialized) await this.initialize();

    try {
      // Récupérer les informations du livre avant l'emprunt pour les enregistrer dans l'historique
      const bookDetails = await this.getBook(bookId);
      if (!bookDetails) {
        return {
          success: false,
          message: "Livre introuvable. Impossible de procéder à l'emprunt."
        };
      }

      // Préparation de la transaction
      const method = this.contract.methods.borrowBook(bookId);

      // Options par défaut pour la transaction
      const defaultOptions = {
        from: this.account,
        gas: this.defaultGasLimit || 500000
      };

      // Vérifier l'estimation de gaz pour cette transaction
      try {
        const gasEstimate = await method.estimateGas({from: this.account});
        console.log(`Estimation de gaz pour l'emprunt du livre ${bookId}:`, gasEstimate);

        // Si l'estimation est proche de la limite, augmenter la limite
        if (gasEstimate > defaultOptions.gas * 0.9) {
          defaultOptions.gas = Math.floor(gasEstimate * 1.2); // Ajouter 20% de marge
          console.log(`Limite de gaz ajustée pour l'emprunt:`, defaultOptions.gas);
        }
      } catch (estimateError) {
        console.warn(`Impossible d'estimer le gaz pour l'emprunt du livre ${bookId}:`, estimateError);
        // Continuer avec la valeur par défaut
      }

      // Enregistrer la date d'emprunt
      const borrowDate = new Date();

      // Exécution de la transaction
      const result = await method.send(defaultOptions);

      console.log(`Résultat de l'emprunt du livre ${bookId}:`, result);

      // Récupérer les événements pour obtenir le borrowId
      const borrowId = result.events?.BookBorrowed?.returnValues?.borrowId || null;

      // Calculer la date de retour prévue (généralement 14 jours après l'emprunt)
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 14); // Période d'emprunt de 2 semaines

      // Stocker les informations de l'emprunt dans le localStorage pour garder un historique local
      try {
        const lowerCaseAddress = this.account.toLowerCase();

        // Récupérer l'historique existant
        let borrowHistory = [];
        const historyJSON = localStorage.getItem(`borrowHistory_${lowerCaseAddress}`);
        if (historyJSON) {
          borrowHistory = JSON.parse(historyJSON);
        }

        // Ajouter le nouvel emprunt
        borrowHistory.push({
          borrowId: borrowId,
          bookId: bookId,
          bookTitle: bookDetails.title,
          bookAuthor: bookDetails.author,
          ipfsHash: bookDetails.ipfsHash,
          coverImageHash: bookDetails.coverImageHash,
          borrowDate: borrowDate.toISOString(),
          dueDate: dueDate.toISOString(),
          returnDate: null,
          status: 'emprunté',
          transactionHash: result.transactionHash
        });

        // Sauvegarder l'historique mis à jour
        localStorage.setItem(`borrowHistory_${lowerCaseAddress}`, JSON.stringify(borrowHistory));
        console.log("Historique d'emprunt mis à jour localement");
      } catch (storageError) {
        console.warn("Erreur lors de la sauvegarde de l'historique d'emprunt local:", storageError);
      }

      // Déclencher un événement pour informer l'application de l'emprunt
      window.dispatchEvent(new CustomEvent('bookBorrowed', {
        detail: {
          borrowId: borrowId,
          bookId: bookId,
          bookTitle: bookDetails.title,
          borrowDate: borrowDate.toISOString(),
          dueDate: dueDate.toISOString()
        }
      }));

      // Retourner un objet formaté avec success=true
      return {
        success: true,
        transaction: result,
        borrowId: borrowId,
        bookDetails: bookDetails,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
        message: "Livre emprunté avec succès!"
      };
    } catch (error) {
      console.error(`Erreur lors de l'emprunt du livre ${bookId}:`, error);

      let errorMessage = "Une erreur s'est produite lors de l'emprunt du livre.";

      // Gérer les erreurs spécifiques de MetaMask
      if (error.code === -32603 && error.message.includes("Internal JSON-RPC error")) {
        // Tenter d'extraire le message d'erreur interne
        try {
          const errorObj = JSON.parse(error.stack.match(/{.*}/s)[0]);
          if (errorObj && errorObj.message) {
            errorMessage = `Erreur MetaMask: ${errorObj.message}`;
          }
        } catch (parseError) {
          // Si nous ne pouvons pas parser l'erreur, suggérer une solution
          errorMessage = "Erreur de transaction MetaMask. Essayez de réinitialiser votre compte dans MetaMask (Paramètres > Avancé > Réinitialiser le compte).";
        }
      }
      // Gérer l'erreur "user rejected transaction"
      else if (error.code === 4001 || (error.message && error.message.includes("User denied"))) {
        errorMessage = "Transaction annulée par l'utilisateur";
      }
      // Gérer l'erreur de limite de gaz insuffisante
      else if (error.message && error.message.toLowerCase().includes("gas")) {
        errorMessage = "Limite de gaz insuffisante. Veuillez augmenter la limite de gaz dans les options de transaction.";
      }
      // Gérer les erreurs spécifiques du contrat
      else if (error.message && error.message.includes("revert LibraryDApp")) {
        const errorMsg = error.message.match(/revert (LibraryDApp:.*?)(?:'|$)/);
        if (errorMsg && errorMsg[1]) {
          errorMessage = errorMsg[1];
        }
      }

      // Retourner un objet formaté avec success=false
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  async returnBook(bookId) {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
      }

      if (!this.account) {
        throw new Error("Aucun compte connecté. Veuillez vous connecter à MetaMask.");
      }

      const book = await this.getBook(bookId);
      if (!book) {
        throw new Error(`Livre avec l'ID ${bookId} introuvable.`);
      }

      if (book.borrowedBy.toLowerCase() !== this.account.toLowerCase()) {
        throw new Error("Vous n'avez pas emprunté ce livre. Seul l'emprunteur peut le retourner.");
      }

      if (!book.currentBorrowId) {
        throw new Error("Ce livre n'a pas d'emprunt actif à retourner.");
      }

      console.log(`Tentative de retour du livre avec l'ID ${bookId}`);

      // Obtenir la réputation actuelle pour calculer le changement après le retour
      const oldReputation = await this.getUserReputation();
      console.log("Réputation avant le retour:", oldReputation);

      // Enregistrer la date de retour
      const returnDate = new Date();

      // Préparer la transaction
      const tx = await this.contract.methods.returnBook(bookId).send({
        from: this.account,
        gas: 200000
      });

      console.log("Transaction de retour réussie:", tx);

      // Attendre un court instant pour que la blockchain se mette à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Récupérer la nouvelle réputation directement depuis la blockchain
      const newReputation = await this.contract.methods.getUserReputation(this.account).call();
      console.log("Réputation après le retour:", newReputation);

      // Mettre à jour le localStorage avec la nouvelle réputation
      try {
        const lowerCaseAddress = this.account.toLowerCase();
        const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
        if (userData) {
          const user = JSON.parse(userData);
          user.reputation = parseInt(newReputation);
          localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(user));
          console.log("Réputation mise à jour dans localStorage:", newReputation);
        }

        // Mettre à jour l'historique des emprunts
        const historyJSON = localStorage.getItem(`borrowHistory_${lowerCaseAddress}`);
        if (historyJSON) {
          let borrowHistory = JSON.parse(historyJSON);

          // Trouver l'emprunt correspondant à ce livre
          const index = borrowHistory.findIndex(item =>
            parseInt(item.bookId) === parseInt(bookId) && !item.returnDate
          );

          if (index !== -1) {
            // Mettre à jour l'emprunt avec les informations de retour
            borrowHistory[index].returnDate = returnDate.toISOString();
            borrowHistory[index].status = 'retourné';
            borrowHistory[index].reputationChange = parseInt(newReputation) - parseInt(oldReputation);
            borrowHistory[index].returnTransactionHash = tx.transactionHash;

            // Vérifier si le livre a été retourné en retard
            const dueDate = new Date(borrowHistory[index].dueDate);
            if (returnDate > dueDate) {
              borrowHistory[index].isLate = true;
              borrowHistory[index].daysLate = Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24));
            } else {
              borrowHistory[index].isLate = false;
            }

            // Sauvegarder l'historique mis à jour
            localStorage.setItem(`borrowHistory_${lowerCaseAddress}`, JSON.stringify(borrowHistory));
            console.log("Historique d'emprunt mis à jour avec les informations de retour");
          }
        }
      } catch (storageError) {
        console.warn("Erreur lors de la mise à jour des données locales:", storageError);
      }

      // Déclencher un événement personnalisé pour informer l'application
      window.dispatchEvent(new CustomEvent('bookReturned', {
        detail: {
          bookId: bookId,
          bookDetails: book,
          transaction: tx,
          oldReputation: oldReputation,
          newReputation: newReputation,
          returnDate: returnDate.toISOString()
        }
      }));

      return {
        success: true,
        transaction: tx,
        reputation: newReputation,
        reputationChange: parseInt(newReputation) - parseInt(oldReputation),
        returnDate: returnDate.toISOString()
      };
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      return {
        success: false,
        message: error.message || "Une erreur s'est produite lors du retour du livre."
      };
    }
  }

  // Nouvelle méthode pour récupérer l'historique complet des emprunts avec détails
  async getBorrowHistory() {
    try {
      const lowerCaseAddress = this.account ? this.account.toLowerCase() : null;
      if (!lowerCaseAddress) {
        console.warn("Aucun compte connecté pour récupérer l'historique d'emprunt");
        return [];
      }

      console.log(`Récupération de l'historique d'emprunt pour ${lowerCaseAddress}`);

      // Récupérer l'historique depuis le localStorage
      let localHistory = [];
      const historyJSON = localStorage.getItem(`borrowHistory_${lowerCaseAddress}`);
      if (historyJSON) {
        try {
          localHistory = JSON.parse(historyJSON);
          console.log(`${localHistory.length} emprunts trouvés dans l'historique local`);
        } catch (parseError) {
          console.warn("Erreur lors du parsing de l'historique local:", parseError);
        }
      }

      // Récupérer également les données depuis la blockchain pour s'assurer qu'elles sont à jour
      let blockchainHistory = [];
      try {
        if (this.initialized && this.contract && this.contract.methods.getUserBorrowHistory) {
          blockchainHistory = await this.callViewMethod('getUserBorrowHistory', [this.account], { gas: 8000000 });
          console.log(`${blockchainHistory.length} emprunts récupérés depuis la blockchain`);

          // Pour chaque emprunt depuis la blockchain, enrichir les données locales ou ajouter si nouveau
          for (const borrowItem of blockchainHistory) {
            // Format possible des données depuis la blockchain (peut varier selon l'implémentation du contrat)
            const borrowId = borrowItem.id || borrowItem[0];
            const bookId = borrowItem.bookId || borrowItem[1];
            const borrowTime = borrowItem.borrowTime || borrowItem[2];
            const returnTime = borrowItem.returnTime || borrowItem[3];
            const isReturned = borrowItem.returned || borrowItem[4] || (returnTime && returnTime !== '0');

            // Vérifier si cet emprunt existe déjà dans l'historique local
            const existingIndex = localHistory.findIndex(item =>
              (item.borrowId && item.borrowId === borrowId) ||
              (parseInt(item.bookId) === parseInt(bookId) && !item.returnDate)
            );

            if (existingIndex >= 0) {
              // Mettre à jour l'entrée existante avec les données de la blockchain
              if (isReturned && !localHistory[existingIndex].returnDate) {
                // Si l'emprunt a été retourné dans la blockchain mais pas dans l'historique local
                localHistory[existingIndex].status = 'retourné';
                localHistory[existingIndex].returnDate = returnTime ? new Date(parseInt(returnTime) * 1000).toISOString() : new Date().toISOString();
              }
            } else {
              // Cet emprunt n'existe pas dans l'historique local, récupérer les détails du livre
              // et ajouter à l'historique
              try {
                const bookDetails = await this.getBook(bookId);
                if (bookDetails) {
                  const borrowDate = borrowTime ? new Date(parseInt(borrowTime) * 1000) : new Date();
                  // Calculer la date d'échéance comme 14 jours après l'emprunt
                  const dueDate = new Date(borrowDate);
                  dueDate.setDate(dueDate.getDate() + 14);

                  // Créer une nouvelle entrée d'historique
                  const newHistoryEntry = {
                    borrowId: borrowId,
                    bookId: bookId,
                    bookTitle: bookDetails.title,
                    bookAuthor: bookDetails.author,
                    ipfsHash: bookDetails.ipfsHash,
                    coverImageHash: bookDetails.coverImageHash,
                    borrowDate: borrowDate.toISOString(),
                    dueDate: dueDate.toISOString(),
                    status: isReturned ? 'retourné' : 'emprunté',
                    returnDate: isReturned && returnTime ? new Date(parseInt(returnTime) * 1000).toISOString() : null,
                    // Ajouter les informations de transaction blockchain
                    borrowTransactionHash: borrowItem.borrowTransactionHash || null,
                    returnTransactionHash: isReturned ? borrowItem.returnTransactionHash || null : null
                  };

                  // Si le livre a été retourné, calculer s'il était en retard
                  if (isReturned && returnTime) {
                    const returnDateObj = new Date(parseInt(returnTime) * 1000);
                    if (returnDateObj > dueDate) {
                      newHistoryEntry.isLate = true;
                      newHistoryEntry.daysLate = Math.floor((returnDateObj - dueDate) / (1000 * 60 * 60 * 24));
                    } else {
                      newHistoryEntry.isLate = false;
                    }
                  }

                  localHistory.push(newHistoryEntry);
                }
              } catch (bookError) {
                console.warn(`Erreur lors de la récupération des détails du livre ${bookId}:`, bookError);
              }
            }
          }

          // Sauvegarder l'historique mis à jour dans localStorage
          localStorage.setItem(`borrowHistory_${lowerCaseAddress}`, JSON.stringify(localHistory));
        }
      } catch (blockchainError) {
        console.warn("Erreur lors de la récupération de l'historique depuis la blockchain:", blockchainError);
      }

      // Récupérer les emprunts actifs actuels
      try {
        // Vérifier les livres actuellement empruntés
        const activeLoans = await this.getUserActiveLoans();
        console.log("Emprunts actifs récupérés:", activeLoans);

        // Pour chaque emprunt actif, vérifier s'il existe dans l'historique
        for (const loan of activeLoans) {
          const bookId = loan.bookId;
          // Vérifier si ce livre existe déjà dans l'historique
          const existingIndex = localHistory.findIndex(item =>
            parseInt(item.bookId) === parseInt(bookId) && !item.returnDate
          );

          if (existingIndex === -1) {
            // Ce livre n'est pas dans l'historique, l'ajouter
            try {
              const bookDetails = await this.getBook(bookId);
              if (bookDetails) {
                // Créer une nouvelle entrée
                const borrowDate = loan.borrowTime ? new Date(loan.borrowTime) : new Date();
                const dueDate = loan.dueTime ? new Date(loan.dueTime) : new Date(borrowDate);
                dueDate.setDate(borrowDate.getDate() + 14); // Fallback si dueTime n'est pas défini

                const newEntry = {
                  borrowId: loan.id,
                  bookId: bookId,
                  bookTitle: bookDetails.title || `Livre #${bookId}`,
                  bookAuthor: bookDetails.author || "Auteur indisponible",
                  ipfsHash: bookDetails.ipfsHash || "",
                  coverImageHash: bookDetails.coverImageHash || bookDetails.ipfsHash || "",
                  borrowDate: borrowDate.toISOString(),
                  dueDate: dueDate.toISOString(),
                  status: 'emprunté',
                  returnDate: null
                };

                localHistory.push(newEntry);
                console.log(`Ajout d'un emprunt actif à l'historique: ${bookDetails.title}`);
              }
            } catch (bookError) {
              console.warn(`Erreur lors de la récupération des détails pour l'emprunt actif ${bookId}:`, bookError);
            }
          }
        }

        // Sauvegarder l'historique mis à jour
        localStorage.setItem(`borrowHistory_${lowerCaseAddress}`, JSON.stringify(localHistory));
      } catch (activeLoansError) {
        console.warn("Erreur lors de la récupération des emprunts actifs:", activeLoansError);
      }

      // Vérifier si des emprunts n'ont pas de détails complets et les enrichir
      const enrichedHistory = await Promise.all(localHistory.map(async (item) => {
        if (!item.bookTitle || item.bookTitle === `Livre #${item.bookId}` || !item.bookAuthor || item.bookAuthor === "Auteur indisponible") {
          try {
            const bookDetails = await this.getBook(item.bookId);
            if (bookDetails) {
              return {
                ...item,
                bookTitle: bookDetails.title || item.bookTitle || `Livre #${item.bookId}`,
                bookAuthor: bookDetails.author || item.bookAuthor || "Auteur indisponible",
                ipfsHash: bookDetails.ipfsHash || item.ipfsHash || "",
                coverImageHash: bookDetails.coverImageHash || bookDetails.ipfsHash || item.coverImageHash || ""
              };
            }
          } catch (error) {
            console.warn(`Erreur lors de l'enrichissement des détails du livre ${item.bookId}:`, error);
          }
        }
        return item;
      }));

      // Trier l'historique par date d'emprunt (du plus récent au plus ancien)
      enrichedHistory.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));

      return enrichedHistory;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique d'emprunt:", error);
      return [];
    }
  }

  // Méthode spécifique pour récupérer l'emprunt en cours pour un livre
  async getCurrentBorrowForBook(bookId) {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
      }

      const bookIdNumber = parseInt(bookId);
      if (isNaN(bookIdNumber)) {
        throw new Error("ID de livre invalide");
      }

      // Récupérer les détails du livre pour voir s'il est emprunté
      const book = await this.getBook(bookIdNumber);
      if (!book) {
        throw new Error("Livre introuvable");
      }

      // Si le livre n'est pas emprunté, retourner null
      if (book.isAvailable || !book.currentBorrowId || book.currentBorrowId === '0') {
        return null;
      }

      // Récupérer les détails de l'emprunt en cours
      const borrowDetails = await this.callViewMethod('getBorrowDetails', [book.currentBorrowId])
        .catch(() => null);

      if (!borrowDetails) {
        return null;
      }

      // Formater les détails de l'emprunt
      const borrowTime = borrowDetails.borrowTime ? new Date(parseInt(borrowDetails.borrowTime) * 1000) : new Date();
      const dueTime = borrowDetails.dueTime ? new Date(parseInt(borrowDetails.dueTime) * 1000) : new Date(borrowTime);
      dueTime.setDate(borrowTime.getDate() + 14); // Fallback si dueTime n'est pas défini

      // Créer un objet avec les détails de l'emprunt
      return {
        borrowId: book.currentBorrowId,
        bookId: bookIdNumber,
        bookTitle: book.title,
        bookAuthor: book.author,
        ipfsHash: book.ipfsHash,
        coverImageHash: book.coverImageHash || book.ipfsHash,
        borrowDate: borrowTime.toISOString(),
        dueDate: dueTime.toISOString(),
        borrowedBy: book.borrowedBy,
        status: 'emprunté',
        returnDate: null
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de l'emprunt en cours:", error);
      return null;
    }
  }

  async getUserReputation(address = null) {
    if (!address && !this.account) {
      console.warn("getUserReputation: Aucun compte spécifié");
      return '80'; // Valeur par défaut de réputation
    }

    const userAddress = address || this.account;
    const lowerCaseAddress = userAddress.toLowerCase();

    try {
      // Vérifier si le service est initialisé
      if (!this.initialized) {
        console.log("Web3 n'est pas initialisé pour getUserReputation, tentative d'initialisation...");
        const success = await this.initialize();
        if (!success) {
          console.warn("Échec d'initialisation dans getUserReputation");
          return '80'; // Valeur par défaut de réputation
        }
      }

      // Essayer d'abord d'obtenir la réputation directement depuis la blockchain
      // plutôt que de se fier au cache/localStorage
      if (this.contract && this.contract.methods.getUserReputation) {
        try {
          console.log("Récupération de la réputation directement depuis la blockchain...");
          const blockchainReputation = await this.contract.methods.getUserReputation(userAddress).call({
            from: this.account,
            gas: 3000000
          });

          console.log("Réputation récupérée depuis la blockchain:", blockchainReputation);

          // Si on a un résultat de la blockchain, c'est la source la plus fiable,
          // alors on met à jour le localStorage et on retourne cette valeur
          if (blockchainReputation) {
            // Mettre à jour le localStorage avec la valeur de la blockchain
            try {
              const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
              if (userData) {
                const user = JSON.parse(userData);
                user.reputation = parseInt(blockchainReputation);
                user.lastUpdated = Date.now();
                localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(user));
              } else {
                // Créer un nouvel enregistrement utilisateur
                const newUser = {
                  address: userAddress,
                  reputation: parseInt(blockchainReputation),
                  lastUpdated: Date.now()
                };
                localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(newUser));
              }
              console.log("Réputation mise à jour dans localStorage:", blockchainReputation);
            } catch (storageError) {
              console.warn("Erreur lors de la sauvegarde de la réputation:", storageError);
            }

            return String(blockchainReputation);
          }
        } catch (blockchainError) {
          console.warn("Erreur lors de la récupération depuis la blockchain:", blockchainError);
          // Continuer avec les méthodes alternatives ci-dessous
        }
      }

      // Si la récupération depuis la blockchain échoue, essayer le localStorage
      try {
        const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.reputation) {
            console.log("Réputation récupérée depuis localStorage:", user.reputation);
            return String(user.reputation);
          }
        }
      } catch (storageError) {
        console.warn("Erreur lors de la lecture depuis localStorage:", storageError);
      }

      // Valeur par défaut si tout échoue
      return '80';
    } catch (error) {
      console.error('Erreur lors de la récupération de la réputation:', error);
      return '80'; // Valeur par défaut de réputation en cas d'erreur
    }
  }

  async getUserBorrowHistory(address = null) {
    if (!address && !this.account) {
      console.warn("getUserBorrowHistory: Aucun compte spécifié");
      return []; // Tableau vide par défaut
    }

    const userAddress = address || this.account;

    try {
      // Vérifier si le service est initialisé
      if (!this.initialized) {
        console.log("Web3 n'est pas initialisé pour getUserBorrowHistory, tentative d'initialisation...");
        const success = await this.initialize();
        if (!success) {
          console.warn("Échec d'initialisation dans getUserBorrowHistory");
          return [];
        }
      }

      // Vérifier que le contrat est disponible
      if (!this.contract || !this.contract.methods) {
        console.warn("Contrat non disponible dans getUserBorrowHistory");
        return [];
      }

      // Vérifier directement si l'utilisateur est inscrit
      if (userAddress === this.account) {
        // Utiliser le cache pour l'utilisateur actuel
        const lowerCaseAddress = userAddress.toLowerCase();
        if (this.userRegisteredCache.has(lowerCaseAddress) && !this.userRegisteredCache.get(lowerCaseAddress)) {
          console.log("L'utilisateur n'est pas inscrit, aucun historique d'emprunt");
          return [];
        }
      }

      console.log("Tentative de récupération de l'historique d'emprunts pour:", userAddress);

      // Vérifier d'abord que la méthode existe
      if (!this.contract.methods.getUserBorrowHistory) {
        console.warn("Méthode getUserBorrowHistory non disponible dans le contrat");
        return [];
      }

      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout dépassé')), 10000);
      });

      // Créer la promesse pour l'appel du contrat
      const contractPromise = this.contract.methods.getUserBorrowHistory(userAddress).call({
        from: this.account,
        gas: 8000000
      });

      // Race entre le timeout et l'appel
      const result = await Promise.race([contractPromise, timeoutPromise])
        .catch(err => {
          console.warn("Erreur ou timeout dans getUserBorrowHistory:", err.message);
          return [];
        });

      // Si le résultat est null, undefined ou non itérable, retourner un tableau vide
      if (!result || typeof result[Symbol.iterator] !== 'function') {
        return [];
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return []; // Tableau vide par défaut
    }
  }

  async getUserActiveLoans(address = null) {
    if (!address && !this.account) {
      console.warn("getUserActiveLoans: Aucun compte spécifié");
      return []; // Tableau vide par défaut
    }

    const userAddress = address || this.account;

    try {
      // Vérifier directement si l'utilisateur est inscrit
      if (userAddress === this.account) {
        // Utiliser le cache pour l'utilisateur actuel
        const lowerCaseAddress = userAddress.toLowerCase();
        if (this.userRegisteredCache.has(lowerCaseAddress) && !this.userRegisteredCache.get(lowerCaseAddress)) {
          console.log("L'utilisateur n'est pas inscrit, aucun emprunt actif");
          return [];
        }
      }

      console.log("Tentative de récupération des emprunts actifs pour:", userAddress);

      // Appeler la méthode du contrat directement avec le bon format de paramètres
      // Utiliser callViewMethod au lieu de callContractMethod car c'est une fonction view
      const loanIds = await this.callViewMethod('getUserActiveLoans', [userAddress], { gas: 8000000 });

      if (!loanIds || loanIds.length === 0) {
        return []; // Tableau vide par défaut
      }

      console.log("IDs d'emprunts actifs récupérés:", loanIds);

      // Pour chaque ID d'emprunt, récupérer les détails
      const loansWithDetails = await Promise.all(loanIds.map(async (loanId) => {
        try {
          // Récupérer les détails de l'emprunt depuis le contrat
          const borrowDetails = await this.callViewMethod('getBorrowDetails', [loanId]);

          if (!borrowDetails) {
            console.warn(`Aucun détail trouvé pour l'emprunt ${loanId}`);
            return null;
          }

          // Formatter les détails de l'emprunt en un objet utilisable
          // Les noms de champs peuvent varier selon votre implémentation du contrat
          const loan = {
            id: loanId.toString(),
            bookId: borrowDetails.bookId ? parseInt(borrowDetails.bookId) : 0,
            borrowTime: borrowDetails.borrowTime ? new Date(parseInt(borrowDetails.borrowTime) * 1000) : new Date(),
            dueTime: borrowDetails.dueTime ? new Date(parseInt(borrowDetails.dueTime) * 1000) : new Date(),
            returned: borrowDetails.returned || false,
            // Formater la date d'échéance au format YYYY-MM-DD pour l'affichage
            dueDate: new Date(parseInt(borrowDetails.dueTime) * 1000).toISOString().split('T')[0]
          };

          return loan;
        } catch (error) {
          console.error(`Erreur lors de la récupération des détails de l'emprunt ${loanId}:`, error);
          return null;
        }
      }));

      // Filtrer les éléments null (emprunts n'ayant pas pu être récupérés)
      const validLoans = loansWithDetails.filter(loan => loan !== null);

      console.log("Emprunts actifs récupérés avec succès:", validLoans);
      return validLoans;
    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts actifs:', error);
      return []; // Tableau vide par défaut
    }
  }

  async addBook(title, author, ipfsHash) {
    try {
      console.log(`Tentative d'ajout du livre: ${title} par ${author} avec hash IPFS: ${ipfsHash}`);

      if (!this.isInitialized()) {
        await this.initialize();
      }

      if (!title || !author || !ipfsHash) {
        throw new Error("Paramètres invalides pour l'ajout du livre");
      }

      // Vérifier s'il s'agit d'un administrateur
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        throw new Error("Seul l'administrateur peut ajouter des livres");
      }

      // Préparation de l'appel au contrat avec des paramètres explicites
      console.log("Préparation de l'appel au contrat addBook...");

      const gasEstimate = await this.contract.methods.addBook(title, author, ipfsHash)
        .estimateGas({ from: this.account })
        .catch(error => {
          console.warn("Erreur lors de l'estimation du gas:", error);
          return this.defaultGasLimit; // Utiliser une limite par défaut
        });

      console.log(`Estimation de gas pour addBook: ${gasEstimate}`);

      // Ajouter une marge de sécurité au gas
      const gasToUse = Math.ceil(gasEstimate * 1.2);

      // Transaction avec paramètres explicites
      const result = await this.contract.methods.addBook(title, author, ipfsHash)
        .send({
          from: this.account,
          gas: gasToUse,
          gasPrice: this.defaultGasPrice
        });

      console.log("Livre ajouté avec succès:", result);

      // Déclencher un événement pour informer l'application de l'ajout du livre
      window.dispatchEvent(new CustomEvent('bookAdded', {
        detail: {
          id: result.events?.BookAdded?.returnValues?.bookId || 'nouveau',
          title,
          author,
          ipfsHash
        }
      }));

      // Ajouter le livre aux livres en cache pour une mise à jour immédiate de l'UI
      setTimeout(() => {
        // Permettre à l'application de recharger les livres
        window.dispatchEvent(new CustomEvent('refreshBooks'));
      }, 2000);

      return {
        success: true,
        transactionHash: result.transactionHash,
        bookId: result.events?.BookAdded?.returnValues?.bookId
      };
    } catch (error) {
      console.error(`Erreur lors de l'ajout du livre:`, error);

      // Analyse des erreurs spécifiques
      if (error.message.includes("denied") || error.message.includes("rejec")) {
        throw new Error("Transaction rejetée par l'utilisateur");
      }

      if (error.message.includes("admin")) {
        throw new Error("Seul l'administrateur peut ajouter des livres");
      }

      throw error;
    }
  }

  // Simuler l'ajout d'un livre localement quand la blockchain n'est pas disponible
  simulateAddBook(title, author, ipfsHash) {
    console.log("Simulation d'ajout de livre localement");

    try {
      // Récupérer les livres existants ou initialiser un tableau vide
      let localBooks = [];
      const localBooksJSON = localStorage.getItem('localBooks');

      if (localBooksJSON) {
        localBooks = JSON.parse(localBooksJSON);
      }

      // Générer un ID unique pour le livre local
      // Utiliser un préfixe "local_" pour distinguer des livres de la blockchain
      const localId = `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      // Créer l'objet livre avec une structure similaire à celle de la blockchain
      const newBook = {
        id: localId,
        title,
        author,
        ipfsHash,
        isAvailable: true,
        borrowedBy: '0x0000000000000000000000000000000000000000',
        currentBorrowId: 0,
        isLocal: true // Indicateur pour identifier les livres locaux
      };

      // Ajouter le livre à la liste locale
      localBooks.push(newBook);

      // Enregistrer dans localStorage
      localStorage.setItem('localBooks', JSON.stringify(localBooks));

      console.log("Livre ajouté localement avec succès:", newBook);
      return { success: true, bookId: localId, book: newBook };
    } catch (error) {
      console.error("Erreur lors de la simulation d'ajout de livre:", error);
      return { success: false, error: error.message };
    }
  }

  async getBookCount() {
    if (!this.initialized) await this.initialize();

    try {
      return await this.contract.methods.bookCount().call();
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de livres:', error);
      throw error;
    }
  }

  // Nouvelle méthode pour changer de réseau
  async switchNetwork(networkId) {
    if (!window.ethereum) {
      throw new Error("MetaMask n'est pas installé");
    }

    if (!this.supportedNetworks[networkId]) {
      throw new Error(`Le réseau ${networkId} n'est pas supporté`);
    }

    const chainId = `0x${networkId.toString(16)}`;

    try {
      console.log(`Tentative de changement vers le réseau ${networkId} (${this.getNetworkName(networkId)})`);
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });

      // Le changement de réseau va déclencher l'événement chainChanged
      // qui est écouté dans setupEventListeners
      return true;
    } catch (error) {
      // Si le réseau n'est pas dans MetaMask (code 4902), proposer de l'ajouter
      if (error.code === 4902) {
        return await this.addNetwork(networkId);
      }
      console.error(`Erreur lors du changement de réseau: ${error.message}`);
      throw error;
    }
  }

  // Nouvelle méthode pour ajouter un réseau à MetaMask
  async addNetwork(networkId) {
    if (!window.ethereum) {
      throw new Error("MetaMask n'est pas installé");
    }

    const network = this.supportedNetworks[networkId];
    if (!network) {
      throw new Error(`Configuration pour le réseau ${networkId} non trouvée`);
    }

    const params = {
      chainId: `0x${networkId.toString(16)}`,
      chainName: network.name,
      nativeCurrency: network.currency,
      rpcUrls: network.rpcUrls,
      blockExplorerUrls: network.explorerUrl ? [network.explorerUrl] : []
    };

    try {
      console.log(`Ajout du réseau ${network.name} à MetaMask`);
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [params],
      });
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'ajout du réseau: ${error.message}`);
      throw error;
    }
  }

  // Méthode pour obtenir la liste des réseaux supportés
  getSupportedNetworks() {
    const networks = [];
    for (const [id, network] of Object.entries(this.supportedNetworks)) {
      networks.push({
        id: parseInt(id),
        name: network.name,
        hasContract: !!this.contractAddress
      });
    }
    return networks;
  }

  // Vérifier si l'initialisation est complète
  isInitialized() {
    return this.initialized;
  }

  // Nouvelle méthode pour tester la validité du contrat
  async validateContract() {
    try {
      console.log("Validation du contrat à l'adresse:", this.contractAddress);

      if (!this.web3) {
        console.error("Web3 non initialisé");
        return false;
      }

      // Vérification de l'adresse du contrat
      if (!this.contractAddress ||
          this.contractAddress === '0x0' ||
          !this.web3.utils.isAddress(this.contractAddress)) {
        console.error("Adresse du contrat invalide:", this.contractAddress);
        return false;
      }

      // Vérifier que le contrat répond
      try {
        const exists = await this.web3.eth.getCode(this.contractAddress);
        if (exists === '0x' || exists === '0x0') {
          console.error("Aucun contrat déployé à cette adresse");
          return false;
        }
      } catch (codeError) {
        console.error("Erreur lors de la vérification du code du contrat:", codeError);
        return false;
      }

      console.log("Code du contrat trouvé à l'adresse indiquée");

      // Si le contrat n'est pas initialisé, essayer de l'initialiser
      if (!this.contract) {
        try {
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
        } catch (contractError) {
          console.error("Erreur lors de l'initialisation du contrat:", contractError);
          return false;
        }
      }

      // Vérifier que les méthodes attendues existent
      if (!this.contract.methods) {
        console.error("Le contrat n'a pas de méthodes");
        return false;
      }

      try {
        // Vérifier si la méthode bookCount existe
        if (!this.contract.methods.bookCount) {
          console.error("La méthode bookCount n'existe pas dans le contrat");
          return false;
        }

        // Ajouter un timeout pour éviter les blocages
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout dépassé')), 10000);
        });

        // Créer la promesse pour l'appel du contrat
        const contractPromise = this.contract.methods.bookCount().call({
          gas: 3000000
        });

        // Race entre le timeout et l'appel
        const bookCount = await Promise.race([contractPromise, timeoutPromise])
          .catch(err => {
            console.error("Erreur ou timeout lors de l'appel à bookCount:", err.message);
            return null;
          });

        if (bookCount === null) {
          console.error("Échec de l'appel à bookCount");
          return false;
        }

        console.log("Contrat valide, nombre de livres:", bookCount);
        return true;
      } catch (error) {
        console.error("Erreur lors de l'appel à une méthode du contrat:", error);
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la validation du contrat:", error);
      return false;
    }
  }

  // Méthode pour obtenir des informations détaillées sur l'état de la connexion
  async getConnectionStatus() {
    try {
      // Vérifier Web3
      const hasWeb3 = !!this.web3;
      let web3Version = null;
      if (hasWeb3) {
        web3Version = this.web3.version;
      }

      // Vérifier le compte
      let account = null;
      if (this.account) {
        account = {
          address: this.account,
          shortened: this.shortenAddress(this.account)
        };
      }

      // Vérifier le réseau
      let network = null;
      if (this.networkId) {
        network = {
          id: this.networkId,
          name: this.getNetworkName(this.networkId),
          supported: this.isNetworkSupported()
        };
      }

      // Vérifier le contrat
      let contract = null;
      if (this.contract) {
        contract = {
          address: this.contractAddress,
          hasCode: false,
          methods: Object.keys(this.contract.methods).filter(m => typeof m === 'string' && !m.startsWith('0x'))
        };

        // Vérifier si le contrat a du code
        if (this.web3) {
          try {
            const code = await this.web3.eth.getCode(this.contractAddress);
            contract.hasCode = code && code !== '0x' && code !== '0x0';
          } catch (e) {
            console.error("Erreur lors de la vérification du code du contrat:", e);
          }
        }
      }

      // Vérifier MetaMask
      let provider = null;
      if (window.ethereum) {
        provider = {
          isMetaMask: window.ethereum.isMetaMask,
          selectedAddress: window.ethereum.selectedAddress,
          chainId: window.ethereum.chainId ? parseInt(window.ethereum.chainId, 16) : null
        };
      }

      return {
        initialized: this.initialized,
        hasWeb3,
        web3Version,
        account,
        network,
        contract,
        provider
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du statut de connexion:", error);
      return {
        error: error.message || "Erreur inconnue"
      };
    }
  }

  // Méthode générique pour appeler n'importe quelle méthode du contrat
  async callContractMethod(methodName, ...args) {
    if (!this.initialized || !this.contract || !this.account) {
      console.error("Web3Service n'est pas initialisé pour appeler une méthode de contrat");
      throw new Error("Service non initialisé");
    }

    if (!this.contract.methods[methodName]) {
      console.error(`La méthode ${methodName} n'existe pas dans le contrat`);
      throw new Error(`Méthode ${methodName} non disponible`);
    }

    try {
      // Préparation de la transaction
      const method = this.contract.methods[methodName](...args);

      // Options par défaut
      const defaultOptions = {
        from: this.account,
        gas: this.defaultGasLimit || 500000, // S'assurer que la limite de gaz est définie
        gasPrice: undefined, // Laisser MetaMask déterminer le prix du gaz
        ...args
      };

      console.log(`Appel de la méthode ${methodName} avec les paramètres:`, args);
      console.log("Options:", defaultOptions);

      // Vérifier l'estimation de gaz pour cette transaction
      try {
        const gasEstimate = await method.estimateGas({from: this.account});
        console.log(`Estimation de gaz pour ${methodName}:`, gasEstimate);

        // Si l'estimation est proche de la limite, augmenter la limite
        if (gasEstimate > defaultOptions.gas * 0.9) {
          defaultOptions.gas = Math.floor(gasEstimate * 1.2); // Ajouter 20% de marge
          console.log(`Limite de gaz ajustée pour ${methodName}:`, defaultOptions.gas);
        }
      } catch (estimateError) {
        console.warn(`Impossible d'estimer le gaz pour ${methodName}:`, estimateError);
        // Continuer avec la valeur par défaut
      }

      // Exécution de la transaction
      const result = await method.send(defaultOptions);

      console.log(`Résultat de l'appel à ${methodName}:`, result);
      return result;
    } catch (error) {
      console.error(`Erreur lors de l'appel à la méthode ${methodName}:`, error);

      // Gérer les erreurs spécifiques de MetaMask
      if (error.code === -32603 && error.message.includes("Internal JSON-RPC error")) {
        // Tenter d'extraire le message d'erreur interne
        try {
          const errorObj = JSON.parse(error.stack.match(/{.*}/s)[0]);
          if (errorObj && errorObj.message) {
            throw new Error(`Erreur MetaMask: ${errorObj.message}`);
          }
        } catch (parseError) {
          // Si nous ne pouvons pas parser l'erreur, suggérer une solution
          throw new Error("Erreur de transaction MetaMask. Essayez de réinitialiser votre compte dans MetaMask (Paramètres > Avancé > Réinitialiser le compte).");
        }
      }
      // Gérer l'erreur "user rejected transaction"
      else if (error.code === 4001 || (error.message && error.message.includes("User denied"))) {
        throw new Error("Transaction annulée par l'utilisateur");
      }
      // Gérer l'erreur de limite de gaz insuffisante
      else if (error.message && error.message.toLowerCase().includes("gas")) {
        throw new Error("Limite de gaz insuffisante. Veuillez augmenter la limite de gaz dans les options de transaction.");
      }

      throw error;
    }
  }

  // Méthode générique pour lire une donnée du contrat (call)
  async callViewMethod(methodName, params = [], options = {}) {
    try {
      if (!this.isInitialized() || !this.contract) {
        await this.initialize(false); // Ne pas forcer la connexion à MetaMask
      }

      // Vérifier si la méthode existe dans le contrat
      if (!this.contract.methods[methodName]) {
        const error = new Error(`Méthode ${methodName} non disponible`);
        console.warn(`La méthode ${methodName} n'existe pas dans le contrat à l'adresse ${this.contractAddress}`);
        throw error;
      }

      // Préparer la méthode avec les paramètres fournis
      const method = this.contract.methods[methodName](...params);

      // Préparer les options d'appel
      const callOptions = {
        ...options
      };

      // Ajouter l'adresse de l'expéditeur si disponible
      if (this.account) {
        callOptions.from = this.account;
      }

      // Exécuter l'appel view (ne modifie pas l'état)
      const result = await method.call(callOptions);

      return result;
    } catch (error) {
      if (error.message.includes('non disponible')) {
        throw error; // Rethrow les erreurs de méthode non disponible (déjà formatées)
      }
      console.error(`Erreur lors de l'appel à la méthode view ${methodName}:`, error);
      throw new Error(`Erreur lors de l'appel à la méthode ${methodName}: ${error.message}`);
    }
  }

  // Vérifier si l'utilisateur est déjà connecté à MetaMask
  isConnected() {
    return !!this.account;
  }

  // Vérifier si l'utilisateur est l'administrateur
  async isAdmin() {
    console.log("Vérification des droits admin - État initial:", {
      initialized: this.initialized,
      hasAccount: !!this.account,
      hasContract: !!this.contract,
      networkId: this.networkId,
      contractAddress: this.contractAddress
    });

    if (!this.initialized) {
      try {
        console.log("Web3Service non initialisé, tentative d'initialisation...");
        // Tenter d'initialiser si ce n'est pas déjà fait
        await this.initialize();
      } catch (error) {
        console.error("Échec de l'initialisation lors de la vérification des droits d'administrateur:", error);
        return false;
      }
    }

    if (!this.account) {
      console.warn("Aucun compte connecté pour vérifier les droits d'administrateur");
      return false;
    }

    if (!this.contract || !this.contract.methods) {
      try {
        console.log("Contrat non initialisé, tentative d'initialisation...", this.networkId);
        // Forcer la réinitialisation du contrat avec le réseau actuel
        if (!this.networkId) {
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.networkId = parseInt(chainId, 16);
            console.log("Réseau actuel détecté:", this.networkId);
          } catch (error) {
            console.error("Impossible de détecter le réseau actuel:", error);
          }
        }

        // Utiliser l'adresse explicite du contrat si disponible
        const contractAddress = this.contractAddresses[this.networkId] || this.contractAddress;
        console.log("Adresse du contrat utilisée:", contractAddress, "pour le réseau:", this.networkId);

        // Initialiser le contrat avec l'ABI et l'adresse
        if (this.web3 && contractAddress) {
          // Utiliser l'ABI disponible dans src/LibraryDAppABI.json
          const LibraryContractABI = require('../LibraryDAppABI.json');
          this.contract = new this.web3.eth.Contract(
            LibraryContractABI,
            contractAddress
          );
          console.log("Contrat réinitialisé manuellement:", !!this.contract);
        }

        if (!this.contract || !this.contract.methods) {
          console.warn("Impossible d'initialiser le contrat pour vérifier les droits d'administrateur");
          return false;
        }
      } catch (error) {
        console.error("Échec de l'initialisation du contrat lors de la vérification des droits d'administrateur:", error);
        return false;
      }
    }

    try {
      console.log("Tentative d'appel de la méthode admin()...");
      // Vérifier si la méthode admin existe
      if (!this.contract.methods.admin) {
        console.error("La méthode admin() n'existe pas dans le contrat");
        return false;
      }

      // Utiliser directement la méthode du contrat pour éviter des problèmes additionnels
      const adminAddress = await this.contract.methods.admin().call();

      if (!adminAddress) {
        console.warn("Impossible de récupérer l'adresse de l'administrateur");
        return false;
      }

      // Comparer avec l'adresse de l'utilisateur (conversion en minuscules pour éviter les problèmes de casse)
      const isUserAdmin = adminAddress.toLowerCase() === this.account.toLowerCase();
      console.log("Vérification admin:", { adminAddress, userAddress: this.account, isAdmin: isUserAdmin });

      return isUserAdmin;
    } catch (error) {
      console.error("Erreur lors de la vérification du statut d'administrateur:", error);
      return false;
    }
  }

  // Méthode pour récupérer les livres sans connexion à MetaMask
  async getBooksWithoutConnection() {
    try {
      console.log("Tentative de récupération des livres sans connexion à MetaMask");

      // Vérifier si le service est initialisé sans demander de connexion
      if (!this.isInitialized()) {
        console.log("Service non initialisé, tentative d'initialisation sans demander de connexion...");
        await this.initialize(false); // false = ne pas demander de connexion
      }

      // Si le contrat est disponible, utiliser la méthode standard
      if (this.contract && this.contract.methods) {
        return await this.getBooks();
      }

      // Sinon, utiliser les livres de secours
      console.log("Contrat non disponible, utilisation des livres de secours");
      return this.getFilteredFallbackBooks();
    } catch (error) {
      console.error("Erreur lors de la récupération des livres sans connexion:", error);
      return this.getFilteredFallbackBooks();
    }
  }

  // Surcharge de la méthode getBooks pour filtrer les livres masqués
  async getBooks() {
    try {
      console.log("Tentative de récupération des livres");

      // Vérifier si le service est initialisé
      if (!this.isInitialized()) {
        console.log("Service non initialisé, tentative d'initialisation...");
        await this.initialize(false); // Ne pas forcer la connexion à MetaMask
      }

      // Vérifier si le contrat est disponible
      if (!this.contract) {
        console.error("Contrat non disponible pour récupérer les livres");

        // Tentative de réinitialisation du contrat
        console.log("Tentative de réinitialisation du contrat...");
        if (this.web3) {
          const networkId = await this.web3.eth.net.getId();
          const success = await this.tryInitializeContract(networkId);

          if (!success) {
            console.error("Échec de réinitialisation du contrat, tentative avec détection automatique");
            const detectedAddress = await this.detectDeployedContract(networkId);

            if (detectedAddress) {
              console.log(`Contrat détecté à l'adresse: ${detectedAddress}`);
              this.contractAddresses[networkId] = detectedAddress;
              this.contractAddress = detectedAddress;

              // Réessayer l'initialisation avec la nouvelle adresse
              const retrySuccess = await this.tryInitializeContract(networkId);
              if (!retrySuccess) {
                console.error("Impossible d'initialiser le contrat même avec l'adresse détectée");
                return this.getFilteredFallbackBooks(); // Utiliser des données de secours
              }
            } else {
              console.error("Aucun contrat détecté automatiquement");
              return this.getFilteredFallbackBooks(); // Utiliser des données de secours
            }
          }
        } else {
          console.error("Web3 non initialisé, impossible de récupérer les livres");
          return this.getFilteredFallbackBooks(); // Utiliser des données de secours
        }
      }

      // Vérifier à nouveau si le contrat est disponible après les tentatives de récupération
      if (!this.contract || !this.contract.methods) {
        console.error("Échec de récupération du contrat après plusieurs tentatives");
        return this.getFilteredFallbackBooks();
      }

      // Récupérer le nombre total de livres avec la propriété 'bookCount'
      let bookCount;
      try {
        bookCount = await this.callViewMethod('bookCount', []);
        console.log(`Nombre total de livres: ${bookCount}`);
      } catch (error) {
        console.error("Erreur lors de la récupération du nombre de livres:", error);
        return this.getFilteredFallbackBooks();
      }

      if (bookCount <= 0) {
        console.log("Aucun livre dans la bibliothèque");
        return [];
      }

      // Récupérer les informations de tous les livres
      const books = [];
      const promises = [];

      for (let i = 1; i <= bookCount; i++) {
        promises.push(this.getBook(i));
      }

      // Attendre que toutes les requêtes soient terminées
      const results = await Promise.all(promises);

      // Filtrer les résultats null ou undefined
      for (const book of results) {
        if (book) {
          books.push(book);
        }
      }

      console.log(`${books.length} livres récupérés avec succès`);

      // Filtrer les livres masqués
      return this.filterHiddenBooks(books);
    } catch (error) {
      console.error("Erreur lors de la récupération des livres:", error);
      return this.getFilteredFallbackBooks();
    }
  }

  // Nouvelle méthode pour filtrer les livres masqués localement
  filterHiddenBooks(books) {
    try {
      // Si aucun livre, retourner un tableau vide
      if (!books || !Array.isArray(books) || books.length === 0) {
        console.warn("Aucun livre à filtrer");
        return [];
      }

      console.log(`Filtrage des livres masqués sur ${books.length} livres`);

      // Récupérer la liste des livres masqués du localStorage
      let hiddenBooks = [];
      try {
        const hiddenBooksJson = localStorage.getItem("hidden_books");
        hiddenBooks = hiddenBooksJson ? JSON.parse(hiddenBooksJson) : [];
      } catch (parseError) {
        console.error("Erreur lors de la récupération des livres masqués:", parseError);
        hiddenBooks = [];
      }

      if (hiddenBooks.length === 0) {
        console.log("Aucun livre masqué trouvé, affichage de tous les livres");
        return books; // Pas de livres masqués, retourner la liste complète
      }

      // Extraire les IDs des livres masqués (s'assurer qu'ils sont bien des nombres)
      const hiddenIds = hiddenBooks.map(book => Number(book.id));
      console.log(`${hiddenIds.length} livres masqués trouvés:`, hiddenIds);

      // Filtrer les livres masqués de la liste
      const filteredBooks = books.filter(book => {
        const bookId = Number(book.id);
        const isHidden = hiddenIds.includes(bookId);
        if (isHidden) {
          console.log(`Livre masqué filtré: ${bookId} - ${book.title}`);
        }
        return !isHidden;
      });

      console.log(`${filteredBooks.length}/${books.length} livres visibles après filtrage`);
      return filteredBooks;
    } catch (error) {
      console.warn("Erreur lors du filtrage des livres masqués:", error);
      return books; // Retourner la liste originale en cas d'erreur
    }
  }

  // Méthode pour vérifier si un livre est masqué localement
  isBookHiddenLocally(bookId) {
    try {
      const hiddenBooksJson = localStorage.getItem("hidden_books");
      if (!hiddenBooksJson) return false;

      const hiddenBooks = JSON.parse(hiddenBooksJson);
      const numBookId = Number(bookId);

      return hiddenBooks.some(book => Number(book.id) === numBookId);
    } catch (error) {
      console.error("Erreur lors de la vérification du statut masqué:", error);
      return false;
    }
  }

  // Récupérer les livres de secours avec filtrage des livres masqués
  getFilteredFallbackBooks() {
    const fallbackBooks = this.getFallbackBooks();
    return this.filterHiddenBooks(fallbackBooks);
  }

  // Méthode pour récupérer des livres de secours depuis le localStorage ou des exemples par défaut
  getFallbackBooks() {
    console.log("Utilisation des livres de secours");

    // Essayer de récupérer les livres depuis localStorage
    try {
      const localBooksJSON = localStorage.getItem('localBooks');
      if (localBooksJSON) {
        const localBooks = JSON.parse(localBooksJSON);
        if (Array.isArray(localBooks) && localBooks.length > 0) {
          console.log(`${localBooks.length} livres récupérés depuis le stockage local`);
          return localBooks;
        }
      }
    } catch (e) {
      console.warn("Erreur lors de la récupération des livres depuis le stockage local:", e);
    }

    // Livres exemples par défaut si aucun livre n'est trouvé
    return [
      {
        id: "offline_1",
        title: "Fondements de la Blockchain",
        author: "Satoshi Nakamoto",
        isAvailable: true,
        isOfflineMode: true
      },
      {
        id: "offline_2",
        title: "Le Web3 pour les Débutants",
        author: "Vitalik Buterin",
        isAvailable: true,
        isOfflineMode: true
      },
      {
        id: "offline_3",
        title: "IPFS: Stockage Décentralisé",
        author: "Juan Benet",
        isAvailable: true,
        isOfflineMode: true
      }
    ];
  }

  // Simuler l'achat d'un livre local
  simulatePurchaseBook(bookId) {
    console.log("Simulation d'achat de livre local:", bookId);

    try {
      // Vérifier si bookId est défini
      if (!bookId) {
        return { success: false, error: "ID du livre non spécifié" };
      }

      // Vérifier si c'est un livre local
      if (!bookId.toString().startsWith('local_')) {
        return { success: false, error: "Ce n'est pas un livre local" };
      }

      // Récupérer les livres locaux
      const localBooksJSON = localStorage.getItem('localBooks');
      if (!localBooksJSON) {
        return { success: false, error: "Aucun livre local trouvé" };
      }

      let localBooks = JSON.parse(localBooksJSON);

      // Trouver le livre à acheter
      const bookIndex = localBooks.findIndex(book => book.id === bookId);
      if (bookIndex === -1) {
        return { success: false, error: "Livre non trouvé" };
      }

      // Vérifier si le livre est disponible
      if (!localBooks[bookIndex].available) {
        return { success: false, error: "Ce livre n'est plus disponible" };
      }

      // Simuler l'achat en modifiant le statut et le propriétaire
      localBooks[bookIndex].available = false;
      localBooks[bookIndex].owner = this.account || "acheteur_local";
      localBooks[bookIndex].purchasedAt = new Date().toISOString();

      // Sauvegarder les changements
      localStorage.setItem('localBooks', JSON.stringify(localBooks));

      console.log("Achat local simulé avec succès:", localBooks[bookIndex]);

      return {
        success: true,
        message: "Achat simulé avec succès",
        book: localBooks[bookIndex]
      };
    } catch (error) {
      console.error("Erreur lors de la simulation d'achat:", error);
      return { success: false, error: error.message };
    }
  }

  // Achat d'un livre (blockchain ou local)
  async purchaseBook(bookId) {
    console.log(`Tentative d'achat du livre: ${bookId}`);

    // Vérifier si web3 est initialisé
    if (!this.initialized) {
      console.log("Web3 n'est pas initialisé, tentative d'initialisation...");
      const success = await this.initialize();
      if (!success) {
        throw new Error("Impossible d'initialiser Web3 pour l'achat");
      }
    }

    // Vérifier qu'un compte est connecté
    if (!this.account) {
      throw new Error("Aucun compte connecté pour acheter un livre");
    }

    // Vérifier si bookId est défini
    if (!bookId) {
      throw new Error("ID du livre non spécifié");
    }

    // Vérifier si c'est un livre local
    if (bookId.toString().startsWith('local_')) {
      console.log("Livre local détecté, utilisation de la simulation d'achat");
      return this.simulatePurchaseBook(bookId);
    }

    // Sinon, c'est un livre sur la blockchain
    try {
      console.log("Tentative d'achat du livre sur la blockchain...");

      // Vérifier si le contrat est disponible
      if (!this.contract || !this.contract.methods) {
        throw new Error("Contrat non disponible pour l'achat");
      }

      // Vérifier si la méthode d'achat existe
      if (!this.contract.methods.purchaseBook) {
        throw new Error("La méthode d'achat n'existe pas dans le contrat");
      }

      // Récupérer les détails du livre pour connaître le prix
      const book = await this.contract.methods.getBookDetails(bookId).call();
      const price = book.price;

      console.log(`Prix du livre: ${price} Wei`);

      // Envoyer la transaction pour acheter le livre
      const result = await this.contract.methods.purchaseBook(bookId).send({
        from: this.account,
        value: price
      });

      console.log("Achat du livre réussie:", result);

      return {
        success: true,
        transactionHash: result.transactionHash,
        bookId: bookId
      };
    } catch (error) {
      console.error("Erreur lors de l'achat du livre:", error);
      throw error;
    }
  }

  // Récupérer un livre avec toutes ses métadonnées (blockchain + IPFS)
  async getLivre(bookId) {
    try {
      // Récupérer les informations de base du livre depuis la blockchain
      const bookFromBlockchain = await this.getBook(bookId);

      if (!bookFromBlockchain) {
        console.error(`Livre avec ID ${bookId} non trouvé sur la blockchain`);
        return null;
      }

      // Si pas de hash IPFS, retourner seulement les données de la blockchain
      if (!bookFromBlockchain.ipfsHash) {
        console.warn(`Le livre avec ID ${bookId} n'a pas de données IPFS associées`);
        return bookFromBlockchain;
      }

      // Récupérer les métadonnées complètes depuis IPFS avec un timeout et gestion d'erreur
      console.log(`Récupération des métadonnées IPFS pour le livre ${bookId}: ${bookFromBlockchain.ipfsHash}`);

      try {
        // Import dynamique pour éviter la dépendance circulaire
        const ipfsService = await import('./IPFSService').then(module => module.default);

        // Utiliser un Promise avec timeout pour éviter de bloquer indéfiniment
        const ipfsMetadata = await Promise.race([
          ipfsService.getBookMetadata(bookFromBlockchain.ipfsHash),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Délai d'attente dépassé pour IPFS")), 10000)
          )
        ]).catch(error => {
          console.warn(`Timeout ou erreur lors de la récupération IPFS pour le livre ${bookId}:`, error.message);
          return null;
        });

        // Si les métadonnées sont disponibles, les fusionner avec les données blockchain
        if (ipfsMetadata) {
          // Fusionner les données de la blockchain avec les métadonnées IPFS
          const completeBook = {
            ...bookFromBlockchain,
            // Ajouter les champs des métadonnées IPFS
            category: ipfsMetadata.category || bookFromBlockchain.category,
            description: ipfsMetadata.description || '',
            isbn: ipfsMetadata.isbn || '',
            pageCount: ipfsMetadata.pageCount || bookFromBlockchain.pageCount,
            publishedDate: ipfsMetadata.publishedDate || '',
            price: ipfsMetadata.price || '0',
            // URLs d'images et de PDF
            coverImageUrl: ipfsMetadata.coverImageUrl || null,
            coverImageHash: ipfsMetadata.coverImageHash || null,
            pdfUrl: ipfsMetadata.pdfUrl || null,
            pdfHash: ipfsMetadata.pdfHash || null
          };

          console.log(`Livre complet récupéré pour ID ${bookId}`);
          return completeBook;
        }
      } catch (ipfsError) {
        console.warn(`Erreur lors de la récupération IPFS pour le livre ${bookId}:`, ipfsError);
      }

      // Si les métadonnées ne sont pas disponibles, retourner les données de base avec flag
      console.warn(`Métadonnées IPFS non disponibles pour le livre ${bookId}, utilisation des données blockchain uniquement`);
      return {
        ...bookFromBlockchain,
        metadataError: true,
        // Ajouter le hash de l'image pour permettre la récupération alternative
        coverImageHash: bookFromBlockchain.ipfsHash // Utiliser le hash IPFS comme hash d'image de secours
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération complète du livre ${bookId}:`, error);
      // Essayer de récupérer au moins les données blockchain de base
      try {
        const basicBookData = await this.getBook(bookId);
        if (basicBookData) {
          console.warn(`Retour des données blockchain de base pour le livre ${bookId}`);
          return {
            ...basicBookData,
            metadataError: true
          };
        }
      } catch (fallbackError) {
        console.error("Échec de la récupération de secours du livre:", fallbackError);
      }
      return null;
    }
  }

  // Récupérer tous les livres avec leurs métadonnées IPFS
  async getAllLivres() {
    try {
      // Récupérer d'abord la liste de base des livres sans connexion à MetaMask
      const basicBooks = await this.getBooksWithoutConnection();

      if (!basicBooks || basicBooks.length === 0) {
        console.log("Aucun livre trouvé dans la blockchain");
        return [];
      }

      console.log(`Récupération des métadonnées complètes pour ${basicBooks.length} livres...`);

      // Pour chaque livre, récupérer les métadonnées complètes
      // Utiliser Promise.allSettled pour éviter que la totalité échoue si un livre échoue
      const completeBookResults = await Promise.allSettled(
        basicBooks.map(async (basicBook) => {
          try {
            return await this.getLivre(basicBook.id);
          } catch (error) {
            console.warn(`Erreur lors de la récupération du livre ${basicBook.id}:`, error);
            // Renvoyer le livre de base avec un flag d'erreur
            return { ...basicBook, metadataError: true };
          }
        })
      );

      // Traiter les résultats pour inclure seulement les livres réussis ou avec des métadonnées partielles
      const validBooks = completeBookResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      console.log(`${validBooks.length}/${basicBooks.length} livres complets récupérés avec succès`);

      // Si aucun livre n'a pu être récupéré avec les métadonnées, retourner les livres de base
      if (validBooks.length === 0 && basicBooks.length > 0) {
        console.warn("Impossible de récupérer les métadonnées IPFS, retour aux données de base");
        return basicBooks;
      }

      return validBooks;
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les livres:", error);
      // En cas d'erreur globale, essayer de retourner la liste de base des livres
      try {
        const fallbackBooks = await this.getBooksWithoutConnection();
        console.warn("Utilisation des données de secours pour les livres");
        return fallbackBooks || [];
      } catch (fallbackError) {
        console.error("Échec du plan de secours pour les livres:", fallbackError);
        return [];
      }
    }
  }

  // Méthode spécifique pour supprimer un livre avec une gestion d'erreur optimisée
  async removeBook(bookId) {
    try {
      console.log(`Tentative de suppression du livre ID:${bookId} - Méthode bas niveau`);

      // Vérifications minimales
      if (!this.web3 || !this.account) {
        throw new Error("Web3 ou compte non initialisé");
      }

      if (!this.contract || !this.contract._address) {
        throw new Error("Contrat non disponible");
      }

      // Convertir l'ID en nombre
      const bookIdNumber = parseInt(bookId);
      if (isNaN(bookIdNumber) || bookIdNumber <= 0) {
        throw new Error("ID de livre invalide");
      }

      console.log("Création des données d'encodage pour removeBook...");

      // =========== SOLUTION BAS NIVEAU ============
      // Encoder directement l'appel à la fonction en utilisant l'ABI du contrat
      // pour éviter les erreurs dans la couche d'abstraction Contract de Web3

      // 1. Trouver la signature de la fonction removeBook dans l'ABI
      const removeBookAbi = LibraryDAppABI.find(
        item => item.type === 'function' && item.name === 'removeBook'
      );

      if (!removeBookAbi) {
        throw new Error("Fonction removeBook non trouvée dans l'ABI du contrat");
      }

      // 2. Créer l'encodage de la fonction
      const functionSignature = this.web3.eth.abi.encodeFunctionSignature(removeBookAbi);

      // 3. Encoder les paramètres
      const encodedParameters = this.web3.eth.abi.encodeParameters(
        ['uint256'],
        [bookIdNumber]
      );

      // 4. Combiner la signature et les paramètres
      const data = functionSignature + encodedParameters.slice(2); // slice pour enlever le '0x' des paramètres

      console.log("Données encodées:", data);

      // 5. Estimer le gaz requis (facultatif mais recommandé)
      const gasEstimate = await this.web3.eth.estimateGas({
        from: this.account,
        to: this.contract._address,
        data: data
      }).catch(err => {
        console.warn("Estimation de gas échouée, on utilise une valeur par défaut:", err);
        return 300000; // Valeur par défaut élevée
      });

      console.log("Estimation de gas:", gasEstimate);

      // 6. Créer et envoyer la transaction directement sans passer par Contract
      console.log("Envoi de la transaction bas niveau...");

      const receipt = await this.web3.eth.sendTransaction({
        from: this.account,
        to: this.contract._address,
        data: data,
        gas: Math.floor(gasEstimate * 1.2) // 20% de marge de sécurité
      });

      console.log("Transaction réussie:", receipt);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        method: "lowLevel"
      };

    } catch (error) {
      console.error("Erreur brute pendant la suppression bas niveau:", error);

      // Analyse de l'erreur pour les messages spécifiques
      if (error.message.includes("User denied")) {
        throw new Error("Vous avez refusé la transaction dans MetaMask");
      }

      if (error.message.includes("gas required exceeds")) {
        throw new Error("La transaction nécessite trop de gas. Essayez une autre méthode.");
      }

      if (error.message.includes("Internal JSON-RPC error")) {
        // Si l'erreur est interne à JSON-RPC, suggérer une réinitialisation complète
        throw new Error("Erreur interne MetaMask. Réinitialisez votre compte MetaMask et essayez à nouveau.");
      }

      // Erreur générique pour les autres cas
      throw new Error(`Échec de la suppression: ${error.message || "Erreur inconnue"}`);
    }
  }

  // Nouvelle méthode pour diagnostiquer les problèmes de suppression
  async diagnoseContractIssues() {
    try {
      console.log("=== DÉBUT DU DIAGNOSTIC DU CONTRAT ===");

      // 1. Vérifier la connexion Web3
      if (!this.web3) {
        console.error("Web3 n'est pas initialisé");
        await this.initialize();
        if (!this.web3) {
          return { success: false, issue: "Web3 non initialisé" };
        }
      }
      console.log("✅ Web3 initialisé");

      // 2. Vérifier le compte
      if (!this.account) {
        console.error("Aucun compte connecté");
        return { success: false, issue: "Aucun compte connecté" };
      }
      console.log("✅ Compte connecté:", this.account);

      // 3. Vérifier le réseau
      const networkId = await this.web3.eth.net.getId();
      const networkName = this.getNetworkName(networkId);
      console.log("Réseau actuel:", networkId, networkName);

      if (!this.isNetworkSupported(networkId)) {
        return { success: false, issue: `Réseau non supporté: ${networkId} (${networkName})` };
      }
      console.log("✅ Réseau supporté:", networkName);

      // 4. Vérifier l'adresse du contrat
      const contractAddress = this.contractAddresses[networkId] || this.contractAddress;
      if (!contractAddress) {
        return { success: false, issue: "Adresse du contrat non définie pour ce réseau" };
      }
      console.log("Adresse du contrat pour ce réseau:", contractAddress);

      // 5. Vérifier si le contrat existe à cette adresse
      try {
        const code = await this.web3.eth.getCode(contractAddress);
        if (!code || code === '0x' || code === '0x0') {
          return { success: false, issue: `Aucun code à l'adresse du contrat: ${contractAddress}` };
        }
        console.log("✅ Code du contrat trouvé à l'adresse");
      } catch (codeError) {
        console.error("Erreur lors de la vérification du code:", codeError);
        return { success: false, issue: "Erreur lors de la vérification du code du contrat" };
      }

      // 6. Vérifier l'instantiation du contrat
      if (!this.contract) {
        console.log("Contrat non instantié, tentative d'initialisation...");
        const success = await this.tryInitializeContract(networkId);
        if (!success || !this.contract) {
          return { success: false, issue: "Échec d'initialisation du contrat" };
        }
      }
      console.log("✅ Contrat instantié");

      // 7. Vérifier les méthodes disponibles
      if (!this.contract.methods) {
        return { success: false, issue: "L'objet 'methods' n'existe pas dans le contrat" };
      }

      const methods = Object.keys(this.contract.methods)
        .filter(name => typeof name === 'string' && !name.startsWith('0x'));

      console.log("Méthodes disponibles dans le contrat:", methods);

      // 8. Vérifier si removeBook existe
      if (!methods.includes('removeBook')) {
        return {
          success: false,
          issue: "La méthode 'removeBook' n'existe pas dans le contrat. Méthodes disponibles: " + methods.join(', ')
        };
      }
      console.log("✅ Méthode 'removeBook' trouvée dans le contrat");

      // 9. Vérifier les droits d'administration
      try {
        const adminAddress = await this.contract.methods.admin().call();
        console.log("Adresse admin du contrat:", adminAddress);
        console.log("Votre adresse:", this.account);

        if (adminAddress.toLowerCase() !== this.account.toLowerCase()) {
          return {
            success: false,
            issue: "Vous n'êtes pas l'administrateur du contrat"
          };
        }
        console.log("✅ L'utilisateur actuel est bien l'administrateur");
      } catch (adminError) {
        console.error("Erreur lors de la vérification des droits d'admin:", adminError);
        return { success: false, issue: "Impossible de vérifier les droits d'administrateur" };
      }

      // 10. Tester une estimation de gas pour removeBook
      try {
        // Utiliser un ID de livre fictif pour le test
        const testBookId = 999;
        const gasEstimate = await this.contract.methods.removeBook(testBookId).estimateGas({
          from: this.account
        });
        console.log("Estimation de gas pour removeBook:", gasEstimate);
        console.log("✅ L'estimation de gas a fonctionné (même si le livre n'existe pas)");
      } catch (gasError) {
        console.warn("Erreur d'estimation gas (normale si le livre n'existe pas):", gasError.message);
        // Ne pas échouer ici car l'erreur peut être normale si le livre de test n'existe pas
      }

      console.log("=== FIN DU DIAGNOSTIC ===");
      return {
        success: true,
        network: networkName,
        contractAddress,
        account: this.account,
        methods,
        isAdmin: true
      };
    } catch (error) {
      console.error("Erreur lors du diagnostic:", error);
      return { success: false, issue: "Erreur pendant le diagnostic: " + error.message };
    }
  }

  // Méthode alternative pour supprimer un livre en utilisant un proxy local
  async removeBookAlternative(bookId) {
    try {
      console.log(`Tentative de suppression alternative du livre ID:${bookId}`);

      // Vérification minimale
      if (!this.account) {
        throw new Error("Aucun compte connecté");
      }

      // Convertir l'ID en nombre
      const bookIdNumber = parseInt(bookId);
      if (isNaN(bookIdNumber) || bookIdNumber <= 0) {
        throw new Error("ID de livre invalide");
      }

      // Vérifier que le livre existe et n'est pas emprunté
      console.log(`Vérification de l'existence du livre ${bookIdNumber}...`);
      const book = await this.getBook(bookIdNumber).catch(() => null);

      if (!book) {
        throw new Error("Ce livre n'existe pas ou est inaccessible");
      }

      if (!book.isAvailable) {
        throw new Error("Ce livre est actuellement emprunté et ne peut pas être supprimé");
      }

      console.log("Livre vérifié et disponible pour suppression:", book.title);

      // Simuler une suppression en local
      // Enregistrer l'action dans localStorage pour synchronisation ultérieure
      try {
        const pendingDeletions = JSON.parse(localStorage.getItem("pendingBookDeletions") || "[]");
        pendingDeletions.push({
          bookId: bookIdNumber,
          title: book.title,
          author: book.author,
          timestamp: Date.now(),
          account: this.account
        });
        localStorage.setItem("pendingBookDeletions", JSON.stringify(pendingDeletions));

        console.log(`Livre ${bookIdNumber} marqué pour suppression différée`);

        // Déclencher un événement pour informer l'UI
        window.dispatchEvent(new CustomEvent('bookMarkedForDeletion', {
          detail: { bookId: bookIdNumber, title: book.title }
        }));

        return {
          success: true,
          method: "localProxy",
          pendingSync: true,
          message: "Le livre a été marqué pour suppression et sera synchronisé ultérieurement"
        };
      } catch (storageError) {
        console.error("Erreur lors de l'enregistrement dans localStorage:", storageError);
        throw new Error("Impossible d'enregistrer localement la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression alternative:", error);
      throw error;
    }
  }

  // Une autre méthode alternative qui utilise directement l'API Ethereum de base
  async removeBookDirect(bookId) {
    try {
      console.log(`Tentative de suppression directe du livre ID:${bookId}`);

      if (!window.ethereum || !this.account) {
        throw new Error("Ethereum ou compte non disponible");
      }

      // Convertir l'ID en nombre
      const bookIdNumber = parseInt(bookId);
      if (isNaN(bookIdNumber) || bookIdNumber <= 0) {
        throw new Error("ID de livre invalide");
      }

      // Obtenir l'ABI de la fonction removeBook
      const removeBookAbi = LibraryDAppABI.find(
        item => item.type === 'function' && item.name === 'removeBook'
      );

      if (!removeBookAbi) {
        throw new Error("Fonction removeBook non trouvée dans l'ABI");
      }

      // Encoder l'appel de fonction
      const functionData = this.web3.eth.abi.encodeFunctionCall(
        removeBookAbi, [bookIdNumber]
      );

      // Utiliser directement l'API ethereum de base
      console.log("Envoi de la transaction directe via window.ethereum...");

      const transactionParameters = {
        to: this.contract._address,
        from: this.account,
        data: functionData
        // Pas de gas ou gasPrice - MetaMask les déterminera
      };

      // Envoyer la transaction via l'API de base
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      console.log("Transaction directe envoyée:", txHash);

      return {
        success: true,
        transactionHash: txHash,
        method: "directEthereum"
      };
    } catch (error) {
      console.error("Erreur lors de la suppression directe:", error);
      throw error;
    }
  }

  // Solution finale: mode hors-ligne pour éviter complètement les problèmes MetaMask
  async hideBookLocally(bookId) {
    console.log(`Masquage local du livre avec ID: ${bookId}`);

    try {
      // Récupérer les données du livre avant de le masquer
      const book = await this.getBook(bookId);

      if (!book) {
        throw new Error(`Le livre avec l'ID ${bookId} n'existe pas ou n'a pas pu être récupéré`);
      }

      console.log(`Livre à masquer trouvé: ${book.title} (${book.id})`);

      // Récupérer les livres masqués actuels
      let hiddenBooks = [];
      try {
        const hiddenBooksJson = localStorage.getItem("hidden_books");
        if (hiddenBooksJson) {
          hiddenBooks = JSON.parse(hiddenBooksJson);
        }
      } catch (parseError) {
        console.warn("Erreur de parsing des livres masqués, réinitialisation:", parseError);
        hiddenBooks = [];
      }

      // Vérifier si le livre est déjà masqué
      const bookIdNum = Number(bookId);
      if (hiddenBooks.some(hb => Number(hb.id) === bookIdNum)) {
        console.log(`Le livre ${bookId} est déjà masqué`);
        return {
          success: true,
          message: "Ce livre est déjà masqué",
          alreadyHidden: true
        };
      }

      // Ajouter le livre aux masqués
      const hiddenBook = {
        id: bookIdNum,
        title: book.title,
        author: book.author,
        ipfsHash: book.ipfsHash,
        hiddenAt: new Date().toISOString(),
        hiddenBy: this.account || "unknown"
      };

      hiddenBooks.push(hiddenBook);

      // Sauvegarder dans localStorage
      localStorage.setItem("hidden_books", JSON.stringify(hiddenBooks));

      console.log(`Livre ${bookId} masqué avec succès, total: ${hiddenBooks.length}`);

      // Émettre un événement pour informer l'interface
      window.dispatchEvent(new CustomEvent('bookHidden', {
        detail: {
          bookId: bookId,
          title: book.title
        }
      }));

      // Après un masquage réussi, forcer un rafraîchissement de la liste
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshBooks'));
      }, 500);

      return {
        success: true,
        message: `Le livre "${book.title}" a été masqué avec succès`
      };
    } catch (error) {
      console.error("Erreur lors du masquage local:", error);
      throw new Error(`Impossible de masquer le livre: ${error.message}`);
    }
  }

  // Fonction pour vérifier si un livre est masqué localement
  isBookHiddenLocally(bookId) {
    try {
      const hiddenBooks = JSON.parse(localStorage.getItem("hidden_books") || "[]");
      return hiddenBooks.some(book => book.id === parseInt(bookId));
    } catch (error) {
      console.error("Erreur lors de la vérification des livres masqués:", error);
      return false;
    }
  }

  // Fonction pour nettoyer le cache local et annuler le masquage
  unhideBook(bookId) {
    try {
      const bookIdNumber = parseInt(bookId);
      const hiddenBooks = JSON.parse(localStorage.getItem("hiddenBooks") || "[]");
      const updatedList = hiddenBooks.filter(book => book.id !== bookIdNumber);
      localStorage.setItem("hiddenBooks", JSON.stringify(updatedList));

      // Déclencher un événement
      window.dispatchEvent(new CustomEvent('bookUnhidden', {
        detail: { bookId: bookIdNumber }
      }));

      return true;
    } catch (error) {
      console.error("Erreur lors du démasquage:", error);
      return false;
    }
  }

  /**
   * Restaure un livre précédemment masqué
   * @param {number} bookId - L'identifiant du livre à restaurer
   * @returns {Promise<boolean>} - Succès de l'opération
   */
  async restoreHiddenBook(bookId) {
    try {
      // S'assurer que le contrat est initialisé
      if (!this.contract) {
        await this.initialize();
      }

      // Convertir l'ID en nombre
      const id = parseInt(bookId, 10);
      if (isNaN(id)) {
        throw new Error("ID de livre invalide");
      }

      // Vérifier si le livre existe toujours dans le contrat
      const bookExists = await this.callContractMethod('bookExists', id);

      if (!bookExists) {
        // Livre déjà supprimé du contrat, on met juste à jour le localStorage
        console.log(`Le livre #${id} n'existe plus dans le contrat, mise à jour du stockage local uniquement`);
        return true;
      }

      // Vérifier si le livre est masqué
      const bookDetails = await this.callContractMethod('getBookById', id);
      if (!bookDetails || bookDetails.isHidden === false) {
        console.log(`Le livre #${id} n'est pas masqué ou n'existe pas`);
        return true; // On considère l'opération réussie car l'état final est celui désiré
      }

      // Restaurer le livre
      const receipt = await this.callContractMethod('unhideBook', id, {
        from: this.account,
        gas: 200000,
        gasPrice: this.defaultGasPrice
      });

      console.log(`Livre #${id} restauré avec succès`, receipt);

      // Emettre un événement pour informer d'autres composants
      const event = new CustomEvent('bookRestored', { detail: { bookId: id } });
      window.dispatchEvent(event);

      return true;
    } catch (error) {
      console.error("Erreur lors de la restauration du livre:", error);
      throw error;
    }
  }

  /**
   * Vérifie si un livre existe
   * @param {number} bookId - L'identifiant du livre
   * @returns {Promise<boolean>} - True si le livre existe
   */
  async bookExists(bookId) {
    try {
      // S'assurer que le contrat est initialisé
      if (!this.contract) {
        await this.initialize();
      }

      // Convertir l'ID en nombre
      const id = parseInt(bookId, 10);
      if (isNaN(id)) {
        return false;
      }

      // Appeler la méthode du contrat si elle existe
      if (this.contract.methods.bookExists) {
        return await this.callViewMethod('bookExists', [id]);
      }

      // Alternative: vérifier si on peut obtenir les détails du livre
      try {
        const bookDetails = await this.callViewMethod('getBookById', [id]);
        return !!bookDetails && bookDetails.title !== '';
      } catch (error) {
        console.log(`Erreur lors de la vérification du livre #${id}:`, error);
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'existence du livre:", error);
      return false;
    }
  }

  // Récupère tous les utilisateurs enregistrés (étudiants et professeurs)
  async getAllRegisteredUsers() {
    console.log("Récupération de tous les utilisateurs enregistrés");

    // Structure pour stocker les utilisateurs
    let allUsers = [];

    try {
      // Étape 1: Récupérer les adresses depuis localStorage
      let registeredAddresses = [];
      const storedUsers = localStorage.getItem('registeredUsers');
      if (storedUsers) {
        try {
          registeredAddresses = JSON.parse(storedUsers);
          console.log(`${registeredAddresses.length} adresses trouvées dans localStorage`);
        } catch (error) {
          console.warn("Erreur lors du parsing des utilisateurs dans localStorage:", error);
        }
      }

      // Étape 2: Récupérer les données détaillées pour chaque utilisateur
      for (const address of registeredAddresses) {
        try {
          const userDataString = localStorage.getItem(`user_${address.toLowerCase()}`);
          if (userDataString) {
            const userData = JSON.parse(userDataString);

            // Vérifier que les données contiennent les informations nécessaires
            if (userData && userData.address && (userData.role !== undefined)) {
              allUsers.push({
                address: userData.address,
                name: userData.name || 'Utilisateur sans nom',
                role: userData.role, // 0 = étudiant, 1 = professeur
                reputation: userData.reputation || 80,
                registrationTime: userData.registrationTime || 0
              });
            }
          }
        } catch (error) {
          console.warn(`Erreur lors de la récupération des données pour l'adresse ${address}:`, error);
        }
      }

      // Étape 3: Si le contrat est disponible, essayer de récupérer des données supplémentaires
      if (this.contract && this.contract.methods && this.contract.methods.getAllUsers) {
        try {
          console.log("Tentative de récupération des utilisateurs via le contrat");
          const contractUsers = await this.callViewMethod('getAllUsers', [], { gas: 8000000 });

          if (contractUsers && contractUsers.length > 0) {
            console.log(`${contractUsers.length} utilisateurs trouvés via le contrat`);

            // Traiter les utilisateurs retournés par le contrat
            for (const contractUser of contractUsers) {
              const userAddress = contractUser.userAddress || contractUser[0];
              const userName = contractUser.name || contractUser[1] || 'Sans nom';
              const userRole = contractUser.role !== undefined ? contractUser.role : contractUser[2];
              const userReputation = contractUser.reputation || contractUser[3] || 80;

              // Vérifier si cet utilisateur existe déjà dans notre liste
              const existingUserIndex = allUsers.findIndex(u =>
                u.address.toLowerCase() === userAddress.toLowerCase()
              );

              if (existingUserIndex >= 0) {
                // Mettre à jour les données existantes
                allUsers[existingUserIndex] = {
                  ...allUsers[existingUserIndex],
                  name: userName || allUsers[existingUserIndex].name,
                  role: userRole !== undefined ? userRole : allUsers[existingUserIndex].role,
                  reputation: userReputation || allUsers[existingUserIndex].reputation
                };
              } else {
                // Ajouter ce nouvel utilisateur
                allUsers.push({
                  address: userAddress,
                  name: userName,
                  role: userRole !== undefined ? userRole : 0,
                  reputation: userReputation || 80
                });
              }
            }
          }
        } catch (contractError) {
          console.warn("Erreur lors de la récupération des utilisateurs via le contrat:", contractError);
        }
      } else if (this.contract && this.contract.methods) {
        // Si getAllUsers n'existe pas, essayer de vérifier si isUserRegistered existe pour chaque adresse
        console.log("La méthode getAllUsers n'existe pas, vérification individuelle des utilisateurs");

        // Cette partie est plus lente car elle vérifie chaque utilisateur individuellement
        for (let i = 0; i < allUsers.length; i++) {
          const user = allUsers[i];
          try {
            if (this.contract.methods.isUserRegistered) {
              const isRegistered = await this.callViewMethod('isUserRegistered', [user.address]);
              if (!isRegistered) {
                console.log(`L'utilisateur ${user.address} n'est pas réellement inscrit selon le contrat`);
                // Nous conservons quand même l'utilisateur dans la liste pour le moment
              }
            }

            // Si getUserReputation existe, mettre à jour la réputation
            if (this.contract.methods.getUserReputation) {
              const reputation = await this.callViewMethod('getUserReputation', [user.address]);
              if (reputation) {
                allUsers[i].reputation = parseInt(reputation);
              }
            }
          } catch (error) {
            console.warn(`Erreur lors de la vérification de l'utilisateur ${user.address}:`, error);
          }
        }
      }

      // Tri par rôle (professeurs en premier, puis étudiants) et par nom
      allUsers.sort((a, b) => {
        // D'abord par rôle (professeurs avant étudiants)
        if (a.role !== b.role) {
          return b.role - a.role; // 1 (prof) avant 0 (étudiant)
        }
        // Puis par nom
        return (a.name || '').localeCompare(b.name || '');
      });

      console.log(`Total de ${allUsers.length} utilisateurs récupérés`);
      return allUsers;
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      return [];
    }
  }

  // Récupère uniquement les étudiants
  async getStudents() {
    const allUsers = await this.getAllRegisteredUsers();
    return allUsers.filter(user => user.role === 0);
  }

  // Récupère uniquement les professeurs
  async getProfessors() {
    const allUsers = await this.getAllRegisteredUsers();
    return allUsers.filter(user => user.role === 1);
  }
}

const web3Service = new Web3Service();
export default web3Service;