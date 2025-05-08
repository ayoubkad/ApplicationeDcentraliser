import React, { useState, useEffect } from 'react';
import web3Service from '../services/Web3Service';
import { Book, RefreshCw, AlertTriangle, BookOpen, CornerLeftUp, User, Calendar, Hash, Bug, History, X, Info, Database } from 'lucide-react';

const TransactionsAdmin = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'emprunt', 'retour'
  const [loadingMethod, setLoadingMethod] = useState('events'); // 'events', 'alternative', 'debug'
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [userFilter, setUserFilter] = useState('all'); // 'all', 'current', 'students', 'teachers'
  const [searchTerm, setSearchTerm] = useState('');
  const [userRoles, setUserRoles] = useState({}); // Map pour stocker les rôles des utilisateurs
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Vérification admin et premier chargement
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // Vérifier si l'utilisateur est admin
        const admin = await web3Service.isAdmin();
        setIsAdmin(admin);

        if (admin) {
          // Charger les données en parallèle pour améliorer les performances
          await Promise.all([
            loadTransactions(),
            loadUserRoles()
          ]);
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

    // Vérifier la validité des données reçues
    if (!bookId) {
      console.warn("addRealTimeTransaction: bookId manquant", details);
      return;
    }

    // Identifiant unique pour éviter les doublons
    const transactionId = details.borrowId ||
                           details.transactionId ||
                           `${type}-${bookId}-${Date.now()}`;

    // Formater la transaction pour l'affichage
    const newTransaction = {
      id: transactionId,
      type: type,
      bookId: bookId,
      user: details.user || web3Service.account,
      timestamp: new Date().toISOString(),
      livre: {
        title: bookDetails?.title || `Livre #${bookId}`,
        author: bookDetails?.author || 'Inconnu'
      },
      isRealTime: true // Indicateur que c'est une transaction en temps réel
    };

    // Vérifier si cette transaction n'existe pas déjà dans la liste
    setTransactions(prev => {
      // Vérifier si l'ID existe déjà
      const exists = prev.some(tx =>
        tx.id === newTransaction.id &&
        tx.type === newTransaction.type
      );

      if (exists) {
        console.log(`Transaction ${type} avec ID ${transactionId} déjà dans la liste`);
        return prev;
      }

      // Ajouter en haut de la liste (le tri sera appliqué par filteredTransactions)
      return [newTransaction, ...prev];
    });

    setLastRefresh(new Date()); // Mise à jour de la date de rafraîchissement
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mode débogage avec données fictives
      if (loadingMethod === 'debug') {
        console.log("Mode débogage activé, génération de transactions fictives");
        const mockTransactions = generateMockTransactionsData();
        setTransactions(mockTransactions);
        setIsLoading(false);
        return;
      }

      let allTransactions = [];
      let methodUsed = '';

      // Essayer d'abord la méthode directe - nouvelle tentative
      try {
        methodUsed = 'direct';
        console.log("Tentative de récupération directe de toutes les transactions...");

        // Essayer de récupérer directement toutes les transactions
        const directTxs = await web3Service.callViewMethod('getAllTransactions', [], {
          gas: 5000000,
          timeoutBlocks: 100
        }).catch(() => null);

        if (directTxs && Array.isArray(directTxs) && directTxs.length > 0) {
          console.log("Récupération directe réussie, traitement des transactions:", directTxs.length);

          // Traitement des transactions directes
          allTransactions = await Promise.all(directTxs.map(async (tx) => {
            const bookDetails = await getBookDetails(tx.bookId);
            return {
              id: tx.id || tx.borrowId || `tx-${Date.now()}`,
              type: tx.returned ? 'retour' : 'emprunt',
              bookId: tx.bookId,
              user: tx.user,
              timestamp: new Date(parseInt(tx.timestamp) * 1000).toISOString(),
              livre: bookDetails
            };
          }));
        } else {
          console.log("Méthode directe échouée, aucune transaction récupérée");
          throw new Error("Aucune transaction directe disponible");
        }
      } catch (directError) {
        // Si la méthode directe échoue, essayer avec les événements
        try {
          methodUsed = 'events';
          console.log("Tentative avec les événements du contrat...");

          if (loadingMethod === 'events' || loadingMethod === 'alternative') {
            // Récupérer tous les événements d'emprunt
            const borrowEvents = await web3Service.contract.getPastEvents('BorrowBook', {
              fromBlock: 0,
              toBlock: 'latest'
            }).catch(e => {
              console.warn("Erreur lors de la récupération des événements d'emprunt:", e);
              return [];
            });

            // Récupérer tous les événements de retour
            const returnEvents = await web3Service.contract.getPastEvents('ReturnBook', {
              fromBlock: 0,
              toBlock: 'latest'
            }).catch(e => {
              console.warn("Erreur lors de la récupération des événements de retour:", e);
              return [];
            });

            console.log(`Événements récupérés: ${borrowEvents.length} emprunts, ${returnEvents.length} retours`);

            if (borrowEvents.length > 0 || returnEvents.length > 0) {
              // Si des événements sont trouvés, les formater
              allTransactions = await formatEventTransactions(borrowEvents, returnEvents);
              console.log(`Transactions formatées à partir des événements: ${allTransactions.length}`);
            } else {
              // Si aucun événement n'est trouvé, passer à la méthode alternative
              throw new Error("Aucun événement trouvé");
            }
          } else {
            throw new Error("Méthode événements non utilisée");
          }
        } catch (eventsError) {
          // Si les événements échouent également, utiliser la méthode alternative
          try {
            methodUsed = 'alternative';
            console.log("Tentative avec la méthode alternative...");

            // Récupérer les emprunts actifs
            const activeLoans = await loadActiveLoans();
            console.log(`Emprunts actifs récupérés: ${activeLoans.length}`);

            // Récupérer l'historique d'emprunt
            const borrowHistory = await loadBorrowHistory();
            console.log(`Historique d'emprunts récupéré: ${borrowHistory.length}`);

            // Récupérer les transactions du localStorage
            const localTransactions = loadFromLocalStorage();
            console.log(`Transactions du localStorage récupérées: ${localTransactions.length}`);

            // Combiner toutes les sources de données
            allTransactions = formatAlternativeTransactions(
              activeLoans,
              borrowHistory,
              localTransactions
            );

            console.log(`Transactions combinées avec méthode alternative: ${allTransactions.length}`);

            if (allTransactions.length === 0) {
              throw new Error("Aucune transaction trouvée avec la méthode alternative");
            }
          } catch (alternativeError) {
            // Si tout échoue, passer au mode débogage
            methodUsed = 'debug';
            console.log("Toutes les méthodes ont échoué, passage au mode débogage");
            console.warn("Erreurs:", { directError, eventsError, alternativeError });

            // Générer des transactions fictives
            allTransactions = generateMockTransactionsData();
            setLoadingMethod('debug');

            // Enregistrer l'erreur pour informer l'utilisateur
            setError("Impossible de charger les vraies transactions. Affichage de données d'exemple.");
          }
        }
      }

      console.log(`Total des transactions chargées: ${allTransactions.length} (méthode: ${methodUsed})`);

      // Assurons-nous que nous avons toujours des transactions à afficher
      if (allTransactions.length === 0) {
        console.warn("Aucune transaction n'a été chargée, passage au mode débogage de secours");
        allTransactions = generateMockTransactionsData();
        setLoadingMethod('debug');
        setError("Aucune transaction trouvée. Affichage de données d'exemple.");
      }

      // Mettre à jour l'état avec les transactions chargées
      setTransactions(allTransactions);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erreur critique lors du chargement des transactions:", error);
      setError(`Erreur lors du chargement des transactions: ${error.message}`);

      // En cas d'erreur critique, générer quand même des données de démo
      const mockData = generateMockTransactionsData();
      setTransactions(mockData);
      setLoadingMethod('debug');
    } finally {
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
    console.log("Formatage d'événements:", {
      emprunts: borrowEvents.length,
      retours: returnEvents.length
    });

    const transactions = [];

    // Traiter les événements d'emprunt
    for (const event of borrowEvents) {
      try {
        const eventValues = event.returnValues;
        if (!eventValues) {
          console.warn("Événement d'emprunt sans returnValues:", event);
          continue;
        }

        // Vérifier et extraire l'ID du livre
        const bookId = eventValues.bookId || eventValues._bookId;

        if (bookId === undefined || bookId === null) {
          console.warn("Événement d'emprunt sans ID de livre valide:", eventValues);
          continue;
        }

        console.log(`Traitement de l'événement d'emprunt pour le livre ${bookId}`);

        // Récupérer les détails du livre
        const bookDetails = await getBookDetails(bookId);

        // Récupérer l'emprunteur et l'identifiant d'emprunt
        const borrower = eventValues.user || eventValues._user || event.returnValues[1];
        const borrowId = eventValues.borrowId || eventValues._borrowId || `borrow-${event.transactionHash}-${bookId}`;

        // Déterminer le timestamp
        let timestamp;
        if (event.timestamp) {
          timestamp = new Date(parseInt(event.timestamp) * 1000).toISOString();
        } else if (event.blockNumber) {
          // Récupérer le timestamp du bloc si disponible
          try {
            const block = await web3Service.web3.eth.getBlock(event.blockNumber);
            timestamp = new Date(parseInt(block.timestamp) * 1000).toISOString();
          } catch (blockError) {
            console.warn(`Impossible de récupérer le timestamp du bloc ${event.blockNumber}:`, blockError);
            timestamp = new Date().toISOString(); // Fallback: date actuelle
          }
        } else {
          timestamp = new Date().toISOString(); // Fallback: date actuelle
        }

        // Ajouter la transaction d'emprunt
        transactions.push({
          id: borrowId,
          type: 'emprunt',
          bookId: bookId,
          user: borrower,
          timestamp: timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          livre: bookDetails
        });
      } catch (error) {
        console.warn(`Erreur lors du traitement d'un événement d'emprunt:`, error, event);
      }
    }

    // Traiter les événements de retour
    for (const event of returnEvents) {
      try {
        const eventValues = event.returnValues;
        if (!eventValues) {
          console.warn("Événement de retour sans returnValues:", event);
          continue;
        }

        // Vérifier et extraire l'ID du livre
        const bookId = eventValues.bookId || eventValues._bookId;

        if (bookId === undefined || bookId === null) {
          console.warn("Événement de retour sans ID de livre valide:", eventValues);
          continue;
        }

        console.log(`Traitement de l'événement de retour pour le livre ${bookId}`);

        // Récupérer les détails du livre
        const bookDetails = await getBookDetails(bookId);

        // Récupérer l'emprunteur et l'identifiant d'emprunt
        const borrower = eventValues.user || eventValues._user || event.returnValues[1];
        const borrowId = eventValues.borrowId || eventValues._borrowId || `return-${event.transactionHash}-${bookId}`;

        // Déterminer le timestamp
        let timestamp;
        if (event.timestamp) {
          timestamp = new Date(parseInt(event.timestamp) * 1000).toISOString();
        } else if (event.blockNumber) {
          // Récupérer le timestamp du bloc si disponible
          try {
            const block = await web3Service.web3.eth.getBlock(event.blockNumber);
            timestamp = new Date(parseInt(block.timestamp) * 1000).toISOString();
          } catch (blockError) {
            console.warn(`Impossible de récupérer le timestamp du bloc ${event.blockNumber}:`, blockError);
            timestamp = new Date().toISOString(); // Fallback: date actuelle
          }
        } else {
          timestamp = new Date().toISOString(); // Fallback: date actuelle
        }

        // Ajouter la transaction de retour
        transactions.push({
          id: `${borrowId}-return`,
          type: 'retour',
          bookId: bookId,
          user: borrower,
          timestamp: timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          livre: bookDetails
        });
      } catch (error) {
        console.warn(`Erreur lors du traitement d'un événement de retour:`, error, event);
      }
    }

    // Trier les transactions par date
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Transactions formatées: ${transactions.length}`);
    return transactions;
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
      const processedBorrowIds = new Set(); // Pour éviter les doublons

      for (const user of registeredUsers) {
        try {
          let userHistory = [];

          // Essayer d'abord avec getUserBorrowHistory
          try {
            userHistory = await web3Service.getUserBorrowHistory(user);
          } catch (historyError) {
            console.warn(`Impossible de récupérer l'historique de ${user} via getUserBorrowHistory:`, historyError);

            // Essayer une méthode alternative: getBorrowsHistory (nom alternatif possible)
            try {
              userHistory = await web3Service.callViewMethod('getBorrowsHistory', [user]).catch(() => []);
            } catch (alternativeError) {
              console.warn(`Méthode alternative également échouée pour ${user}:`, alternativeError);
            }
          }

          if (userHistory && userHistory.length > 0) {
            // Convertir chaque entrée d'historique en transaction
            for (const entry of userHistory) {
              try {
                // Vérifier si l'entrée est valide
                if (!entry || typeof entry !== 'object') {
                  console.warn("Entrée d'historique invalide:", entry);
                  continue;
                }

                // Vérifier si cet emprunt a déjà été traité
                if (!entry.borrowId || processedBorrowIds.has(entry.borrowId)) {
                  continue;
                }
                processedBorrowIds.add(entry.borrowId);

                // Vérifier si bookId existe
                if (entry.bookId === undefined || entry.bookId === null) {
                  console.warn(`Emprunt ${entry.borrowId} sans ID de livre valide:`, entry);
                  continue;
                }

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
                  // Vérifier si la date de retour semble valide
                  const returnTime = entry.returnTime && parseInt(entry.returnTime) > 0
                    ? parseInt(entry.returnTime) * 1000
                    : parseInt(entry.borrowTime) * 1000 + 86400000; // Fallback: emprunté + 1 jour

                  allHistory.push({
                    id: `${entry.borrowId}-return`,
                    type: 'retour',
                    bookId: entry.bookId,
                    user: user,
                    timestamp: new Date(returnTime).toISOString(),
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

      console.log(`Historique d'emprunts chargé: ${allHistory.length} transactions au total`);
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
    // Vérifier si bookId est undefined ou invalide
    if (bookId === undefined || bookId === null) {
      console.warn("getBookDetails: bookId est undefined ou null");
      return { title: "Livre inconnu", author: "Auteur inconnu" };
    }

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
  const generateMockTransactionsData = () => {
    // Création de données de test pour le débogage
    const mockBooks = [
      { id: 1, title: "Le Seigneur des Anneaux", author: "J.R.R. Tolkien" },
      { id: 2, title: "Harry Potter", author: "J.K. Rowling" },
      { id: 3, title: "1984", author: "George Orwell" },
      { id: 4, title: "Le Petit Prince", author: "Antoine de Saint-Exupéry" },
      { id: 5, title: "Dune", author: "Frank Herbert" }
    ];

    const mockUsers = [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
      "0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c",
      web3Service.account || "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"
    ];

    // Création des transactions aléatoires
    const transactions = [];
    for (let i = 0; i < 20; i++) {
      const book = mockBooks[Math.floor(Math.random() * mockBooks.length)];
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const isReturn = Math.random() > 0.6; // 40% de retours
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30)); // Date aléatoire dans les 30 derniers jours

      transactions.push({
        id: `mock-${i}`,
        type: isReturn ? 'retour' : 'emprunt',
        bookId: book.id,
        user: user,
        timestamp: timestamp.toISOString(),
        livre: book
      });
    }

    // Ajouter quelques transactions pour l'utilisateur actuel
    const currentUser = web3Service.account;
    if (currentUser) {
      const userBook = mockBooks[0];
      transactions.push({
        id: `mock-user-1`,
        type: 'emprunt',
        bookId: userBook.id,
        user: currentUser,
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 heures avant
        livre: userBook
      });

      transactions.push({
        id: `mock-user-2`,
        type: 'retour',
        bookId: userBook.id,
        user: currentUser,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 heures avant
        livre: userBook
      });
    }

    // Tri par date décroissante
    return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Fonction pour charger les rôles des utilisateurs
  const loadUserRoles = async () => {
    try {
      const users = await web3Service.callViewMethod('getRegisteredUsers', []).catch(() => []);
      const roleMap = {};

      // Utiliser Promise.all pour exécuter les requêtes en parallèle
      const rolePromises = users.map(async (user) => {
        try {
          // Essayer d'obtenir le rôle (professeur ou étudiant)
          const isTeacher = await web3Service.callViewMethod('isTeacher', [user]).catch(() => false);
          roleMap[user] = isTeacher ? 'teacher' : 'student';
        } catch (error) {
          console.warn(`Impossible de déterminer le rôle de l'utilisateur ${user}:`, error);
          roleMap[user] = 'unknown';
        }
      });

      await Promise.all(rolePromises);
      setUserRoles(roleMap);
    } catch (error) {
      console.warn("Erreur lors du chargement des rôles des utilisateurs:", error);
    }
  };

  // Formatage de l'adresse - déplacé avant son utilisation
  const formatAddress = (address) => {
    if (!address) return 'Adresse inconnue';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Appliquer les filtres de recherche et pagination
  const applyFilters = () => {
    let filtered = [...transactions];

    // Filtrer par type de transaction
    if (activeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === activeFilter);
    }

    // Filtrer par utilisateur
    if (userFilter === 'current') {
      filtered = filtered.filter(tx => tx.user === web3Service.account);
    } else if (userFilter === 'students') {
      filtered = filtered.filter(tx => userRoles[tx.user] === 'student');
    } else if (userFilter === 'teachers') {
      filtered = filtered.filter(tx => userRoles[tx.user] === 'teacher');
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.livre.title.toLowerCase().includes(term) ||
        tx.livre.author.toLowerCase().includes(term) ||
        formatAddress(tx.user).toLowerCase().includes(term) ||
        tx.id.toString().includes(term)
      );
    }

    return filtered;
  };

  // Obtenir les transactions filtrées et paginées
  const filteredTransactions = applyFilters();
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  // Obtenir une étiquette pour le rôle de l'utilisateur
  const getUserRoleLabel = (user) => {
    const role = userRoles[user];
    if (!role) return null;

    if (role === 'teacher') {
      return <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Professeur</span>;
    } else if (role === 'student') {
      return <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Étudiant</span>;
    }
    return null;
  };

  // Mettre à jour les données lors du changement de page ou de filtres
  useEffect(() => {
    setCurrentPage(1); // Réinitialiser la page lors du changement de filtres
  }, [activeFilter, searchTerm]);

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

  // Message explicatif pour les données
  const renderDataSourceMessage = () => {
    if (loadingMethod === 'debug' && transactions.some(tx => tx.isMock)) {
      return (
        <div className="text-xs text-center mt-2 bg-yellow-50 p-2 rounded-lg text-yellow-700">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Mode de démonstration activé. Seules les transactions réelles sont affichées.
        </div>
      );
    }
    return null;
  };

  // Bouton pour forcer le mode de démonstration
  const ForceDebugButton = () => (
    <div className="flex justify-center mb-4 mt-2">
      <button
        onClick={() => {
          setLoadingMethod('debug');
          const mockTransactions = generateMockTransactionsData();
          setTransactions(mockTransactions);
          setError("Mode démonstration activé. Les données affichées sont des exemples.");
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <Bug className="h-4 w-4" />
        Générer des données de démonstration
      </button>
    </div>
  );

  // Utilisation du hook useEffect pour afficher un debug à l'initialisation si nécessaire
  useEffect(() => {
    if (process.env.REACT_APP_DEBUG_TRANSACTIONS === 'true') {
      console.log("Debug transactions activé via variable d'environnement");
      setLoadingMethod('debug');
      const mockTransactions = generateMockTransactionsData();
      setTransactions(mockTransactions);
      setError("Mode démonstration automatique via configuration");
    }
  }, []);

  // Rendu principal du composant
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-red-700">Accès non autorisé</h2>
          </div>
          <p className="mt-2 text-red-600">
            Vous n'avez pas les droits d'accès pour visualiser l'historique des transactions.
            Seuls les administrateurs peuvent accéder à cette section.
          </p>
        </div>
        <ForceDebugButton />
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
        <p className="text-purple-100 text-sm flex items-center">
          <span>Journal complet des emprunts et retours par tous les utilisateurs</span>
          {isLoading ? (
            <span className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full flex items-center">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Chargement...
            </span>
          ) : (
            <span className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
              {transactions.length} transactions
            </span>
          )}
        </p>
      </div>

      {/* Statistiques rapides */}
      {!isLoading && !error && transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-b from-gray-50 to-white">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total Transactions</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-2xl font-bold text-gray-800">{transactions.length}</div>
              <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                <History className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Emprunts</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-2xl font-bold text-blue-600">{transactions.filter(tx => tx.type === 'emprunt').length}</div>
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Retours</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-2xl font-bold text-green-600">{transactions.filter(tx => tx.type === 'retour').length}</div>
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <CornerLeftUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Utilisateurs</div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(transactions.map(tx => tx.user)).size}
              </div>
              <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                {Object.values(userRoles).filter(role => role === 'teacher').length} profs
              </span>
              <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                {Object.values(userRoles).filter(role => role === 'student').length} étudiants
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Barre de recherche */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher un livre, utilisateur..."
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                       bg-white transition-all duration-200 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher dans les transactions"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtres par type de transaction */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type de transaction</label>
            <div className="flex space-x-2">
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
          </div>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Livre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTransactions.map((tx) => (
              <tr key={tx.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tx.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tx.type === 'emprunt' ? 'Emprunt' : 'Retour'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tx.livre.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatAddress(tx.user)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatDate(tx.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-4 border-t">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {currentPage} de {totalPages}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-200"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              className="px-3 py-1 rounded-full text-sm font-medium text-gray-500 hover:bg-gray-200"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsAdmin;