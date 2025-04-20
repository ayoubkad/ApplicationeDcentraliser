import React, { useState, useEffect } from 'react';
import { User, BookOpen, Shield, AlertTriangle, CheckCircle, WifiOff, UserPlus, AlertCircle } from 'lucide-react';
import web3Service from '../services/Web3Service';

// Renommer la prop pour éviter le conflit avec la fonction locale
const LoginTab = ({ setActiveTab, showNotification, setIsLoading, isConnected, account, connectToMetaMask: externalConnectToMetaMask }) => {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('0'); // 0 = étudiant, 1 = professeur
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [metamaskAvailable, setMetamaskAvailable] = useState(true);
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'connecting', 'registering', 'success'
  const [ethereumAddress, setEthereumAddress] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [redirectSource, setRedirectSource] = useState('');
  
  useEffect(() => {
    // Vérifier si on est redirigé depuis une tentative d'emprunt
    const checkRedirectReason = () => {
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      if (source === 'borrow') {
        setRedirectSource('borrow');
      }
    };
    
    checkRedirectReason();
    
    // Vérifier si MetaMask est installé
    const checkMetaMask = async () => {
      const detected = typeof window.ethereum !== 'undefined';
      setMetamaskAvailable(detected);
      
      if (detected && isConnected && account) {
        // Déjà connecté, récupérer les informations du compte
        setEthereumAddress(account);
        
        // Récupérer les informations du réseau
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdNumber = parseInt(chainId, 16);
          
          let name = 'Réseau inconnu';
          let supported = false;
          
          // Définir les réseaux supportés
          switch (chainIdNumber) {
            case 1:
              name = 'Ethereum Mainnet';
              supported = true;
              break;
            case 11155111:
              name = 'Sepolia Testnet';
              supported = true;
              break;
            case 80001:
              name = 'Mumbai Testnet';
              supported = true;
              break;
            case 137:
              name = 'Polygon Mainnet';
              supported = true;
              break;
            case 1337:
              name = 'Ganache Local';
              supported = true;
              break;
            default:
              name = `Réseau ${chainIdNumber}`;
              supported = true; // Tous les réseaux sont maintenant supportés
          }
          
          setNetworkInfo({ chainId: chainIdNumber, name, supported });
        } catch (error) {
          console.error("Erreur lors de la récupération du réseau:", error);
          setNetworkInfo({ chainId: 0, name: 'Inconnu', supported: true });
        }
      }
    };
    
    checkMetaMask();
    
    // Définir des écouteurs d'événements personnalisés pour la communication
    const handleAccountChanged = (accounts) => {
      if (accounts && accounts.length > 0) {
        setEthereumAddress(accounts[0]);
      } else {
        setEthereumAddress('');
      }
    };
    
    const handleNetworkChanged = (chainId) => {
      const chainIdNumber = parseInt(chainId, 16);
      
      let name = 'Réseau inconnu';
      let supported = false;
      
      // Définir les réseaux supportés
      switch (chainIdNumber) {
        case 1:
          name = 'Ethereum Mainnet';
          supported = true;
          break;
        case 11155111:
          name = 'Sepolia Testnet';
          supported = true;
          break;
        case 80001:
          name = 'Mumbai Testnet';
          supported = true;
          break;
        case 137:
          name = 'Polygon Mainnet';
          supported = true;
          break;
        case 1337:
          name = 'Ganache Local';
          supported = true;
          break;
        default:
          name = `Réseau ${chainIdNumber}`;
          supported = true; // Tous les réseaux sont maintenant supportés
      }
      
      setNetworkInfo({ chainId: chainIdNumber, name, supported });
    };
    
    const handleDisconnect = () => {
      setEthereumAddress('');
      setNetworkInfo(null);
      setCurrentStep('form');
      showNotification("Déconnecté de MetaMask", "info");
    };
    
    // Écouter l'événement de nettoyage des données
    const handleUserDataCleared = () => {
      setEthereumAddress('');
      setNetworkInfo(null);
      setCurrentStep('form');
      setErrors({});
      showNotification("Les données utilisateur ont été nettoyées avec succès", "success");
    };
    
    // Ajouter les écouteurs
    window.addEventListener('metamaskAccountChanged', handleAccountChanged);
    window.addEventListener('metamaskNetworkChanged', handleNetworkChanged);
    window.addEventListener('metamaskDisconnected', handleDisconnect);
    window.addEventListener('userDataCleared', handleUserDataCleared);
    
    // Vérifier si on est redirigé depuis une tentative d'emprunt (via événement personnalisé)
    const checkBorrowRedirect = (event) => {
      setRedirectSource('borrow');
    };
    window.addEventListener('borrowRedirect', checkBorrowRedirect);
    
    // Nettoyer les écouteurs lors du démontage
    return () => {
      window.removeEventListener('metamaskAccountChanged', handleAccountChanged);
      window.removeEventListener('metamaskNetworkChanged', handleNetworkChanged);
      window.removeEventListener('metamaskDisconnected', handleDisconnect);
      window.removeEventListener('borrowRedirect', checkBorrowRedirect);
      window.removeEventListener('userDataCleared', handleUserDataCleared);
    };
  }, [showNotification, currentStep, isConnected, account]);
  
  // Validation du formulaire - Étape 1: Vérification des champs obligatoires
  const validateForm = () => {
    console.log("Validation du formulaire avec nom:", userName, "rôle:", userRole);
    const newErrors = {};
    
    // Vérification de la présence de MetaMask
    if (!metamaskAvailable) {
      console.error("MetaMask n'est pas installé");
      newErrors.metamask = "MetaMask est requis pour s'inscrire";
    }
    
    // Vérification du nom d'utilisateur
    if (!userName || !userName.trim()) {
      console.error("Le nom est vide");
      newErrors.userName = "Le nom est obligatoire";
    } else if (userName.trim().length < 3) {
      console.error("Le nom est trop court:", userName.trim().length);
      newErrors.userName = "Le nom doit comporter au moins 3 caractères";
    } else if (userName.trim().length > 50) {
      console.error("Le nom est trop long:", userName.trim().length);
      newErrors.userName = "Le nom ne doit pas dépasser 50 caractères";
    }
    
    // Vérification du rôle
    if (userRole !== '0' && userRole !== '1') {
      console.error("Rôle invalide:", userRole);
      newErrors.role = "Veuillez sélectionner un rôle valide";
    }
    
    // Mettre à jour les erreurs et retourner le résultat de validation
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log("Résultat de validation:", isValid, newErrors);
    return isValid;
  };
  
  // Étape 2: Demande de connexion et signature à MetaMask
  const connectToMetaMaskLocal = async () => {
    if (!validateForm()) {
      return false;
    }
    
    setCurrentStep('connecting');
    showNotification("Demande de connexion à MetaMask...", "info");
    
    try {
      await web3Service.initialize();
      const account = web3Service.getAccount();
      
      if (!account) {
        showNotification("Échec de connexion à MetaMask", "error");
        setCurrentStep('form');
        return false;
      }
      
      setEthereumAddress(account);
      
      // Vérifier le réseau
      const network = web3Service.getNetworkDetails();
      setNetworkInfo(network);
      
      showNotification("Adresse Ethereum authentifiée: " + web3Service.shortenAddress(account), "success");
      
      return true;
    } catch (error) {
      console.error("Erreur de connexion MetaMask:", error);
      showNotification("Erreur lors de la connexion à MetaMask: " + 
        (error.message || "Veuillez vérifier que MetaMask est déverrouillé"), "error");
      setCurrentStep('form');
      return false;
    }
  };
  
  // Processus complet d'inscription
  const registerUser = async (e) => {
    e.preventDefault();
    
    // Valider le formulaire avant de continuer
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsLoading(true);
      
      // Étape 2: Connexion à MetaMask si pas déjà connecté
      if (!isConnected) {
        const connected = await connectToMetaMaskLocal();
        if (!connected) {
          setIsSubmitting(false);
          setIsLoading(false);
          return;
        }
      }
      
      // Vérifier que l'adresse Ethereum est disponible
      if (!account && !ethereumAddress) {
        showNotification("Aucune adresse Ethereum détectée. Veuillez vous connecter à MetaMask.", "error");
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }
      
      // Étape 3: Appel au contrat pour l'inscription
      setCurrentStep('registering');
      showNotification("Vérification et enregistrement sur la blockchain...", "info");
      
      // Utiliser l'adresse du compte connecté
      const currentAccount = account || ethereumAddress;
      console.log("Compte utilisé pour l'inscription:", currentAccount);
      
      const result = await web3Service.registerUser(userName, parseInt(userRole));
      
      // Étape 4: Traitement du résultat
      setCurrentStep('success');
      showNotification(`Inscription réussie en tant que ${userRole === '0' ? 'étudiant' : 'professeur'}!`, "success");
      
      // Déclencher un événement personnalisé pour informer l'application de la nouvelle inscription
      window.dispatchEvent(new CustomEvent('userRegistered', { 
        detail: { 
          account: currentAccount,
          userName: userName,
          userRole: parseInt(userRole)
        } 
      }));
      
      // Rediriger vers la page appropriée après inscription
      setTimeout(() => {
        if (redirectSource === 'borrow') {
          setActiveTab('catalog');
        } else {
          setActiveTab('home');
        }
      }, 2000);
      
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      
      // Traitement des différents cas d'erreur selon le diagramme
      if (error.code === "USER_EXISTS" || (error.message && error.message.includes("User already exists"))) {
        showNotification("Cet utilisateur est déjà inscrit", "error");
      } else if (error.code === "INVALID_ROLE" || (error.message && error.message.includes("Invalid role"))) {
        showNotification("Rôle non autorisé", "error");
      } else if (error.code === 4001) {
        showNotification("Transaction refusée. Veuillez réessayer et confirmer dans MetaMask.", "warning");
      } else if (error.code === 'UNSUPPORTED_NETWORK') {
        showNotification(`Erreur réseau: ${error.networkName || 'Inconnu'}. Veuillez réessayer.`, "warning");
      } else {
        showNotification("Erreur lors de l'inscription: " + error.message, "error");
      }
      
      setCurrentStep('form');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };
  
  // Affichage du statut actuel
  const renderStatusStep = () => {
    if (currentStep === 'connecting') {
      return (
        <div className="bg-blue-50 p-4 rounded-md my-4 flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Connexion à MetaMask en cours</h3>
            <p className="mt-1 text-sm text-blue-700">Veuillez confirmer la connexion dans l'extension MetaMask.</p>
          </div>
        </div>
      );
    } else if (currentStep === 'registering') {
      return (
        <div className="bg-blue-50 p-4 rounded-md my-4 flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Inscription en cours</h3>
            <p className="mt-1 text-sm text-blue-700">Vérification et enregistrement de vos données sur la blockchain.</p>
          </div>
        </div>
      );
    } else if (currentStep === 'success') {
      return (
        <div className="bg-green-50 p-4 rounded-md my-4 flex items-start">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Inscription réussie!</h3>
            <p className="mt-1 text-sm text-green-700">
              Votre compte a été créé avec succès. Redirection vers la page d'accueil...
            </p>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Fonction pour connecter à MetaMask via la prop passée 
  const handleConnectButtonClick = async () => {
    if (!metamaskAvailable) {
      showNotification("Veuillez installer MetaMask pour continuer", "warning");
      return;
    }
    
    setIsLoading(true);
    try {
      await externalConnectToMetaMask(); // Utiliser la fonction reçue des props
    } catch (error) {
      console.error("Erreur lors de la connexion à MetaMask:", error);
      showNotification("Impossible de se connecter à MetaMask", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ajouter une nouvelle fonction pour nettoyer les données utilisateur
  const handleClearUserData = () => {
    try {
      const cleared = web3Service.clearAllUserData();
      if (cleared) {
        showNotification("Les données d'inscription locales ont été supprimées. Vous pouvez maintenant vous inscrire à nouveau.", "success");
        
        // Réinitialiser l'état du composant
        setEthereumAddress('');
        setNetworkInfo(null);
        setCurrentStep('form');
        setErrors({});
        
        // Vérifier à nouveau la disponibilité de MetaMask
        if (typeof window.ethereum !== 'undefined') {
          setMetamaskAvailable(true);
        }
        
        // Afficher un guide pour rafraîchir la page si nécessaire
        setTimeout(() => {
          showNotification("Si le problème persiste, essayez de rafraîchir la page", "info");
        }, 5000);
      } else {
        showNotification("Erreur lors du nettoyage des données locales", "error");
      }
    } catch (error) {
      console.error("Erreur lors du nettoyage des données:", error);
      showNotification("Erreur: " + (error.message || "Une erreur s'est produite lors du nettoyage"), "error");
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-[#2A3B8C] text-white p-6">
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <User size={24} className="mr-2" />
              Inscription
            </h2>
            <p className="text-sm">Connectez votre portefeuille et inscrivez-vous pour accéder à la bibliothèque</p>
          </div>

          {/* Message pour les utilisateurs redirigés depuis l'emprunt */}
          {redirectSource === 'borrow' && currentStep === 'form' && (
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex">
                <div className="flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Pour emprunter des livres, veuillez d'abord vous inscrire.</strong> Nous vous recommandons de vous connecter au réseau <span className="font-bold">Sepolia Testnet</span> pour une meilleure expérience.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {!metamaskAvailable && (
            <div className="bg-red-50 p-4 border-l-4 border-red-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">MetaMask requis</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>MetaMask n'est pas installé. Veuillez <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="font-bold underline">installer MetaMask</a> pour vous inscrire à la bibliothèque.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {renderStatusStep()}
          
          {ethereumAddress && networkInfo && (
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">Connecté à</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                    <span className="text-sm font-medium">{networkInfo.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Adresse</span>
                  <div className="text-sm font-mono">{web3Service.shortenAddress(ethereumAddress)}</div>
                </div>
              </div>
            </div>
          )}
          
          <form 
            onSubmit={(e) => {
              console.log("Formulaire soumis");
              registerUser(e);
            }} 
            className="p-6"
          >
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="userName">
                Votre nom complet
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C] ${
                  errors.userName ? 'border-red-500' : ''
                }`}
                placeholder="Entrez votre nom"
                disabled={currentStep !== 'form'}
                required
              />
              {errors.userName && (
                <p className="mt-1 text-red-500 text-sm flex items-center">
                  <AlertTriangle size={14} className="mr-1" />
                  {errors.userName}
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Rôle
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`border rounded-md p-4 cursor-pointer flex flex-col items-center transition ${
                    userRole === '0' ? 'border-[#2A3B8C] bg-[#2A3B8C]/5' : 'hover:bg-gray-50'
                  } ${currentStep !== 'form' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={() => currentStep === 'form' && setUserRole('0')}
                >
                  <BookOpen size={24} className={`mb-2 ${userRole === '0' ? 'text-[#2A3B8C]' : 'text-gray-400'}`} />
                  <span className={`font-medium ${userRole === '0' ? 'text-[#2A3B8C]' : 'text-gray-700'}`}>Étudiant</span>
                </div>
                
                <div
                  className={`border rounded-md p-4 cursor-pointer flex flex-col items-center transition ${
                    userRole === '1' ? 'border-[#2A3B8C] bg-[#2A3B8C]/5' : 'hover:bg-gray-50'
                  } ${currentStep !== 'form' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={() => currentStep === 'form' && setUserRole('1')}
                >
                  <Shield size={24} className={`mb-2 ${userRole === '1' ? 'text-[#2A3B8C]' : 'text-gray-400'}`} />
                  <span className={`font-medium ${userRole === '1' ? 'text-[#2A3B8C]' : 'text-gray-700'}`}>Professeur</span>
                </div>
              </div>
            </div>
            
            {/* Connexion MetaMask */}
            {!isConnected && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Étape 1: Connecter votre portefeuille
                </label>
                <button
                  type="button"
                  className="w-full flex justify-center items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition"
                  onClick={handleConnectButtonClick}
                >
                  <img src="/metamask-fox.svg" alt="MetaMask" className="h-5 w-5 mr-2" />
                  Connecter avec MetaMask
                </button>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !metamaskAvailable || currentStep !== 'form'}
              className={`w-full ${
                isSubmitting || !metamaskAvailable || currentStep !== 'form'
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#2A3B8C] hover:bg-[#1F2D6B]'
              } text-white py-2 px-4 rounded-md font-medium transition flex items-center justify-center`}
              onClick={(e) => {
                console.log("Bouton d'inscription cliqué");
                if (!validateForm()) {
                  e.preventDefault();
                  return false;
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Inscription en cours...
                </>
              ) : (
                "S'inscrire"
              )}
            </button>
            
            <div className="mt-6 p-4 bg-[#FFD700]/10 rounded-md">
              <h3 className="text-sm font-semibold text-[#2A3B8C] mb-2">Informations importantes:</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Vous devrez confirmer la transaction dans MetaMask</li>
                <li>• L'inscription est enregistrée sur la blockchain Ethereum</li>
                <li>• Une réputation de base vous sera attribuée</li>
                <li>• Votre adresse de portefeuille servira d'identifiant</li>
                <li>• Les étudiants et professeurs ont des droits d'accès différents</li>
                {networkInfo && (
                  <li>• Réseau actuel: <span className="font-medium">{networkInfo.name}</span></li>
                )}
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginTab;