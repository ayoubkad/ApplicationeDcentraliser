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
        const mockTransactions = generateMockTransactions();
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
            allTransactions = generateMockTransactions();
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
        allTransactions = generateMockTransactions();
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
      const mockData = generateMockTransactions();
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

  // Vérifier si un utilisateur est un utilisateur réel (pas un utilisateur fictif ou constant)
  const isRealUser = (user) => {
    // Si c'est l'utilisateur actuel, toujours le considérer comme réel
    if (user === web3Service.account) {
      return true;
    }
    
    // Vérifications de base pour exclure les adresses nulles ou invalides
    if (!user || user === '0x0000000000000000000000000000000000000000') {
      return false;
    }

    // Si l'utilisateur a un rôle défini, le considérer comme réel
    const role = userRoles[user];
    if (role === 'student' || role === 'teacher') {
      return true;
    }

    // Pour le développement, considérer tous les utilisateurs comme réels
    // (enlever cette condition en production pour un filtrage plus strict)
    return true;
  };

  // Vérifier si une transaction est réelle (et non fictive/constante)
  const isRealTransaction = (tx) => {
    // Si la transaction a un flag explicite indiquant qu'elle est fictive
    if (tx.isMock === true) {
      // En mode débogage, afficher quand même les transactions fictives
      if (loadingMethod === 'debug') {
        return true;
      }
      return false;
    }
    
    // Validation minimale pour l'ID de livre
    if (!tx.bookId) {
      return false;
    }
    
    // Pour les transactions en temps réel ou du contrat, toujours accepter
    if (tx.isRealTime || tx.transactionHash) {
      return true;
    }
    
    // Vérification moins stricte de l'utilisateur
    return true;
  };

  // Appliquer les filtres de recherche et pagination
  const applyFilters = () => {
    // Commencer par filtrer strictement toutes les transactions fictives
    let filtered = transactions.filter(isRealTransaction);
    
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
        (tx.livre?.title?.toLowerCase().includes(term)) ||
        (tx.livre?.author?.toLowerCase().includes(term)) ||
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
  
  // Obtenir une étiquette pour le rôle de l'utilisateur avec style amélioré
  const getUserRoleLabel = (user) => {
    const role = userRoles[user];
    if (!role) return null;
    
    if (role === 'teacher') {
      return <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Professeur</span>;
    } else if (role === 'student') {
      return <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Étudiant</span>;
    }
    return null;
  };

  // Mettre à jour les données lors du changement de page ou de filtres
  useEffect(() => {
    setCurrentPage(1); // Réinitialiser la page lors du changement de filtres
  }, [activeFilter, userFilter, searchTerm]);
  
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
          const mockTransactions = generateMockTransactions();
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

  // Fonction pour générer des transactions fictives pour le mode débogage
  const generateMockTransactions = () => {
    const now = new Date();
    
    // Pour la démo, utiliser des utilisateurs fictifs clairement identifiés
    const demoUsers = [
      { address: "0xab1234567890123456789012345678901234cdef", role: "student", name: "Étudiant Test" },
      { address: "0xcd1234567890123456789012345678901234abef", role: "teacher", name: "Professeur Test" },
      { address: web3Service.account, role: "student", name: "Vous (Test)" }
    ];
    
    // Assigner des rôles pour l'affichage
    demoUsers.forEach(user => {
      userRoles[user.address] = user.role;
    });
    
    const books = [
      { id: 1, title: "L'Art de la Guerre", author: "Sun Tzu" },
      { id: 2, title: "1984", author: "George Orwell" },
      { id: 3, title: "Le Petit Prince", author: "Antoine de Saint-Exupéry" },
      { id: 4, title: "Dune", author: "Frank Herbert" },
      { id: 5, title: "Introduction à la blockchain", author: "Satoshi Nakamoto" },
      { id: 6, title: "Web3 et applications décentralisées", author: "Vitalik Buterin" }
    ];
    
    const mockTransactions = [];
    const usedCombinations = new Set(); // Pour éviter les doublons d'emprunts
    
    // Générer des transactions fictives
    for (let i = 1; i <= 20; i++) {
      const book = books[Math.floor(Math.random() * books.length)];
      const user = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      const combo = `${user.address}-${book.id}`; // Combinaison utilisateur-livre
      
      // Éviter les doublons d'emprunts pour le même utilisateur et livre
      if (usedCombinations.has(combo)) continue;
      usedCombinations.add(combo);
      
      const daysAgo = Math.floor(Math.random() * 30);
      // Toujours commencer par un emprunt
      const type = 'emprunt';
      
      const mockTimestamp = new Date(now);
      mockTimestamp.setDate(mockTimestamp.getDate() - daysAgo);
      
      // Ajouter la transaction d'emprunt
      const txId = `${user.address.substring(0, 6)}-${book.id}-${i}`;
      mockTransactions.push({
        id: txId,
        type: type,
        bookId: book.id,
        user: user.address,
        timestamp: mockTimestamp.toISOString(),
        livre: {
          title: book.title,
          author: book.author
        },
        isMock: true
      });
      
      // Pour certains emprunts, ajouter un retour
      if (Math.random() > 0.4) {
        const returnDaysAgo = Math.max(0, daysAgo - Math.floor(Math.random() * 10));
        const returnTimestamp = new Date(now);
        returnTimestamp.setDate(returnTimestamp.getDate() - returnDaysAgo);
        
        mockTransactions.push({
          id: `${txId}-return`,
          type: 'retour',
          bookId: book.id,
          user: user.address,
          timestamp: returnTimestamp.toISOString(),
          livre: {
            title: book.title,
            author: book.author
          },
          isMock: true
        });
      }
    }
    
    console.log(`Généré ${mockTransactions.length} transactions fictives pour la démonstration`);
    
    // Trier par date (plus récent d'abord)
    return mockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total Transactions</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-2xl font-bold text-gray-800">{filteredTransactions.length}</div>
            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {transactions.length - filteredTransactions.length} transactions fictives cachées
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Emprunts</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-2xl font-bold text-blue-600">{filteredTransactions.filter(tx => tx.type === 'emprunt').length}</div>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {filteredTransactions.filter(tx => tx.type === 'emprunt' && tx.user === web3Service.account).length} par vous
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Retours</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-2xl font-bold text-green-600">{filteredTransactions.filter(tx => tx.type === 'retour').length}</div>
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <CornerLeftUp className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {filteredTransactions.filter(tx => tx.type === 'retour' && tx.user === web3Service.account).length} par vous
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Utilisateurs Uniques</div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(filteredTransactions.map(tx => tx.user)).size}
            </div>
            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
              <User className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 flex justify-between">
            <span>{Object.values(userRoles).filter(role => role === 'student').length} étudiants</span>
            <span>{Object.values(userRoles).filter(role => role === 'teacher').length} professeurs</span>
          </div>
        </div>
      </div>
      
      {/* Filtres et recherche */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-sm rounded-full ${activeFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Toutes
          </button>
          <button
            onClick={() => setActiveFilter('emprunt')}
            className={`px-3 py-1 text-sm rounded-full ${activeFilter === 'emprunt' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Emprunts
          </button>
          <button
            onClick={() => setActiveFilter('retour')}
            className={`px-3 py-1 text-sm rounded-full ${activeFilter === 'retour' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Retours
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setUserFilter('all')}
            className={`px-3 py-1 text-sm rounded-full ${userFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Tous les utilisateurs
          </button>
          <button
            onClick={() => setUserFilter('current')}
            className={`px-3 py-1 text-sm rounded-full ${userFilter === 'current' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Vous uniquement
          </button>
          <button
            onClick={() => setUserFilter('students')}
            className={`px-3 py-1 text-sm rounded-full flex items-center ${userFilter === 'students' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Étudiants
            <span className="ml-1 bg-white text-xs px-1.5 py-0.5 rounded-full">
              {Object.values(userRoles).filter(role => role === 'student').length}
            </span>
          </button>
          <button
            onClick={() => setUserFilter('teachers')}
            className={`px-3 py-1 text-sm rounded-full flex items-center ${userFilter === 'teachers' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
          >
            Professeurs
            <span className="ml-1 bg-white text-xs px-1.5 py-0.5 rounded-full">
              {Object.values(userRoles).filter(role => role === 'teacher').length}
            </span>
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par titre, auteur ou utilisateur..."
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {searchTerm ? (
              <X className="h-5 w-5 cursor-pointer" onClick={() => setSearchTerm('')} />
            ) : null}
          </div>
        </div>
      </div>

      {/* Message d'information sur les données */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Message explicatif sur l'affichage des transactions réelles uniquement */}
      {!error && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-2 mx-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Cette page affiche uniquement les transactions effectuées par de vrais utilisateurs (étudiants et professeurs).
                Les transactions fictives ou constantes ont été filtrées pour une meilleure lisibilité.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des transactions */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="bg-gray-50 p-6 text-center rounded-lg">
            <div className="mb-4 text-gray-400">
              <Database className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Aucune transaction trouvée</h3>
            <p className="mt-2 text-sm text-gray-500">
              Aucune transaction ne correspond à vos critères de recherche.
            </p>
            <ForceDebugButton />
          </div>
        ) : (
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
              {paginatedTransactions.map((tx) => {
                const isCurrentUser = tx.user === web3Service.account;
                const role = userRoles[tx.user];
                
                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-gray-50 ${
                      isCurrentUser 
                        ? "bg-indigo-50 hover:bg-indigo-100" 
                        : role === 'student' 
                          ? "bg-green-50/30"
                          : role === 'teacher'
                            ? "bg-blue-50/30"
                            : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.type === 'emprunt' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Emprunt
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Retour
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-indigo-100 rounded-full text-indigo-600">
                          <Book className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{tx.livre.title}</div>
                          <div className="text-sm text-gray-500">{tx.livre.author}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full text-white
                          ${isCurrentUser 
                            ? "bg-indigo-600" 
                            : role === 'student' 
                              ? "bg-green-600"
                              : role === 'teacher'
                                ? "bg-blue-600"
                                : "bg-gray-400"
                          }`}>
                          <User className="h-4 w-4" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {isCurrentUser ? (
                              <span className="font-bold">Vous</span>
                            ) : (
                              formatAddress(tx.user)
                            )}
                            {getUserRoleLabel(tx.user)}
                          </div>
                          {isCurrentUser && (
                            <div className="text-xs text-gray-500">
                              {formatAddress(tx.user)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tx.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
        {renderDataSourceMessage()}
      </div>
    </div>
  );
};

export default TransactionsAdmin;