import Web3 from 'web3';
import LibraryDAppABI from '../LibraryDAppABI.json';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.networkId = null;
    this.contractAddress = '0x9d13fF116CCdd5D1dC44aa07131bf7e5487003F6'; // Adresse du contrat déployé
    this.initialized = false;
    this.isGanache = false;
    this.ganacheUrl = 'http://127.0.0.1:7545';
    
    // Réseaux supportés
    this.supportedNetworks = {
      // Ethereum Mainnet
      1: {
        name: 'Ethereum Mainnet',
        explorerUrl: 'https://etherscan.io'
      },
      // Goerli Testnet
      5: {
        name: 'Goerli Testnet',
        explorerUrl: 'https://goerli.etherscan.io'
      },
      // Sepolia
      11155111: {
        name: 'Sepolia',
        explorerUrl: 'https://sepolia.etherscan.io'
      },
      // Local Networks
      1337: {
        name: 'Localhost 8545',
        explorerUrl: ''
      },
      5777: {
        name: 'Ganache',
        explorerUrl: ''
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
  
  // Réinitialiser l'état du service
  resetState(resetAccount = true) {
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
    
    // Vérifier les anciens navigateurs qui utilisent encore web3
    if (window.web3 && window.web3.currentProvider) {
      console.log("Provider legacy détecté via window.web3");
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
    // Si déjà initialisé, retourner immédiatement
    if (this.initialized) return true;
    
    console.log("Tentative d'initialisation Web3");
    
    try {
      // Vérifier si MetaMask ou un autre provider Ethereum est installé
      if (window.ethereum) {
        console.log("Utilisation du provider window.ethereum");
        this.web3 = new Web3(window.ethereum);
        
        try {
          console.log("Demande d'accès aux comptes...");
          // Tentative simplifiée - méthode standard
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          console.log("Comptes reçus:", accounts);
          
          if (!accounts || accounts.length === 0) {
            console.error("Aucun compte autorisé");
            return false;
          }
          
          this.account = accounts[0];
          
          // Essayer d'obtenir l'ID du réseau, mais ne pas échouer si cela ne fonctionne pas
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.networkId = parseInt(chainId, 16);
            console.log("Réseau détecté:", this.networkId);
          } catch (networkError) {
            console.warn("Impossible de détecter le réseau:", networkError);
            // Continuer quand même
          }
          
          // Initialiser le contrat avec l'adresse fournie
          console.log("Initialisation du contrat à l'adresse:", this.contractAddress);
          
          // Vérification que l'adresse du contrat n'est pas un placeholder
          if (this.contractAddress.includes('...')) {
            console.error("L'adresse du contrat est toujours un placeholder:", this.contractAddress);
            return false;
          }
          
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
          
          console.log("Contrat initialisé avec succès");
          this.initialized = true;
          return true;
        } catch (error) {
          console.error("Erreur lors de la demande d'accès aux comptes:", error);
          
          // Si l'erreur est liée au refus de la demande, fournir un message spécifique
          if (error.code === 4001) {
            console.error("L'utilisateur a refusé la connexion");
          } else {
            console.error("Erreur détaillée:", JSON.stringify(error, null, 2));
          }
          return false;
        }
      } 
      // Support des anciens navigateurs avec web3 injecté
      else if (window.web3 && window.web3.currentProvider) {
        console.log("Utilisation du legacy provider via window.web3");
        this.web3 = new Web3(window.web3.currentProvider);
        
        try {
          const accounts = await this.web3.eth.getAccounts();
          console.log("Comptes obtenus (legacy):", accounts);
          
          if (!accounts || accounts.length === 0) {
            console.error("Aucun compte disponible (legacy)");
            return false;
          }
          
          this.account = accounts[0];
          this.networkId = await this.web3.eth.net.getId();
          
          // Initialiser le contrat avec l'adresse fournie
          if (this.contractAddress.includes('...')) {
            console.error("L'adresse du contrat est toujours un placeholder:", this.contractAddress);
            return false;
          }
          
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
          
          this.initialized = true;
          return true;
        } catch (error) {
          console.error("Erreur avec le provider legacy:", error);
          return false;
        }
      }
      // Fallback pour Ganache (environnement de développement)
      else if (process.env.REACT_APP_GANACHE_URL || this.ganacheUrl) {
        console.log("Tentative de connexion à Ganache");
        this.isGanache = true;
        const ganacheUrl = process.env.REACT_APP_GANACHE_URL || this.ganacheUrl;
        this.web3 = new Web3(new Web3.providers.HttpProvider(ganacheUrl));
        
        try {
          // Obtenir les comptes sur Ganache
          const accounts = await this.web3.eth.getAccounts();
          console.log("Comptes Ganache:", accounts);
          
          if (!accounts || accounts.length === 0) {
            console.error("Aucun compte disponible sur Ganache");
            return false;
          }
          
          this.account = accounts[0];
          this.networkId = await this.web3.eth.net.getId();
          
          // Initialiser le contrat
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
          
          this.initialized = true;
          return true;
        } catch (error) {
          console.error("Erreur de connexion à Ganache:", error);
          return false;
        }
      }
      else {
        // MetaMask n'est pas installé
        console.error("Aucun provider Ethereum détecté. Veuillez installer MetaMask ou configurer Ganache!");
        return false;
      }
    } catch (error) {
      console.error("Erreur générale d'initialisation Web3:", error);
      this.resetState();
      return false;
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

  async isUserRegistered() {
    if (!this.initialized) await this.initialize();
    
    try {
      const user = await this.contract.methods.users(this.account).call();
      return user.exists;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      return false;
    }
  }

  async registerUser(name, role) {
    if (!this.initialized) await this.initialize();
    
    // Vérifier que le rôle est valide (0 = étudiant, 1 = professeur)
    if (role !== 0 && role !== 1) {
      const error = new Error("Invalid role");
      error.code = "INVALID_ROLE";
      throw error;
    }
    
    try {
      // Vérifier d'abord si l'utilisateur existe déjà
      const isRegistered = await this.isUserRegistered();
      if (isRegistered) {
        const error = new Error("User already exists");
        error.code = "USER_EXISTS";
        throw error;
      }
      
      // Si l'utilisateur n'existe pas, procéder à l'inscription
      return await this.contract.methods.registerUser(name, role).send({
        from: this.account
      });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
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

  async getUserReputation() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserReputation(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération de la réputation:', error);
      throw error;
    }
  }

  async getUserBorrowHistory() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserBorrowHistory(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  async getUserActiveLoans() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserActiveLoans(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts actifs:', error);
      throw error;
    }
  }

  async addBook(title, author, ipfsHash) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.addBook(title, author, ipfsHash).send({
        from: this.account
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du livre:', error);
      throw error;
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
}

const web3Service = new Web3Service();
export default web3Service;
