import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import web3Service from './services/Web3Service';
import ipfsService from './services/IPFSService';
import LibraryDAppABI from './LibraryDAppABI.json';
import { Toaster } from 'react-hot-toast';

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
import TutorialTab from './components/TutorialTab';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contractInfo, setContractInfo] = useState({
    address: null,
    abi: LibraryDAppABI,
    hasValidConnection: false
  });

  // Configurer les écouteurs d'événements MetaMask sans connexion automatique
  useEffect(() => {
    const setupEventListeners = async () => {
      // Ne pas afficher l'indicateur de chargement pour ne pas bloquer l'interface
      try {
        if (window.ethereum) {
          // Configurer les écouteurs d'événements sans initialiser Web3Service
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => {
            // Mise à jour du contrat lors du changement de réseau uniquement si l'utilisateur est déjà connecté
            if (isConnected) {
              setTimeout(async () => {
                const success = await web3Service.initialize(false);
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
            }
          });
          window.ethereum.on('disconnect', () => {
            setIsConnected(false);
            setAccount(null);
            setIsRegistered(false);
            setContractInfo(prev => ({ ...prev, hasValidConnection: false }));
          });
        } else {
          console.log("MetaMask n'est pas installé");
          // Ne pas afficher de notification pour ne pas déranger l'utilisateur
        }
      } catch (error) {
        console.error("Erreur lors de la configuration des écouteurs d'événements:", error);
      }
    };

    setupEventListeners();

    // Ajouter un écouteur pour l'événement personnalisé d'ouverture de l'onglet d'inscription
    const openLoginTabHandler = () => {
      console.log("Ouverture de l'onglet d'inscription depuis une carte de livre");

      // Vérifier si l'utilisateur est déjà inscrit avant de rediriger vers login
      if (isRegistered) {
        console.log("L'utilisateur est déjà inscrit, redirection vers le catalogue...");
        showNotification("Vous êtes déjà inscrit et pouvez emprunter des livres", "info");
        setActiveTab('catalog');
        return;
      }

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
  }, [isRegistered, activeTab]);

  // Écouteur pour les événements de mise à jour de réputation
  useEffect(() => {
    // Configurer les écouteurs d'événements pour les mises à jour de réputation
    // sans vérifier la connexion automatiquement

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

          // Si l'utilisateur est sur la page d'inscription mais est déjà inscrit,
          // le rediriger vers le dashboard
          if (activeTab === 'login') {
            setActiveTab('dashboard');
          }
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
      setIsLoading(true);

      // Timer de sécurité pour éviter le blocage de l'interface
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
        showNotification("La connexion à MetaMask a pris trop de temps. Veuillez réessayer.", "warning");
      }, 20000);

      // Vérifier si MetaMask est disponible
      if (!window.ethereum) {
        showNotification("MetaMask n'est pas installé. Veuillez l'installer pour continuer.", "error");
        clearTimeout(safetyTimer);
        setIsLoading(false);
        return false;
      }

      try {
        // Demander l'accès au compte
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length === 0) {
          showNotification("Aucun compte MetaMask n'a été sélectionné", "error");
          clearTimeout(safetyTimer);
          setIsLoading(false);
          return false;
        }

        // Compte connecté
        const account = accounts[0];
        console.log("Compte connecté:", account);
        setAccount(account);
        setIsConnected(true);

        // Initialize Web3Service
        const success = await web3Service.initialize();
        if (!success) {
          showNotification("Connexion au contrat échouée. Veuillez vérifier que vous êtes sur le bon réseau.", "error");
          clearTimeout(safetyTimer);
          setIsLoading(false);
          return false;
        }

        // Mettre à jour les informations du contrat
        setContractInfo({
          address: web3Service.contractAddress,
          abi: LibraryDAppABI,
          hasValidConnection: success,
          networkId: web3Service.networkId,
          networkName: web3Service.getNetworkName(web3Service.networkId)
        });

        // Vérifier si l'utilisateur est admin
        const isAdminStatus = await web3Service.isAdmin();
        setIsAdmin(isAdminStatus);

        // Les administrateurs sont automatiquement considérés comme inscrits
        if (isAdminStatus) {
          setIsRegistered(true);
          showNotification("Connexion réussie avec un compte administrateur", "success");

          // Rediriger l'administrateur vers l'interface admin
          setTimeout(() => {
            setActiveTab('admin');
          }, 500);

          clearTimeout(safetyTimer);
          setIsLoading(false);
          return true;
        }

        // Vérifier si l'utilisateur est inscrit (uniquement pour les non-admins)
        const registered = await web3Service.isUserRegistered();
        setIsRegistered(registered);
        console.log("Utilisateur inscrit:", registered);

        if (registered) {
          // Si l'utilisateur est inscrit, récupérer sa réputation
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          console.log("Réputation utilisateur:", reputation);

          showNotification("Connexion réussie à MetaMask", "success");

          // Si c'est un admin, considérer qu'il est enregistré automatiquement
          if (isAdminStatus && !isRegistered) {
            console.log("Administrateur détecté - inscription automatique");
            setIsRegistered(true);

            // Si l'admin est sur une page destinée aux utilisateurs, le rediriger vers l'interface admin
            if (activeTab === 'dashboard' || activeTab === 'login' || activeTab === 'tutorial') {
              setTimeout(() => {
                setActiveTab('admin');
                showNotification("Compte administrateur détecté. Redirection vers l'interface admin.", "success");
              }, 500);
            }
          }

          // Si l'utilisateur est sur la page d'inscription mais est déjà inscrit,
          // le rediriger vers le dashboard
          if (activeTab === 'login') {
            setTimeout(() => {
              setActiveTab('dashboard');
              showNotification("Vous êtes déjà inscrit. Redirection vers le tableau de bord...", "info");
            }, 1000);
          }

        } else {
          // Si l'utilisateur n'est pas inscrit et qu'il est sur une page qui nécessite une inscription,
          // le rediriger vers la page d'inscription
          if (activeTab !== 'login' && activeTab !== 'home' && activeTab !== 'catalog') {
            setTimeout(() => {
              setActiveTab('login');
              showNotification("Veuillez vous inscrire pour accéder à cette fonctionnalité", "info");
            }, 1000);
          } else {
            showNotification("Connexion réussie. Vous n'êtes pas encore inscrit.", "info");
          }
        }

        clearTimeout(safetyTimer);
        setIsLoading(false);
        return true;

      } catch (error) {
        if (error.code === 4001) {
          // L'utilisateur a refusé la demande
          showNotification("Connexion à MetaMask refusée par l'utilisateur", "error");
        } else {
          console.error("Erreur lors de la connexion à MetaMask:", error);
          showNotification(`Erreur lors de la connexion à MetaMask: ${error.message}`, "error");
        }
        clearTimeout(safetyTimer);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Erreur inattendue lors de la connexion:", error);
      showNotification(`Erreur inattendue: ${error.message}`, "error");
      setIsLoading(false);
      return false;
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

  // Modifier la fonction handleBorrowBook pour bloquer les administrateurs
  const handleBorrowBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez connecter votre portefeuille MetaMask pour emprunter un livre.", "warning");
      return;
    }

    if (isAdmin) {
      showNotification("Les administrateurs ne peuvent pas emprunter de livres. Veuillez utiliser un compte étudiant ou professeur.", "error");
      return;
    }

    if (!isRegistered) {
      showNotification("Vous devez vous inscrire avant de pouvoir emprunter des livres.", "warning");
      // Déclencher un événement pour ouvrir l'onglet d'inscription
      window.dispatchEvent(new CustomEvent('openLoginTab'));
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si l'utilisateur a déjà emprunté ce livre
      const emprunts = await web3Service.getUserActiveLoans();
      const dejaEmprunte = emprunts.some(emprunt => Number(emprunt.bookId) === Number(bookId));

      if (dejaEmprunte) {
        showNotification("Vous avez déjà emprunté ce livre!", "error");
        setIsLoading(false);
        return;
      }

      // Récupérer les informations du livre
      const bookDetails = await web3Service.getBook(bookId);

      if (!bookDetails) {
        showNotification("Le livre demandé n'existe pas.", "error");
        setIsLoading(false);
        return;
      }

      if (!bookDetails.isAvailable) {
        showNotification("Ce livre n'est pas disponible actuellement.", "error");
        setIsLoading(false);
        return;
      }

      // Emprunter le livre
      const result = await web3Service.borrowBook(bookId);

      if (result.success) {
        showNotification(`"${bookDetails.title}" a été emprunté avec succès!`, "success");

        // Déclencher un événement pour informer l'application de l'emprunt
        window.dispatchEvent(new CustomEvent('bookBorrowed', {
          detail: {
            bookId,
            bookDetails,
            transaction: result.transaction,
            borrowId: result.borrowId
          }
        }));
      } else {
        showNotification(result.message || "Erreur lors de l'emprunt du livre", "error");
      }
    } catch (error) {
      console.error("Erreur lors de l'emprunt du livre:", error);
      showNotification(`Erreur: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Modifier la fonction handleReturnBook pour bloquer les administrateurs
  const handleReturnBook = async (bookId) => {
    if (!isConnected) {
      showNotification("Veuillez connecter votre portefeuille MetaMask pour retourner un livre.", "warning");
      return;
    }

    if (isAdmin) {
      showNotification("Les administrateurs ne peuvent pas retourner de livres. Veuillez utiliser un compte étudiant ou professeur.", "error");
      return;
    }

    if (!isRegistered) {
      showNotification("Vous devez vous inscrire avant de pouvoir retourner des livres.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si l'utilisateur a bien emprunté ce livre
      const emprunts = await web3Service.getUserActiveLoans();
      const estEmprunte = emprunts.some(emprunt => Number(emprunt.bookId) === Number(bookId));

      if (!estEmprunte) {
        showNotification("Vous n'avez pas emprunté ce livre!", "error");
        setIsLoading(false);
        return;
      }

      // Retourner le livre
      const result = await web3Service.returnBook(bookId);

      if (result.success) {
        // Afficher le message de succès
        showNotification(result.message || "Livre retourné avec succès!", "success");

        // Si la réputation a changé, la mettre à jour
        if (result.reputation) {
          setUserReputation(Number(result.reputation));
        }

        // Déclencher un événement pour informer l'application du retour
        window.dispatchEvent(new CustomEvent('bookReturned', {
          detail: {
            bookId,
            transaction: result.transaction,
            oldReputation: userReputation,
            newReputation: result.reputation
          }
        }));
      } else {
        showNotification(result.message || "Erreur lors du retour du livre", "error");
      }
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      showNotification(`Erreur: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Modifier la fonction isTabDisabled pour restreindre l'accès à certains onglets pour les administrateurs
  const isTabDisabled = (tab) => {
    // Si l'onglet est l'accueil, toujours accessible
    if (tab === 'home') return false;

    // Le tutoriel est accessible sans connexion
    if (tab === 'tutorial') return false;

    // Le catalogue est accessible sans connexion
    if (tab === 'catalog') return false;

    // Si l'utilisateur n'est pas connecté, désactiver tous les onglets sauf accueil, catalogue et inscription
    if (!isConnected && tab !== 'login') return true;

    // Si l'utilisateur est un administrateur
    if (isAdmin) {
      // Les administrateurs ne peuvent pas accéder à l'espace utilisateur, à l'inscription et au tutoriel
      if (tab === 'dashboard' || tab === 'login' || tab === 'tutorial') return true;
      // Les administrateurs peuvent accéder au catalogue (pour gestion), admin et transactions
      return false;
    }

    // Si l'utilisateur n'est pas inscrit, désactiver les onglets dashboard
    if (!isRegistered && tab === 'dashboard') return true;

    // Les utilisateurs normaux ne peuvent pas accéder aux onglets admin et transactions
    if (tab === 'admin' || tab === 'transactions') return true;

    return false;
  };

  // Modifier la fonction handleTabChange pour rediriger les administrateurs
  const handleTabChange = (tab) => {
    // Vérifier si l'onglet est désactivé
    if (isTabDisabled(tab)) {
      // Pour les administrateurs tentant d'accéder à des pages utilisateur
      if (isAdmin && (tab === 'dashboard' || tab === 'login')) {
        showNotification("Les administrateurs n'ont pas accès à l'espace utilisateur. Veuillez utiliser l'interface d'administration.", "warning");
        return;
      }

      // Pour les administrateurs tentant d'accéder au tutoriel
      if (isAdmin && tab === 'tutorial') {
        showNotification("Le tutoriel est destiné uniquement aux utilisateurs, pas aux administrateurs.", "warning");
        return;
      }

      // Pour d'autres cas, afficher un message général et rediriger vers la page de connexion
      if (!isConnected) {
        // Le catalogue est accessible sans connexion, donc on ne redirige pas si l'utilisateur tente d'y accéder
        showNotification("Veuillez connecter votre portefeuille MetaMask pour accéder à cette fonctionnalité.", "warning");
        // Pour les onglets nécessitant une connexion, rediriger vers l'accueil
        setActiveTab('home');
        return;
      }

      // Si l'utilisateur est connecté mais non inscrit, rediriger vers l'inscription
      if (tab === 'dashboard' && !isRegistered) {
        showNotification("Vous devez vous inscrire avant d'accéder à cette fonctionnalité.", "warning");
        setActiveTab('login');
        return;
      }

      // Pour les utilisateurs normaux tentant d'accéder aux pages admin
      if ((tab === 'admin' || tab === 'transactions') && !isAdmin) {
        showNotification("Accès réservé aux administrateurs.", "error");
        return;
      }

      return;
    }

    // Si l'onglet est accessible, changer l'onglet actif
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

  // Dans les effets où vous vérifiez l'état de l'utilisateur, ajouter la vérification admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isConnected && account) {
        try {
          const adminStatus = await web3Service.isAdmin();
          setIsAdmin(adminStatus);
          console.log("Statut admin vérifié:", adminStatus);

          // Si c'est un admin, considérer qu'il est enregistré automatiquement
          if (adminStatus) {
            console.log("Administrateur détecté - inscription automatique");
            setIsRegistered(true);

            // Si l'admin est sur une page destinée aux utilisateurs, le rediriger vers l'interface admin
            if (activeTab === 'dashboard' || activeTab === 'login' || activeTab === 'tutorial') {
              setTimeout(() => {
                setActiveTab('admin');
                showNotification("Compte administrateur détecté. Redirection vers l'interface admin.", "success");
              }, 500);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la vérification du statut admin:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isConnected, account, activeTab]);

  return (
    <div className="app min-h-screen flex flex-col bg-gray-50">
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
        isAdmin={isAdmin}
      />

      <main className="flex-grow container mx-auto px-4 py-6">
        {activeTab === 'home' && (
          <HomeTab
            setActiveTab={handleTabChange}
            handleBorrowBook={handleBorrowBook}
            isConnected={isConnected}
            isRegistered={isRegistered}
            account={account}
            connectToMetaMask={connectToMetaMask}
            disconnectWallet={disconnectWallet}
            isAdmin={isAdmin}
          />
        )}
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
          account={account}
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
        {activeTab === 'tutorial' && <TutorialTab
          setActiveTab={handleTabChange}
          isConnected={isConnected}
          connectToMetaMask={connectToMetaMask}
        />}
        {activeTab === 'transactions' && <TransactionsAdmin />}
      </main>

      <Footer setActiveTab={handleTabChange} isAdmin={isAdmin} />

      {notification && <Notification notification={notification} setNotification={setNotification} />}
      {isLoading && <LoadingIndicator />}

      {/* Composant Toaster pour les notifications toast */}
      <Toaster position="bottom-center" toastOptions={{
        className: '',
        style: {
          background: '#fff',
          color: '#333',
        },
      }} />
    </div>
  );
};

export default App;
