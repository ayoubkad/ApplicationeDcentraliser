import Web3 from 'web3';
import LibraryDAppABI from '../LibraryDAppABI.json';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.account = null;
    this.contractAddress = '0x1234...5678'; // À remplacer par l'adresse réelle du contrat
    this.initialized = false;
    this.isGanache = false;
    this.ganacheUrl = 'http://127.0.0.1:7545';
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      if (window.ethereum) {
        this.web3 = new Web3(window.ethereum);
        
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          this.account = accounts[0];
          
          this.contract = new this.web3.eth.Contract(
            LibraryDAppABI,
            this.contractAddress
          );
          
          window.ethereum.on('accountsChanged', (accounts) => {
            this.account = accounts[0];
            window.location.reload();
          });
          
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
      else if (process.env.REACT_APP_GANACHE_URL || this.ganacheUrl) {
        this.isGanache = true;
        const ganacheUrl = process.env.REACT_APP_GANACHE_URL || this.ganacheUrl;
        this.web3 = new Web3(new Web3.providers.HttpProvider(ganacheUrl));
        
        const accounts = await this.web3.eth.getAccounts();
        this.account = accounts[0];
        
        this.contract = new this.web3.eth.Contract(
          LibraryDAppABI,
          this.contractAddress
        );
        
        this.initialized = true;
        return true;
      }
      else {
        console.error('Veuillez installer MetaMask ou configurer Ganache!');
        return false;
      }
    } catch (error) {
      console.error('Erreur d\'initialisation Web3:', error);
      return false;
    }
  }

  getAccount() {
    return this.account;
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
    
    try {
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
