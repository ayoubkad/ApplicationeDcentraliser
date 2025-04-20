import React, { useState } from 'react';
import { User, Book, CheckCircle, ArrowRight, UserPlus, Loader } from 'lucide-react';
import BookCard from './common/BookCard';

const recentBooks = [
  { id: 1, title: "Principes d'Économie", author: "Gregory Mankiw", isAvailable: true, ipfsHash: "QmX...", category: "Économie", pageCount: 528, publishedDate: "2019-05-10", isbn: "978-2-7590-2369-1" },
  { id: 2, title: "Introduction à l'Algorithmique", author: "Thomas Cormen", isAvailable: false, ipfsHash: "QmY...", category: "Informatique", pageCount: 752, publishedDate: "2015-03-22", isbn: "978-2-1007-2998-7" },
  { id: 3, title: "Physique Quantique", author: "Claude Cohen-Tannoudji", isAvailable: true, ipfsHash: "QmZ...", category: "Sciences", pageCount: 624, publishedDate: "2018-09-15", isbn: "978-2-1007-1288-0" },
  { id: 4, title: "Histoire de l'Art", author: "Ernst Gombrich", isAvailable: true, ipfsHash: "QmA...", category: "Art", pageCount: 412, publishedDate: "2020-01-30", isbn: "978-2-0814-1212-2" }
];

const HomeTab = ({ setActiveTab, handleBorrowBook, isConnected, isRegistered, account, connectToMetaMask: propConnectToMetaMask, disconnectWallet }) => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectToMetaMask = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setCurrentAccount(accounts[0]);
        console.log('Connected account:', accounts[0]);
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
      }
    } else {
      alert('MetaMask non détecté. Veuillez installer MetaMask pour continuer.');
    }
  };

  const handleRegistration = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveTab('login');
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[#2A3B8C] text-[#F8F9FA] rounded-lg shadow-md overflow-hidden mb-8">
        <div className="md:flex">
          <div className="p-8 md:w-1/2">
            <h1 className="text-3xl font-bold mb-4">Bibliothèque Universitaire Décentralisée</h1>
            <p className="mb-6">Une solution moderne pour emprunter et gérer des livres universitaires avec transparence et sécurité grâce à la blockchain.</p>
            <div className="flex flex-wrap gap-3">
              <button
                className="bg-[#FFD700] text-[#2A3B8C] px-6 py-2 rounded-md font-semibold shadow-sm hover:bg-yellow-400 transition flex items-center"
                onClick={() => setActiveTab('catalog')}
                aria-label="Explorer le catalogue de livres"
              >
                Explorer le catalogue
                <ArrowRight size={18} className="ml-2" />
              </button>

              {!currentAccount && (
                <button
                  className="text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition flex items-center"
                  onClick={handleConnectToMetaMask}
                >
                  <User size={16} className="mr-2" />
                  Se connecter avec MetaMask
                </button>
              )}
            </div>
          </div>
          <div className="md:w-1/2 h-64 bg-[#1F2D6B] flex items-center justify-center">
            <img src="/api/placeholder/600/400" alt="Bibliothèque universitaire" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      {isConnected && !isRegistered && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserPlus className="h-6 w-6 text-yellow-600" aria-hidden="true" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-yellow-800">Complétez votre inscription</h3>
              <p className="mt-2 text-sm text-yellow-700">
                Pour emprunter des livres, vous devez finaliser votre inscription. Cela ne prendra que quelques secondes.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white ${
                    isLoading ? 'bg-yellow-400' : 'bg-yellow-600 hover:bg-yellow-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500`}
                  onClick={handleRegistration}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      S'inscrire maintenant
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-4">Livres récemment ajoutés</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {recentBooks.map(book => (
          <BookCard 
            key={book.id} 
            book={book} 
            handleBorrowBook={handleBorrowBook}
            isConnected={isConnected}
            isRegistered={isRegistered}
          />
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">Comment ça marche</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <User size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">1. Inscrivez-vous</h3>
          <p className="text-gray-600">Connectez votre portefeuille et inscrivez-vous comme étudiant ou professeur.</p>
          {isConnected && !isRegistered && (
            <button
              className="mt-3 px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition"
              onClick={() => setActiveTab('login')}
            >
              S'inscrire maintenant
            </button>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Book size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">2. Empruntez</h3>
          <p className="text-gray-600">Parcourez le catalogue et empruntez les livres qui vous intéressent.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">3. Retournez</h3>
          <p className="text-gray-600">Retournez les livres avant la date limite pour maintenir votre réputation.</p>
        </div>
      </div>

      {(!isConnected || !isRegistered) && (
        <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-bold mb-2">Prêt à emprunter des livres ?</h2>
          <p className="mb-4">L'inscription est rapide et vous donne un accès immédiat à notre bibliothèque entière.</p>
          <div className="flex flex-wrap gap-3">
            {!isConnected ? (
              <button
                className="bg-white text-blue-800 px-6 py-2 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition flex items-center"
                onClick={handleConnectToMetaMask}
              >
                <User size={18} className="mr-2" />
                Se connecter d'abord
              </button>
            ) : !isRegistered ? (
              <button
                className="bg-yellow-500 text-white px-6 py-2 rounded-md font-semibold shadow-sm hover:bg-yellow-600 transition flex items-center"
                onClick={() => setActiveTab('login')}
              >
                <UserPlus size={18} className="mr-2" />
                Compléter mon inscription
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeTab;