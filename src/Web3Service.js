import Web3 from 'web3';
import LibraryDAppABI from './LibraryDAppABI.json';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.contractAddress = '0x1234...5678'; // Remplacer par l'adresse réelle du contrat déployé
    this.initialized = false;
    this.isGanache = false;
    this.ganacheUrl = 'http://127.0.0.1:7545'; // URL par défaut de Ganache
  }

  async initialize() {
    // Éviter l'initialisation multiple
    if (this.initialized) return true;
    
    try {
      // Vérifier si MetaMask est installé
      if (window.ethereum) {
        // Utiliser le provider fourni par MetaMask
        this.web3 = new Web3(window.ethereum);
        
        try {
          // Demander à l'utilisateur de se connecter
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          this.account = accounts[0];
          
          // Initialiser le contrat
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
          
          // Configurer l'écoute des changements de compte
          window.ethereum.on('accountsChanged', (accounts) => {
            this.account = accounts[0];
            window.location.reload();
          });
          
          // Configurer l'écoute des changements de réseau
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
          
          this.initialized = true;
          return true;
        } catch (error) {
          console.error('Accès refusé par l\'utilisateur:', error);
          return false;
        }
      } 
      // Fallback pour Ganache
      else if (process.env.REACT_APP_GANACHE_URL || this.ganacheUrl) {
        console.log('Connexion à Ganache...');
        this.isGanache = true;
        const ganacheUrl = process.env.REACT_APP_GANACHE_URL || this.ganacheUrl;
        this.web3 = new Web3(new Web3.providers.HttpProvider(ganacheUrl));
        
        // Obtenir les comptes de Ganache
        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];
        
        // Initialiser le contrat
        this.contract = new this.web3.eth.Contract(
          LibraryDAppABI,
          this.contractAddress
        );
        
        this.initialized = true;
        return true;
      }
      // Fallback pour les navigateurs non-web3
      else {
        console.error('Veuillez installer MetaMask ou configurer Ganache!');
        return false;
      }
    } catch (error) {
      console.error('Erreur d\'initialisation Web3:', error);
      return false;
    }
  }

  // Méthode pour basculer entre MetaMask et Ganache
  async switchToGanache() {
    this.isGanache = true;
    this.initialized = false;
    return await this.initialize();
  }

  // Méthode pour basculer vers MetaMask
  async switchToMetaMask() {
    this.isGanache = false;
    this.initialized = false;
    return await this.initialize();
  }

  // Obtenir l'adresse du compte connecté
  getAccount() {
    return this.account;
  }

  // Raccourcir l'adresse pour l'affichage
  shortenAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 5)}...${address.substring(address.length - 4)}`;
  }

  // Vérifier si l'utilisateur est inscrit
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

  // Inscrire un nouvel utilisateur
  async registerUser(name, role) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.registerUser(name, role).send({
        from: this.account
      });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  // Obtenir les détails d'un livre
  async getBook(bookId) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.books(bookId).call();
    } catch (error) {
      console.error(`Erreur lors de la récupération du livre ${bookId}:`, error);
      throw error;
    }
  }

  // Emprunter un livre
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

  // Retourner un livre
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

  // Obtenir la réputation de l'utilisateur
  async getUserReputation() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserReputation(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération de la réputation:', error);
      throw error;
    }
  }

  // Obtenir l'historique des emprunts de l'utilisateur
  async getUserBorrowHistory() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserBorrowHistory(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      throw error;
    }
  }

  // Obtenir les emprunts actifs de l'utilisateur
  async getUserActiveLoans() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.methods.getUserActiveLoans(this.account).call();
    } catch (error) {
      console.error('Erreur lors de la récupération des emprunts actifs:', error);
      throw error;
    }
  }

  // Ajouter un livre (admin uniquement)
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
  
  // Obtenir le nombre total de livres
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

// Instance unique du service
const web3Service = new Web3Service();
export default web3Service; 