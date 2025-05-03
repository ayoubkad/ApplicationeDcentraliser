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
    <div className="flex flex-col min-h-screen">
      {/* Hero section avec l'image de bibliothèque comme arrière-plan */}
      <div className="relative bg-cover bg-center h-[500px] mb-10 overflow-hidden" 
           style={{ 
             backgroundImage: "url('/assets/images/library-background.jpg')",
           }}>
        <div className="absolute inset-0 bg-[#2A3B8C]/70"></div>
        <div className="relative container mx-auto px-4 py-20 h-full flex items-center">
          <div className="max-w-2xl text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Bibliothèque Universitaire Décentralisée
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Une solution moderne pour emprunter et gérer des livres universitaires 
              avec transparence et sécurité grâce à la blockchain.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="bg-[#FFD700] text-[#2A3B8C] px-6 py-3 rounded-md font-semibold shadow-lg hover:bg-yellow-400 transition flex items-center"
                onClick={() => setActiveTab('catalog')}
                aria-label="Explorer le catalogue de livres"
              >
                Explorer le catalogue
                <ArrowRight size={20} className="ml-2" />
              </button>

              {!currentAccount && (
                <button
                  className="text-white bg-white/20 hover:bg-white/30 px-6 py-3 rounded-md transition flex items-center font-medium shadow-lg backdrop-blur-sm"
                  onClick={handleConnectToMetaMask}
                >
                  <User size={20} className="mr-2" />
                  Se connecter avec MetaMask
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
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

        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Book size={26} className="mr-2 text-[#2A3B8C]" />
          Livres récemment ajoutés
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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

        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <CheckCircle size={26} className="mr-2 text-[#2A3B8C]" />
          Comment ça marche
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition border border-gray-100">
            <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <User size={32} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">1. Inscrivez-vous</h3>
            <p className="text-gray-600">Connectez votre portefeuille et inscrivez-vous comme étudiant ou professeur.</p>
            {isConnected && !isRegistered && (
              <button
                className="mt-4 px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition"
                onClick={() => setActiveTab('login')}
              >
                S'inscrire maintenant
              </button>
            )}
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition border border-gray-100">
            <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Book size={32} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">2. Empruntez</h3>
            <p className="text-gray-600">Parcourez le catalogue et empruntez les livres qui vous intéressent.</p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition border border-gray-100">
            <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={32} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">3. Retournez</h3>
            <p className="text-gray-600">Retournez les livres avant la date limite pour maintenir votre réputation.</p>
          </div>
        </div>

        {(!isConnected || !isRegistered) && (
          <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white rounded-lg shadow-md p-8 mt-4 mb-8">
            <h2 className="text-2xl font-bold mb-3">Prêt à emprunter des livres ?</h2>
            <p className="mb-6 text-lg">L'inscription est rapide et vous donne un accès immédiat à notre bibliothèque entière.</p>
            <div className="flex flex-wrap gap-3">
              {!isConnected ? (
                <button
                  className="bg-white text-blue-800 px-6 py-3 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition flex items-center"
                  onClick={handleConnectToMetaMask}
                >
                  <User size={20} className="mr-2" />
                  Se connecter d'abord
                </button>
              ) : !isRegistered ? (
                <button
                  className="bg-yellow-500 text-white px-6 py-3 rounded-md font-semibold shadow-sm hover:bg-yellow-600 transition flex items-center"
                  onClick={() => setActiveTab('login')}
                >
                  <UserPlus size={20} className="mr-2" />
                  Compléter mon inscription
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Bibliothèque Universitaire Décentralisée. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Note pour l'installation: Placer l'image de la bibliothèque dans le dossier public/assets/images/ avec le nom library-background.jpg */}
    </div>
  );
};

export default HomeTab;