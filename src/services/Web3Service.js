import Web3 from 'web3';
import LibraryDAppABI from '../LibraryDAppABI.json';
import ipfsService from './IPFSService';

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
      1337: '0xef344c1FA4054a56651b8006587ab7AeE3BbDB3c', // Localhost 8545 (Ganache) - Adresse déployée
      5777: '0xef344c1FA4054a56651b8006587ab7AeE3BbDB3c'  // Ganache - Adresse déployée
    };
    
    // Cache local des utilisateurs inscrits
    this.userRegisteredCache = new Map();
    
    // Configuration par défaut pour les appels de contrat
    this.defaultGasLimit = 3000000; // Limite de gas par défaut élevée
    this.defaultGasPrice = 20000000000; // Prix du gas par défaut (20 Gwei)
    
    // Adresse par défaut pour le développement local
    this.contractAddress = '0xef344c1FA4054a56651b8006587ab7AeE3BbDB3c';
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
  async initialize() {
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
        
        // Récupérer les comptes avec un délai pour éviter les conflits
        await new Promise(resolve => setTimeout(resolve, 1000));
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          console.warn("Aucun compte autorisé");
          this.dispatchWeb3Event('no-accounts');
          return false;
        }
        
        this.account = accounts[0];
        console.log("Compte connecté:", this.account);
        
        // Obtenir l'ID du réseau
        const networkId = await this.web3.eth.net.getId();
        console.log("Réseau détecté:", networkId);
        
        // Vérifier le support du réseau
        if (!this.isNetworkSupported(networkId)) {
          console.warn("Réseau non supporté:", networkId);
          this.dispatchWeb3Event('wrong-network', { networkId });
          
          // Ajouter un délai avant de demander le changement de réseau
          setTimeout(() => {
            this.switchNetwork(1337); // Essayer de basculer vers Ganache
          }, 2000);
          
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
        
        // Configurer les écouteurs d'événements du contrat
        this.setupContractEventListeners();
        
        // Marquer comme initialisé
        this.initialized = true;
        console.log("Web3Service initialisé avec succès");
        
        // Déclencher l'événement connecté
        this.dispatchWeb3Event('connected', {
          account: this.account,
          networkId: networkId
        });
        
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
      '0xf9a82C631f7C03bb2DCA0435C982826621966e15'  // Nouvelle adresse
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

  async isUserRegistered(address = null) {
    try {
      // Vérifier si nous sommes initialisés et connectés
      if (!this.isInitialized() || !this.isConnected()) {
        await this.initialize();
      }

      // Utiliser l'adresse fournie ou l'adresse actuelle
      const userAddress = address || this.account;
      
      if (!userAddress) {
        console.error("Aucune adresse fournie ou compte non connecté");
        return false;
      }

      // Vérifier si le contrat est disponible
      if (!this.contract) {
        console.error("Contrat non disponible pour vérifier l'inscription");
        return false;
      }

      // Appeler la fonction du smart contract pour vérifier si l'utilisateur est enregistré
      const isRegistered = await this.callViewMethod('isUserRegistered', [userAddress]);
      
      // Ajouter un event si l'utilisateur change de compte et n'est pas enregistré
      if (address && address !== this.account && !isRegistered) {
        window.dispatchEvent(new CustomEvent('metamaskAccountChanged', { 
          detail: { 
            account: address,
            isRegistered: false
          } 
        }));
      }
      
      return isRegistered;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'enregistrement:", error);
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
      await this.tryInitializeContract(this.networkId);
      
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
    try {
      // S'assurer que bookId est un nombre
      const id = Number(bookId);
      if (isNaN(id) || id <= 0) {
        console.error("ID de livre invalide:", bookId);
        return null;
      }
      
      // Appeler la méthode du contrat pour obtenir les informations du livre
      const bookInfo = await this.callViewMethod('books', [id]);
      
      if (!bookInfo || !bookInfo.title) {
        console.warn(`Livre non trouvé ou données invalides pour l'ID ${id}`);
        return null;
      }
      
      // Récupérer si le livre est actuellement emprunté
      const isAvailable = await this.callViewMethod('isBookAvailable', [id]);
      
      // Récupérer les métadonnées supplémentaires depuis IPFS si disponible
      let metadata = {};
      
      if (bookInfo.ipfsHash) {
        try {
          console.log(`Tentative de récupération des métadonnées IPFS pour le hash: ${bookInfo.ipfsHash}`);
          // Récupérer les métadonnées depuis IPFS
          const ipfsGatewayUrl = `https://ipfs.io/ipfs/${bookInfo.ipfsHash}`;
          
          // Vérifier si la ressource existe
          const checkResponse = await fetch(ipfsGatewayUrl, { method: 'HEAD' });
          
          if (checkResponse.ok) {
            const contentType = checkResponse.headers.get('content-type');
            
            if (contentType && contentType.includes('json')) {
              // Si c'est un JSON, récupérer les métadonnées
              const response = await fetch(ipfsGatewayUrl);
              const data = await response.json();
              
              console.log("Métadonnées IPFS récupérées:", data);
              
              // Extraire les propriétés utiles
              metadata = {
                category: data.category || '',
                isbn: data.isbn || '',
                pageCount: data.pageCount ? parseInt(data.pageCount) : null,
                publishedDate: data.publishedDate || '',
                description: data.description || '',
                coverImageHash: data.coverImageHash || '',
                pdfHash: data.pdfHash || ''
              };
            }
          }
        } catch (ipfsError) {
          console.warn(`Erreur lors de la récupération des métadonnées IPFS pour le livre ${id}:`, ipfsError);
        }
      }
      
      // Formater et retourner les informations du livre
      return {
        id: id,
        title: bookInfo.title || '',
        author: bookInfo.author || '',
        ipfsHash: bookInfo.ipfsHash || '',
        isAvailable: isAvailable,
        // Intégrer les métadonnées supplémentaires si disponibles
        ...metadata
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération du livre ${bookId}:`, error);
      return null;
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
        await this.tryInitializeContract(this.networkId);
        
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

  // Surcharge de la méthode getBooks pour filtrer les livres masqués
  async getBooks() {
    try {
      console.log("Tentative de récupération des livres");
      
      // Vérifier si le service est initialisé
      if (!this.isInitialized()) {
        console.log("Service non initialisé, tentative d'initialisation...");
        await this.initialize();
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
      const hiddenBooks = JSON.parse(localStorage.getItem("hiddenBooks") || "[]");
      if (hiddenBooks.length === 0) {
        return books; // Pas de livres masqués, retourner la liste complète
      }
      
      const hiddenIds = hiddenBooks.map(book => book.id);
      console.log(`Filtrage de ${hiddenIds.length} livres masqués localement`);
      
      // Filtrer les livres masqués de la liste
      return books.filter(book => !hiddenIds.includes(parseInt(book.id)));
    } catch (error) {
      console.warn("Erreur lors du filtrage des livres masqués:", error);
      return books; // Retourner la liste originale en cas d'erreur
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
      
      // Récupérer les métadonnées complètes depuis IPFS
      console.log(`Récupération des métadonnées IPFS pour le livre ${bookId}: ${bookFromBlockchain.ipfsHash}`);
      const ipfsMetadata = await ipfsService.getBookMetadata(bookFromBlockchain.ipfsHash);
      
      if (!ipfsMetadata) {
        console.warn(`Impossible de récupérer les métadonnées IPFS pour le livre ${bookId}`);
        return bookFromBlockchain;
      }
      
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
      
      console.log(`Livre complet récupéré pour ID ${bookId}:`, completeBook);
      return completeBook;
    } catch (error) {
      console.error(`Erreur lors de la récupération complète du livre ${bookId}:`, error);
      return null;
    }
  }
  
  // Récupérer tous les livres avec leurs métadonnées IPFS
  async getAllLivres() {
    try {
      // Récupérer d'abord la liste de base des livres
      const basicBooks = await this.getBooks();
      
      if (!basicBooks || basicBooks.length === 0) {
        console.log("Aucun livre trouvé dans la blockchain");
        return [];
      }
      
      console.log(`Récupération des métadonnées complètes pour ${basicBooks.length} livres...`);
      
      // Pour chaque livre, récupérer les métadonnées complètes
      const completeBooks = await Promise.all(
        basicBooks.map(async (basicBook) => {
          return await this.getLivre(basicBook.id);
        })
      );
      
      // Filtrer les livres nuls (en cas d'erreur)
      const validBooks = completeBooks.filter(book => book !== null);
      
      console.log(`${validBooks.length} livres complets récupérés avec succès`);
      return validBooks;
    } catch (error) {
      console.error("Erreur lors de la récupération de tous les livres:", error);
      return [];
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
    try {
      console.log(`Mode hors-ligne: masquage local du livre ID:${bookId}`);
      
      // Convertir l'ID
      const bookIdNumber = parseInt(bookId);
      if (isNaN(bookIdNumber) || bookIdNumber <= 0) {
        throw new Error("ID de livre invalide");
      }
      
      // Obtenir les détails du livre
      let book = null;
      try {
        book = await this.getBook(bookIdNumber);
      } catch (error) {
        console.warn("Erreur lors de la récupération du livre, utilisation des données minimales", error);
      }
      
      // Créer l'entrée pour les livres masqués
      const hiddenBook = {
        id: bookIdNumber,
        title: book?.title || `Livre #${bookIdNumber}`,
        author: book?.author || "Inconnu",
        hiddenAt: new Date().toISOString(),
        hiddenBy: this.account,
        reason: "Masqué par l'administrateur en mode hors-ligne"
      };
      
      // Enregistrer dans localStorage
      try {
        // 1. Récupérer la liste actuelle des livres masqués
        const hiddenBooks = JSON.parse(localStorage.getItem("hiddenBooks") || "[]");
        
        // 2. Vérifier si ce livre est déjà masqué
        const existingIndex = hiddenBooks.findIndex(item => item.id === bookIdNumber);
        if (existingIndex >= 0) {
          hiddenBooks[existingIndex] = hiddenBook;
        } else {
          hiddenBooks.push(hiddenBook);
        }
        
        // 3. Sauvegarder la liste mise à jour
        localStorage.setItem("hiddenBooks", JSON.stringify(hiddenBooks));
        
        // 4. Déclencher un événement pour notifier l'UI
        window.dispatchEvent(new CustomEvent('bookHidden', {
          detail: { book: hiddenBook }
        }));
        
        console.log(`Livre ${bookIdNumber} masqué localement avec succès`);
        
        return {
          success: true,
          method: "offlineMode",
          hiddenBook,
          message: "Le livre a été masqué dans l'interface. La suppression blockchain sera effectuée plus tard."
        };
      } catch (storageError) {
        console.error("Erreur localStorage:", storageError);
        throw new Error("Impossible de masquer le livre localement");
      }
    } catch (error) {
      console.error("Erreur lors du masquage local:", error);
      throw error;
    }
  }
  
  // Fonction pour vérifier si un livre est masqué localement
  isBookHiddenLocally(bookId) {
    try {
      const hiddenBooks = JSON.parse(localStorage.getItem("hiddenBooks") || "[]");
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
}

const web3Service = new Web3Service();
export default web3Service;