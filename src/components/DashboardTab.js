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

    loadReputationFromBlockchain();

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

    // Ajouter les écouteurs d'événements
    window.addEventListener('reputationUpdated', handleReputationUpdate);
    window.addEventListener('bookReturned', handleBookReturned);
    window.addEventListener('openPdfViewer', handleOpenPdfViewer);

    // Nettoyer les écouteurs d'événements
    return () => {
      window.removeEventListener('reputationUpdated', handleReputationUpdate);
      window.removeEventListener('bookReturned', handleBookReturned);
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
      }
    };

    window.addEventListener('bookBorrowed', handleBookBorrowed);
    return () => window.removeEventListener('bookBorrowed', handleBookBorrowed);
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Vos Emprunts Actifs</h2>
          <span className="text-sm bg-[#2A3B8C]/10 text-[#2A3B8C] font-medium px-3 py-1 rounded-full">{userLoans.length} livre(s) emprunté(s)</span>
        </div>
        {loadingBooks ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="animate-pulse flex space-x-4 mb-3">
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
            <p className="text-gray-500">Chargement de vos emprunts...</p>
          </div>
        ) : userLoans.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#2A3B8C]/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Auteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Date limite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userLoans.map(loan => {
                  const dueDate = new Date(loan.dueDate);
                  const today = new Date();
                  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                  let statusColor = "text-[#4CAF50] bg-[#4CAF50]/10";
                  let statusText = `${daysLeft} jours restants`;
                  if (daysLeft <= 2) {
                    statusColor = "text-[#FFD700] bg-[#FFD700]/10";
                    statusText = `${daysLeft} jour${daysLeft > 1 ? 's' : ''} - Retour imminent !`;
                  }
                  if (daysLeft < 0) {
                    statusColor = "text-[#E53935] bg-[#E53935]/10";
                    statusText = `En retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''} !`;
                  }
                  return (
                    <tr key={loan.id} className="hover:bg-[#F8F9FA] transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loan.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex">
                        <button 
                          className="text-white bg-[#2A3B8C] hover:bg-[#1F2D6B] px-3 py-1 rounded-md transition" 
                          onClick={() => handleBookReturn(loan.bookId)}
                        >
                          Retourner
                        </button>
                        {loan.pdfHash && (
                          <button 
                            className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md transition flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                            onClick={() => handleDownload(loan)}
                            title="Lire le livre"
                          >
                            <Download size={14} className="mr-1" />
                            Lire
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">Vous n'avez pas d'emprunts actifs.</p>
            <button
              className="mt-4 px-4 py-2 bg-[#2A3B8C] text-white rounded-md font-medium hover:bg-[#1F2D6B] transition"
              onClick={() => setActiveTab('catalog')}
            >
              Parcourir le catalogue
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Historique d'Emprunts</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center">
            <div className="text-center text-gray-500">
              <Clock size={32} className="mx-auto mb-2 text-gray-400" />
              <p>Votre historique d'emprunts s'affichera ici.</p>
              <p className="text-xs mt-2 text-[#2A3B8C]">Les transactions sont enregistrées de manière transparente sur la blockchain</p>
            </div>
          </div>
          <TestButton userReputation={actualReputation} />
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
