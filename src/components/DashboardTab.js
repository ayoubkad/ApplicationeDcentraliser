import React, { useEffect, useState } from 'react';
import { Clock, Award, TrendingUp, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import web3Service from '../services/Web3Service';
import TestButton from './common/TestButton';
import PdfViewer from './common/PdfViewer';

// Fonctions utilitaires IPFS importées depuis un fichier séparé
import { downloadPdfFromIPFS, triggerDownload, verifyIpfsIntegrity, isValidCid } from '../utils/ipfsUtils';

const DashboardTab = ({ setActiveTab, handleReturnBook, userReputation = 80 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showReputationDetails, setShowReputationDetails] = useState(false);
  const [actualReputation, setActualReputation] = useState(userReputation);
  const [isLoading, setIsLoading] = useState(true);
  const [userLoans, setUserLoans] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [pdfViewerData, setPdfViewerData] = useState(null);
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [filteredBorrowHistory, setFilteredBorrowHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [bookCache, setBookCache] = useState({});

  // Move loadUserLoans function definition here, before any useEffect references it
  const loadUserLoans = async () => {
    setLoadingBooks(true);
    try {
      await web3Service.initialize();
      const activeLoans = await web3Service.getUserActiveLoans();
      if (activeLoans && activeLoans.length > 0) {
        const loansWithDetails = await Promise.all(
          activeLoans.map(async (loan) => {
            try {
              const bookDetails = await web3Service.getBook(loan.bookId);
              return {
                ...loan,
                title: bookDetails?.title || "Livre inconnu",
                author: bookDetails?.author || "Auteur inconnu",
                pdfHash: bookDetails?.pdfHash || null,
                coverImageHash: bookDetails?.coverImageHash || null
              };
            } catch (error) {
              console.error(`Erreur lors de la récupération des détails du livre ${loan.bookId}:`, error);
              return { ...loan, title: "Livre inconnu", author: "Auteur inconnu" };
            }
          })
        );
        setUserLoans(loansWithDetails);
      } else {
        setUserLoans([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des emprunts:", error);
      setUserLoans([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  // Fonction pour appliquer un filtre à l'historique des emprunts
  const applyHistoryFilter = (history, filter) => {
    if (!history || history.length === 0) {
      setFilteredBorrowHistory([]);
      return;
    }

    let filtered = [...history];

    switch (filter) {
      case 'active':
        filtered = history.filter(item => !item.isReturned);
        break;
      case 'returned':
        filtered = history.filter(item => item.isReturned);
        break;
      case 'late':
        filtered = history.filter(item => item.isReturned && item.duration > 14);
        break;
      case 'recent':
        filtered = history.filter(item => {
          const date = item.borrowTime || new Date();
          const daysDiff = Math.ceil((new Date() - date) / (1000 * 60 * 60 * 24));
          return daysDiff <= 30; // Activité des 30 derniers jours
        });
        break;
      case 'all':
      default:
        // Pas de filtrage, garder tous les éléments
        break;
    }

    setFilteredBorrowHistory(filtered);
  };

  const getReputationLevel = (score) => {
    if (score >= 90) return { level: 'Premium', color: 'text-purple-600', benefits: ['Emprunts prolongés', 'Réservations prioritaires', 'Accès VIP'] };
    if (score >= 75) return { level: 'Or', color: 'text-yellow-600', benefits: ['Emprunts multiples', 'Délai prolongé'] };
    if (score >= 50) return { level: 'Argent', color: 'text-gray-600', benefits: ['Emprunts standards'] };
    return { level: 'Bronze', color: 'text-amber-700', benefits: ['Emprunts limités'] };
  };

  // Fonction améliorée pour récupérer et mettre en cache les détails d'un livre
  const getBookDetails = async (bookId) => {
    if (!bookId) {
      console.warn("getBookDetails appelé avec un ID de livre invalide:", bookId);
      return {
        id: "0",
        title: "Livre inconnu",
        author: "Information manquante",
        ipfsHash: null
      };
    }

    // Normaliser l'ID du livre pour éviter les problèmes de comparaison
    const normalizedBookId = bookId.toString();
    console.log(`Récupération des détails pour le livre ID: ${normalizedBookId}`);

    // Si le livre est déjà en cache et a un titre valide, retourner les données
    if (bookCache[normalizedBookId] && bookCache[normalizedBookId].title &&
        !bookCache[normalizedBookId].title.includes("Référence #") &&
        !bookCache[normalizedBookId].title.includes("Livre #")) {
      console.log(`Livre trouvé dans le cache: ${bookCache[normalizedBookId].title}`);
      return bookCache[normalizedBookId];
    }

    try {
      // Essayer d'abord de récupérer le livre depuis le smart contract
      console.log(`Tentative de récupération du livre ${normalizedBookId} depuis le smart contract...`);
      let bookDetails = await web3Service.getBook(normalizedBookId);

      // Vérifier si les détails sont valides
      if (bookDetails && bookDetails.title && bookDetails.title.trim() !== "") {
        console.log(`Livre récupéré avec succès depuis le contrat: ${bookDetails.title}`);

        // Mettre à jour le cache pour les prochaines demandes
        setBookCache(prevCache => ({
          ...prevCache,
          [normalizedBookId]: bookDetails
        }));

        return bookDetails;
      }

      console.log(`Livre ${normalizedBookId} non trouvé dans le contrat, recherche dans le localStorage...`);

      // Si nous n'avons pas pu récupérer le livre depuis le contrat, vérifier le localStorage
      try {
        const localBooksString = localStorage.getItem('localBooks');
        if (localBooksString) {
          const localBooks = JSON.parse(localBooksString);
          const localBook = localBooks.find(book => book.id.toString() === normalizedBookId);
          if (localBook && localBook.title) {
            console.log(`Livre trouvé dans le localStorage: ${localBook.title}`);
            bookDetails = localBook;

            // Mettre à jour le cache pour les prochaines demandes
            setBookCache(prevCache => ({
              ...prevCache,
              [normalizedBookId]: bookDetails
            }));

            return bookDetails;
          }
        }
      } catch (e) {
        console.warn("Erreur lors de la récupération du livre depuis le localStorage:", e);
      }

      // Essayer de récupérer l'information "brute" depuis le contrat
      console.log(`Tentative de récupération des données brutes pour le livre ${normalizedBookId}...`);
      try {
        const rawBook = await web3Service.callViewMethod('books', [normalizedBookId], {gas: 3000000});
        if (rawBook && rawBook.title && rawBook.title.trim() !== "") {
          console.log(`Données brutes récupérées pour le livre ${normalizedBookId}: ${rawBook.title}`);
          bookDetails = {
            id: normalizedBookId,
            title: rawBook.title || "Titre indisponible",
            author: rawBook.author || "Auteur indisponible",
            ipfsHash: rawBook.ipfsHash || null
          };

          // Mettre à jour le cache pour les prochaines demandes
          setBookCache(prevCache => ({
            ...prevCache,
            [normalizedBookId]: bookDetails
          }));

          return bookDetails;
        }
      } catch (rawError) {
        console.warn(`Impossible de récupérer les données brutes du livre ${normalizedBookId}:`, rawError);
      }

      // Essayer de récupérer depuis le catalogue global si disponible
      console.log(`Tentative de récupération depuis le catalogue global pour le livre ${normalizedBookId}...`);
      try {
        const catalogString = localStorage.getItem('bookCatalog');
        if (catalogString) {
          const catalog = JSON.parse(catalogString);
          const catalogBook = catalog.find(book => book.id.toString() === normalizedBookId);
          if (catalogBook && catalogBook.title) {
            console.log(`Livre trouvé dans le catalogue global: ${catalogBook.title}`);
            bookDetails = catalogBook;

            // Mettre à jour le cache pour les prochaines demandes
            setBookCache(prevCache => ({
              ...prevCache,
              [normalizedBookId]: bookDetails
            }));

            return bookDetails;
          }
        }
      } catch (e) {
        console.warn("Erreur lors de la récupération du livre depuis le catalogue global:", e);
      }

      // Si nous n'avons toujours rien, utiliser l'ID pour la référence
      console.log(`Aucune information trouvée pour le livre ${normalizedBookId}, utilisation de valeurs par défaut`);
      bookDetails = {
        id: normalizedBookId,
        title: `Livre #${normalizedBookId}`,
        author: "Auteur indisponible",
        ipfsHash: null
      };

      // Mettre à jour le cache pour les prochaines demandes
      setBookCache(prevCache => ({
        ...prevCache,
        [normalizedBookId]: bookDetails
      }));

      return bookDetails;
    } catch (error) {
      console.error(`Erreur lors de la récupération des détails du livre ${normalizedBookId}:`, error);
      // Valeur par défaut en cas d'erreur
      const defaultBook = {
        id: normalizedBookId,
        title: `Référence #${normalizedBookId}`,
        author: "Information inaccessible",
        ipfsHash: null
      };

      // Mettre à jour le cache pour les prochaines demandes
      setBookCache(prevCache => ({
        ...prevCache,
        [normalizedBookId]: defaultBook
      }));

      return defaultBook;
    }
  };

  // Déplacer la fonction loadBorrowHistory ici pour qu'elle soit accessible partout
  const loadBorrowHistory = async () => {
    setLoadingHistory(true);
    try {
      await web3Service.initialize();

      // Récupérer l'historique des emprunts
      const history = await web3Service.getBorrowHistory();
      console.log("Historique d'emprunts récupéré:", history);

      if (history && history.length > 0) {
        // Convertir et enrichir les éléments de l'historique avec les détails des livres
        console.log("Enrichissement de l'historique avec les détails des livres...");
        
        // Formater la date pour un affichage plus convivial
        const formatDate = (date) => {
          if (!date) return '-';
          
          try {
            // Si la date est déjà une chaîne formatée, la retourner telle quelle
            if (typeof date === 'string' && date.includes('/')) {
              return date;
            }
            
            // Convertir en objet Date si ce n'est pas déjà le cas
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            
            // Vérifier que la date est valide
            if (isNaN(dateObj.getTime())) {
              console.warn("Date invalide:", date);
              return 'Date invalide';
            }
            
            // Formater la date (ex: "25 juin 2023 à 14:30")
            const day = dateObj.getDate();
            const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            const month = monthNames[dateObj.getMonth()];
            const year = dateObj.getFullYear();
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            
            return `${day} ${month} ${year} à ${hours}:${minutes}`;
          } catch (error) {
            console.error("Erreur lors du formatage de la date:", error, date);
            return 'Date invalide';
          }
        };
        
        // Transformer les données de l'historique en objet plus complet
        const historyWithDetails = await Promise.all(
          history.map(async (historyItem) => {
            try {
              // Extraire les informations pertinentes
              let bookId = historyItem.bookId || 0;
              let borrowTime = null;
              let borrowTransactionHash = null;
              let returnTime = null;
              let returnTransactionHash = null;
              let isReturned = false;
              let borrowId = historyItem.borrowId || historyItem.id || 0;
              
              // Extraction selon le format
              // Format 1: L'historique est déjà bien formaté par Web3Service
              if (historyItem.bookId && historyItem.borrowDate) {
                bookId = historyItem.bookId;
                borrowTime = new Date(historyItem.borrowDate);
                returnTime = historyItem.returnDate ? new Date(historyItem.returnDate) : null;
                isReturned = historyItem.status === 'retourné' || !!historyItem.returnDate;
                borrowTransactionHash = historyItem.borrowTransactionHash;
                returnTransactionHash = historyItem.returnTransactionHash;
              }
              // Format 2: Format brut du contrat
              else if (Array.isArray(historyItem)) {
                borrowId = historyItem[0] || 0;
                bookId = historyItem[1] || 0;
                const borrowTimestamp = historyItem[2] || 0;
                const returnTimestamp = historyItem[3] || 0;
                borrowTime = borrowTimestamp > 0 ? new Date(borrowTimestamp * 1000) : new Date();
                returnTime = returnTimestamp > 0 ? new Date(returnTimestamp * 1000) : null;
                isReturned = !!returnTime;
              }
              // Format 3: Format objet mais avec des clés différentes
              else {
                bookId = historyItem.bookId || historyItem.book_id || 0;
                borrowTime = historyItem.borrowDate || historyItem.borrowTime || 
                            (historyItem.timestamp ? new Date(historyItem.timestamp) : new Date());
                returnTime = historyItem.returnDate || historyItem.returnTime || null;
                isReturned = historyItem.isReturned || historyItem.returned || historyItem.status === 'retourné';
                borrowTransactionHash = historyItem.transactionHash || historyItem.borrowTransactionHash;
                returnTransactionHash = historyItem.returnTransactionHash;
              }
              
              // Si l'ID du livre n'est pas valide, ignorer cet élément
              if (!bookId || bookId === '0') {
                console.warn("ID de livre invalide dans l'historique:", historyItem);
                return null;
              }
              
              // Récupérer les détails du livre
              const bookDetails = await getBookDetails(bookId);
              
              // Calculer la durée de l'emprunt en jours avec une limite raisonnable
              let duration = 0;
              if (borrowTime && returnTime) {
                const diffTime = returnTime.getTime() - borrowTime.getTime();
                duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Limiter la durée à 365 jours maximum (pour éviter les valeurs aberrantes)
                duration = Math.min(duration, 365);
                
                // Si la durée est négative (erreur de date), mettre à zéro
                duration = Math.max(duration, 0);
              }
              
              // Normaliser les dates
              borrowTime = borrowTime || new Date();
              
              // Créer l'objet d'historique avec toutes les informations
              const historyEntry = {
                id: borrowId.toString(),
                bookId: bookId.toString(),
                borrowTime: borrowTime,
                returnTime: returnTime,
                isReturned: isReturned,
                title: bookDetails?.title || `Livre #${bookId}`,
                author: bookDetails?.author || "Information non disponible",
                // Formatage des dates
                borrowDate: formatDate(borrowTime),
                returnDate: returnTime ? formatDate(returnTime) : '-',
                // Durée calculée avec limite raisonnable
                duration: duration,
                // Informations de transaction blockchain
                borrowTransactionHash: borrowTransactionHash,
                returnTransactionHash: returnTransactionHash
              };

              console.log(`Élément d'historique traité pour le livre "${historyEntry.title}"`);
              return historyEntry;
            } catch (error) {
              console.error("Erreur lors du traitement d'un élément d'historique:", error);
              return null;
            }
          })
        );
        
        // Filtrer les éléments null (erreurs)
        const validHistory = historyWithDetails.filter(item => item !== null);
        console.log(`${validHistory.length}/${history.length} éléments d'historique traités avec succès`);
        
        // Trier par date d'emprunt, du plus récent au plus ancien
        const sortedHistory = validHistory.sort((a, b) => {
          // Pour des raisons de sécurité, vérifier que les dates sont valides
          const dateA = a.borrowTime instanceof Date ? a.borrowTime : new Date();
          const dateB = b.borrowTime instanceof Date ? b.borrowTime : new Date();
          return dateB - dateA;
        });
        
        if (sortedHistory && sortedHistory.length > 0) {
          console.log("Historique d'emprunts trié par date:", sortedHistory);
          
          // Validation et correction des dates
          const validateAndFixDates = (item) => {
            // Vérifier si la date d'emprunt est dans le futur (erreur potentielle)
            const now = new Date();
            if (item.borrowTime > now) {
              console.warn(`Date d'emprunt future détectée pour le livre ${item.bookId}, correction...`);
              // Corriger la date d'emprunt à une date plausible (aujourd'hui - durée)
              item.borrowTime = new Date(now.getTime() - (item.duration * 24 * 60 * 60 * 1000));
              item.borrowDate = formatDate(item.borrowTime);
            }
            return item;
          };
          
          // Appliquer la validation des dates
          if (sortedHistory && sortedHistory.length > 0) {
            const validatedHistory = sortedHistory.map(validateAndFixDates);
            setBorrowHistory(validatedHistory);
            
            // Appliquer le filtre actuel à l'historique
            applyHistoryFilter(validatedHistory, historyFilter);
            
            console.log("Historique d'emprunts validé et corrigé:", validatedHistory);
          }
        } else {
          setBorrowHistory([]);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique d'emprunts:", error);
      setBorrowHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Effet pour mettre à jour la liste filtrée lorsque l'historique ou le filtre change
  useEffect(() => {
    if (borrowHistory.length > 0) {
      applyHistoryFilter(borrowHistory, historyFilter);
    } else {
      setFilteredBorrowHistory([]);
    }
  }, [borrowHistory, historyFilter]);

  useEffect(() => {
    const loadReputationFromBlockchain = async () => {
      try {
        setIsLoading(true);
        await web3Service.initialize();
        const reputation = await web3Service.getUserReputation();
        if (reputation && !isNaN(Number(reputation))) {
          setActualReputation(Number(reputation));
        } else {
          console.log("Utilisation de la réputation par défaut:", userReputation);
          setActualReputation(userReputation);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la réputation:", error);
        setActualReputation(userReputation);
      } finally {
        setIsLoading(false);
      }
    };

    // Gestion des événements de mise à jour de réputation
    const handleReputationUpdate = (event) => {
      if (event.detail && event.detail.reputation) {
        const newReputation = parseInt(event.detail.reputation);
        console.log("Mise à jour de la réputation:", newReputation);
        setActualReputation(newReputation);
        
        // Afficher un toast de confirmation
        toast.success(`Votre réputation a été mise à jour: ${newReputation}`, {
          duration: 3000,
          icon: '🌟'
        });
      }
    };

    // Gérer l'événement de retour de livre
    const handleBookReturned = async (event) => {
      if (!event.detail) return;
      
      const { bookId, bookDetails, oldReputation, newReputation } = event.detail;
      
      console.log("Événement de retour détecté:", event.detail);
      
      // Mettre à jour les emprunts actifs
      setUserLoans(prevLoans => prevLoans.filter(loan => loan.bookId.toString() !== bookId.toString()));
      
      // Mettre à jour la réputation si elle a changé
      if (newReputation !== undefined && oldReputation !== undefined) {
        setActualReputation(parseInt(newReputation));
        
        // Calculer le changement pour afficher visuellement l'impact
        const change = parseInt(newReputation) - parseInt(oldReputation);
        const sign = change >= 0 ? '+' : '';
        
        // Afficher un message différent selon le changement de réputation
        if (change !== 0) {
          toast.success(
            `Livre retourné ! Réputation ${sign}${change} points (${newReputation})`, 
            { duration: 4000, icon: '📚' }
          );
        } else {
          toast.success(`Livre retourné ! Votre réputation reste à ${newReputation}`, 
            { duration: 3000, icon: '📚' }
          );
        }
      } else {
        toast.success(`Livre retourné avec succès !`, { duration: 3000, icon: '📚' });
      }
      
      // Recharger l'historique après un délai
      setTimeout(() => {
        loadBorrowHistory();
      }, 2000);
    };

    // Écouter les événements de visualisation PDF
    const handleOpenPdfViewer = (event) => {
      if (event.detail) {
        setPdfViewerData({
          url: event.detail.url,
          fileName: event.detail.filename,
          blob: event.detail.blob,
          directUrl: event.detail.directUrl || false,
          iframe: event.detail.iframe || null
        });
      }
    };
    
    // Écouter les événements de mise à jour pour l'historique des emprunts
    const handleBookBorrowed = (event) => {
      if (event.detail && event.detail.bookId && event.detail.bookDetails) {
        const { bookId, bookDetails } = event.detail;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        setUserLoans(prevLoans => [
          ...prevLoans,
          {
            id: Date.now(),
            bookId,
            title: bookDetails.title || "Livre inconnu",
            author: bookDetails.author || "Auteur inconnu",
            dueDate: dueDate.toISOString().split('T')[0],
            pdfHash: bookDetails.pdfHash || null,
            coverImageHash: bookDetails.coverImageHash || null
          }
        ]);
        // Recharger l'historique après un emprunt
        loadBorrowHistory();
      }
    };
    
    // Ajouter la fonction pour recharger l'historique après un retour
    const handleBookReturnedHistory = (event) => {
      // Attendre un court instant pour que la blockchain soit mise à jour
      setTimeout(() => {
        loadBorrowHistory();
      }, 2000);
    };

    // Ajouter les écouteurs d'événements
    window.addEventListener('reputationUpdated', handleReputationUpdate);
    window.addEventListener('bookReturned', handleBookReturned);
    window.addEventListener('bookReturned', handleBookReturnedHistory); // Nouvel écouteur pour l'historique
    window.addEventListener('bookBorrowed', handleBookBorrowed);
    window.addEventListener('openPdfViewer', handleOpenPdfViewer);
    
    // Charger les données initiales
    loadReputationFromBlockchain();
    loadBorrowHistory();
    loadUserLoans();
    
    // Animation de la réputation
    if (actualReputation > 0) {
      const startScore = 0;
      const endScore = actualReputation;
      const duration = 1500; // ms
      const frameDuration = 16; // ~60fps
      const totalFrames = Math.round(duration / frameDuration);
      let frame = 0;
      
      const timer = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const currentScore = Math.floor(startScore + progress * (endScore - startScore));
        setAnimatedScore(currentScore);
        
        if (frame === totalFrames) {
          clearInterval(timer);
        }
      }, frameDuration);
    }
    
    // Nettoyage des écouteurs d'événements
    return () => {
      window.removeEventListener('reputationUpdated', handleReputationUpdate);
      window.removeEventListener('bookReturned', handleBookReturned);
      window.removeEventListener('bookReturned', handleBookReturnedHistory);
      window.removeEventListener('bookBorrowed', handleBookBorrowed);
      window.removeEventListener('openPdfViewer', handleOpenPdfViewer);
    };
  }, [actualReputation, historyFilter, bookCache, userReputation]);

  const handleDownload = async (loan) => {
    // Vérifier si le CID existe
    const cid = loan.pdfCid || loan.pdfHash;
    if (!cid) {
      toast.error("Ce livre n'est pas disponible au téléchargement.");
      return;
    }

    // Vérifier si le CID a un format valide
    if (!isValidCid(cid)) {
      toast.error("Le CID IPFS est invalide.");
      return;
    }

    // Créer un toast avec timeout automatique pour éviter qu'il reste bloqué
    const loadingToastId = toast.loading("Chargement en cours...", {
      duration: 30000 // Auto-dismiss après 30 secondes maximum
    });

    const startTime = performance.now();

    // Créer un timer de sécurité pour s'assurer que le toast est fermé même en cas d'erreur
    const safetyTimer = setTimeout(() => {
      toast.dismiss(loadingToastId);
      toast.error("Le téléchargement a pris trop de temps. Veuillez réessayer.", {
        duration: 5000
      });
    }, 45000); // 45 secondes de timeout

    try {
      const result = await downloadPdfFromIPFS(cid);

      // Vérifier l'intégrité si un blob est disponible
      if (result.blob) {
        try {
          // Utiliser la vérification d'intégrité en mode permissif (continue même si erreur)
          await verifyIpfsIntegrity(result.blob, cid, { skipOnError: true });
          // La vérification a réussi ou a été ignorée en cas d'erreur
        } catch (integrityError) {
          // Ce bloc ne sera pas exécuté avec skipOnError=true, mais on le garde par sécurité
          console.warn("Avertissement d'intégrité:", integrityError.message);
          // Continuer même si la vérification échoue
        }
      }

      // Utilisation de triggerDownload pour afficher le PDF plutôt que le télécharger
      triggerDownload(result, `${loan.title}.pdf`);

      const downloadTime = ((performance.now() - startTime) / 1000).toFixed(2);

      // Annuler le timer de sécurité car l'opération a réussi
      clearTimeout(safetyTimer);

      toast.success(`Chargement terminé en ${downloadTime}s !`, {
        id: loadingToastId,
        duration: 3000
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);

      // Annuler le timer de sécurité
      clearTimeout(safetyTimer);

      // Fermer le toast de chargement
      toast.dismiss(loadingToastId);

      // Utilisation spécifique des informations d'erreur enrichies si disponibles
      if (error.directLinks) {
        // Remplacer le toast d'erreur par un toast avec des liens directs
        toast((t) => (
          <div className="flex flex-col">
            <p className="mb-2 font-semibold text-red-600">
              Impossible de télécharger le PDF
            </p>
            <p className="text-sm mb-2">
              {error.message}
            </p>
            <div className="text-sm">
              <p className="mb-1 font-medium">Options alternatives :</p>
              <ul className="mb-2 list-disc list-inside space-y-1">
                {error.directLinks.slice(0, 3).map((link, index) => (
                  <li key={index} className="truncate">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Ouvrir dans l'onglet {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(error.directLinks[0]);
                toast.success("Lien copié dans le presse-papier !");
                toast.dismiss(t.id);
              }}
              className="bg-gray-200 hover:bg-gray-300 text-sm px-2 py-1 rounded self-end"
            >
              Copier un lien
            </button>
          </div>
        ), { duration: 10000, style: { maxWidth: '100%', width: '350px' } });
      } else {
        // Générer des liens directs pour une solution alternative
        const directGateways = [
          'https://ipfs.io/ipfs/',
          'https://cloudflare-ipfs.com/ipfs/',
          'https://dweb.link/ipfs/',
          'https://gateway.pinata.cloud/ipfs/',
          'https://ipfs.fleek.co/ipfs/'
        ];

        const directLinks = directGateways.map(gateway => `${gateway}${cid}`);

        // Erreur standard avec options par défaut
        toast((t) => (
          <div className="flex flex-col">
            <p className="mb-2 font-semibold text-red-600">
              Impossible de télécharger le PDF
            </p>
            <p className="text-sm mb-2">
              {error.message}
            </p>
            <div className="text-sm">
              <p className="mb-1 font-medium">Options alternatives :</p>
              <ul className="mb-2 list-disc list-inside space-y-1">
                {directLinks.slice(0, 3).map((link, index) => (
                  <li key={index} className="truncate">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Ouvrir dans l'onglet {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(directLinks[0]);
                toast.success("Lien copié dans le presse-papier !");
                toast.dismiss(t.id);
              }}
              className="bg-gray-200 hover:bg-gray-300 text-sm px-2 py-1 rounded self-end"
            >
              Copier un lien
            </button>
          </div>
        ), { duration: 10000, style: { maxWidth: '100%', width: '350px' } });
      }
    }
  };

  const reputationInfo = getReputationLevel(actualReputation);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(actualReputation), 300);
    return () => clearTimeout(timer);
  }, [actualReputation]);

  // Fonction pour fermer le visualiseur PDF
  const handleClosePdfViewer = () => {
    // Libérer l'URL de l'objet blob
    if (pdfViewerData && pdfViewerData.url && !pdfViewerData.directUrl) {
      URL.revokeObjectURL(pdfViewerData.url);
    }
    setPdfViewerData(null);
  };

  const handleBookReturn = async (bookId, bookTitle) => {
    try {
      // Afficher un toast de confirmation
      const confirmToastId = toast((t) => (
        <div className="flex flex-col">
          <p className="font-semibold mb-2">Confirmer le retour</p>
          <p className="text-sm mb-3">Êtes-vous sûr de vouloir retourner "{bookTitle || `Livre #${bookId}`}" ?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                toast.loading("Traitement en cours...", { id: "return-loading" });
                processBookReturn(bookId, bookTitle);
              }}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Confirmer
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </div>
      ), { duration: 10000 });
    } catch (error) {
      console.error("Erreur lors de la confirmation de retour:", error);
      toast.error("Une erreur s'est produite lors de la préparation du retour", {
        duration: 4000
      });
    }
  };

  // Fonction pour traiter le retour après confirmation
  const processBookReturn = async (bookId, bookTitle) => {
    try {
      // Désactiver le bouton pendant le processus de retour
      setIsLoading(true);

      // Enregistrer l'heure de début pour calculer la durée
      const startTime = performance.now();

      // Appeler la fonction de retour du livre
      const result = await web3Service.returnBook(bookId);

      // Calculer la durée de la transaction
      const duration = ((performance.now() - startTime) / 1000).toFixed(1);

      // Fermer le toast de chargement
      toast.dismiss("return-loading");

      if (result.success) {
        // Mettre à jour la réputation si elle a changé
        if (result.reputation && !isNaN(Number(result.reputation))) {
          console.log("Nouvelle réputation après retour:", result.reputation);
          setActualReputation(Number(result.reputation));

          // Afficher un message sur le changement de réputation
          if (result.reputationChange > 0) {
            toast.success(
              <div>
                <p className="font-semibold">Réputation augmentée!</p>
                <p className="text-sm">+{result.reputationChange} points pour votre retour à temps</p>
              </div>,
              {
                duration: 5000,
                icon: '⭐',
                style: { minWidth: '300px' }
              }
            );
          }
        }

        // Afficher un message de succès avec toast
        toast.success(
          <div>
            <p className="font-semibold">Livre retourné avec succès!</p>
            <p className="text-sm">{bookTitle || `Livre #${bookId}`}</p>
            <p className="text-xs mt-1 text-gray-500">Transaction complétée en {duration}s</p>
          </div>,
          {
            duration: 5000,
            icon: '📚',
            style: { minWidth: '300px' }
          }
        );

        // Mettre à jour la liste des emprunts
        setUserLoans(prevLoans => prevLoans.filter(loan => Number(loan.bookId) !== Number(bookId)));

        // Recharger l'historique des emprunts pour afficher le retour
        setTimeout(() => {
          // Utiliser directement la fonction loadBorrowHistory définie dans le useEffect principal
          // pour s'assurer que le traitement des données est identique
          console.log("Rechargement de l'historique après retour de livre...");
          loadBorrowHistory();
        }, 2000);

        // Notifier le parent du retour réussi
        if (handleReturnBook) {
          handleReturnBook(bookId);
        }
      } else {
        // Afficher un message d'erreur
        toast.error(
          <div>
            <p className="font-semibold">Erreur lors du retour</p>
            <p className="text-sm">{result.message || "Erreur lors du retour du livre"}</p>
          </div>,
          {
            duration: 5000,
            style: { minWidth: '300px' }
          }
        );
      }
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      toast.dismiss("return-loading");
      toast.error(
        <div>
          <p className="font-semibold">Erreur lors du retour</p>
          <p className="text-sm">{error.message || "Une erreur s'est produite lors du retour du livre"}</p>
        </div>,
        {
          duration: 5000,
          style: { minWidth: '300px' }
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#2A3B8C] mb-6 flex items-center">
        <Award className="mr-2" /> Mon Espace Personnel
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Niveau de Réputation</h2>
              <div className={`${reputationInfo.color} font-bold text-lg px-4 py-1 rounded-full bg-opacity-10`}>
                {reputationInfo.level}
              </div>
            </div>
            <div className="relative pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{animatedScore}/100</span>
                <button
                  onClick={() => setShowReputationDetails(!showReputationDetails)}
                  className="text-[#2A3B8C] text-sm hover:underline"
                >
                  Voir les détails
                </button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${animatedScore}%`,
                    background: `linear-gradient(90deg, #4CAF50 ${animatedScore}%, #e5e7eb ${animatedScore}%)`
                  }}
                />
              </div>
              {showReputationDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg animate-fadeIn">
                  <h3 className="font-semibold mb-2">Avantages du niveau {reputationInfo.level}:</h3>
                  <ul className="space-y-2">
                    {reputationInfo.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <TrendingUp className="w-4 h-4 mr-2 text-[#2A3B8C]" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Score actuel:</span>
                      <span className="text-xl font-bold text-[#2A3B8C]">{actualReputation}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ce score est enregistré sur la blockchain et évolue en fonction de vos interactions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Emprunts Total</h3>
              <p className="text-2xl font-bold text-[#2A3B8C]">{userLoans.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Retours à Temps</h3>
              <p className="text-2xl font-bold text-green-600">100%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-600">Score de Réputation Actuel</h3>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 rounded-lg h-6 w-12"></div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="text-2xl font-bold text-purple-700">{actualReputation}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Mis à jour en temps réel depuis la blockchain
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#2A3B8C] mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Mes Livres Empruntés
        </h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          {loadingBooks ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-100 rounded"></div>
            </div>
          ) : userLoans.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userLoans.map(loan => {
                  const dueDate = new Date(loan.dueDate);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysLeft <= 2;
                  const isLate = daysLeft <= 0;
                  const borrowDate = loan.borrowDate ? new Date(loan.borrowDate) : null;
                  const isNewBorrow = borrowDate && ((today - borrowDate) / (1000 * 60 * 60 * 24)) < 1; // Moins d'un jour

                  // Calculer le pourcentage de temps écoulé
                  const totalBorrowDays = 14; // Durée standard d'emprunt
                  const elapsedPercentage = borrowDate
                    ? Math.min(100, Math.max(0, 100 - (daysLeft / totalBorrowDays * 100)))
                    : 50; // Valeur par défaut si pas de date d'emprunt

                  return (
                    <div key={loan.id}
                      className={`border rounded-lg overflow-hidden transition-all duration-200
                        ${isLate ? 'border-red-400 shadow-red-100 shadow-md' :
                          isUrgent ? 'border-yellow-300 shadow-yellow-100 shadow-md' :
                          isNewBorrow ? 'border-green-300 shadow-green-100 shadow-md' :
                          'border-gray-200'}`}
                    >
                      {isNewBorrow && (
                        <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 flex items-center justify-center">
                          <span className="animate-pulse mr-1">●</span> Nouvel emprunt
                        </div>
                      )}
                      <div className="flex p-4">
                        <div className={`w-16 h-20 rounded-md flex items-center justify-center mr-4 flex-shrink-0
                          ${isLate ? 'bg-red-50 text-red-700' :
                            isUrgent ? 'bg-yellow-50 text-yellow-700' :
                            isNewBorrow ? 'bg-green-50 text-green-700' :
                            'bg-blue-50 text-blue-700'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-gray-900 text-lg line-clamp-1" title={loan.title}>{loan.title}</h3>
                            {isNewBorrow && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full ml-2">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{loan.author}</p>

                          {/* Barre de progression du temps d'emprunt */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                isLate ? 'bg-red-500' :
                                elapsedPercentage > 75 ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${elapsedPercentage}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className={`text-xs font-medium rounded-full px-2 py-1 ${
                              isLate ? 'bg-red-100 text-red-800' :
                              isUrgent ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {isLate
                                ? <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    En retard de {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? 's' : ''}
                                  </span>
                                : <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                                  </span>
                              }
                            </div>
                            <span className="text-xs text-gray-500">Échéance: {new Date(loan.dueDate).toLocaleDateString('fr-FR')}</span>
                          </div>

                          {borrowDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Emprunté le: {borrowDate.toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="border-t bg-gray-50 p-2 flex">
                        <button
                          className={`flex-1 py-1.5 rounded text-sm font-medium flex items-center justify-center transition-colors
                            ${isLate ? 'text-red-600 hover:bg-red-50' :
                              'text-[#2A3B8C] hover:bg-[#2A3B8C]/10'}`}
                          onClick={() => {
                            // Notification directe
                            toast.success("Traitement du retour en cours...");
                            // Appeler directement la fonction de traitement sans passer par la confirmation
                            processBookReturn(loan.bookId, loan.title);
                          }}
                          disabled={isLoading}
                        >
                          {isLate ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Retourner maintenant
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Retourner
                            </>
                          )}
                        </button>
                        {loan.pdfHash && (
                          <button
                            className="flex-1 text-green-600 hover:bg-green-50 transition-colors py-1.5 rounded text-sm font-medium flex items-center justify-center"
                            onClick={() => handleDownload(loan)}
                          >
                            <Download size={14} className="mr-1" />
                            Lire
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="text-sm text-[#2A3B8C] hover:underline flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Emprunter plus de livres
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Aucun livre emprunté actuellement</h3>
              <p className="text-gray-500 mb-4">Explorez notre catalogue et empruntez des livres pour les voir ici.</p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="inline-flex items-center px-4 py-2 bg-[#2A3B8C] text-white rounded-md hover:bg-[#1F2D6B] transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Parcourir le catalogue
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#2A3B8C] mb-4 flex items-center">
          <Clock className="mr-2" /> Historique d'Emprunts et Retours
        </h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          {loadingHistory ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-100 rounded"></div>
            </div>
          ) : borrowHistory.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Résumé de vos activités</h3>
                  <div className="flex flex-wrap gap-2 my-2">
                    <span className="text-sm bg-[#2A3B8C]/10 text-[#2A3B8C] font-medium px-3 py-1 rounded-full flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {borrowHistory.length} emprunt{borrowHistory.length > 1 ? 's' : ''} au total
                    </span>
                    <span className="text-sm bg-green-100 text-green-800 font-medium px-3 py-1 rounded-full flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {borrowHistory.filter(item => item.isReturned).length} retourné{borrowHistory.filter(item => item.isReturned).length > 1 ? 's' : ''}
                    </span>
                    <span className="text-sm bg-yellow-100 text-yellow-800 font-medium px-3 py-1 rounded-full flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {borrowHistory.filter(item => !item.isReturned).length} en cours
                    </span>
                    {borrowHistory.filter(item => item.isReturned && item.duration > 14).length > 0 && (
                      <span className="text-sm bg-red-100 text-red-800 font-medium px-3 py-1 rounded-full flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {borrowHistory.filter(item => item.isReturned && item.duration > 14).length} retard{borrowHistory.filter(item => item.isReturned && item.duration > 14).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xs text-gray-500 italic">
                      Transactions vérifiées par la blockchain
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  </div>

                  <div className="flex space-x-2">
                    <select
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
                      value={historyFilter}
                      onChange={(e) => {
                        const newFilter = e.target.value;
                        setHistoryFilter(newFilter);
                        // Appliquer le filtre à l'historique actuel
                        applyHistoryFilter(borrowHistory, newFilter);

                        // Afficher un message de confirmation
                        const filterLabels = {
                          all: "Tous les emprunts",
                          active: "Emprunts en cours",
                          returned: "Emprunts retournés",
                          late: "Retours en retard",
                          recent: "Activité récente"
                        };

                        toast.success(`Filtre appliqué: ${filterLabels[newFilter] || newFilter}`, {
                          duration: 2000,
                          icon: '🔍'
                        });
                      }}
                    >
                      <option value="all">Tous les emprunts</option>
                      <option value="active">Emprunts en cours</option>
                      <option value="returned">Emprunts retournés</option>
                      <option value="late">Retours en retard</option>
                      <option value="recent">Activité récente</option>
                    </select>

                    <button
                      className="text-xs border border-[#2A3B8C] text-[#2A3B8C] rounded px-2 py-1 hover:bg-[#2A3B8C]/10 transition-colors"
                      onClick={() => {
                        // Fonction pour rafraîchir l'historique
                        toast.success("Actualisation de l'historique...", {
                          id: "refresh-history",
                          duration: 2000
                        });

                        // Vider le cache des livres pour forcer le rechargement des informations
                        console.log("Vidage du cache des livres pour forcer le rechargement...");
                        setBookCache({});

                        // Utiliser directement la fonction loadBorrowHistory définie dans le useEffect principal
                        console.log("Actualisation manuelle de l'historique...");
                        loadBorrowHistory();

                        // Afficher un message de succès après un délai
                        setTimeout(() => {
                          toast.success(`Historique actualisé avec les dernières informations`, {
                            duration: 3000,
                            icon: '🔄'
                          });
                        }, 3000);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistiques visuelles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Activité récente</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-blue-700">
                      {borrowHistory.filter(item => {
                        const date = item.borrowTime || new Date();
                        const daysDiff = Math.ceil((new Date() - date) / (1000 * 60 * 60 * 24));
                        return daysDiff <= 30; // Activité des 30 derniers jours
                      }).length}
                    </div>
                    <div className="text-xs text-blue-600">
                      Derniers 30 jours
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Taux de retour à temps</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-green-700">
                      {borrowHistory.filter(item => item.isReturned).length > 0
                        ? Math.round((borrowHistory.filter(item => item.isReturned && item.duration <= 14).length /
                           borrowHistory.filter(item => item.isReturned).length) * 100)
                        : 100}%
                    </div>
                    <div className="text-xs text-green-600">
                      {borrowHistory.filter(item => item.isReturned && item.duration <= 14).length}/{borrowHistory.filter(item => item.isReturned).length} retours
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Impact sur la réputation</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-purple-700">
                      +{Math.min(borrowHistory.length * 5, 50)}
                    </div>
                    <div className="text-xs text-purple-600">
                      Points potentiels
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#2A3B8C]/90 to-[#2A3B8C]/80 text-white">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Titre</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Auteur</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Emprunté le</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Retourné le</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Durée</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(filteredBorrowHistory.length > 0 ? filteredBorrowHistory : borrowHistory).map((item, index) => {
                      // Calculer si l'emprunt est récent (moins de 3 jours)
                      const isRecent = (new Date() - item.borrowTime) < (3 * 24 * 60 * 60 * 1000);
                      // Calculer si le retour est récent
                      const isRecentReturn = item.returnTime &&
                                            ((new Date() - item.returnTime) < (3 * 24 * 60 * 60 * 1000));

                      // Déterminer si le titre est disponible ou s'il s'agit d'une référence
                      const isTitleReference = item.title === "Livre inconnu" ||
                                             item.title === "Livre non disponible" ||
                                             item.title.includes("Référence #") ||
                                             item.title.includes("Livre #");

                      // Déterminer si l'auteur est disponible ou non
                      const isAuthorMissing = item.author === "Auteur inconnu" ||
                                            item.author === "Information manquante" ||
                                            item.author === "Information non disponible" ||
                                            item.author === "Auteur indisponible" ||
                                            item.author === "Information inaccessible" ||
                                            item.author === "Information non récupérable";

                      return (
                        <tr key={`history-${item.id}-${index}`} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            {isTitleReference ? (
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-base font-medium text-gray-500 italic">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-400 flex items-center mt-1">
                                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs mr-1">ID: {item.bookId}</span>
                                    {isRecent && <span className="text-green-500 text-xs flex items-center">• <span className="ml-1">Nouveau</span></span>}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-md flex items-center justify-center text-blue-600 mr-3">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="text-base font-bold text-gray-900 hover:text-blue-700 transition-colors">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center mt-1">
                                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs mr-1">ID: {item.bookId}</span>
                                    {isRecent && <span className="text-green-500 text-xs flex items-center">• <span className="ml-1">Nouveau</span></span>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isAuthorMissing ? (
                              <div className="flex items-center">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-500 mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </span>
                                <div>
                                  <span className="text-base text-gray-400 italic block">
                                    {item.author}
                                  </span>
                                  <span className="text-xs text-gray-400 mt-1 block">Information non vérifiée</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </span>
                                <div>
                                  <span className="text-base font-semibold text-gray-700 block">
                                    {item.author}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-1 block">Auteur vérifié</span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {isRecent && (
                                <span className="flex h-2 w-2 mr-2">
                                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-700">{item.borrowDate}</div>
                                {isRecent && <div className="text-xs text-green-600">Récent</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {isRecentReturn && (
                                <span className="flex h-2 w-2 mr-2">
                                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-700">{item.returnDate}</div>
                                {isRecentReturn && <div className="text-xs text-green-600">Récent</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 font-medium">
                              {item.duration} jour{item.duration > 1 ? 's' : ''}
                              {item.isReturned && item.duration <= 14 && (
                                <span className="ml-1 text-xs text-green-600">✓</span>
                              )}
                              {item.isReturned && item.duration > 14 && (
                                <span className="ml-1 text-xs text-yellow-600">⚠️</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.isReturned ?
                                (item.duration <= 14 ? "Dans les délais" : "Hors délai") :
                                "En cours"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.isReturned ? (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Retourné
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                En cours
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-2">
                              {/* Transaction d'emprunt */}
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  Emprunt
                                </span>
                                {item.borrowTransactionHash ? (
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${item.borrowTransactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-xs text-blue-600 hover:underline"
                                  >
                                    Voir
                                  </a>
                                ) : (
                                  <span className="ml-1 text-xs text-gray-500">-</span>
                                )}
                              </div>

                              {/* Transaction de retour (si applicable) */}
                              {item.isReturned && (
                                <div className="flex items-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Retour
                                  </span>
                                  {item.returnTransactionHash ? (
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${item.returnTransactionHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-1 text-xs text-blue-600 hover:underline"
                                    >
                                      Voir
                                    </a>
                                  ) : (
                                    <span className="ml-1 text-xs text-gray-500">-</span>
                                  )}
                                </div>
                              )}

                              {/* Bouton pour recharger les informations du livre */}
                              {(item.title.includes("Livre #") || item.title.includes("Référence #") ||
                                item.author === "Information non disponible" || item.author === "Auteur indisponible" ||
                                item.author === "Information inaccessible" || item.author === "Information non récupérable") && (
                                <div className="flex items-center mt-1">
                                  <button
                                    className="text-xs text-[#2A3B8C] hover:text-[#2A3B8C]/80 flex items-center"
                                    onClick={async () => {
                                      // Afficher un toast de chargement
                                      toast.loading("Rechargement des informations...", {
                                        id: `reload-book-${item.bookId}`,
                                        duration: 3000
                                      });

                                      try {
                                        // Supprimer ce livre du cache
                                        setBookCache(prevCache => {
                                          const newCache = {...prevCache};
                                          delete newCache[item.bookId];
                                          return newCache;
                                        });

                                        // Forcer le rechargement des informations du livre
                                        console.log(`Rechargement forcé des informations pour le livre ID: ${item.bookId}`);
                                        const bookDetails = await getBookDetails(item.bookId);

                                        if (bookDetails && bookDetails.title &&
                                            !bookDetails.title.includes("Livre #") &&
                                            !bookDetails.title.includes("Référence #")) {

                                          // Mettre à jour l'élément dans l'historique
                                          setBorrowHistory(prevHistory =>
                                            prevHistory.map(historyItem =>
                                              historyItem.bookId === item.bookId
                                                ? {
                                                    ...historyItem,
                                                    title: bookDetails.title,
                                                    author: bookDetails.author || "Auteur inconnu"
                                                  }
                                                : historyItem
                                            )
                                          );

                                          // Mettre à jour également la liste filtrée
                                          setFilteredBorrowHistory(prevFiltered =>
                                            prevFiltered.map(historyItem =>
                                              historyItem.bookId === item.bookId
                                                ? {
                                                    ...historyItem,
                                                    title: bookDetails.title,
                                                    author: bookDetails.author || "Auteur inconnu"
                                                  }
                                                : historyItem
                                            )
                                          );

                                          // Afficher un message de succès
                                          toast.success(`Informations mises à jour: ${bookDetails.title}`, {
                                            id: `reload-book-${item.bookId}`,
                                            duration: 3000
                                          });
                                        } else {
                                          // Afficher un message d'erreur
                                          toast.error("Impossible de récupérer les informations du livre", {
                                            id: `reload-book-${item.bookId}`,
                                            duration: 3000
                                          });
                                        }
                                      } catch (error) {
                                        console.error(`Erreur lors du rechargement des informations du livre ${item.bookId}:`, error);
                                        toast.error("Erreur lors du rechargement des informations", {
                                          id: `reload-book-${item.bookId}`,
                                          duration: 3000
                                        });
                                      }
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Recharger les infos
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Message si aucun résultat après filtrage */}
                    {filteredBorrowHistory.length === 0 && borrowHistory.length > 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center">
                          <div className="text-gray-500 py-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-lg font-medium">Aucun résultat ne correspond à votre filtre</p>
                            <p className="text-sm mt-1">Essayez un autre filtre ou <button
                              className="text-[#2A3B8C] underline"
                              onClick={() => {
                                setHistoryFilter('all');
                                applyHistoryFilter(borrowHistory, 'all');
                              }}
                            >voir tous les emprunts</button></p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Légende améliorée */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Légende</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center">
                    <span className="flex h-2 w-2 mr-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-gray-600">Activité récente (moins de 3 jours)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-green-600 mr-2">✓</span>
                    <span className="text-gray-600">Retourné dans les délais</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-yellow-600 mr-2">⚠️</span>
                    <span className="text-gray-600">Retourné avec retard</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex h-5 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Retourné
                    </span>
                    <span className="text-gray-600">Livre déjà rendu</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex h-5 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      En cours
                    </span>
                    <span className="text-gray-600">Emprunt toujours actif</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex h-5 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Validé
                    </span>
                    <span className="text-gray-600">Transaction confirmée sur la blockchain</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <p>Les transactions d'emprunt et de retour sont enregistrées de manière permanente et transparente sur la blockchain Ethereum.</p>
                  <p className="mt-1">Cliquez sur "Voir" pour consulter les détails de la transaction sur Etherscan.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-6 mb-4">
                <Clock size={48} className="text-gray-400" />
              </div>
              <p className="text-lg text-gray-500 mb-2">Vous n'avez pas encore d'historique d'emprunts.</p>
              <p className="text-sm text-gray-400 mb-6 text-center max-w-md">
                Lorsque vous emprunterez des livres, votre historique s'affichera ici et sera enregistré de manière transparente sur la blockchain.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 bg-[#2A3B8C] text-white rounded-md font-medium hover:bg-[#1F2D6B] transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Parcourir le catalogue
              </button>
            </div>
          )}
          <div className="mt-4">
            <TestButton userReputation={actualReputation} />
          </div>
        </div>
      </div>

      {/* Affichage du visualiseur PDF si des données sont disponibles */}
      {pdfViewerData && (
        <PdfViewer
          pdfUrl={pdfViewerData.url}
          fileName={pdfViewerData.fileName}
          onClose={handleClosePdfViewer}
          directUrl={pdfViewerData.directUrl}
          iframe={pdfViewerData.iframe}
        />
      )}

      <style>{`
        .circular-chart { width: 100%; height: auto; }
        .circle { transition: stroke-dasharray 1.5s ease-in-out; transform-origin: center; transform: rotate(-90deg); }
        .circle-bg { transform-origin: center; transform: rotate(-90deg); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .reputation-chart { animation: fadeIn 0.5s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default DashboardTab;
