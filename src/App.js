import React, { useState, useEffect, useCallback } from 'react';
import web3Service from './services/Web3Service';
import ipfsService from './services/IPFSService';
import LibraryDAppABI from './LibraryDAppABI.json';

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
import TransactionsAdmin from './components/TransactionsAdmin';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contractInfo, setContractInfo] = useState({
    address: null,
    abi: LibraryDAppABI,
    hasValidConnection: false
  });
 
  // Vérifier la connexion initiale et configurer les écouteurs d'événements MetaMask
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      
      try {
        if (window.ethereum) {
          // Vérifier si l'utilisateur est déjà connecté
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log("Compte déjà connecté:", accounts[0]);
            const success = await web3Service.initialize();
            if (success) {
              setIsConnected(true);
              setAccount(accounts[0]);
              
              // Mettre à jour les informations du contrat
              setContractInfo({
                address: web3Service.contractAddress,
                abi: LibraryDAppABI,
                hasValidConnection: success,
                networkId: web3Service.networkId,
                networkName: web3Service.getNetworkName(web3Service.networkId)
              });
              
              const registered = await web3Service.isUserRegistered();
              setIsRegistered(registered);
              console.log("Utilisateur inscrit:", registered);
              
              if (registered) {
                const reputation = await web3Service.getUserReputation();
                setUserReputation(Number(reputation));
                console.log("Réputation utilisateur:", reputation);
              }
            }
          } else {
            console.log("Aucun compte connecté au démarrage");
          }
          
          // Configurer les écouteurs d'événements
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => {
            // Mise à jour du contrat lors du changement de réseau
            setTimeout(async () => {
              const success = await web3Service.initialize();
              if (success) {
                setContractInfo({
                  address: web3Service.contractAddress,
                  abi: LibraryDAppABI,
                  hasValidConnection: success,
                  networkId: web3Service.networkId,
                  networkName: web3Service.getNetworkName(web3Service.networkId)
                });
                showNotification(`Réseau changé: ${web3Service.getNetworkName(web3Service.networkId)}`, "info");
              }
            }, 1000);
          });
          window.ethereum.on('disconnect', () => {
            setIsConnected(false);
            setAccount(null);
            setIsRegistered(false);
            setContractInfo(prev => ({ ...prev, hasValidConnection: false }));
          });
        } else {
          console.log("MetaMask n'est pas installé");
          showNotification("MetaMask n'est pas installé. Veuillez l'installer pour utiliser toutes les fonctionnalités.", "warning");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de connexion:", error);
        showNotification("Erreur de connexion au démarrage", "error");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
    
    // Ajouter un écouteur pour l'événement personnalisé d'ouverture de l'onglet d'inscription
    const openLoginTabHandler = () => {
      console.log("Ouverture de l'onglet d'inscription depuis une carte de livre");
      setActiveTab('login');
    };
    
    // Ajouter un écouteur pour l'événement personnalisé d'inscription réussie
    const userRegisteredHandler = (event) => {
      console.log("Inscription réussie détectée:", event.detail);
      
      // Mettre à jour l'état de l'application
      setIsRegistered(true);
      
      // Charger la réputation initiale (généralement 0 pour un nouvel utilisateur)
      const loadInitialReputation = async () => {
        try {
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          console.log("Réputation initiale chargée:", reputation);
        } catch (error) {
          console.error("Erreur lors du chargement de la réputation initiale:", error);
        }
      };
      
      loadInitialReputation();
      
      // Afficher une notification de confirmation
      showNotification("Votre compte a été enregistré avec succès!", "success");
    };
    
    window.addEventListener('openLoginTab', openLoginTabHandler);
    window.addEventListener('userRegistered', userRegisteredHandler);
    
    // Nettoyage
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('disconnect', () => {});
      }
      window.removeEventListener('openLoginTab', openLoginTabHandler);
      window.removeEventListener('userRegistered', userRegisteredHandler);
    };
  }, []);
  
  // Écouteur pour les événements de mise à jour de réputation
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await web3Service.isMetaMaskInstalled();
        setIsConnected(isConnected);
        
        if (isConnected) {
          // Vérification de la connexion à MetaMask et initialisation
          await web3Service.initialize();
          
          // Récupérer l'adresse du compte
          const account = web3Service.getAccount();
          setAccount(account);
          
          // Vérifier si l'utilisateur est inscrit
          const registered = await web3Service.isUserRegistered();
          setIsRegistered(registered);
          
          // Récupérer la réputation de l'utilisateur s'il est inscrit
          if (registered) {
            const reputation = await web3Service.getUserReputation();
            setUserReputation(Number(reputation));
            console.log("Réputation de l'utilisateur chargée:", reputation);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la connexion:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkConnection();
    
    // Ajouter un écouteur pour les mises à jour de réputation
    const reputationUpdatedHandler = (event) => {
      if (event.detail && event.detail.reputation) {
        console.log("Mise à jour de la réputation détectée:", event.detail.reputation);
        setUserReputation(Number(event.detail.reputation));
        
        // Afficher une notification
        showNotification(`Votre score de réputation a été mis à jour: ${event.detail.reputation}`, "success");
      }
    };
    
    // Écouter l'événement personnalisé de mise à jour de réputation
    window.addEventListener('reputationUpdated', reputationUpdatedHandler);
    
    // Nettoyage
    return () => {
      window.removeEventListener('reputationUpdated', reputationUpdatedHandler);
    };
  }, []);

  // Fonction pour gérer les changements de compte
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
      setIsConnected(true);
      
      // Vérifier si le nouveau compte est inscrit
      console.log("Vérification de l'inscription du nouveau compte:", accounts[0]);
      try {
        const registered = await web3Service.isUserRegistered();
        console.log("Résultat de la vérification d'inscription:", registered);
        setIsRegistered(registered);
        
        if (registered) {
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          showNotification("Compte inscrit trouvé. Réputation: " + reputation, "success");
        } else {
          showNotification("Ce compte n'est pas encore inscrit. Veuillez vous inscrire.", "warning");
          // Rediriger vers la page d'inscription
          setActiveTab('login');
        }
      } catch (error) {
        console.error("Erreur lors de la vérification d'inscription:", error);
        setIsRegistered(false);
        showNotification("Impossible de vérifier votre inscription", "error");
      }
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

  // Rafraîchir la connexion
  const refreshConnection = async () => {
    console.log("Rafraîchissement de la connexion...");
    setIsLoading(true);
    
    try {
      // Définir explicitement l'adresse du contrat avant l'initialisation
      const newContractAddress = '0xf9a82C631f7C03bb2DCA0435C982826621966e15';
      console.log(`Mise à jour de l'adresse du contrat pour refresh: ${newContractAddress}`);
      web3Service.contractAddress = newContractAddress;
      web3Service.contractAddresses[1337] = newContractAddress;
      web3Service.contractAddresses[5777] = newContractAddress;
      
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
          // Rediriger automatiquement vers l'inscription si non inscrit
          setActiveTab('login');
        }
      } else {
        // Tentative de connexion manuelle avec l'adresse spécifique
        console.log("Échec du rafraîchissement automatique, tentative de connexion manuelle au contrat");
        
        try {
          if (web3Service.web3) {
            // Obtenir le compte
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
              web3Service.account = accounts[0];
              
              // Tester l'existence du contrat à cette adresse
              const code = await web3Service.web3.eth.getCode(newContractAddress);
              if (code && code !== '0x' && code !== '0x0') {
                console.log("Code de contrat trouvé à l'adresse spécifiée");
                
                // Initialiser manuellement le contrat
                const LibraryContractABI = require('./LibraryDAppABI.json');
                web3Service.contract = new web3Service.web3.eth.Contract(
                  LibraryContractABI,
                  newContractAddress
                );
                
                web3Service.initialized = true;
                
                // Tester un appel au contrat
                const adminAddress = await web3Service.contract.methods.admin().call();
                console.log("Contrat initialisé manuellement avec succès. Admin:", adminAddress);
                
                // Mettre à jour l'état de l'application
                const account = web3Service.getAccount();
                setIsConnected(true);
                setAccount(account);
                
                // Vérifier l'inscription
                const registered = await web3Service.isUserRegistered();
                setIsRegistered(registered);
                
                if (registered) {
                  const reputation = await web3Service.getUserReputation();
                  setUserReputation(Number(reputation));
                  showNotification("Connexion rafraîchie avec succès (mode manuel)", "success");
                } else {
                  showNotification("Connexion rétablie. Veuillez vous inscrire.", "warning");
                  setActiveTab('login');
                }
                
                return;
              } else {
                console.error("Aucun code de contrat à cette adresse");
              }
            } else {
              console.error("Aucun compte disponible");
            }
          }
        } catch (manualError) {
          console.error("Échec de l'initialisation manuelle lors du rafraîchissement:", manualError);
        }
        
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
      if (!window.ethereum) {
        console.error("Aucun provider Ethereum détecté");
        showNotification("MetaMask n'est pas installé. Veuillez l'installer pour continuer.", "error");
        return;
      }
      
      setIsLoading(true);
      
      // Définir explicitement l'adresse du contrat avant l'initialisation
      const newContractAddress = '0xf9a82C631f7C03bb2DCA0435C982826621966e15';
      console.log(`Mise à jour de l'adresse du contrat à: ${newContractAddress}`);
      web3Service.contractAddress = newContractAddress;
      web3Service.contractAddresses[1337] = newContractAddress;
      web3Service.contractAddresses[5777] = newContractAddress;
      
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
          console.log("Redirection vers l'écran d'inscription...");
        }
      } else {
        // Tentative de connexion manuelle avec l'adresse spécifique
        console.log("Échec de l'initialisation automatique, tentative de connexion manuelle au contrat");
        
        try {
          if (web3Service.web3) {
            // Tester l'existence du contrat à cette adresse
            const code = await web3Service.web3.eth.getCode(newContractAddress);
            if (code && code !== '0x' && code !== '0x0') {
              console.log("Code de contrat trouvé à l'adresse spécifiée");
              
              // Initialiser manuellement le contrat
              const LibraryContractABI = require('./LibraryDAppABI.json');
              web3Service.contract = new web3Service.web3.eth.Contract(
                LibraryContractABI,
                newContractAddress
              );
              
              web3Service.initialized = true;
              
              // Tester un appel au contrat
              const adminAddress = await web3Service.contract.methods.admin().call();
              console.log("Contrat initialisé manuellement avec succès. Admin:", adminAddress);
              
              // Mettre à jour l'état de l'application
              const account = web3Service.getAccount();
              setIsConnected(true);
              setAccount(account);
              
              // Vérifier l'inscription
              const registered = await web3Service.isUserRegistered();
              setIsRegistered(registered);
              
              if (registered) {
                const reputation = await web3Service.getUserReputation();
                setUserReputation(Number(reputation));
                showNotification("Connexion réussie (mode manuel)", "success");
              } else {
                showNotification("Veuillez vous inscrire pour utiliser l'application", "warning");
                setActiveTab('login');
              }
              
              return;
            } else {
              console.error("Aucun code de contrat à cette adresse");
            }
          }
        } catch (manualError) {
          console.error("Échec de l'initialisation manuelle:", manualError);
        }
        
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

  // Fonction pour se connecter au réseau Ganache local
  const connectToGanacheNetwork = async () => {
    setIsLoading(true);
    try {
      const success = await web3Service.addGanacheNetwork();
      if (success) {
        showNotification("Réseau Ganache configuré. Veuillez le sélectionner dans MetaMask.", "success");
      } else {
        showNotification("Impossible d'ajouter automatiquement le réseau Ganache. Vous pouvez le configurer manuellement dans MetaMask.", "warning");
      }
    } catch (error) {
      console.error("Erreur lors de la connexion au réseau Ganache:", error);
      showNotification("Erreur lors de la connexion au réseau Ganache: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Emprunter un livre
  const handleBorrowBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez vous connecter avec MetaMask", "warning");
      return false;
    }
    
    if (!isRegistered) {
      // Mettre à jour l'URL pour indiquer que l'utilisateur vient d'une tentative d'emprunt
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('source', 'borrow');
      window.history.pushState({}, '', currentUrl);
      
      // Déclencher l'événement personnalisé pour indiquer la redirection depuis emprunt
      window.dispatchEvent(new CustomEvent('borrowRedirect'));
      
      showNotification("Vous devez être inscrit pour emprunter des livres", "warning");
      setActiveTab('login'); // Redirection automatique vers la page d'inscription
      return false;
    }

    try {
      setIsLoading(true);
      const success = await web3Service.borrowBook(bookId);
      if (success) {
        showNotification("Livre emprunté avec succès!", "success");
        return true;
      } else {
        showNotification("Échec de l'emprunt du livre", "error");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de l'emprunt du livre:", error);
      showNotification("Erreur lors de l'emprunt: " + error.message, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Retourner un livre
  const handleReturnBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez vous connecter avec MetaMask", "warning");
      return false;
    }
    
    if (!isRegistered) {
      showNotification("Veuillez vous inscrire avant de retourner un livre", "warning");
      setActiveTab('login');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await web3Service.returnBook(bookId);
      if (success) {
        showNotification("Livre retourné avec succès!", "success");
        return true;
      } else {
        showNotification("Échec du retour du livre", "error");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      showNotification("Erreur lors du retour: " + error.message, "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Déterminer si un onglet doit être désactivé
  const isTabDisabled = (tab) => {
    if (!isConnected && tab === 'dashboard') {
      return true;
    }
    if (!isRegistered && (tab === 'dashboard')) {
      return true;
    }
    return false;
  };

  // Changer d'onglet avec vérification des conditions
  const handleTabChange = (tab) => {
    if (isTabDisabled(tab)) {
      if (!isConnected) {
        if (tab === 'admin') {
          // Ne pas afficher de message pour l'admin
          return;
        } else if (tab === 'dashboard') {
          // Utiliser une notification bleue pour Mon espace
          showNotification("Veuillez vous connecter pour accéder à Mon espace", "info");
        } else {
          showNotification("Veuillez vous connecter pour accéder à cette fonctionnalité", "warning");
        }
      } else if (!isRegistered) {
        showNotification("Veuillez vous inscrire pour accéder à cette fonctionnalité", "warning");
        setActiveTab('login');
        return;
      }
      return;
    }
    setActiveTab(tab);
  };

  // Fonction pour afficher les informations du contrat (pour le débogage ou pour les utilisateurs avancés)
  const displayContractInfo = () => {
    console.log("Informations du contrat:", contractInfo);
    showNotification(`Contrat connecté sur ${contractInfo.networkName || 'réseau inconnu'}`, "info");
  };

  // Gestionnaire pour forcer la mise à jour des livres dans l'application
  const handleBookUpdateEvent = useCallback(() => {
    console.log("Événement de mise à jour des livres détecté");
    setNotification({
      message: "Mise à jour du catalogue en cours...",
      type: "info",
      duration: 1500
    });
    
    // Attendre un moment puis forcer le rafraîchissement du composant
    setActiveTab(prevTab => {
      // Si on était déjà sur le catalogue, forcer un double switch pour rafraîchir complètement
      if (prevTab === 'catalog') {
        setTimeout(() => {
          setActiveTab('catalog');
        }, 100);
        return 'home';
      }
      return prevTab;
    });
  }, [setNotification]);
  
  // Écouter les événements de mise à jour des livres
  useEffect(() => {
    window.addEventListener('bookAdded', handleBookUpdateEvent);
    window.addEventListener('bookHidden', handleBookUpdateEvent);
    window.addEventListener('refreshBooks', handleBookUpdateEvent);
    
    return () => {
      window.removeEventListener('bookAdded', handleBookUpdateEvent);
      window.removeEventListener('bookHidden', handleBookUpdateEvent);
      window.removeEventListener('refreshBooks', handleBookUpdateEvent);
    };
  }, [handleBookUpdateEvent]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        account={account}
        isConnected={isConnected}
        isRegistered={isRegistered}
        connectToMetaMask={connectToMetaMask}
        refreshConnection={refreshConnection}
        disconnectWallet={disconnectWallet}
        showNotification={showNotification}
        contractInfo={contractInfo}
      />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {activeTab === 'home' && <HomeTab 
          setActiveTab={handleTabChange} 
          handleBorrowBook={handleBorrowBook} 
          isConnected={isConnected}
          isRegistered={isRegistered}
          account={account}
          connectToMetaMask={connectToMetaMask}
          disconnectWallet={disconnectWallet}
        />}
        {activeTab === 'catalog' && <CatalogTab 
          handleBorrowBook={handleBorrowBook} 
          isConnected={isConnected}
          isRegistered={isRegistered}
        />}
        {activeTab === 'dashboard' && <DashboardTab 
          setActiveTab={handleTabChange} 
          handleReturnBook={handleReturnBook} 
          userReputation={userReputation}
          isConnected={isConnected}
          isRegistered={isRegistered}
        />}
        {activeTab === 'admin' && <AdminTab 
          setNotification={showNotification} 
          setIsLoading={setIsLoading} 
          isConnected={isConnected}
          isRegistered={isRegistered}
        />}
        {activeTab === 'login' && <LoginTab 
          setActiveTab={handleTabChange} 
          showNotification={showNotification} 
          setIsLoading={setIsLoading} 
          isConnected={isConnected}
          account={account}
          connectToMetaMask={connectToMetaMask}
        />}
        {activeTab === 'transactions' && <TransactionsAdmin />}
      </main>
      
      <Footer setActiveTab={handleTabChange} />
      
      {notification && <Notification notification={notification} setNotification={setNotification} />}
      {isLoading && <LoadingIndicator />}
    </div>
  );
};

export default App;
