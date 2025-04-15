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

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Afficher une notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Fonction pour se connecter à MetaMask
  const connectToMetaMask = async () => {
    try {
      setIsLoading(true);
      const success = await web3Service.initialize();
      if (success) {
        setIsConnected(true);
        setAccount(web3Service.getAccount());
        const registered = await web3Service.isUserRegistered();
        setIsRegistered(registered);
        
        if (registered) {
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          showNotification("Connexion réussie à votre portefeuille", "success");
        } else {
          showNotification("Veuillez vous inscrire pour utiliser toutes les fonctionnalités", "warning");
        }
      } else {
        showNotification("Connexion au portefeuille échouée. Veuillez installer MetaMask.", "error");
      }
    } catch (error) {
      console.error("Erreur lors de la connexion à MetaMask:", error);
      showNotification("Erreur lors de la connexion: " + error.message, "error");
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
        connectToMetaMask={connectToMetaMask}
      />
      
      <main className="flex-grow">
        {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} handleBorrowBook={handleBorrowBook} />}
        {activeTab === 'catalog' && <CatalogTab handleBorrowBook={handleBorrowBook} />}
        {activeTab === 'dashboard' && <DashboardTab setActiveTab={setActiveTab} handleReturnBook={handleReturnBook} userReputation={userReputation} />}
        {activeTab === 'admin' && <AdminTab setNotification={setNotification} setIsLoading={setIsLoading} />}
      </main>
      
      <Footer setActiveTab={setActiveTab} />
      
      {notification && <Notification notification={notification} setNotification={setNotification} />}
      {isLoading && <LoadingIndicator isLoading={isLoading} />}
    </div>
  );
};

export default App;
