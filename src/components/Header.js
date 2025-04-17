import React, { useState } from 'react';
import { BookOpen, Menu, X, RefreshCw, LogOut } from 'lucide-react';

const Header = ({ activeTab, setActiveTab, account, isConnected, isRegistered, connectToMetaMask, refreshConnection, disconnectWallet }) => {
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

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-[#2A3B8C] mr-2">
            <BookOpen size={28} className="inline mr-2" />
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

        <div className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3 py-2 ${activeTab === 'home' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'home' ? 'page' : undefined}
          >
            Accueil
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-2 ${activeTab === 'catalog' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
          >
            Catalogue
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 ${activeTab === 'dashboard' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            Mon Espace
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-2 ${activeTab === 'admin' ? 'text-[#6A1B9A] border-b-2 border-[#6A1B9A]' : 'text-gray-600'}`}
            aria-current={activeTab === 'admin' ? 'page' : undefined}
          >
            Admin
          </button>
        </div>

        <div className="flex items-center">
          {account ? (
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={refreshConnection}
                className="text-gray-500 hover:text-[#2A3B8C] bg-gray-100 hover:bg-gray-200 p-1 rounded-full transition"
                title="Rafraîchir la connexion"
              >
                <RefreshCw size={16} />
              </button>
              
              {isRegistered ? (
                <>
                  <div className="relative">
                    <div 
                      className="bg-[#2A3B8C]/10 text-[#2A3B8C] px-3 py-1 rounded-full text-sm font-medium flex items-center cursor-pointer"
                      onClick={toggleAccountMenu}
                    >
                      <div className="w-2 h-2 rounded-full bg-[#4CAF50] mr-2"></div>
                      {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                    </div>
                    
                    {/* Menu déroulant du compte */}
                    {showAccountMenu && (
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                        onClick={handleAccountMenuClick}
                      >
                        <div className="px-4 py-2 text-xs text-gray-500">Compte connecté</div>
                        <div className="px-4 py-2 text-xs font-mono overflow-hidden text-ellipsis">{account}</div>
                        <hr className="my-1" />
                        <button
                          onClick={() => setActiveTab('dashboard')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Mon Espace
                        </button>
                        <button
                          onClick={disconnectWallet}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <LogOut size={14} className="mr-2" /> Déconnecter
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Bouton de déconnexion directement visible */}
                  <button
                    onClick={disconnectWallet}
                    className="flex items-center text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md transition"
                    title="Déconnecter"
                  >
                    <LogOut size={16} className="mr-1" />
                    <span className="hidden lg:inline">Déconnecter</span>
                  </button>
                </>
              ) : (
                <button
                  className="bg-[#FFD700] text-[#2A3B8C] px-4 py-1 rounded-md font-medium hover:bg-yellow-400 transition"
                  onClick={() => setActiveTab('login')}
                >
                  S'inscrire
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                className="bg-[#2A3B8C] text-white px-4 py-1 rounded-md font-medium hover:bg-[#1F2D6B] transition"
                onClick={connectToMetaMask}
              >
                Connecter
              </button>
              <button
                onClick={refreshConnection}
                className="text-gray-500 hover:text-[#2A3B8C] bg-gray-100 hover:bg-gray-200 p-1 rounded-full transition"
                title="Rafraîchir la connexion"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}
          <button
            className="md:hidden ml-4 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-2">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'home' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Accueil
            </button>
            <button
              onClick={() => {
                setActiveTab('catalog');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'catalog' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Catalogue
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'dashboard' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
            >
              Mon Espace
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 ${activeTab === 'admin' ? 'text-[#6A1B9A] font-medium' : 'text-gray-600'}`}
            >
              Admin
            </button>
            
            {isConnected && (
              <>
                {!isRegistered && (
                  <button
                    onClick={() => {
                      setActiveTab('login');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-[#FFD700] font-medium"
                  >
                    S'inscrire
                  </button>
                )}
                
                <button
                  onClick={() => {
                    disconnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 font-medium flex items-center"
                >
                  <LogOut size={16} className="mr-2" /> Déconnecter
                </button>
              </>
            )}
            
            {!isConnected && (
              <button
                onClick={() => {
                  connectToMetaMask();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 bg-[#2A3B8C] text-white font-medium rounded-md mt-2"
              >
                Connecter à MetaMask
              </button>
            )}
            
            <button
              onClick={() => {
                refreshConnection();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-gray-600 mt-2 flex items-center"
            >
              <RefreshCw size={16} className="mr-2" /> Rafraîchir la connexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;