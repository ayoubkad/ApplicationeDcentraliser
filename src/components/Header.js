import React, { useState, useEffect } from 'react';
import { BookOpen, Menu, X, RefreshCw, AlertCircle, User, Home, BookmarkIcon, LayoutDashboard, Settings, LogOut, History, HelpCircle } from 'lucide-react';
import web3Service from '../services/Web3Service';

const Header = ({ activeTab, setActiveTab, account, isConnected, isRegistered, connectToMetaMask, refreshConnection, disconnectWallet, showNotification, userReputation, isAdmin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Fermer le menu de compte lorsqu'on clique ailleurs
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowAccountMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Arrêter la propagation pour éviter de fermer le menu quand on clique dessus
  const handleAccountMenuClick = (e) => {
    e.stopPropagation();
  };

  // Ouvrir/fermer le menu du compte
  const toggleAccountMenu = (e) => {
    e.stopPropagation();
    setShowAccountMenu(!showAccountMenu);
  };

  // Ajouter une fonction pour connecter au réseau Ganache
  const connectToGanache = async () => {
    try {
      const success = await web3Service.addGanacheNetwork();
      if (success) {
        showNotification("Réseau Ganache local configuré avec succès. Veuillez le sélectionner dans MetaMask.", "success");
      } else {
        showNotification("Impossible d'ajouter automatiquement le réseau Ganache. Veuillez le configurer manuellement dans MetaMask.", "warning");
      }
    } catch (error) {
      console.error("Erreur lors de la connexion au réseau Ganache:", error);
      showNotification("Erreur: " + error.message, "error");
    }
  };

  // Ajouter une fonction pour afficher le diagnostic
  const showDiagnostic = async () => {
    const status = await web3Service.getConnectionStatus();
    console.log("--- DIAGNOSTIC DE CONNEXION ---");
    console.log(JSON.stringify(status, null, 2));

    // Afficher un alert avec les informations principales
    alert(`DIAGNOSTIC:

Réseau: ${status.network ? `${status.network.id} (${status.network.name})` : 'Non connecté'}
Compte: ${status.account ? status.account.address : 'Non connecté'}
Contrat: ${status.contract ? `${status.contract.address} (Code: ${status.contract.hasCode ? 'Oui' : 'Non'})` : 'Non initialisé'}
Provider: ${status.provider ? `ChainID: ${status.provider.chainId}` : 'Non détecté'}
Connecté: ${isConnected ? 'Oui' : 'Non'}
Inscrit: ${isRegistered ? 'Oui' : 'Non'}`);

    // Déboguer le problème du bouton S'inscrire
    console.log("Débogage du bouton S'inscrire:");
    console.log("- Compte:", account);
    console.log("- isConnected:", isConnected);
    console.log("- isRegistered:", isRegistered);
    console.log("- Bouton S'inscrire doit apparaître:", account && !isRegistered);
  };

  // Afficher l'adresse du compte de manière abrégée
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <header className="tab-navigation shadow-md px-4 py-3 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Barre de navigation supérieure */}
        <div className="flex justify-between items-center">
          {/* Logo et nom */}
          <div className="flex items-center">
            <div className="text-2xl font-bold text-[#2A3B8C] mr-2">
              <BookOpen size={30} className="inline mr-2 text-[#2A3B8C]" />
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('home');
                }}
                className="hover:text-[#1F2D6B] transition"
              >
                BiblioChain
              </a>
            </div>
          </div>

          {/* Navigation principale - version desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'home' ? 'bg-blue-100 text-[#2A3B8C] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Home size={18} className="mr-1" />
              <span>Accueil</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'catalog' ? 'bg-blue-100 text-[#2A3B8C] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <BookmarkIcon size={18} className="mr-1" />
              <span>Catalogue</span>
            </button>
            {/* Afficher "Mon Espace" seulement si l'utilisateur n'est pas admin */}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'dashboard' ? 'bg-blue-100 text-[#2A3B8C] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <LayoutDashboard size={18} className="mr-1" />
                <span>Mon Espace</span>
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'admin' ? 'bg-purple-100 text-[#6A1B9A] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Settings size={18} className="mr-1" />
                  <span>Admin</span>
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'transactions' ? 'bg-purple-100 text-[#6A1B9A] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Settings size={18} className="mr-1" />
                  <span>Transactions</span>
                </button>
              </>
            )}

            {/* Bouton Tutoriel - visible seulement pour les non-admins */}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('tutorial')}
                className={`flex items-center px-4 py-2 rounded-md transition ${activeTab === 'tutorial' ? 'bg-blue-100 text-[#2A3B8C] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <HelpCircle size={18} className="mr-1" />
                <span>Tutoriel</span>
              </button>
            )}

            {/* Bouton S'inscrire visible seulement si pas admin */}
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('login')}
                className={`flex items-center px-4 py-2 rounded-md transition font-medium ${activeTab === 'login' ? 'bg-yellow-200 text-yellow-800' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
              >
                <User size={18} className="mr-1" />
                <span>S'inscrire</span>
              </button>
            )}
          </div>

          {/* Section connexion et compte */}
          <div className="flex items-center">
            {account ? (
              <div className="flex items-center space-x-3">
                {/* Statut de connexion */}
                <div className="flex items-center">
                  <div className="relative">
                    <div
                      className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition ${isRegistered ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
                      onClick={toggleAccountMenu}
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${isRegistered ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      {formatAddress(account)}
                    </div>

                    {/* Menu déroulant du compte */}
                    {showAccountMenu && (
                      <div
                        className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200"
                        onClick={handleAccountMenuClick}
                      >
                        <div className="px-4 py-2 text-xs text-gray-500 border-b">Compte connecté</div>
                        <div className="px-4 py-2 text-xs font-mono overflow-hidden text-ellipsis break-all">{account}</div>
                        <div className="px-4 py-2 text-xs">
                          Statut: {isRegistered ?
                            <span className="text-green-600 font-medium">Inscrit</span> :
                            <span className="text-yellow-600 font-medium">Non inscrit</span>
                          }
                          {isAdmin && <span className="ml-2 bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs">Admin</span>}
                        </div>
                        <hr className="my-1" />

                        {/* Options de menu conditionnelles selon le rôle */}
                        {isAdmin ? (
                          <>
                            {/* Options réservées aux administrateurs */}
                            <button
                              onClick={() => setActiveTab('admin')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Settings size={16} className="inline mr-2 text-purple-600" />
                              Panel d'administration
                            </button>
                            <button
                              onClick={() => setActiveTab('transactions')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <History size={16} className="inline mr-2 text-purple-600" />
                              Journal des transactions
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Options pour les utilisateurs normaux */}
                            <button
                              onClick={() => setActiveTab('dashboard')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <LayoutDashboard size={16} className="inline mr-2 text-blue-600" />
                              Mon Espace
                            </button>

                            {/* Afficher "S'inscrire" seulement si pas inscrit */}
                            {!isRegistered && (
                              <button
                                onClick={() => setActiveTab('login')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <User size={16} className="inline mr-2 text-yellow-600" />
                                S'inscrire
                              </button>
                            )}
                          </>
                        )}

                        <hr className="my-1" />
                        {/* Lien vers le tutoriel - visible seulement pour les non-admins */}
                        {!isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('tutorial');
                              setShowAccountMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <HelpCircle size={16} className="inline mr-2 text-blue-600" />
                            Tutoriel Blockchain
                          </button>
                        )}
                        <hr className="my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectWallet();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} className="inline mr-2" />
                          Déconnecter
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Outils */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={refreshConnection}
                    className="text-gray-500 hover:text-[#2A3B8C] bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition"
                    title="Rafraîchir la connexion"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button
                    onClick={showDiagnostic}
                    className="text-gray-500 hover:text-orange-500 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition"
                    title="Diagnostic de connexion"
                  >
                    <AlertCircle size={16} />
                  </button>

                  <button
                    onClick={connectToGanache}
                    className="text-gray-500 hover:text-green-500 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition"
                    title="Connecter au réseau Ganache local"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                      <polyline points="17 2 12 7 7 2"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Bouton de connexion */}
                <button
                  className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition flex items-center"
                  onClick={connectToMetaMask}
                >
                  <span>Connecter</span>
                </button>

                {/* Outils */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={showDiagnostic}
                    className="text-gray-500 hover:text-orange-500 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition"
                    title="Diagnostic de connexion"
                  >
                    <AlertCircle size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Bouton du menu mobile */}
            <button
              className="md:hidden ml-4 text-gray-600 hover:text-gray-800 bg-gray-100 p-1.5 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-inner">
          <div className="container mx-auto px-4 py-3">
            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'home' ? 'bg-blue-100 text-[#2A3B8C]' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Home size={18} className="mr-2" /> Accueil
              </button>
              <button
                onClick={() => {
                  setActiveTab('catalog');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'catalog' ? 'bg-blue-100 text-[#2A3B8C]' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <BookmarkIcon size={18} className="mr-2" /> Catalogue
              </button>
              {/* Afficher "Mon Espace" seulement si pas admin */}
              {!isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'dashboard' ? 'bg-blue-100 text-[#2A3B8C]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <LayoutDashboard size={18} className="mr-2" /> Mon Espace
                </button>
              )}

              {/* Bouton Tutoriel - visible seulement pour les non-admins */}
              {!isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('tutorial');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'tutorial' ? 'bg-blue-100 text-[#2A3B8C]' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <HelpCircle size={18} className="mr-2" /> Tutoriel
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'admin' ? 'bg-purple-100 text-[#6A1B9A]' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Settings size={18} className="mr-2" /> Admin
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('transactions');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center w-full px-3 py-2 rounded-md ${activeTab === 'transactions' ? 'bg-purple-100 text-[#6A1B9A]' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Settings size={18} className="mr-2" /> Transactions
                  </button>
                </>
              )}

              <div className="pt-2 border-t">
                {/* Bouton d'inscription seulement si pas admin */}
                {!isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('login');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center w-full px-3 py-2.5 mt-2 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  >
                    <User size={18} className="mr-2" /> S'inscrire
                  </button>
                )}

                {/* Bouton de diagnostic */}
                <button
                  onClick={() => {
                    showDiagnostic();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 mt-2 rounded-md text-gray-600 hover:bg-gray-100"
                >
                  <AlertCircle size={18} className="mr-2" /> Diagnostic
                </button>

                {/* Bouton de déconnexion pour mobile */}
                {isConnected && (
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 mt-2 rounded-md text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} className="mr-2" /> Déconnecter
                  </button>
                )}
              </div>

              {/* Section compte (si connecté) */}
              {account && (
                <div className="mt-3 pt-2 border-t">
                  <div className="px-3 py-1 text-sm text-gray-500">Compte connecté</div>
                  <div className="px-3 py-1 text-xs font-mono break-all">{account}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;