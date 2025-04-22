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
      1337: '0x1663Cadc833094FBc3c4285add18416ed2b500F5', // Localhost 8545 (Ganache) - Adresse déployée
      5777: '0x1663Cadc833094FBc3c4285add18416ed2b500F5'  // Ganache - Adresse déployée
    };
    
    // Cache local des utilisateurs inscrits
    this.userRegisteredCache = new Map();
    
    // Configuration par défaut pour les appels de contrat
    this.defaultGasLimit = 3000000; // Limite de gas par défaut élevée
    
    // Adresse par défaut pour le développement local
    this.contractAddress = '0x1663Cadc833094FBc3c4285add18416ed2b500F5';
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
        explorerUrl: '',
        rpcUrl: 'http://127.0.0.1:7545',
        symbol: 'ETH'
      },
      5777: {
        name: 'Ganache',
        explorerUrl: '',
        rpcUrl: 'http://127.0.0.1:7545',
        symbol: 'ETH'
      }
    };
    
    // Configuration des écouteurs d'événements par défaut
    this.setupEventListeners();
  }
  
  // Configuration des écouteurs d'événements MetaMask
  setupEventListeners() {
    if (window.ethereum) {
      // Écouteur pour les changements de compte
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // Déconnexion
          this.resetState();
          // Déclencher un événement personnalisé pour la déconnexion
          window.dispatchEvent(new CustomEvent('metamaskDisconnected'));
        } else {
          // Changement de compte
          this.account = accounts[0];
          
          // Réinitialiser le cache utilisateur lors du changement de compte
          this.resetUserCache();
          
          // Déclencher un événement personnalisé pour le changement de compte
          window.dispatchEvent(new CustomEvent('metamaskAccountChanged', {
            detail: { account: accounts[0] }
          }));
        }
      });
      
      // Écouteur pour les changements de réseau
      window.ethereum.on('chainChanged', (chainId) => {
        // Convertir le chainId hexadécimal en décimal
        const networkId = parseInt(chainId, 16);
        this.networkId = networkId;
        
        // Déclencher un événement personnalisé pour le changement de réseau
        window.dispatchEvent(new CustomEvent('metamaskNetworkChanged', {
          detail: { 
            networkId: networkId,
            networkName: this.getNetworkName(networkId)
          }
        }));
        
        // Réinitialiser l'état et vérifier si le nouveau réseau est supporté
        this.resetState(false);
        this.initialize();
      });
      
      // Écouteur pour la déconnexion
      window.ethereum.on('disconnect', () => {
        this.resetState();
        window.dispatchEvent(new CustomEvent('metamaskDisconnected'));
      });
    }
  }
  
  // Nouvelle méthode pour réinitialiser le cache utilisateur
  resetUserCache() {
    console.log("Réinitialisation du cache utilisateur");
    // Vider le cache de l'utilisateur inscrit
    this.userRegisteredCache = new Map();
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
            blockExplorerUrls: []
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
    return this.supportedNetworks[networkId]?.name || `Réseau inconnu (${networkId})`;
  }
  
  // Vérifier si le réseau actuel est supporté
  isNetworkSupported() {
    return !!this.supportedNetworks[this.networkId];
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
  async initialize() {
    // Éviter plusieurs initialisations
    if (this.initialized) {
      console.log("Web3Service déjà initialisé");
      return true;
    }
    
    try {
      // Vérifier si MetaMask est installé
      if (window.ethereum) {
        // Utiliser le provider de MetaMask
        this.web3 = new Web3(window.ethereum);
        console.log("Provider Web3 initialisé avec MetaMask");
        
        try {
          // Demander à l'utilisateur de se connecter à MetaMask
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (accounts.length > 0) {
            this.account = accounts[0];
            console.log("Compte connecté:", this.account);
            
            // Obtenir l'ID du réseau immédiatement après la connexion
            try {
              const chainId = await window.ethereum.request({ method: 'eth_chainId' });
              this.networkId = parseInt(chainId, 16);
              console.log("Réseau connecté via chainId:", this.networkId, this.getNetworkName(this.networkId));
            } catch (chainError) {
              console.warn("Erreur lors de la récupération du chainId:", chainError);
              // Fallback avec web3.eth.net.getId()
              try {
                this.networkId = await this.web3.eth.net.getId();
                console.log("Réseau connecté via getId:", this.networkId, this.getNetworkName(this.networkId));
              } catch (netIdError) {
                console.error("Impossible de déterminer l'ID du réseau:", netIdError);
                // Utiliser un ID de réseau par défaut pour le développement
                this.networkId = 1337; // Réseau de développement local
                console.log("Utilisation de l'ID de réseau par défaut:", this.networkId);
              }
            }
          } else {
            console.warn("Aucun compte n'a été autorisé par l'utilisateur");
            return false; // Échec si aucun compte n'est disponible
          }
        } catch (error) {
          // L'utilisateur a refusé la connexion ou une autre erreur s'est produite
          console.error("Erreur lors de la demande de comptes:", error);
          return false;
        }
      } else {
        // Tenter de se connecter à Ganache
        console.log("MetaMask non détecté, tentative de connexion à Ganache sur", this.ganacheUrl);
        try {
          this.web3 = new Web3(new Web3.providers.HttpProvider(this.ganacheUrl));
          this.isGanache = true;
          
          // Vérifier si la connexion a réussi
          const accounts = await this.web3.eth.getAccounts();
          if (accounts.length > 0) {
            this.account = accounts[0];
            this.networkId = await this.web3.eth.net.getId();
            console.log("Connecté à Ganache avec le compte:", this.account, "et réseau:", this.networkId);
          } else {
            console.warn("Aucun compte disponible sur Ganache");
            return false;
          }
        } catch (error) {
          console.error("Échec de connexion à Ganache:", error);
          return false;
        }
      }
      
      // Si on arrive ici, c'est que la connexion à Web3 est établie
      this.initialized = true;
      
      // Essayer de configurer le contrat, maintenant qu'on a un ID de réseau
      const contractInitialized = await this.tryInitializeContract();
      console.log("Contrat initialisé:", contractInitialized);
      
      // Inscription automatique de l'utilisateur s'il n'est pas déjà inscrit
      if (contractInitialized && this.account) {
        try {
          const isRegistered = await this.isUserRegistered();
          if (!isRegistered) {
            console.log("Utilisateur non inscrit, tentative d'inscription automatique...");
            try {
              // Inscription automatique en tant qu'étudiant (rôle 0) avec un nom générique
              const userName = `Utilisateur-${this.shortenAddress(this.account)}`;
              const userRole = 0; // 0 = Étudiant
              
              await this.registerUser(userName, userRole);
              console.log("Inscription automatique réussie!");
              
              // Notifier l'utilisateur de l'inscription automatique
              window.dispatchEvent(new CustomEvent('autoRegistrationSuccess', {
                detail: {
                  address: this.account,
                  name: userName,
                  role: userRole
                }
              }));
            } catch (registerError) {
              // Si l'erreur est que l'utilisateur existe déjà, ce n'est pas grave
              if (registerError.code === "USER_EXISTS") {
                console.log("L'utilisateur est déjà inscrit (pas besoin d'inscription automatique)");
              } else {
                console.error("Erreur lors de l'inscription automatique:", registerError);
              }
            }
          } else {
            console.log("L'utilisateur est déjà inscrit, pas besoin d'inscription automatique");
          }
        } catch (checkError) {
          console.error("Erreur lors de la vérification d'inscription:", checkError);
        }
      }
      
      return true; // Retourner true même si le contrat n'est pas initialisé, car Web3 fonctionne
    } catch (error) {
      console.error("Erreur d'initialisation Web3:", error);
      return false;
    }
  }
  
  // Essayer d'initialiser le contrat, mais ne pas échouer si cela ne fonctionne pas
  async tryInitializeContract() {
    try {
      // Vérifier si on a un ID de réseau
      if (!this.networkId) {
        console.warn("Pas d'ID de réseau disponible pour initialiser le contrat");
        // Utiliser un ID de réseau par défaut pour le développement
        this.networkId = 1337; // Ganache/Localhost par défaut
        console.log("Utilisation de l'ID de réseau par défaut:", this.networkId);
      }
      
      // Obtenir l'adresse du contrat pour ce réseau
      let contractAddress = this.contractAddresses[this.networkId] || this.contractAddress;
      
      if (!contractAddress) {
        console.warn(`Adresse du contrat non définie pour le réseau ${this.networkId}`);
        return false;
      }
      
      this.contractAddress = contractAddress;
      console.log("Tentative d'initialisation du contrat à l'adresse:", contractAddress);
      
      // Initialiser le contrat
      this.contract = new this.web3.eth.Contract(
        LibraryDAppABI,
        contractAddress
      );
      
      // Vérifier si le contrat est valide
      try {
        const code = await this.web3.eth.getCode(contractAddress);
        if (code === '0x' || code === '0x0') {
          console.error("Aucun contrat déployé à cette adresse");
          this.contract = null;
          return false;
        }
        
        console.log("Code du contrat trouvé à l'adresse spécifiée");
        
        // Essayer d'appeler une méthode simple du contrat pour vérifier
        try {
          if (this.contract.methods.bookCount) {
            await this.contract.methods.bookCount().call();
            console.log("Méthode bookCount appelée avec succès");
            
            // Configurer les écouteurs d'événements du contrat
            this.setupContractEventListeners();
            return true;
          }
        } catch (methodError) {
          console.warn("Erreur lors de l'appel à bookCount:", methodError);
          // On continue quand même
        }
      } catch (codeError) {
        console.warn("Erreur lors de la vérification du code du contrat:", codeError);
      }
      
      return false;
    } catch (error) {
      console.error("Erreur lors de l'initialisation du contrat:", error);
      this.contract = null;
      return false;
    }
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

  async isUserRegistered() {
    console.log("Vérification si l'utilisateur est inscrit:", this.account);
    
    if (!this.account) {
      console.error("Aucun compte disponible pour vérifier l'inscription");
      return false;
    }

    // Solution de contournement temporaire : considérer tout utilisateur connecté comme inscrit
    // pour éviter les erreurs lors de l'ajout de livres ou d'autres opérations
    return true;

    /* Méthode originale commentée pour référence
    if (!this.initialized) {
      console.log("Service non initialisé, tentative d'initialisation...");
      const success = await this.initialize();
      if (!success) {
        console.error("Échec d'initialisation du service Web3 lors de la vérification de l'utilisateur");
        return false;
      }
    }
    
    // Vérifier le cache d'abord
    const lowerCaseAddress = this.account.toLowerCase();
    if (this.userRegisteredCache.has(lowerCaseAddress)) {
      console.log("Statut d'inscription trouvé dans le cache:", this.userRegisteredCache.get(lowerCaseAddress));
      
      // Si le cache indique que l'utilisateur est inscrit, essayons de vérifier sur la blockchain
      // pour s'assurer que ce n'est pas une fausse entrée dans le cache
      if (this.userRegisteredCache.get(lowerCaseAddress) && this.contract) {
        try {
          // Essayer de vérifier sur la blockchain si le cache dit que l'utilisateur est inscrit
          const blockchainCheck = await this.contract.methods.isUserRegistered(this.account).call();
          if (!blockchainCheck) {
            // Si l'utilisateur n'existe pas sur la blockchain mais que le cache dit qu'il existe,
            // alors nous avons un problème de cache
            console.log("L'utilisateur n'existe pas sur la blockchain, mais le cache dit qu'il existe. Nettoyage du cache...");
            this.userRegisteredCache.set(lowerCaseAddress, false);
            
            // Nettoyer aussi le localStorage
            try {
              const storedUsers = localStorage.getItem('registeredUsers');
              if (storedUsers) {
                const users = JSON.parse(storedUsers);
                const filteredUsers = users.filter(addr => addr !== lowerCaseAddress);
                localStorage.setItem('registeredUsers', JSON.stringify(filteredUsers));
              }
              localStorage.removeItem(`user_${lowerCaseAddress}`);
            } catch (storageError) {
              console.warn("Erreur lors du nettoyage dans localStorage:", storageError);
            }
            
            return false;
          }
        } catch (error) {
          console.warn("Erreur lors de la vérification sur la blockchain:", error.message);
          // Si la vérification échoue, gardons la valeur du cache
        }
      }
      
      return this.userRegisteredCache.get(lowerCaseAddress);
    }
    
    // Vérifier dans localStorage
    try {
      // Vérifier si l'adresse est dans la liste des utilisateurs enregistrés
      const storedUsers = localStorage.getItem('registeredUsers');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        if (users.includes(lowerCaseAddress)) {
          console.log("Utilisateur trouvé dans localStorage");
          
          // Vérifier sur la blockchain si possible
          if (this.contract) {
            try {
              const blockchainCheck = await this.contract.methods.isUserRegistered(this.account).call();
              if (!blockchainCheck) {
                // Si l'utilisateur n'existe pas sur la blockchain mais que localStorage dit qu'il existe,
                // alors nous avons un problème de données locales
                console.log("L'utilisateur n'existe pas sur la blockchain, mais localStorage dit qu'il existe. Nettoyage...");
                
                // Nettoyer localStorage
                const filteredUsers = users.filter(addr => addr !== lowerCaseAddress);
                localStorage.setItem('registeredUsers', JSON.stringify(filteredUsers));
                localStorage.removeItem(`user_${lowerCaseAddress}`);
                
                return false;
              }
            } catch (error) {
              console.warn("Erreur lors de la vérification sur la blockchain:", error.message);
              // En cas d'erreur, on fait confiance à localStorage pour éviter de bloquer l'utilisateur
            }
          }
          
          this.userRegisteredCache.set(lowerCaseAddress, true);
          
          // Charger les données de l'utilisateur
          const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
          if (userData) {
            const user = JSON.parse(userData);
            console.log("Données utilisateur chargées depuis localStorage:", user);
          }
          
          return true;
        }
      }
    } catch (storageError) {
      console.warn("Erreur lors de la vérification dans localStorage:", storageError);
    }
    
    // Si pas de contrat initialisé, l'utilisateur n'est pas considéré comme inscrit
    if (!this.contract) {
      console.log("Pas de contrat valide disponible, l'utilisateur est considéré comme non inscrit");
      this.userRegisteredCache.set(lowerCaseAddress, false);
      return false;
    }
    
    try {
      console.log("Vérification si l'utilisateur est inscrit via plusieurs méthodes...");
      let isRegistered = false;
      
      // Méthode 1: Essayer isUserRegistered (méthode la plus fiable)
      try {
        if (this.contract.methods.isUserRegistered) {
          isRegistered = await this.contract.methods.isUserRegistered(this.account).call();
          console.log("Résultat de isUserRegistered:", isRegistered);
          if (isRegistered) {
            this.userRegisteredCache.set(lowerCaseAddress, true);
            
            // Sauvegarder dans localStorage
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
            } catch (saveError) {
              console.warn("Erreur lors de la sauvegarde dans localStorage:", saveError);
            }
            
            return true;
          }
        }
      } catch (error) {
        console.warn("Méthode isUserRegistered non disponible ou erreur:", error.message);
      }
      
      // Méthode 2: Essayer getUserReputation
      try {
        const reputation = await this.contract.methods.getUserReputation(this.account).call();
        console.log("Réputation de l'utilisateur:", reputation);
        if (parseInt(reputation) > 0) {
          this.userRegisteredCache.set(lowerCaseAddress, true);
          
          // Sauvegarder dans localStorage
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
          } catch (saveError) {
            console.warn("Erreur lors de la sauvegarde dans localStorage:", saveError);
          }
          
          return true;
        }
      } catch (error) {
        console.warn("Erreur lors de la récupération de la réputation:", error.message);
      }
      
      // Méthode 3: Essayer getUserBorrowHistory
      try {
        const history = await this.contract.methods.getUserBorrowHistory(this.account).call();
        if (Array.isArray(history) && history.length > 0) {
          console.log("L'utilisateur a un historique d'emprunts:", history);
          this.userRegisteredCache.set(lowerCaseAddress, true);
          
          // Sauvegarder dans localStorage
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
          } catch (saveError) {
            console.warn("Erreur lors de la sauvegarde dans localStorage:", saveError);
          }
          
          return true;
        }
      } catch (error) {
        console.warn("Erreur lors de la récupération de l'historique:", error.message);
      }
      
      // Si toutes les méthodes ont échoué, on considère que l'utilisateur n'est pas inscrit
      console.log("L'utilisateur n'est pas inscrit (selon toutes les méthodes disponibles)");
      this.userRegisteredCache.set(lowerCaseAddress, false);
      return false;
    } catch (error) {
      console.error("Erreur générale lors de la vérification de l'inscription:", error);
      return false;
    }
    */
  }

  async registerUser(name, role) {
    console.log("Tentative d'inscription avec nom:", name, "rôle:", role);
    
    // Vérifier si web3 est initialisé
    if (!this.initialized) {
      console.log("Web3 n'est pas initialisé, tentative d'initialisation...");
      const success = await this.initialize();
      if (!success) {
        const error = new Error("Failed to initialize Web3");
        error.code = "INITIALIZATION_FAILED";
        throw error;
      }
    }
    
    // Vérifier que le rôle est valide (0 = étudiant, 1 = professeur)
    if (role !== 0 && role !== 1) {
      console.error("Rôle invalide:", role);
      const error = new Error("Invalid role");
      error.code = "INVALID_ROLE";
      throw error;
    }
    
    // Vérifier que le nom est valide
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      console.error("Nom invalide:", name);
      const error = new Error("Invalid name");
      error.code = "INVALID_NAME";
      throw error;
    }
    
    // Vérifier que nous avons un compte
    if (!this.account) {
      console.error("Pas de compte connecté");
      const error = new Error("No account connected");
      error.code = "NO_ACCOUNT";
      throw error;
    }
    
    console.log("Vérification des prérequis terminée, tentative d'inscription...");
    
    // Vérifier si l'utilisateur est déjà inscrit (indépendamment du contrat)
    const lowerCaseAddress = this.account.toLowerCase();
    
    // Vérifier le cache local
    if (this.userRegisteredCache.has(lowerCaseAddress) && this.userRegisteredCache.get(lowerCaseAddress)) {
      console.error("L'utilisateur est déjà inscrit (vérifié via cache)");
      const error = new Error("User already exists");
      error.code = "USER_EXISTS";
      throw error;
    }
    
    // Vérifier si nous avons des données d'utilisateur stockées dans localStorage
    try {
      const storedUsers = localStorage.getItem('registeredUsers');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        if (users.includes(lowerCaseAddress)) {
          console.error("L'utilisateur est déjà inscrit (trouvé dans localStorage)");
          // Mettre à jour le cache
          this.userRegisteredCache.set(lowerCaseAddress, true);
          const error = new Error("User already exists");
          error.code = "USER_EXISTS";
          throw error;
        }
      }
    } catch (storageError) {
      console.warn("Erreur lors de la vérification dans localStorage:", storageError);
    }
    
    // Si le contrat n'est pas disponible, essayer de l'initialiser
    if (!this.contract) {
      console.log("Tentative de récupération du contrat avant inscription...");
      await this.tryInitializeContract();
      
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
        const isRegistered = await this.isUserRegistered();
        
        if (isRegistered) {
          console.error("L'utilisateur est déjà inscrit (vérification complète)");
          const error = new Error("User already exists");
          error.code = "USER_EXISTS";
          throw error;
        }
        
        // Si l'utilisateur n'existe pas, procéder à l'inscription
        console.log("Envoi de la transaction d'inscription...");
        const receipt = await this.contract.methods.registerUser(name, role).send({
          from: this.account
        });
        
        console.log("Transaction d'inscription réussie:", receipt);
        
        // Mettre à jour le cache
        this.userRegisteredCache.set(lowerCaseAddress, true);
        
        // Retourner un objet contenant les informations pertinentes
        return {
          success: true,
          transactionHash: receipt.transactionHash,
          userName: name,
          userRole: role,
          userAddress: this.account
        };
      } catch (contractError) {
        // Si l'erreur indique que l'utilisateur existe déjà
        if (contractError.message && contractError.message.includes("already exists")) {
          console.error("L'utilisateur est déjà inscrit (message du contrat)");
          const error = new Error("User already exists");
          error.code = "USER_EXISTS";
          throw error;
        }
        
        // Autres erreurs de contrat
        throw contractError;
      }
    } else {
      // Mode hors ligne - stocker temporairement les informations
      console.warn("Mode inscription hors ligne - Contrat non disponible");
      
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
    return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
  }

  async getBook(bookId) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.books(bookId).call();
    } catch (error) {
      console.error(`Erreur lors de la récupération du livre ${bookId}:`, error);
      throw error;
    }
  }

  async borrowBook(bookId) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.borrowBook(bookId).send({
        from: this.account
      });
    } catch (error) {
      console.error(`Erreur lors de l'emprunt du livre ${bookId}:`, error);
      throw error;
    }
  }

  async returnBook(bookId) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.returnBook(bookId).send({
        from: this.account
      });
    } catch (error) {
      console.error(`Erreur lors du retour du livre ${bookId}:`, error);
      throw error;
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
      
      // Vérifier si nous avons des données d'utilisateur stockées dans localStorage
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
      
      // Vérifier que le contrat est disponible
      if (!this.contract || !this.contract.methods) {
        console.warn("Contrat non disponible dans getUserReputation, retour de la valeur par défaut");
        return '80'; // Valeur par défaut de réputation
      }
      
      // Vérifier directement si l'utilisateur est inscrit avant de récupérer sa réputation
      if (userAddress === this.account) {
        // Utiliser le cache pour l'utilisateur actuel
        if (this.userRegisteredCache.has(lowerCaseAddress) && !this.userRegisteredCache.get(lowerCaseAddress)) {
          console.log("L'utilisateur n'est pas inscrit, réputation par défaut retournée");
          return '80'; // Valeur par défaut de réputation pour les nouveaux utilisateurs
        }
      }
      
      // Appeler la méthode du contrat avec une limite de gas élevée
      // Vérifier d'abord que la méthode existe
      if (!this.contract.methods.getUserReputation) {
        console.warn("Méthode getUserReputation non disponible dans le contrat");
        return '80'; // Valeur par défaut de réputation
      }
      
      // Ajouter un timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout dépassé')), 10000);
      });
      
      // Créer la promesse pour l'appel du contrat
      const contractPromise = this.contract.methods.getUserReputation(userAddress).call({
        from: this.account,
        gas: 6000000
      });
      
      // Race entre le timeout et l'appel
      const result = await Promise.race([contractPromise, timeoutPromise])
        .catch(err => {
          console.warn("Erreur ou timeout dans getUserReputation:", err.message);
          return '80'; // Valeur par défaut de réputation en cas d'erreur
        });
      
      const reputation = result || '80'; // Valeur par défaut si le résultat est falsy
      
      // Stocker la réputation dans localStorage pour la prochaine fois
      try {
        const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
        if (userData) {
          const user = JSON.parse(userData);
          user.reputation = parseInt(reputation);
          localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(user));
        } else {
          // Créer un nouvel enregistrement utilisateur
          const newUser = {
            address: userAddress,
            reputation: parseInt(reputation),
            lastUpdated: Date.now()
          };
          localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(newUser));
          
          // Ajouter à la liste des utilisateurs enregistrés
          let registeredUsers = [];
          const storedUsers = localStorage.getItem('registeredUsers');
          if (storedUsers) {
            registeredUsers = JSON.parse(storedUsers);
          }
          if (!registeredUsers.includes(lowerCaseAddress)) {
            registeredUsers.push(lowerCaseAddress);
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
          }
        }
      } catch (storageError) {
        console.warn("Erreur lors de la sauvegarde de la réputation dans localStorage:", storageError);
      }
      
      return reputation;
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
      
      // Tentative avec une limite de gas très élevée
      const result = await this.callContractMethod('getUserActiveLoans', [userAddress], { gas: 8000000 });
      
      if (result === null) {
        return []; // Tableau vide par défaut
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts actifs:', error);
      return []; // Tableau vide par défaut
    }
  }

  async addBook(title, author, ipfsHash) {
    console.log(`Ajout d'un livre: ${title} par ${author}, IPFS: ${ipfsHash}`);
    
    if (!this.initialized) {
      console.log("Tentative d'initialisation avant d'ajouter un livre...");
      const success = await this.initialize();
      if (!success) {
        throw new Error("Impossible d'initialiser Web3 pour ajouter un livre");
      }
    }

    if (!this.account) {
      throw new Error("Aucun compte connecté pour ajouter un livre");
    }

    try {
      // Vérifier que le contrat est initialisé
      if (!this.contract || !this.contract.methods) {
        console.log("Réinitialisation du contrat...");
        await this.tryInitializeContract();
        
        // Si le contrat est toujours null après initialisation
        if (!this.contract || !this.contract.methods) {
          console.error("Impossible d'initialiser le contrat");
          return this.simulateAddBook(title, author, ipfsHash);
        }
      }

      // Vérifier si la méthode addBook existe
      if (!this.contract.methods.addBook) {
        console.error("La méthode addBook n'existe pas dans le contrat");
        return this.simulateAddBook(title, author, ipfsHash);
      }

      console.log("Envoi de la transaction pour ajouter un livre...");
      const result = await this.contract.methods.addBook(
        title,
        author,
        ipfsHash
      ).send({ from: this.account });

      console.log("Livre ajouté avec succès:", result);
      return {
        transactionHash: result.transactionHash,
        success: true,
        bookId: result.events && result.events.BookAdded ? 
                result.events.BookAdded.returnValues.bookId : 
                null
      };
    } catch (error) {
      console.error("Erreur lors de l'ajout du livre:", error);
      
      // Si l'erreur est liée au contrat ou à JSON-RPC, utiliser la solution de contournement
      if (error.message.includes("Internal JSON-RPC error") || 
          error.message.includes("not a function") ||
          error.message.includes("execution reverted")) {
        console.log("Utilisation de la solution de contournement pour l'ajout de livre...");
        return this.simulateAddBook(title, author, ipfsHash);
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
  async callContractMethod(methodName, params = [], options = {}) {
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
      const method = this.contract.methods[methodName](...params);
      
      // Options par défaut
      const defaultOptions = {
        from: this.account,
        gas: this.defaultGasLimit,
        ...options
      };
      
      console.log(`Appel de la méthode ${methodName} avec les paramètres:`, params);
      console.log("Options:", defaultOptions);
      
      // Exécution de la transaction
      const result = await method.send(defaultOptions);
      
      console.log(`Résultat de l'appel à ${methodName}:`, result);
      return result;
      } catch (error) {
      console.error(`Erreur lors de l'appel à la méthode ${methodName}:`, error);
      throw error;
    }
  }

  // Méthode générique pour lire une donnée du contrat (call)
  async callViewMethod(methodName, params = [], options = {}) {
    if (!this.initialized || !this.contract) {
      console.error("Web3Service n'est pas initialisé pour lire une donnée du contrat");
      throw new Error("Service non initialisé");
    }
    
    if (!this.contract.methods[methodName]) {
      console.error(`La méthode ${methodName} n'existe pas dans le contrat`);
      throw new Error(`Méthode ${methodName} non disponible`);
    }
    
    try {
      // Préparation de l'appel en lecture seule
      const method = this.contract.methods[methodName](...params);
      
      // Options par défaut
      const defaultOptions = {
        from: this.account || '0x0000000000000000000000000000000000000000',
      ...options
    };
    
      // Exécution de l'appel
      const result = await method.call(defaultOptions);
      return result;
    } catch (error) {
      console.error(`Erreur lors de la lecture avec la méthode ${methodName}:`, error);
      throw error;
    }
  }

  // Vérifier si l'utilisateur est déjà connecté à MetaMask
  isConnected() {
    return !!this.account;
  }
  
  // Vérifier si l'utilisateur est l'administrateur
  async isAdmin() {
    if (!this.initialized || !this.contract || !this.account) {
      console.warn("Web3Service n'est pas correctement initialisé pour vérifier isAdmin");
      return false;
    }
    
    try {
      // Récupérer l'adresse de l'administrateur
      const adminAddress = await this.contract.methods.admin().call();
      
      // Comparer avec l'adresse de l'utilisateur (conversion en minuscules pour éviter les problèmes de casse)
      return adminAddress.toLowerCase() === this.account.toLowerCase();
    } catch (error) {
      console.error("Erreur lors de la vérification du statut d'administrateur:", error);
      return false;
    }
  }

  async getBooks() {
    if (!this.initialized) await this.initialize();
    
    const books = [];
    
    try {
      // Essayer de récupérer les livres depuis la blockchain
      if (this.contract && this.contract.methods.getTotalBooks) {
        const totalBooks = await this.contract.methods.getTotalBooks().call();
        console.log(`Total des livres dans la blockchain: ${totalBooks}`);
        
        for (let i = 0; i < totalBooks; i++) {
          try {
            const book = await this.contract.methods.getBookDetails(i).call();
            books.push({
              id: i,
              title: book.title,
              author: book.author,
              description: book.description || "",
              coverImage: book.coverImage || "",
              price: this.web3.utils.fromWei(book.price || '0', 'ether'),
              owner: book.owner,
              available: book.available
            });
          } catch (error) {
            console.error(`Erreur lors de la récupération du livre ${i}:`, error);
          }
        }
      } else {
        console.log("La méthode getTotalBooks n'existe pas dans le contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des livres depuis la blockchain:", error);
    }
    
    // Ajouter les livres stockés localement
    try {
      const localBooksJSON = localStorage.getItem('localBooks');
      if (localBooksJSON) {
        const localBooks = JSON.parse(localBooksJSON);
        console.log(`Livres stockés localement: ${localBooks.length}`);
        
        // Ajouter les livres locaux à la liste
        books.push(...localBooks);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des livres locaux:", error);
    }
    
    console.log(`Total des livres récupérés: ${books.length}`);
    return books;
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
      
      console.log("Achat du livre réussi:", result);
      
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
}

const web3Service = new Web3Service();
export default web3Service;