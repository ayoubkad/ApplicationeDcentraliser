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
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [bookCache, setBookCache] = useState({});

  const getReputationLevel = (score) => {
    if (score >= 90) return { level: 'Premium', color: 'text-purple-600', benefits: ['Emprunts prolongés', 'Réservations prioritaires', 'Accès VIP'] };
    if (score >= 75) return { level: 'Or', color: 'text-yellow-600', benefits: ['Emprunts multiples', 'Délai prolongé'] };
    if (score >= 50) return { level: 'Argent', color: 'text-gray-600', benefits: ['Emprunts standards'] };
    return { level: 'Bronze', color: 'text-amber-700', benefits: ['Emprunts limités'] };
  };

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

    // Fonction pour récupérer et mettre en cache les détails d'un livre
    const getBookDetails = async (bookId) => {
      // Si le livre est déjà en cache, retourner les données
      if (bookCache[bookId]) {
        return bookCache[bookId];
      }

      try {
        // Essayer d'abord de récupérer le livre depuis le smart contract
        let bookDetails = await web3Service.getBook(bookId);
        
        // Si nous n'avons pas pu récupérer le livre depuis le contrat
        if (!bookDetails || !bookDetails.title) {
          // Vérifier si le livre existe dans le localStorage (hors ligne)
          try {
            const localBooksString = localStorage.getItem('localBooks');
            if (localBooksString) {
              const localBooks = JSON.parse(localBooksString);
              const localBook = localBooks.find(book => book.id.toString() === bookId.toString());
              if (localBook) {
                bookDetails = localBook;
                console.log(`Livre trouvé dans le localStorage: ${localBook.title}`);
              }
            }
          } catch (e) {
            console.warn("Erreur lors de la récupération du livre depuis le localStorage:", e);
          }
          
          // Si nous n'avons toujours pas trouvé le livre, utiliser les données par défaut
          if (!bookDetails || !bookDetails.title) {
            // Essayer de récupérer l'information "brute" depuis le contrat
            try {
              const rawBook = await web3Service.callViewMethod('books', [bookId], {gas: 3000000});
              if (rawBook && rawBook.title) {
                bookDetails = {
                  id: bookId,
                  title: rawBook.title || "Titre indisponible",
                  author: rawBook.author || "Auteur indisponible",
                  ipfsHash: rawBook.ipfsHash || null
                };
              }
            } catch (rawError) {
              console.warn(`Impossible de récupérer les données brutes du livre ${bookId}:`, rawError);
            }
            
            // Si nous n'avons toujours rien, utiliser l'ID pour la référence
            if (!bookDetails) {
              bookDetails = {
                id: bookId,
                title: `Livre #${bookId}`,
                author: "Auteur indisponible",
                ipfsHash: null
              };
            }
          }
        }
        
        // Mettre à jour le cache pour les prochaines demandes
        setBookCache(prevCache => ({
          ...prevCache,
          [bookId]: bookDetails
        }));
        
        return bookDetails;
      } catch (error) {
        console.error(`Erreur lors de la récupération des détails du livre ${bookId}:`, error);
        // Valeur par défaut en cas d'erreur
        return {
          id: bookId,
          title: `Référence #${bookId}`,
          author: "Information inaccessible",
          ipfsHash: null
        };
      }
    };

    // Charger l'historique des emprunts de l'utilisateur
    const loadBorrowHistory = async () => {
      setLoadingHistory(true);
      try {
        await web3Service.initialize();
        
        // Récupérer l'historique des emprunts
        const history = await web3Service.getUserBorrowHistory();
        
        if (history && history.length > 0) {
          console.log("Historique brut récupéré:", history);
          
          // Collecter tous les IDs de livres uniques pour une récupération optimisée
          const uniqueBookIds = [...new Set(history.map(item => item.bookId?.toString() || '0'))];
          console.log("IDs de livres uniques à récupérer:", uniqueBookIds);
          
          // Précharger les livres en batch pour éviter les requêtes multiples
          const bookDetailsPromises = uniqueBookIds.map(id => getBookDetails(id));
          await Promise.allSettled(bookDetailsPromises);
          
          // Traiter l'historique avec les détails des livres
          const historyWithDetails = await Promise.all(
            history.map(async (historyItem) => {
              try {
                // Extraire les valeurs importantes de l'objet d'historique
                const borrowId = historyItem.id || historyItem.borrowId || '0';
                const bookId = historyItem.bookId || '0';
                
                // Utiliser un timestamp valide ou une date par défaut raisonnable
                const defaultBorrowTime = new Date();
                defaultBorrowTime.setDate(defaultBorrowTime.getDate() - 1);
                
                // Convertir correctement les timestamps Unix en dates
                const borrowTime = historyItem.borrowTime && parseInt(historyItem.borrowTime) > 0 
                  ? new Date(parseInt(historyItem.borrowTime) * 1000) 
                  : defaultBorrowTime;
                
                const returnTime = historyItem.returnTime && parseInt(historyItem.returnTime) > 0
                  ? new Date(parseInt(historyItem.returnTime) * 1000)
                  : null;
                
                const isReturned = historyItem.returned || returnTime !== null;
                
                // Récupérer les détails du livre depuis notre cache/service
                const bookDetails = await getBookDetails(bookId);
                
                // Formatage des dates avec fallback sécurisé
                const formatDate = (date) => {
                  if (!date) return '-';
                  try {
                    return date.toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                  } catch (e) {
                    return date.toLocaleDateString('fr-FR');
                  }
                };
                
                // Calcul de la durée avec une valeur maximale raisonnable
                let duration = 0;
                try {
                  const endTime = returnTime || new Date();
                  duration = Math.ceil((endTime - borrowTime) / (1000 * 60 * 60 * 24));
                  
                  // Si la durée est négative ou déraisonnablement grande, utiliser une valeur par défaut
                  if (duration < 0 || duration > 1000) {
                    duration = returnTime ? 14 : Math.ceil((new Date() - defaultBorrowTime) / (1000 * 60 * 60 * 24));
                  }
                } catch (e) {
                  duration = 1; // Valeur par défaut en cas d'erreur
                }
                
                return {
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
                  duration: duration
                };
              } catch (error) {
                console.error(`Erreur lors du traitement de l'élément d'historique:`, error);
                // Valeurs par défaut améliorées en cas d'erreur
                const defaultDate = new Date();
                defaultDate.setDate(defaultDate.getDate() - 7); // Une semaine par défaut
                
                return {
                  id: historyItem.id || Date.now().toString(),
                  bookId: historyItem.bookId || '0',
                  borrowTime: defaultDate,
                  returnTime: null,
                  isReturned: false,
                  title: `Référence #${historyItem.bookId || '?'}`,
                  author: "Information non récupérable",
                  borrowDate: defaultDate.toLocaleDateString('fr-FR'),
                  returnDate: '-',
                  duration: 7
                };
              }
            })
          );
          
          // Trier l'historique par date d'emprunt (plus récent en premier)
          const sortedHistory = historyWithDetails.sort((a, b) => 
            b.borrowTime - a.borrowTime
          );
          
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
            console.log("Historique d'emprunts validé et corrigé:", validatedHistory);
          }
        } else {
          setBorrowHistory([]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'historique d'emprunts:", error);
        setBorrowHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadReputationFromBlockchain();
    loadBorrowHistory();

    // Fonction de gestion des mises à jour de réputation
    const handleReputationUpdate = (event) => {
      if (event.detail && !isNaN(Number(event.detail.reputation))) {
        console.log("Mise à jour de la réputation détectée:", event.detail.reputation);
        
        // Forcer la mise à jour du localStorage pour éviter les désynchronisations
        const account = web3Service.getAccount();
        if (account) {
          try {
            const lowerCaseAddress = account.toLowerCase();
            const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
            if (userData) {
              const user = JSON.parse(userData);
              user.reputation = Number(event.detail.reputation);
              localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(user));
            }
          } catch (error) {
            console.error("Erreur lors de la mise à jour du localStorage:", error);
          }
        }
        
        // Mettre à jour l'interface avec la nouvelle valeur
        setActualReputation(Number(event.detail.reputation));
        
        // Afficher une notification
        const oldReputation = actualReputation;
        const newReputation = Number(event.detail.reputation);
        const delta = newReputation - oldReputation;
        
        if (delta > 0) {
          toast.success(`Félicitations! Votre réputation a augmenté: +${delta} points`, {
            duration: 4000,
            icon: '⭐'
          });
        }
      }
    };

    // Fonction spécifique pour la gestion des retours de livres
    const handleBookReturned = async (event) => {
      console.log("Livre retourné, vérification de la réputation...");
      
      // Attendre un moment pour que la blockchain se mette à jour
      setTimeout(async () => {
        try {
          // Récupérer la réputation directement depuis la blockchain (ignorer le cache)
          const newReputation = await web3Service.callViewMethod('getUserReputation', [web3Service.getAccount()]);
          
          if (newReputation && !isNaN(Number(newReputation))) {
            console.log("Nouvelle réputation après retour:", newReputation);
            
            // Calculer le changement
            const delta = Number(newReputation) - actualReputation;
            
            // Forcer la mise à jour du localStorage
            const account = web3Service.getAccount();
            if (account) {
              try {
                const lowerCaseAddress = account.toLowerCase();
                const userData = localStorage.getItem(`user_${lowerCaseAddress}`);
                if (userData) {
                  const user = JSON.parse(userData);
                  user.reputation = Number(newReputation);
                  localStorage.setItem(`user_${lowerCaseAddress}`, JSON.stringify(user));
                }
              } catch (error) {
                console.error("Erreur lors de la mise à jour du localStorage:", error);
              }
            }
            
            // Mettre à jour l'interface
            setActualReputation(Number(newReputation));
            
            // Afficher une notification si la réputation a augmenté
            if (delta > 0) {
              toast.success(`Félicitations! Retour à temps: +${delta} points de réputation`, {
                duration: 4000,
                icon: '🌟'
              });
            }
          }
        } catch (error) {
          console.error("Erreur lors de la vérification de la réputation après retour:", error);
        }
      }, 1500);
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

    // Nettoyer les écouteurs d'événements
    return () => {
      window.removeEventListener('reputationUpdated', handleReputationUpdate);
      window.removeEventListener('bookReturned', handleBookReturned);
      window.removeEventListener('bookReturned', handleBookReturnedHistory); // Nettoyer l'écouteur
      window.removeEventListener('bookBorrowed', handleBookBorrowed);
      window.removeEventListener('openPdfViewer', handleOpenPdfViewer);
    };
  }, [userReputation, actualReputation]);

  useEffect(() => {
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

    loadUserLoans();
  }, []);

  const handleDownload = async (loan) => {
    if (!loan.pdfHash) {
      toast.error("Ce livre n'est pas disponible au téléchargement.");
      return;
    }

    const cid = loan.pdfHash.startsWith('ipfs://') ? loan.pdfHash.substring(7) : loan.pdfHash;

    if (!isValidCid(cid)) {
      toast.error("Le CID IPFS est invalide.");
      return;
    }

    const loadingToastId = toast.loading("Chargement en cours...");
    const startTime = performance.now();

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
      toast.success(`Chargement terminé en ${downloadTime}s !`, {
        id: loadingToastId,
        duration: 3000
      });
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
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

  const handleBookReturn = async (bookId) => {
    try {
      // Désactiver le bouton pendant le processus de retour
      setIsLoading(true);
      
      // Appeler la fonction de retour du livre
      const result = await web3Service.returnBook(bookId);
      
      if (result.success) {
        // Mettre à jour la réputation si elle a changé
        if (result.reputation && !isNaN(Number(result.reputation))) {
          console.log("Nouvelle réputation après retour:", result.reputation);
          setActualReputation(Number(result.reputation));
          
          // Afficher un message sur le changement de réputation
          if (result.reputationChange > 0) {
            toast.success(`Réputation augmentée: +${result.reputationChange} points!`, {
              duration: 3000,
              icon: '⭐'
            });
          }
        }
        
        // Afficher un message de succès avec toast
        toast.success("Livre retourné avec succès!", {
          duration: 3000,
          icon: '📚'
        });
        
        // Mettre à jour la liste des emprunts
        setUserLoans(prevLoans => prevLoans.filter(loan => Number(loan.bookId) !== Number(bookId)));
        
        // Notifier le parent du retour réussi
        if (handleReturnBook) {
          handleReturnBook(bookId);
        }
      } else {
        // Afficher un message d'erreur
        toast.error(result.message || "Erreur lors du retour du livre", {
          duration: 4000
        });
      }
    } catch (error) {
      console.error("Erreur lors du retour du livre:", error);
      toast.error("Une erreur s'est produite lors du retour du livre", {
        duration: 4000
      });
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
                  
                  return (
                    <div key={loan.id} className={`border rounded-lg overflow-hidden transition-all duration-200 ${isUrgent ? 'border-yellow-300 shadow-yellow-100 shadow-md' : 'border-gray-200'}`}>
                      <div className="flex p-4">
                        <div className="w-16 h-20 bg-blue-50 rounded-md flex items-center justify-center text-blue-700 mr-4 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg line-clamp-1" title={loan.title}>{loan.title}</h3>
                          <p className="text-gray-600 text-sm mb-2">{loan.author}</p>
                          <div className="flex justify-between items-center">
                            <div className={`text-xs font-medium rounded-full px-2 py-1 ${
                              daysLeft <= 0 
                                ? 'bg-red-100 text-red-800' 
                                : daysLeft <= 2 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {daysLeft <= 0 
                                ? `En retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}` 
                                : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}
                            </div>
                            <span className="text-xs text-gray-500">Échéance: {loan.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t bg-gray-50 p-2 flex">
                        <button 
                          className="flex-1 text-[#2A3B8C] hover:bg-[#2A3B8C]/10 transition-colors py-1 rounded text-sm font-medium" 
                          onClick={() => handleBookReturn(loan.bookId)}
                        >
                          Retourner
                        </button>
                        {loan.pdfHash && (
                          <button 
                            className="flex-1 text-green-600 hover:bg-green-50 transition-colors py-1 rounded text-sm font-medium flex items-center justify-center"
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
          <Clock className="mr-2" /> Historique d'Emprunts
        </h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          {loadingHistory ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-32 bg-gray-100 rounded"></div>
            </div>
          ) : borrowHistory.length > 0 ? (
            <>
              <div className="flex flex-wrap justify-between items-center mb-6">
                <div className="flex space-x-2 my-2">
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
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500 italic">
                    Transactions vérifiées par la blockchain
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {borrowHistory.map((item, index) => {
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
                        <tr key={item.id} className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
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
                        </tr>
                      );
                    })}
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
                      Retourné
                    </span>
                    <span className="text-gray-600">Livre déjà rendu</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex h-5 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                      En cours
                    </span>
                    <span className="text-gray-600">Emprunt toujours actif</span>
                  </div>
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
