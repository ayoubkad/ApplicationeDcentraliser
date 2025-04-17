import React, { useState, useEffect } from 'react';
import { User, BookOpen, Shield, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import web3Service from '../services/Web3Service';

const LoginTab = ({ setActiveTab, showNotification, setIsLoading }) => {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('0'); // 0 = étudiant, 1 = professeur
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [metamaskAvailable, setMetamaskAvailable] = useState(true);
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'connecting', 'registering', 'success'
  const [ethereumAddress, setEthereumAddress] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  
  // Vérifier si MetaMask est disponible et configurer les écouteurs d'événements
  useEffect(() => {
    // Vérifier si MetaMask est installé
    const isMetaMaskInstalled = web3Service.isMetaMaskInstalled();
    setMetamaskAvailable(isMetaMaskInstalled);
    
    if (!isMetaMaskInstalled) {
      showNotification("MetaMask n'est pas installé. Veuillez l'installer pour vous inscrire.", "warning");
      return;
    }
    
    // Vérifier si l'utilisateur est déjà connecté à MetaMask
    const checkConnection = async () => {
      const isConnected = await web3Service.checkIfConnected();
      if (isConnected) {
        setEthereumAddress(web3Service.getAccount());
        const network = web3Service.getNetworkDetails();
        setNetworkInfo(network);
        
        if (!network.supported) {
          showNotification(`Réseau non supporté: ${network.name}. Veuillez changer de réseau.`, "warning");
        }
      }
    };
    
    checkConnection();
    
    // Configurer les écouteurs d'événements personnalisés
    const handleAccountChanged = (e) => {
      setEthereumAddress(e.detail.account);
      showNotification("Compte MetaMask changé", "info");
      
      if (currentStep !== 'form') {
        setCurrentStep('form');
      }
    };
    
    const handleNetworkChanged = (e) => {
      setNetworkInfo({
        id: e.detail.networkId,
        name: e.detail.networkName,
        supported: web3Service.isNetworkSupported()
      });
      
      if (!web3Service.isNetworkSupported()) {
        showNotification(`Réseau non supporté: ${e.detail.networkName}. Veuillez changer de réseau.`, "warning");
      } else {
        showNotification(`Réseau changé: ${e.detail.networkName}`, "info");
      }
    };
    
    const handleDisconnect = () => {
      setEthereumAddress('');
      setNetworkInfo(null);
      setCurrentStep('form');
      showNotification("Déconnecté de MetaMask", "info");
    };
    
    // Ajouter les écouteurs
    window.addEventListener('metamaskAccountChanged', handleAccountChanged);
    window.addEventListener('metamaskNetworkChanged', handleNetworkChanged);
    window.addEventListener('metamaskDisconnected', handleDisconnect);
    
    // Nettoyer les écouteurs lors du démontage
    return () => {
      window.removeEventListener('metamaskAccountChanged', handleAccountChanged);
      window.removeEventListener('metamaskNetworkChanged', handleNetworkChanged);
      window.removeEventListener('metamaskDisconnected', handleDisconnect);
    };
  }, [showNotification, currentStep]);
  
  // Validation du formulaire - Étape 1: Vérification des champs obligatoires
  const validateForm = () => {
    const newErrors = {};
    
    if (!metamaskAvailable) {
      newErrors.metamask = "MetaMask est requis pour s'inscrire";
    }
    
    if (!userName.trim()) {
      newErrors.userName = "Le nom est obligatoire";
    } else if (userName.trim().length < 3) {
      newErrors.userName = "Le nom doit comporter au moins 3 caractères";
    }
    
    // Vérifier si le réseau est supporté
    if (networkInfo && !networkInfo.supported) {
      newErrors.network = `Réseau non supporté: ${networkInfo.name}`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Étape 2: Demande de connexion et signature à MetaMask
  const connectToMetaMask = async () => {
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
      
      // Vérifier le réseau mais ne pas bloquer si non supporté
      const network = web3Service.getNetworkDetails();
      setNetworkInfo(network);
      
      if (!network.supported) {
        showNotification(`Réseau ${network.name} détecté. Certaines fonctionnalités pourraient être limitées.`, "warning");
        // On continue quand même, sans bloquer
      } else {
        showNotification("Adresse Ethereum authentifiée: " + web3Service.shortenAddress(account), "success");
      }
      
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
    
    try {
      setIsSubmitting(true);
      setIsLoading(true);
      
      // Étape 2: Connexion à MetaMask
      const connected = await connectToMetaMask();
      if (!connected) {
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }
      
      // Étape 3: Appel au contrat pour l'inscription
      setCurrentStep('registering');
      showNotification("Vérification et enregistrement sur la blockchain...", "info");
      
      const result = await web3Service.registerUser(userName, parseInt(userRole));
      
      // Étape 4: Traitement du résultat
      setCurrentStep('success');
      showNotification(`Inscription réussie en tant que ${userRole === '0' ? 'étudiant' : 'professeur'}!`, "success");
      
      // Rediriger vers la page d'accueil après inscription
      setTimeout(() => setActiveTab('home'), 2000);
      
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
        showNotification(`Réseau non supporté: ${error.networkName || 'Inconnu'}. Veuillez changer de réseau.`, "warning");
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
    
    // Afficher un avertissement pour réseau non supporté, mais ne pas bloquer
    if (networkInfo && !networkInfo.supported && currentStep === 'form') {
      return (
        <div className="bg-yellow-50 p-4 rounded-md my-4 flex items-start">
          <div className="flex-shrink-0">
            <WifiOff className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Réseau non reconnu</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Vous êtes connecté au réseau <strong>{networkInfo.name}</strong> qui n'est pas officiellement supporté.
              L'inscription pourrait quand même fonctionner, mais certaines fonctionnalités pourraient être limitées.
            </p>
          </div>
        </div>
      );
    }
    
    return null;
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
                    <div className={`w-2 h-2 rounded-full mr-2 ${networkInfo.supported ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
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
          
          <form onSubmit={registerUser} className="p-6">
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
            
            <button
              type="submit"
              disabled={isSubmitting || !metamaskAvailable || currentStep !== 'form'}
              className={`w-full ${
                isSubmitting || !metamaskAvailable || currentStep !== 'form'
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#2A3B8C] hover:bg-[#1F2D6B]'
              } text-white py-2 px-4 rounded-md font-medium transition flex items-center justify-center`}
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
                {networkInfo && networkInfo.supported && (
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