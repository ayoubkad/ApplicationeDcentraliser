import React, { useState, useEffect } from 'react';
import web3Service from './services/Web3Service';
import ipfsService from './services/IPFSService';

// Composants existants
import Header from './components/Header';
import Footer from './components/Footer';
import HomeTab from './components/HomeTab';
import CatalogTab from './components/CatalogTab';
import DashboardTab from './components/DashboardTab';
import AdminTab from './components/AdminTab';
import Notification from './components/common/Notification';
import LoadingIndicator from './components/common/LoadingIndicator';
import LoginTab from './components/LoginTab';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Vérifier la connexion initiale et configurer les écouteurs d'événements MetaMask
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Vérifier si l'utilisateur est déjà connecté
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const success = await web3Service.initialize();
            if (success) {
              setIsConnected(true);
              setAccount(accounts[0]);
              
              const registered = await web3Service.isUserRegistered();
              setIsRegistered(registered);
              
              if (registered) {
                const reputation = await web3Service.getUserReputation();
                setUserReputation(Number(reputation));
              }
            }
          }
          
          // Configurer les écouteurs d'événements
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => window.location.reload());
          window.ethereum.on('disconnect', () => {
            setIsConnected(false);
            setAccount(null);
            setIsRegistered(false);
          });
        } catch (error) {
          console.error("Erreur lors de la vérification de connexion:", error);
        }
      } else {
        console.log("MetaMask n'est pas installé");
      }
    };
    
    checkConnection();
    
    // Nettoyage
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('disconnect', () => {});
      }
    };
  }, []);
  
  // Gestionnaire de changement de compte
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // L'utilisateur s'est déconnecté
      setIsConnected(false);
      setAccount(null);
      setIsRegistered(false);
      showNotification("Vous avez été déconnecté de MetaMask", "info");
    } else {
      // L'utilisateur a changé de compte
      setAccount(accounts[0]);
      
      // Vérifier si le nouveau compte est inscrit
      const registered = await web3Service.isUserRegistered();
      setIsRegistered(registered);
      
      if (registered) {
        const reputation = await web3Service.getUserReputation();
        setUserReputation(Number(reputation));
      }
      
      showNotification("Compte MetaMask changé", "info");
    }
  };
  
  // Afficher une notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Fonction pour déconnecter l'utilisateur
  const disconnectWallet = () => {
    console.log("Déconnexion du portefeuille...");
    
    try {
      // Appeler la méthode de déconnexion dans Web3Service
      web3Service.disconnect();
      
      // Mettre à jour l'état de l'application
      setIsConnected(false);
      setAccount(null);
      setIsRegistered(false);
      setUserReputation(0);
      
      // Rediriger vers la page d'accueil
      setActiveTab('home');
      
      showNotification("Vous avez été déconnecté avec succès", "info");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      showNotification("Erreur lors de la déconnexion", "error");
    }
  };

  // Fonction pour rafraîchir la connexion sans recharger la page
  const refreshConnection = async () => {
    console.log("Rafraîchissement de la connexion...");
    setIsLoading(true);
    
    try {
      // Réinitialiser le service Web3
      web3Service.resetState();
      
      // Essayer de se reconnecter
      const success = await web3Service.initialize();
      console.log("Résultat du rafraîchissement:", success);
      
      if (success) {
        const account = web3Service.getAccount();
        setIsConnected(true);
        setAccount(account);
        
        // Vérifier à nouveau l'état d'inscription
        const registered = await web3Service.isUserRegistered();
        setIsRegistered(registered);
        
        if (registered) {
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          showNotification("Connexion rafraîchie avec succès", "success");
        } else {
          showNotification("Connexion rétablie. Veuillez vous inscrire.", "warning");
        }
      } else {
        setIsConnected(false);
        setAccount(null);
        setIsRegistered(false);
        showNotification("Impossible de rafraîchir la connexion", "error");
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement:", error);
      setIsConnected(false);
      setAccount(null);
      setIsRegistered(false);
      showNotification("Erreur lors du rafraîchissement: " + (error.message || "Erreur inconnue"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour se connecter à MetaMask
  const connectToMetaMask = async () => {
    try {
      console.log("Tentative de connexion à MetaMask...");
      
      // Vérification de la présence de MetaMask
      if (!window.ethereum && !window.web3) {
        console.error("Aucun provider Ethereum détecté");
        showNotification("MetaMask n'est pas installé. Veuillez l'installer pour continuer.", "error");
        return;
      }
      
      setIsLoading(true);
      console.log("Appel à web3Service.initialize()");
      
      const success = await web3Service.initialize();
      console.log("Résultat de l'initialisation:", success);
      
      if (success) {
        const account = web3Service.getAccount();
        console.log("Compte connecté:", account);
        
        setIsConnected(true);
        setAccount(account);
        
        // Vérifier si l'utilisateur est inscrit
        console.log("Vérification de l'inscription...");
        const registered = await web3Service.isUserRegistered();
        console.log("Utilisateur inscrit:", registered);
        setIsRegistered(registered);
        
        if (registered) {
          // Charger la réputation
          console.log("Récupération de la réputation...");
          const reputation = await web3Service.getUserReputation();
          console.log("Réputation utilisateur:", reputation);
          setUserReputation(Number(reputation));
          showNotification("Connexion réussie à votre portefeuille", "success");
        } else {
          showNotification("Veuillez vous inscrire pour utiliser toutes les fonctionnalités", "warning");
          // Rediriger automatiquement vers la page d'inscription
          setActiveTab('login');
        }
      } else {
        // Vérifier si l'adresse du contrat est un placeholder
        if (web3Service.contractAddress.includes('...')) {
          showNotification("L'adresse du contrat n'est pas configurée correctement. Contactez l'administrateur.", "error");
        } else {
          showNotification("Connexion au portefeuille échouée. Vérifiez que MetaMask est déverrouillé et rechargez la page.", "error");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la connexion à MetaMask:", error);
      
      // Messages d'erreur plus spécifiques
      if (error.code === 4001) {
        showNotification("Vous avez refusé la connexion à MetaMask", "warning");
      } else if (error.message && error.message.includes("contract")) {
        showNotification("Problème avec le contrat intelligent: " + error.message, "error");
      } else {
        showNotification("Erreur lors de la connexion: " + (error.message || "Erreur inconnue"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Emprunter un livre
  const handleBorrowBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez vous connecter avec MetaMask", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const success = await web3Service.borrowBook(bookId);
      if (success) {
        showNotification("Livre emprunté avec succès!", "success");
      } else {
        showNotification("Échec de l'emprunt du livre", "error");
      }
    } catch (error) {
      console.error("Erreur lors de l'emprunt du livre:", error);
      showNotification("Erreur lors de l'emprunt: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Retourner un livre
  const handleReturnBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez vous connecter avec MetaMask", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const success = await web3Service.returnBook(bookId);
      if (success) {
        showNotification("Livre retourné avec succès!", "success");
      } else {
        showNotification("Échec du retour du livre", "error");
      }
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      showNotification("Erreur lors du retour: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        account={account}
        isConnected={isConnected}
        isRegistered={isRegistered}
        connectToMetaMask={connectToMetaMask}
        refreshConnection={refreshConnection}
        disconnectWallet={disconnectWallet}
      />
      
      <main className="flex-grow">
        {activeTab === 'home' && <HomeTab 
          setActiveTab={setActiveTab} 
          handleBorrowBook={handleBorrowBook} 
          isConnected={isConnected}
          account={account}
          connectToMetaMask={connectToMetaMask}
          disconnectWallet={disconnectWallet}
        />}
        {activeTab === 'catalog' && <CatalogTab 
          handleBorrowBook={handleBorrowBook} 
        />}
        {activeTab === 'dashboard' && <DashboardTab 
          setActiveTab={setActiveTab} 
          handleReturnBook={handleReturnBook} 
          userReputation={userReputation}
        />}
        {activeTab === 'admin' && <AdminTab setNotification={setNotification} setIsLoading={setIsLoading} />}
        {activeTab === 'login' && <LoginTab setActiveTab={setActiveTab} showNotification={showNotification} setIsLoading={setIsLoading} />}
      </main>
      
      <Footer setActiveTab={setActiveTab} />
      
      {notification && <Notification notification={notification} setNotification={setNotification} />}
      {isLoading && <LoadingIndicator isLoading={isLoading} />}
    </div>
  );
};

export default App;
