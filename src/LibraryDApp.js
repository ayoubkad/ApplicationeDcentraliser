import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import HomeTab from './HomeTab';
import CatalogTab from './CatalogTab';
import DashboardTab from './DashboardTab';
import AdminTab from './AdminTab';
import Notification from './Notification';
import LoadingIndicator from './LoadingIndicator';
import web3Service from './Web3Service';

const LibraryDApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const connectWallet = async () => {
      setIsLoading(true);
      if (window.ethereum && window.ethereum.selectedAddress) {
        const success = await web3Service.initialize();
        if (success) {
          setIsConnected(true);
          setAccount(web3Service.getAccount());
        }
      }
      setIsLoading(false);
    };
    connectWallet();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-right">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'admin' && (
          <AdminTab setNotification={setNotification} setIsLoading={setIsLoading} />
        )}
      </main>
      <Footer setActiveTab={setActiveTab} />
      <Notification notification={notification} setNotification={setNotification} />
      <LoadingIndicator isLoading={isLoading} />
    </div>
  );
};

export default LibraryDApp;