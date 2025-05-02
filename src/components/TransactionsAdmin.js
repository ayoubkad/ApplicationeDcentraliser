import React, { useState, useEffect } from 'react';
import web3Service from '../services/Web3Service';
import { Book, RefreshCw, AlertTriangle, BookOpen, CornerLeftUp, User, Calendar, Hash, Bug, History } from 'lucide-react';

const TransactionsAdmin = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'emprunt', 'retour'
  const [loadingMethod, setLoadingMethod] = useState('events'); // 'events', 'alternative', 'debug'
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Vérification admin et premier chargement
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // Vérifier si l'utilisateur est admin
        const admin = await web3Service.isAdmin();
        setIsAdmin(admin);
        
        if (admin) {
          await loadTransactions();
        } else {
          setError("Accès réservé aux administrateurs");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification des droits admin:", error);
        setError("Erreur de vérification des droits admin: " + error.message);
        setIsLoading(false);
      }
    };
    
    checkAdminAndLoadData();
  }, []);

  // Écouteurs d'événements pour les mises à jour en temps réel
  useEffect(() => {
    // Fonction pour gérer un nouvel emprunt
    const handleBookBorrowed = (event) => {
      console.log("Emprunt détecté dans TransactionsAdmin:", event.detail);
      // Ajouter la nouvelle transaction à la liste
      addRealTimeTransaction('emprunt', event.detail);
    };

    // Fonction pour gérer un retour
    const handleBookReturned = (event) => {
      console.log("Retour détecté dans TransactionsAdmin:", event.detail);
      // Ajouter la nouvelle transaction à la liste
      addRealTimeTransaction('retour', event.detail);
    };

    // Ajouter les écouteurs
    window.addEventListener('bookBorrowed', handleBookBorrowed);
    window.addEventListener('bookReturned', handleBookReturned);

    // Nettoyage
    return () => {
      window.removeEventListener('bookBorrowed', handleBookBorrowed);
      window.removeEventListener('bookReturned', handleBookReturned);
    };
  }, [transactions]); // dépendance aux transactions pour pouvoir les mettre à jour

  // Méthode pour ajouter une transaction en temps réel
  const addRealTimeTransaction = (type, details) => {
    const { bookId, bookDetails, transaction, oldReputation, newReputation } = details;
    
    // Formater la transaction pour l'affichage
    const newTransaction = {
      id: details.borrowId || Math.floor(Math.random() * 10000), // ID aléatoire si aucun n'est fourni
      type: type,
      bookId: bookId,
      user: web3Service.account,
      timestamp: new Date().toISOString(),
      livre: {
        title: bookDetails?.title || `Livre #${bookId}`,
        author: bookDetails?.author || 'Inconnu'
      },
      isRealTime: true // Indicateur que c'est une transaction en temps réel
    };

    // Ajouter en haut de la liste (le tri sera appliqué par filteredTransactions)
    setTransactions(prev => [newTransaction, ...prev]);
    setLastRefresh(new Date()); // Mise à jour de la date de rafraîchissement
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Mode débogage avec données fictives
      if (loadingMethod === 'debug') {
        const mockTransactions = generateMockTransactions();
        setTransactions(mockTransactions);
        setIsLoading(false);
        return;
      }
      
      // Méthode principale: utiliser les événements du contrat
      if (loadingMethod === 'events') {
        try {
          const borrowEvents = await web3Service.contract.getPastEvents('BorrowBook', {
            fromBlock: 0,
            toBlock: 'latest'
          });
          
          const returnEvents = await web3Service.contract.getPastEvents('ReturnBook', {
            fromBlock: 0,
            toBlock: 'latest'
          });
          
          // Formater et combiner les événements
          const allTransactions = await formatEventTransactions(borrowEvents, returnEvents);
          setTransactions(allTransactions);
          setIsLoading(false);
          setLastRefresh(new Date());
          return;
        } catch (eventsError) {
          console.error("Erreur lors du chargement des événements:", eventsError);
          
          // Si l'erreur indique que les événements n'existent pas, basculer vers la méthode alternative
          if (eventsError.message && (
              eventsError.message.includes("doesn't exist") || 
              eventsError.message.includes("not exist") ||
              eventsError.message.includes("Event") ||
              eventsError.message.includes("unknown event")
          )) {
            console.log("Événements non trouvés, utilisation de la méthode alternative...");
            setLoadingMethod('alternative');
            // Continuer avec la méthode alternative
          } else {
            // Pour les autres erreurs, arrêter et afficher l'erreur
            throw eventsError;
          }
        }
      }
      
      // Méthode alternative: récupérer les emprunts actuels et l'historique
      if (loadingMethod === 'alternative') {
        // Récupérer les livres actuellement empruntés par tous les utilisateurs
        const activeLoans = await loadActiveLoans();
        
        // Récupérer l'historique d'emprunt pour tous les utilisateurs
        const borrowHistory = await loadBorrowHistory();
        
        // Tenter de récupérer les données du localStorage
        const localStorageTransactions = loadFromLocalStorage();
        
        // Combiner et formater les données
        const combinedTransactions = formatAlternativeTransactions(
          activeLoans, 
          borrowHistory,
          localStorageTransactions
        );
        
        setTransactions(combinedTransactions);
        setIsLoading(false);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Erreur lors du chargement des transactions:", error);
      setError("Erreur lors du chargement des transactions: " + error.message);
      setIsLoading(false);
    }
  };

  // Récupérer les transactions stockées dans localStorage
  const loadFromLocalStorage = () => {
    try {
      const transactionsJson = localStorage.getItem('libraryTransactions');
      if (transactionsJson) {
        return JSON.parse(transactionsJson);
      }
    } catch (error) {
      console.warn("Erreur lors de la lecture des transactions depuis localStorage:", error);
    }
    return [];
  };

  // Formater les transactions à partir des événements
  const formatEventTransactions = async (borrowEvents, returnEvents) => {
    // Formater les emprunts
    const formattedBorrows = await Promise.all(borrowEvents.map(async (event) => {
      const { borrowId, bookId, user, timestamp } = event.returnValues;
      
      // Récupérer les infos du livre
      const bookDetails = await getBookDetails(bookId);
      
      return {
        id: borrowId,
        type: 'emprunt',
        bookId: bookId,
        user: user,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        livre: bookDetails,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
    }));
    
    // Formater les retours
    const formattedReturns = await Promise.all(returnEvents.map(async (event) => {
      const { borrowId, bookId, user, timestamp } = event.returnValues;
      
      // Récupérer les infos du livre
      const bookDetails = await getBookDetails(bookId);
      
      return {
        id: borrowId,
        type: 'retour',
        bookId: bookId,
        user: user,
        timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
        livre: bookDetails,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
    }));
    
    // Combiner et trier par date (plus récent d'abord)
    return [...formattedBorrows, ...formattedReturns].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  // Récupérer les livres actuellement empruntés pour la méthode alternative
  const loadActiveLoans = async () => {
    try {
      // Tenter d'abord avec getAllActiveLoans
      let activeLoanIds = [];
      try {
        activeLoanIds = await web3Service.callViewMethod('getAllActiveLoans', []);
      } catch (error) {
        console.warn("getAllActiveLoans n'est pas disponible, tentative avec des méthodes alternatives...");
        
        // Si cette méthode échoue, essayer obtenir une liste d'utilisateurs et vérifier leurs emprunts
        try {
          const users = await web3Service.callViewMethod('getRegisteredUsers', []).catch(() => []);
          for (const user of users) {
            const userLoans = await web3Service.getUserActiveLoans(user).catch(() => []);
            activeLoanIds = [...activeLoanIds, ...userLoans.map(loan => loan.id)];
          }
        } catch (error) {
          console.warn("Impossibe de récupérer les emprunts actifs via les utilisateurs:", error);
        }
        
        // En dernier recours, vérifier les livres
        try {
          const bookCount = await web3Service.getBookCount().catch(() => 0);
          for (let i = 1; i <= bookCount; i++) {
            const book = await web3Service.getBook(i).catch(() => null);
            if (book && !book.isAvailable && book.currentBorrowId) {
              activeLoanIds.push(book.currentBorrowId);
            }
          }
        } catch (error) {
          console.warn("Impossible de récupérer les emprunts actifs via les livres:", error);
        }
      }
      
      if (!activeLoanIds || activeLoanIds.length === 0) {
        return [];
      }
      
      // Pour chaque ID d'emprunt actif, récupérer les détails
      const detailedLoans = await Promise.all(activeLoanIds.map(async (loanId) => {
        try {
          const loanDetails = await web3Service.callViewMethod('getBorrowDetails', [loanId])
            .catch(async () => {
              // Si getBorrowDetails n'existe pas, récupérer les détails autrement
              try {
                // Essayer de récupérer via l'historique d'emprunt
                const allHistory = await web3Service.getUserBorrowHistory(web3Service.account)
                  .catch(() => []);
                
                const matchingLoan = allHistory.find(h => h.borrowId == loanId);
                if (matchingLoan) {
                  return {
                    bookId: matchingLoan.bookId,
                    borrower: web3Service.account,
                    borrowTime: matchingLoan.borrowTime,
                    returned: matchingLoan.returned
                  };
                }
              } catch (error) {
                console.warn(`Impossible de récupérer les détails du prêt ${loanId} via l'historique:`, error);
              }
              
              return null;
            });
          
          if (!loanDetails) return null;
          
          // Récupérer les détails du livre
          const bookDetails = await getBookDetails(loanDetails.bookId);
          
          return {
            id: loanId,
            type: 'emprunt',
            bookId: loanDetails.bookId,
            user: loanDetails.borrower,
            timestamp: new Date(parseInt(loanDetails.borrowTime) * 1000).toISOString(),
            livre: bookDetails,
            active: true,
            // Pas de blockNumber ou transactionHash dans cette méthode
          };
        } catch (error) {
          console.warn(`Erreur lors de la récupération des détails de l'emprunt ${loanId}:`, error);
          return null;
        }
      }));
      
      // Filtrer les valeurs null
      return detailedLoans.filter(loan => loan !== null);
    } catch (error) {
      console.error("Erreur lors du chargement des emprunts actifs:", error);
      return [];
    }
  };

  // Récupérer l'historique des emprunts pour la méthode alternative
  const loadBorrowHistory = async () => {
    try {
      // Obtenir la liste des utilisateurs enregistrés
      const registeredUsers = await web3Service.callViewMethod('getRegisteredUsers', [])
        .catch(() => {
          // Si la méthode n'existe pas, utiliser l'utilisateur actuel
          console.warn("getRegisteredUsers n'existe pas, utilisation de l'utilisateur actuel uniquement");
          return web3Service.account ? [web3Service.account] : [];
        });
      
      if (!registeredUsers || registeredUsers.length === 0) {
        return [];
      }
      
      // Pour chaque utilisateur, récupérer son historique d'emprunt
      const allHistory = [];
      
      for (const user of registeredUsers) {
        try {
          const userHistory = await web3Service.getUserBorrowHistory(user);
          
          if (userHistory && userHistory.length > 0) {
            // Convertir chaque entrée d'historique en transaction
            for (const entry of userHistory) {
              try {
                const bookDetails = await getBookDetails(entry.bookId);
                
                // Ajouter l'emprunt
                allHistory.push({
                  id: entry.borrowId,
                  type: 'emprunt',
                  bookId: entry.bookId,
                  user: user,
                  timestamp: new Date(parseInt(entry.borrowTime) * 1000).toISOString(),
                  livre: bookDetails
                });
                
                // Si le livre a été retourné, ajouter également le retour
                if (entry.returned) {
                  allHistory.push({
                    id: entry.borrowId,
                    type: 'retour',
                    bookId: entry.bookId,
                    user: user,
                    timestamp: entry.returnTime ? new Date(parseInt(entry.returnTime) * 1000).toISOString() : 
                                              new Date(parseInt(entry.borrowTime) * 1000 + 86400000).toISOString(),
                    livre: bookDetails
                  });
                }
              } catch (entryError) {
                console.warn(`Erreur lors du traitement de l'entrée d'historique:`, entryError);
              }
            }
          }
        } catch (userError) {
          console.warn(`Erreur lors de la récupération de l'historique de l'utilisateur ${user}:`, userError);
        }
      }
      
      return allHistory;
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique d'emprunt:", error);
      return [];
    }
  };

  // Formater les transactions pour la méthode alternative
  const formatAlternativeTransactions = (activeLoans, borrowHistory, localStorageTransactions = []) => {
    // Combiner les trois listes
    const combined = [...activeLoans, ...borrowHistory, ...localStorageTransactions];
    
    // Éliminer les doublons potentiels (basés sur id et type)
    const uniqueMap = new Map();
    
    for (const transaction of combined) {
      const key = `${transaction.id}-${transaction.type}`;
      // Si le même emprunt/retour existe déjà, garder celui avec plus d'informations
      if (!uniqueMap.has(key) || !uniqueMap.get(key).timestamp) {
        uniqueMap.set(key, transaction);
      }
    }
    
    // Convertir la map en array et trier par date
    return Array.from(uniqueMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Obtenir les détails d'un livre (réutilisable)
  const getBookDetails = async (bookId) => {
    let bookDetails = { title: `Livre #${bookId}`, author: 'Inconnu' };
    
    try {
      const book = await web3Service.getBook(bookId);
      if (book) {
        bookDetails = {
          title: book.title || `Livre #${bookId}`,
          author: book.author || 'Inconnu'
        };
      }
    } catch (err) {
      console.warn(`Impossible de récupérer les détails du livre ${bookId}:`, err);
    }
    
    return bookDetails;
  };

  // Générer des transactions fictives pour le mode débogage
  const generateMockTransactions = () => {
    const now = new Date();
    const books = [
      { id: 1, title: "L'Art de la Guerre", author: "Sun Tzu" },
      { id: 2, title: "1984", author: "George Orwell" },
      { id: 3, title: "Le Petit Prince", author: "Antoine de Saint-Exupéry" },
      { id: 4, title: "Dune", author: "Frank Herbert" }
    ];
    
    const users = [
      "0x123456789012345678901234567890123456abcd",
      "0xabcdef1234567890123456789012345678901234",
      web3Service.account || "0x0000000000000000000000000000000000000000"
    ];
    
    const mockTransactions = [];
    
    // Générer 10 transactions fictives
    for (let i = 1; i <= 10; i++) {
      const book = books[Math.floor(Math.random() * books.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const daysAgo = Math.floor(Math.random() * 15);
      const type = i % 3 === 0 ? 'retour' : 'emprunt'; // 2/3 emprunts, 1/3 retours
      
      const mockTimestamp = new Date(now);
      mockTimestamp.setDate(mockTimestamp.getDate() - daysAgo);
      
      mockTransactions.push({
        id: i,
        type: type,
        bookId: book.id,
        user: user,
        timestamp: mockTimestamp.toISOString(),
        livre: {
          title: book.title,
          author: book.author
        },
        isMock: true // Indicateur que c'est une transaction fictive
      });
    }
    
    // Trier par date (plus récent d'abord)
    return mockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };
  
  // Filtrer les transactions selon le type choisi
  const filteredTransactions = activeFilter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === activeFilter);
  
  // Formatage de l'adresse
  const formatAddress = (address) => {
    if (!address) return 'Adresse inconnue';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Formatage de la date
  const formatDate = (isoDate) => {
    if (!isoDate) return 'Date inconnue';
    const date = new Date(isoDate);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Changer la méthode de chargement et recharger
  const switchLoadingMethod = () => {
    // Rotation entre les trois modes
    const methods = ['events', 'alternative', 'debug'];
    const currentIndex = methods.indexOf(loadingMethod);
    const nextIndex = (currentIndex + 1) % methods.length;
    const newMethod = methods[nextIndex];
    
    setLoadingMethod(newMethod);
    setIsLoading(true);
    setTimeout(() => {
      loadTransactions();
    }, 100);
  };

  // Mise à jour du dernier rafraîchissement
  const formatLastRefresh = () => {
    return lastRefresh.toLocaleTimeString('fr-FR');
  };

  // Affichage conditionnel selon les droits admin
  if (!isAdmin && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Accès restreint</h2>
            <p className="text-gray-600">
              Seuls les administrateurs peuvent consulter les transactions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <h2 className="text-white text-xl font-bold flex items-center">
          <History className="h-5 w-5 mr-2" />
          Historique des transactions
        </h2>
        <p className="text-purple-100 text-sm">Suivez tous les emprunts et retours de livres</p>
      </div>
      
      {/* Filtres */}
      <div className="bg-gray-50 px-6 py-3 border-b flex flex-wrap items-center justify-between">
        <div className="flex space-x-2 mb-2 md:mb-0">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          <button 
            onClick={() => setActiveFilter('emprunt')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'emprunt' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Emprunts
          </button>
          <button 
            onClick={() => setActiveFilter('retour')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeFilter === 'retour' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Retours
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={loadTransactions}
            className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded text-sm font-medium hover:bg-indigo-100 transition flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </button>
          <button 
            onClick={switchLoadingMethod}
            className={`px-3 py-1 rounded text-sm font-medium flex items-center transition ${
              loadingMethod === 'events' 
                ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                : loadingMethod === 'alternative'
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title={
              loadingMethod === 'events' 
                ? "Mode Événements: utilise les événements du contrat" 
                : loadingMethod === 'alternative'
                  ? "Mode Alternatif: utilise les méthodes d'appel direct"
                  : "Mode Débogage: affiche des données fictives"
            }
          >
            {loadingMethod === 'debug' && <Bug className="h-4 w-4 mr-1" />}
            Mode: {loadingMethod === 'events' ? 'Événements' : loadingMethod === 'alternative' ? 'Alternatif' : 'Débogage'}
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <div className="font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Erreur
            </div>
            <div className="text-sm mt-1">{error}</div>
            <div className="mt-3 flex space-x-2">
              <button 
                onClick={switchLoadingMethod}
                className="text-xs bg-white text-red-600 px-2 py-1 border border-red-300 rounded hover:bg-red-50"
              >
                Essayer la méthode {
                  loadingMethod === 'events' 
                    ? 'alternative' 
                    : loadingMethod === 'alternative' 
                      ? 'de débogage' 
                      : 'des événements'
                }
              </button>
              <button 
                onClick={loadTransactions}
                className="text-xs bg-white text-blue-600 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Réessayer
              </button>
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4">📚</div>
            <p>Aucune transaction à afficher</p>
            <p className="text-sm mt-2">
              {loadingMethod === 'events' 
                ? "Essayez la méthode alternative pour vérifier s'il y a des données disponibles" 
                : loadingMethod === 'alternative'
                  ? "Essayez le mode débogage pour afficher des exemples fictifs"
                  : "Les données de débogage n'ont pas pu être générées"}
            </p>
            <div className="mt-4 flex justify-center space-x-2">
              <button 
                onClick={switchLoadingMethod}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-sm flex items-center"
              >
                Essayer la méthode {
                  loadingMethod === 'events' 
                    ? 'alternative' 
                    : loadingMethod === 'alternative' 
                      ? 'de débogage' 
                      : 'des événements'
                }
              </button>
              <button 
                onClick={loadTransactions}
                className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualiser
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-1" />
                      ID
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Book className="h-4 w-4 mr-1" />
                      Type
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Utilisateur
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Livre
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Date
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={`${transaction.type}-${transaction.id || index}-${transaction.blockNumber || index}`}
                      className={`hover:bg-gray-50 transition ${
                        transaction.isRealTime ? 'animate-pulse bg-green-50' : 
                        transaction.isMock ? 'bg-amber-50/30' : ''
                      }`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.id || `—`}
                      {transaction.isRealTime && (
                        <span className="ml-2 text-xs text-green-600 font-medium">(Nouveau)</span>
                      )}
                      {transaction.isMock && (
                        <span className="ml-2 text-xs text-amber-600 font-medium">(Exemple)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === 'emprunt' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.type === 'emprunt' ? 
                          <><BookOpen className="h-3 w-3 mr-1" /> Emprunt</> : 
                          <><CornerLeftUp className="h-3 w-3 mr-1" /> Retour</>}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" title={transaction.user}>
                        {formatAddress(transaction.user)}
                        {transaction.user === web3Service.account && (
                          <span className="ml-2 text-xs text-blue-600 font-medium">(Vous)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.livre.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.livre.author}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Footer avec stats */}
      {!isLoading && !error && (
        <div className="bg-gray-50 px-6 py-3 border-t">
          <div className="flex flex-wrap justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-indigo-600">{transactions.length}</span> transactions au total
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-blue-600">
                  {transactions.filter(tx => tx.type === 'emprunt').length}
                </span> emprunts
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-green-600">
                  {transactions.filter(tx => tx.type === 'retour').length}
                </span> retours
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-2 md:mt-0">
              <div className="text-xs text-gray-500">
                Dernière mise à jour: {formatLastRefresh()}
              </div>
              <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                Mode: 
                <span className={`font-medium ml-1 ${
                  loadingMethod === 'events' 
                    ? 'text-purple-600'
                    : loadingMethod === 'alternative'
                      ? 'text-blue-600'
                      : 'text-amber-600'
                }`}>
                  {loadingMethod === 'events' ? 'Événements' : loadingMethod === 'alternative' ? 'Alternatif' : 'Débogage'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsAdmin; 