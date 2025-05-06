import React, { useState, useEffect } from 'react';
import { User, Book, CheckCircle, ArrowRight, UserPlus, Loader, Clock } from 'lucide-react';
import web3Service from '../services/Web3Service';
import ipfsService from '../services/IPFSService';

// Supposons que vous avez un fichier d'ABI pour votre contrat
// Importez-le ici ou définissez-le directement
const BookContractABI = [
  // Exemple d'ABI minimal - à remplacer par votre vrai ABI
  {
    "inputs": [],
    "name": "getRecentBooksByAdmin",
    "outputs": [
      {
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "title", "type": "string" },
          { "name": "author", "type": "string" },
          { "name": "category", "type": "string" },
          { "name": "imageUrl", "type": "string" },
          { "name": "addedByAdmin", "type": "bool" }
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Adresse de votre contrat intelligent
const CONTRACT_ADDRESS = '0x123456789...'; // À remplacer par votre adresse réelle

const HomeTab = ({ setActiveTab, handleBorrowBook, isConnected, isRegistered, account, connectToMetaMask: propConnectToMetaMask, disconnectWallet, isAdmin }) => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentBooks, setRecentBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Fonction utilitaire pour déterminer la couleur selon la catégorie
  const getCategoryColor = (category) => {
    const categoryColors = {
      'Informatique': 'blue',
      'Économie': 'green',
      'Sciences': 'red',
      'Technologie': 'purple',
      'Littérature': 'yellow',
      'Histoire': 'orange',
      'Médecine': 'teal',
      'Droit': 'indigo',
      // Ajoutez d'autres catégories selon vos besoins
    };
    
    return categoryColors[category] || 'gray';
  };

  // Fonction pour récupérer les livres récents ajoutés par l'admin
  const fetchRecentBooks = async () => {
    setLoadingBooks(true);
    setErrorMessage("");
    
    try {
      // Initialiser le service Web3
      await web3Service.initialize();
      
      // Récupérer tous les livres
      const allBooks = await web3Service.getBooks();
      
      // Filtrer pour obtenir les 4 livres les plus récents (les derniers dans l'array)
      const recent = allBooks.slice(-4).reverse();
      
      // Formater les données pour l'affichage avec traitement des images IPFS
      const formattedBooks = await Promise.all(recent.map(async book => {
        // Déterminer l'URL de l'image à partir du hash IPFS
        let imageUrl = "/assets/images/default-book.jpg";
        
        // Utiliser coverImageHash en priorité, puis ipfsHash comme fallback
        const imageHash = book.coverImageHash || book.ipfsHash;
        
        if (imageHash) {
          try {
            // Générer l'URL de l'image à partir du hash IPFS
            const ipfsUrl = await ipfsService.generateIPFSImageUrl(imageHash);
            if (ipfsUrl) {
              imageUrl = ipfsUrl;
            }
          } catch (error) {
            console.warn(`Erreur lors de la génération de l'URL IPFS pour l'image du livre ${book.id}:`, error);
          }
        }
        
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category || 'Général',
          categoryColor: getCategoryColor(book.category || 'Général'),
          imageUrl: imageUrl,
          coverImageHash: imageHash // Conserver le hash pour toute utilisation ultérieure
        };
      }));
      
      // Mettre à jour l'état avec les livres récupérés
      setRecentBooks(formattedBooks);
      setLoadingBooks(false);
      
    } catch (error) {
      console.error("Erreur lors de la récupération des livres récents:", error);
      setErrorMessage("Impossible de charger les livres récents. " + error.message);
      setLoadingBooks(false);
      
      // Si une erreur se produit, utiliser des données de démonstration temporaires
      setTimeout(() => {
        const mockBooks = [
          {
            id: 1,
            title: "Architecture des Systèmes Distribués",
            author: "Prof. Ahmed Benali",
            category: "Informatique",
            categoryColor: "blue",
            imageUrl: "/assets/images/book-1.jpg"
          },
          {
            id: 2, 
            title: "Finance Quantitative",
            author: "Dr. Sophia Chen",
            category: "Économie",
            categoryColor: "green",
            imageUrl: "/assets/images/book-2.jpg"
          },
          {
            id: 3,
            title: "Physique Quantique Avancée",
            author: "Dr. Richard Feynman",
            category: "Sciences",
            categoryColor: "red",
            imageUrl: "/assets/images/book-3.jpg"
          },
          {
            id: 4,
            title: "Éthique et IA",
            author: "Dr. Claire Dubois",
            category: "Technologie",
            categoryColor: "purple",
            imageUrl: "/assets/images/book-4.jpg"
          }
        ];
        setRecentBooks(mockBooks);
        setLoadingBooks(false);
      }, 1000);
    }
  };

  useEffect(() => {
    fetchRecentBooks();
  }, []);

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
        {isConnected && !isRegistered && !isAdmin && (
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

        {/* Section des livres récents */}
        <div className="container mx-auto px-4 mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <Clock size={26} className="mr-2 text-[#2A3B8C]" />
            Livres récemment ajoutés
          </h2>
          
          {loadingBooks ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="h-8 w-8 text-[#2A3B8C] animate-spin" />
              <span className="ml-3 text-lg text-gray-600">Chargement des livres...</span>
            </div>
          ) : errorMessage ? (
            <div className="text-center py-8 bg-red-50 rounded-lg">
              <p className="text-red-500 text-lg">{errorMessage}</p>
            </div>
          ) : recentBooks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">Aucun livre récent disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentBooks.map((book, index) => (
                <div key={`history-${book.id}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img 
                      src={book.imageUrl} 
                      alt={book.title} 
                      className="w-full h-full object-cover transform hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-2 text-gray-800">{book.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">Par {book.author}</p>
                    <div className="flex justify-between items-center">
                      <span className={`bg-${book.categoryColor}-100 text-${book.categoryColor}-800 px-2 py-1 rounded text-xs`}>
                        {book.category}
                      </span>
                      <button 
                        className="text-sm text-[#2A3B8C] hover:text-blue-700 font-medium"
                        onClick={() => setActiveTab('catalog')}
                      >
                        Voir détails
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              className="px-5 py-2 bg-[#2A3B8C] text-white font-medium rounded-md hover:bg-blue-800 transition inline-flex items-center"
              onClick={() => setActiveTab('catalog')}
            >
              Voir tout le catalogue
              <ArrowRight size={16} className="ml-2" />
            </button>
          </div>
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
            {isConnected && !isRegistered && !isAdmin && (
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

        {(!isConnected || (!isRegistered && !isAdmin)) && (
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
              ) : (!isRegistered && !isAdmin) ? (
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