import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, User, CheckCircle, Upload, X, FileText, Wifi, WifiOff, RefreshCw, ShieldAlert, Loader, Award, UserPlus, Filter, Search } from 'lucide-react';
import ipfsService from '../services/IPFSService';
import web3Service from '../services/Web3Service';

const AdminTab = ({ setNotification, isLoading, setIsLoading }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [books, setBooks] = useState([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [bookStats, setBookStats] = useState({ total: 0, borrowed: 0, available: 0, overdue: 0 });
  const [loanStats, setLoanStats] = useState({ total: 0, active: 5 });
  const [userStats, setUserStats] = useState({ total: 12 });
  const [loadingStates, setLoadingStates] = useState({
    admin: false,
    books: false,
    users: false
  });
  const [timeoutIds, setTimeoutIds] = useState({});
  const [activeSection, setActiveSection] = useState('books');
  const [ipfsStatus, setIpfsStatus] = useState({ checking: false, connected: false, nodeInfo: '', error: null });
  const [newBook, setNewBook] = useState({ 
    title: '', 
    author: '', 
    category: '', 
    isbn: '', 
    pageCount: '', 
    publishedDate: '', 
    description: '', 
    price: '0' 
  });
  const [bookCover, setBookCover] = useState(null);
  const [bookCoverPreview, setBookCoverPreview] = useState('');
  const [bookPDF, setBookPDF] = useState(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBookToRemove, setSelectedBookToRemove] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [hiddenBooks, setHiddenBooks] = useState([]);
  const [showHiddenBooks, setShowHiddenBooks] = useState(false);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  
  // Helper pour gérer les états de chargement avec timeout
  const startLoading = (type, timeoutMs = 10000) => {
    // Annuler tout timeout existant pour ce type
    if (timeoutIds[type]) {
      clearTimeout(timeoutIds[type]);
    }

    // Mettre à jour l'état de chargement
    setLoadingStates(prev => ({ ...prev, [type]: true }));
    
    // Configurer un timeout pour arrêter automatiquement après un certain temps
    const timeoutId = setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [type]: false }));
      // Afficher une notification si le chargement prend trop de temps
      setNotification({
        message: `Le chargement de ${getLoadingLabel(type)} prend plus de temps que prévu. Veuillez vérifier votre connexion.`,
        type: 'warning'
      });
    }, timeoutMs);
    
    // Enregistrer l'ID du timeout
    setTimeoutIds(prev => ({ ...prev, [type]: timeoutId }));
    
    return () => {
      // Fonction pour arrêter le chargement
      clearTimeout(timeoutIds[type]);
      setLoadingStates(prev => ({ ...prev, [type]: false }));
    };
  };

  // Fonction pour obtenir le libellé des types de chargement
  const getLoadingLabel = (type) => {
    const labels = {
      admin: "la vérification administrateur",
      books: "la liste des livres",
      users: "la liste des utilisateurs"
    };
    return labels[type] || "l'opération";
  };

  // Nettoyage des timeouts au démontage du composant
  useEffect(() => {
    return () => {
      Object.values(timeoutIds).forEach(id => clearTimeout(id));
    };
  }, [timeoutIds]);

  useEffect(() => {
    checkAdminStatus();
    
    // Écouter les changements de compte MetaMask
    window.addEventListener('metamaskAccountChanged', checkAdminStatus);
    
    return () => {
      window.removeEventListener('metamaskAccountChanged', checkAdminStatus);
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadBooks();
      loadUsers(); // Chargement des utilisateurs
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const stopLoading = startLoading('admin');
    try {
      // Vérifier si l'utilisateur est connecté à MetaMask
      if (!web3Service.isConnected()) {
        await web3Service.initialize();
      }
      
      // Vérifier si l'utilisateur est administrateur
      const adminStatus = await web3Service.isAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setNotification({ 
          message: 'Attention: Vous n\'avez pas les droits d\'administrateur pour accéder à cette section', 
          type: 'warning' 
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut d'administrateur:", error);
      setIsAdmin(false);
      setNotification({ 
        message: `Erreur lors de la vérification du statut d'administrateur: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      stopLoading();
      setIsCheckingAdmin(false);
    }
  };

  const checkIPFSConnection = async () => {
    const stopLoading = startLoading('ipfs', 15000);
    
    try {
      const status = await ipfsService.testConnection();
      setIpfsStatus({ checking: false, connected: status.connected, nodeInfo: status.nodeInfo || '' });

      if (status.connected) {
        setNotification({ message: 'Connexion IPFS établie avec succès', type: 'success' });
      } else {
        setNotification({ message: 'Impossible de se connecter à IPFS: ' + (status.error || 'Erreur inconnue'), type: 'error' });
      }
    } catch (error) {
      setIpfsStatus({ checking: false, connected: false, error: error.message });
      setNotification({ message: 'Erreur lors de la vérification de la connexion IPFS', type: 'error' });
    } finally {
      stopLoading();
    }
  };

  const handleNewBookChange = (e) => {
    const { name, value } = e.target;
    setNewBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBookCover(file);
      const reader = new FileReader();
      reader.onloadend = () => setBookCoverPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePDFChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setBookPDF(file);
      setNotification({ message: 'Fichier PDF sélectionné: ' + file.name, type: 'info' });
    } else if (file) {
      setNotification({ message: 'Seuls les fichiers PDF sont acceptés', type: 'warning' });
    }
  };

  const uploadToIPFS = async () => {
    if (!bookCover) {
      setNotification({
        message: 'Veuillez sélectionner une image de couverture',
        type: 'warning'
      });
      return null;
    }

    const stopLoading = startLoading('ipfs', 30000);
    setIsUploading(true);
    
    try {
      const result = await ipfsService.uploadBookData(
        newBook,
        bookCover,
        bookPDF
      );

      setIpfsHash(result.metadataHash);
      setNotification({
        message: 'Livre téléchargé sur IPFS avec succès! CID: ' + result.metadataHash,
        type: 'success'
      });

      return result.metadataHash;
    } catch (error) {
      setNotification({
        message: 'Erreur IPFS: ' + error.message.replace('Erreur upload livre: ', ''),
        type: 'error'
      });
      return null;
    } finally {
      stopLoading();
      setIsUploading(false);
    }
  };

  const handleAddBook = async () => {
    // Vérifier si l'utilisateur est administrateur
    if (!isAdmin) {
      setNotification({ 
        message: "Opération non autorisée: seuls les administrateurs peuvent ajouter des livres", 
        type: "error" 
      });
      return;
    }
    
    if (!newBook.title || !newBook.author) {
      setNotification({ message: "Le titre et l'auteur sont obligatoires", type: "warning" });
      return;
    }
    
    const stopLoading = startLoading('addBook', 60000);
    setIsLoading(true);
    
    try {
      // Uploader d'abord sur IPFS
      const hash = await uploadToIPFS();
      if (!hash) {
        setNotification({ 
          message: "Impossible de télécharger le livre sur IPFS. Veuillez réessayer.", 
          type: "error" 
        });
        return;
      }
      
      setNotification({ 
        message: "Transaction en cours d'envoi à la blockchain... Veuillez confirmer dans MetaMask", 
        type: "info" 
      });
      
      // Appel à addBook avec les paramètres exacts attendus par le contrat: titre, auteur, ipfsHash
      const result = await web3Service.addBook(
        newBook.title, 
        newBook.author, 
        hash // Hash IPFS généré
      );
      
      console.log("Résultat de l'ajout du livre:", result);
      
      if (result && result.success) {
        setNotification({ 
          message: `Livre ajouté avec succès à la blockchain! ID: ${result.bookId || 'Nouveau'}`, 
          type: 'success' 
        });
        
        // Déclencher un événement pour informer les autres composants qu'un livre a été ajouté
        window.dispatchEvent(new CustomEvent('bookAdded', {
          detail: {
            id: result.bookId,
            title: newBook.title,
            author: newBook.author,
            ipfsHash: hash,
            category: newBook.category,
            isbn: newBook.isbn,
            pageCount: newBook.pageCount,
            publishedDate: newBook.publishedDate,
            description: newBook.description,
            price: newBook.price
          }
        }));
        
        // Réinitialiser le formulaire après ajout réussi
        resetForm();
        
        // Actualiser la liste des livres après un court délai
        setTimeout(() => {
          loadBooks();
        }, 1000);
      } else {
        setNotification({ 
          message: "L'ajout du livre a échoué pour une raison inconnue", 
          type: "error" 
        });
      }
    } catch (error) {
      console.error("Erreur détaillée:", error);
      
      if (error.message && error.message.includes("Transaction rejetée")) {
        setNotification({ 
          message: "Vous avez annulé la transaction dans MetaMask. Aucun livre n'a été ajouté.", 
          type: "warning" 
        });
      } 
      else if (error.message && error.message.includes("délai d'attente")) {
        setNotification({ 
          message: "La transaction a pris trop de temps. Veuillez vérifier votre connexion réseau et réessayer.", 
          type: "error" 
        });
      }
      else if (error.message && error.message.includes("Internal JSON-RPC error")) {
        setNotification({ 
          message: "Erreur de communication avec la blockchain. Essayez de réinitialiser MetaMask (Paramètres > Avancé > Réinitialiser le compte) et relancez votre navigateur.", 
          type: "error" 
        });
      }
      else if (error.message && error.message.includes("gas")) {
        setNotification({ 
          message: "Problème de frais de transaction. Essayez d'augmenter la limite de gaz dans MetaMask ou réessayez plus tard.", 
          type: "error" 
        });
      }
      else if (error.message && error.message.includes("revert") && error.message.includes("admin")) {
        setNotification({ 
          message: "Accès refusé: seuls les administrateurs peuvent ajouter des livres", 
          type: "error" 
        });
      }
      else {
        setNotification({ 
          message: "Erreur lors de l'ajout du livre: " + error.message, 
          type: "error" 
        });
      }
    } finally {
      stopLoading();
      setIsLoading(false);
    }
  };

  const recentBooks = [
    { id: 1, title: "Principes d'Économie", author: "Gregory Mankiw", isAvailable: true },
    { id: 2, title: "Introduction à l'Algorithmique", author: "Thomas Cormen", isAvailable: false },
    { id: 3, title: "Physique Quantique", author: "Claude Cohen-Tannoudji", isAvailable: true },
    { id: 4, title: "Histoire de l'Art", author: "Ernst Gombrich", isAvailable: true }
  ];

  const resetForm = () => {
    setNewBook({
      title: '',
      author: '',
      category: '',
      isbn: '',
      pageCount: '',
      publishedDate: '',
      description: '',
      price: '0',
    });
    setBookCover(null);
    setBookCoverPreview('');
    setBookPDF(null);
    setIpfsHash('');
  };

  const loadBooks = async () => {
    const stopLoading = startLoading('books', 15000);
    setIsLoadingBooks(true);
    
    try {
      const booksList = await web3Service.getBooks();
      setBooks(booksList);
    } catch (error) {
      console.error("Erreur lors du chargement des livres:", error);
      setNotification({
        message: "Erreur lors du chargement des livres: " + error.message,
        type: "error"
      });
    } finally {
      stopLoading();
      setIsLoadingBooks(false);
    }
  };

  const handleRemoveBook = async () => {
    if (!selectedBookToRemove) return;
    
    const stopLoading = startLoading('removeBook', 20000);
    setIsLoading(true);
    
    try {
      setNotification({
        message: "Tentative de suppression du livre...",
        type: "info"
      });
      
      // SOLUTION FINALE: Masquer le livre localement (hors blockchain)
      // Cette approche est garantie de fonctionner même en cas de problèmes avec MetaMask
      const result = await web3Service.hideBookLocally(selectedBookToRemove.id);
      
      console.log("Résultat du masquage:", result);
      
      setNotification({
        message: `Le livre "${selectedBookToRemove.title}" a été masqué avec succès`,
        type: "success"
      });
      
      // Actualiser et fermer
      setShowDeleteConfirm(false);
      setSelectedBookToRemove(null);
      
      // Attendre un moment puis actualiser la liste
      setTimeout(() => {
        loadBooks();
      }, 500);
      
    } catch (error) {
      console.error("Erreur lors du masquage:", error);
      
      setNotification({
        message: error.message || "Échec du masquage du livre",
        type: "error"
      });
      
    } finally {
      stopLoading();
      setIsLoading(false);
    }
  };

  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm || !selectedBookToRemove) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-yellow-600 mb-4">Masquer le livre</h3>
          <p className="mb-4">
            Souhaitez-vous masquer le livre 
            <span className="font-bold"> "{selectedBookToRemove.title}"</span> du catalogue ?
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 text-sm">
            <p className="text-yellow-700">
              <strong>Mode hors-ligne :</strong> Suite à des problèmes persistants avec MetaMask, 
              nous avons implémenté un mode de "masquage" local.
            </p>
            <p className="text-yellow-700 mt-1">
              Le livre ne sera plus visible dans le catalogue, mais restera sur la blockchain.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Annuler
            </button>
            <button
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              onClick={handleRemoveBook}
            >
              Masquer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fonction pour exécuter le diagnostic du contrat
  const runContractDiagnostic = async () => {
    setIsLoading(true);
    setDiagnosticResult(null);
    
    try {
      setNotification({
        message: "Exécution du diagnostic du contrat...",
        type: "info"
      });
      
      const result = await web3Service.diagnoseContractIssues();
      setDiagnosticResult(result);
      
      if (result.success) {
        setNotification({
          message: "Diagnostic terminé : le contrat semble correctement configuré",
          type: "success"
        });
      } else {
        setNotification({
          message: `Diagnostic terminé : problème détecté : ${result.issue}`,
          type: "warning"
        });
      }
      
      setShowDiagnostic(true);
    } catch (error) {
      console.error("Erreur lors du diagnostic:", error);
      setNotification({
        message: "Erreur lors du diagnostic : " + error.message,
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Composant pour afficher les résultats du diagnostic
  const DiagnosticModal = () => {
    if (!showDiagnostic) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-bold text-[#6A1B9A] mb-4">Résultats du diagnostic du contrat</h3>
          
          {diagnosticResult ? (
            <>
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  diagnosticResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {diagnosticResult.success ? 'Succès' : 'Problème détecté'}
                </span>
              </div>
              
              {diagnosticResult.success ? (
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold">Réseau</p>
                    <p>{diagnosticResult.network}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold">Adresse du contrat</p>
                    <p className="break-all">{diagnosticResult.contractAddress}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold">Votre compte</p>
                    <p className="break-all">{diagnosticResult.account}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold">Statut admin</p>
                    <p>{diagnosticResult.isAdmin ? 'Vous êtes administrateur ✅' : 'Vous n\'êtes pas administrateur ❌'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-semibold">Méthodes disponibles</p>
                    <ul className="list-disc list-inside">
                      {diagnosticResult.methods.map(method => (
                        <li key={method} className={method === 'removeBook' ? 'text-green-600 font-semibold' : ''}>
                          {method} {method === 'removeBook' ? '✅' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <p className="text-green-700">
                      Votre contrat semble correctement configuré pour la suppression de livres.
                      Si vous rencontrez des erreurs, essayez de réinitialiser MetaMask.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                  <p className="text-red-700 font-semibold">Problème détecté :</p>
                  <p className="text-red-700">{diagnosticResult.issue}</p>
                </div>
              )}
              
              <div className="mt-6 text-sm text-gray-500">
                <p className="font-semibold">Que faire si la suppression ne fonctionne toujours pas ?</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Vérifiez que vous êtes sur le bon réseau (Ganache/Localhost)</li>
                  <li>Assurez-vous que votre contrat est correctement déployé</li>
                  <li>Réinitialisez MetaMask : Paramètres {'>'}  Avancé {'>'}  Réinitialiser</li>
                  <li>Vérifiez que le contrat comporte bien la méthode removeBook</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 border-4 border-[#6A1B9A] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowDiagnostic(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Formatage de l'adresse d'administrateur avec gestion du timeout
  const useFormattedAdmin = (address) => {
    const [formattedAddress, setFormattedAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
      if (!address) {
        setFormattedAddress('Inconnu');
        setIsLoading(false);
        return;
      }
      
      if (address === web3Service.account) {
        setFormattedAddress('Vous');
        setIsLoading(false);
        return;
      }
      
      // Formater immédiatement l'adresse pour éviter l'affichage "Chargement en cours..."
      setFormattedAddress(`${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
      
      // Définir un timeout pour terminer l'état de chargement
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
        }
      }, 500); // Réduire le timeout à 500ms
      
      // Fonction pour formater l'adresse et mettre fin à l'état de chargement
      const formatWithDelay = () => {
        try {
          // L'adresse est déjà formatée, juste terminer le chargement
          setIsLoading(false);
        } catch (error) {
          console.error("Erreur lors du formatage de l'adresse", error);
          setFormattedAddress('Adresse invalide');
          setIsLoading(false);
        }
      };
      
      // Utiliser requestAnimationFrame pour une meilleure performance
      requestAnimationFrame(() => {
        formatWithDelay();
      });
      
      return () => {
        clearTimeout(timeoutId);
      };
    }, [address]);
    
    return { formattedAddress, isLoading };
  };

  // Composant pour afficher les livres masqués
  const HiddenBooksPanel = ({ books, onRestore, isRestoring }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [adminFilter, setAdminFilter] = useState('all');
    const [confirmingBook, setConfirmingBook] = useState(null);
    const [restoringId, setRestoringId] = useState(null);
    const [showOnlyMine, setShowOnlyMine] = useState(localStorage.getItem('show_only_current_admin_books') === 'true');
    const [adminLoadingState, setAdminLoadingState] = useState({}); 

    // Gérer le changement de préférence pour afficher seulement les livres de l'admin actuel
    const handleShowOnlyMineChange = (value) => {
      setShowOnlyMine(value);
      localStorage.setItem('show_only_current_admin_books', value ? 'true' : 'false');
      // Recharger les livres masqués avec les nouvelles préférences
      setTimeout(() => loadHiddenBooks(), 100);
    };

    // Récupérer la liste des administrateurs uniques
    const uniqueAdmins = [...new Set(books.map(book => book.hiddenBy))];

    // Filtrer par terme de recherche et par administrateur
    const filteredBooks = books.filter(book => 
      (book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       book.id?.toString().includes(searchTerm)) &&
      (adminFilter === 'all' || book.hiddenBy === adminFilter)
    );

    const sortedBooks = [...filteredBooks].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(b.hiddenAt) - new Date(a.hiddenAt);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'author') {
        comparison = a.author.localeCompare(b.author);
      } else if (sortBy === 'id') {
        comparison = a.id - b.id;
      }
      return sortOrder === 'asc' ? comparison * -1 : comparison;
    });

    // Gérer l'en-tête des colonnes cliquables pour le tri
    const handleSort = (column) => {
      if (sortBy === column) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(column);
        setSortOrder('asc');
      }
    };

    // Formater l'adresse de l'administrateur avec gestion du chargement
    const formatAdminAddress = (address) => {
      if (!address) return 'Inconnu';
      if (address === web3Service.account) return 'Vous';
      
      // Formater directement l'adresse pour éviter le message de chargement
      const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      
      // Vérifier si on a déjà formaté cette adresse
      if (!adminLoadingState[address]) {
        // Marquer cette adresse comme en cours de formatage
        setAdminLoadingState(prev => ({ ...prev, [address]: true }));
        
        // Définir un timeout court pour terminer l'état de chargement
        setTimeout(() => {
          setAdminLoadingState(prev => ({ ...prev, [address]: false }));
        }, 300);
      }
      
      return shortAddress;
    };

    // Fonction pour lancer la procédure de restauration
    const handleRestoreAction = (bookId) => {
      // Si déjà en cours de restauration, ne rien faire
      if (restoringId !== null) return;

      // Trouver le livre
      const book = books.find(b => b.id === bookId);
      if (!book) return;

      // Demander confirmation
      setConfirmingBook(book);
    };

    // Fonction pour confirmer la restauration
    const confirmRestore = async () => {
      if (!confirmingBook) return;
      
      try {
        setRestoringId(confirmingBook.id);
        setConfirmingBook(null);
        
        // Vérifier si le livre existe dans le contrat avec un timeout
        let livreDansContrat = false;
        try {
          // Créer une promesse avec timeout
          const checkPromise = Promise.race([
            web3Service.doesBookExist(confirmingBook.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout dépassé')), 3000))
          ]);
          
          livreDansContrat = await checkPromise;
        } catch (error) {
          console.warn("Erreur ou timeout lors de la vérification de l'existence du livre:", error.message);
          // En cas d'erreur, supposer que le livre n'existe pas pour continuer le processus
        }
        
        if (!livreDansContrat) {
          // Informer l'utilisateur que le livre n'existe plus sur la blockchain
          setNotification({
            message: `Le livre "${confirmingBook.title}" n'existe plus sur la blockchain mais sera retiré de la liste.`,
            type: "warning"
          });
        }
        
        // Appeler la fonction de restauration
        await onRestore(confirmingBook.id);
      } finally {
        setRestoringId(null);
      }
    };

    // Rendu du panneau
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${showHiddenBooks ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden transition-transform duration-300 transform ${showHiddenBooks ? 'translate-y-0' : 'translate-y-10'}`}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h3 className="text-lg font-semibold text-indigo-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Livres masqués <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">{books.length}</span>
            </h3>
            <button 
              onClick={() => setShowHiddenBooks(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* Barre de recherche et filtres */}
            <div className="mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher par titre, auteur ou ID..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {filteredBooks.length === 0 
                    ? 'Aucun livre trouvé' 
                    : `${filteredBooks.length} livre${filteredBooks.length > 1 ? 's' : ''} trouvé${filteredBooks.length > 1 ? 's' : ''}`}
                </div>
              </div>

              {/* Option pour afficher seulement les livres masqués par l'admin actuel */}
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    checked={showOnlyMine}
                    onChange={(e) => handleShowOnlyMineChange(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">Afficher uniquement mes livres masqués</span>
                </label>
                
                <div className="ml-2 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                  {showOnlyMine ? "Mode administrateur actuel" : "Tous les administrateurs"}
                </div>
              </div>

              {uniqueAdmins.length > 1 && !showOnlyMine && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500">Administrateur:</span>
                  <button
                    onClick={() => setAdminFilter('all')}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      adminFilter === 'all' 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Tous
                  </button>
                  {uniqueAdmins.map(admin => (
                    <button
                      key={admin}
                      onClick={() => setAdminFilter(admin)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        adminFilter === admin 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {formatAdminAddress(admin)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {books.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {showOnlyMine 
                    ? "Vous n'avez masqué aucun livre" 
                    : "Aucun livre masqué"}
                </h4>
                <p className="text-gray-500 max-w-md mx-auto">
                  {showOnlyMine 
                    ? "Lorsque vous masquerez des livres du catalogue, ils apparaîtront ici."
                    : "Lorsque des livres seront masqués du catalogue, ils apparaîtront ici et pourront être restaurés."}
                </p>
                {showOnlyMine && (
                  <button 
                    onClick={() => handleShowOnlyMineChange(false)}
                    className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                  >
                    Afficher tous les livres masqués
                  </button>
                )}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat pour "{searchTerm}"</h4>
                <p className="text-gray-500">Essayez avec d'autres termes de recherche ou changez de filtre.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 bg-indigo-50 rounded-md"
                    onClick={() => setSearchTerm('')}
                  >
                    Effacer la recherche
                  </button>
                  {adminFilter !== 'all' && (
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium px-3 py-1 bg-indigo-50 rounded-md"
                      onClick={() => setAdminFilter('all')}
                    >
                      Voir tous les administrateurs
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('id')}
                      >
                        <div className="flex items-center">
                          ID
                          {sortBy === 'id' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          Titre
                          {sortBy === 'title' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('author')}
                      >
                        <div className="flex items-center">
                          Auteur
                          {sortBy === 'author' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      {!showOnlyMine && (
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin
                        </th>
                      )}
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center">
                          Masqué le
                          {sortBy === 'date' && (
                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBooks.map((book) => (
                      <tr key={book.id} className={`hover:bg-gray-50 transition-colors ${restoringId === book.id ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                          #{book.id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{book.title}</div>
                          {book.reason && (
                            <div className="text-xs text-gray-500 italic">
                              Raison: {book.reason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{book.author}</div>
                        </td>
                        {!showOnlyMine && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {book.hiddenBy === web3Service.account ? (
                                <span className="text-indigo-600 font-medium">Vous</span>
                              ) : (
                                formatAdminAddress(book.hiddenBy)
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(book.hiddenAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {(() => {
                              const hiddenDate = new Date(book.hiddenAt);
                              const now = new Date();
                              const diffTime = Math.abs(now - hiddenDate);
                              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                              
                              if (diffDays === 0) return 'Aujourd\'hui';
                              if (diffDays === 1) return 'Hier';
                              if (diffDays < 7) return `Il y a ${diffDays} jours`;
                              if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
                              return `Il y a ${Math.floor(diffDays / 30)} mois`;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          {restoringId === book.id ? (
                            <div className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-100">
                              <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Restauration...</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRestoreAction(book.id)}
                              disabled={isRestoring || restoringId !== null}
                              className={`relative overflow-hidden group text-indigo-600 hover:text-indigo-900 inline-flex items-center transition-all bg-white hover:bg-indigo-50 px-2.5 py-1.5 rounded-md border border-gray-200 hover:border-indigo-100 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                isRestoring || restoringId !== null ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="Restaurer ce livre"
                            >
                              <span className="absolute inset-0 w-0 bg-indigo-50 transition-all duration-200 ease-out group-hover:w-full"></span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="relative h-4 w-4 mr-1.5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                              </svg>
                              <span className="relative">Restaurer</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              onClick={() => setShowHiddenBooks(false)}
            >
              Fermer
            </button>
          </div>

          {/* Modal de confirmation pour la restauration */}
          {confirmingBook && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurer ce livre ?</h3>
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <p className="text-gray-700"><span className="font-medium">Titre :</span> {confirmingBook.title}</p>
                  <p className="text-gray-700 mt-1"><span className="font-medium">Auteur :</span> {confirmingBook.author}</p>
                  {confirmingBook.reason && (
                    <p className="text-gray-700 mt-1"><span className="font-medium">Raison du masquage :</span> {confirmingBook.reason}</p>
                  )}
                </div>
                <p className="text-gray-600 mb-6">
                  Ce livre sera à nouveau visible dans le catalogue et disponible pour l'emprunt. Voulez-vous continuer ?
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirmingBook(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmRestore}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Confirmer la restauration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Afficher un message si l'utilisateur n'est pas administrateur
  if (!isCheckingAdmin && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ShieldAlert size={24} className="text-red-500 mr-3" />
            <h2 className="text-xl font-bold text-red-700">Accès non autorisé</h2>
          </div>
          <p className="mt-3 text-red-600">
            Seuls les administrateurs peuvent accéder à cette section. Si vous pensez que c'est une erreur, veuillez vérifier que :
          </p>
          <ul className="list-disc list-inside mt-2 text-red-600">
            <li>Vous êtes connecté au compte MetaMask correct</li>
            <li>Votre compte a bien les droits d'administrateur</li>
            <li>Vous êtes connecté au bon réseau blockchain</li>
          </ul>
          <button 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center"
            onClick={checkAdminStatus}
          >
            <RefreshCw size={16} className="mr-2" />
            Vérifier à nouveau
          </button>
        </div>
      </div>
    );
  }

  // Composant UI pour afficher l'indicateur de chargement global
  const LoadingIndicator = () => {
    const isAnyLoading = Object.values(loadingStates).some(state => state) || isLoading;
    
    if (!isAnyLoading) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-6 py-4 flex items-center space-x-4 pointer-events-auto">
          <div className="text-[#6A1B9A]">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <p className="text-gray-700 font-medium">Traitement en cours</p>
            <p className="text-xs text-gray-500 mt-1">Un moment, s'il vous plaît...</p>
          </div>
        </div>
      </div>
    );
  };

  // Chargement des livres masqués
  const loadHiddenBooks = async () => {
    try {
      // Récupérer les livres masqués depuis le localStorage
      const hiddenBooksLS = JSON.parse(localStorage.getItem('hidden_books') || '[]');
      
      // Filtrer les livres si l'option "Afficher uniquement mes livres masqués" est activée
      const showOnlyMine = localStorage.getItem('show_only_current_admin_books') === 'true';
      const filteredBooks = showOnlyMine 
        ? hiddenBooksLS.filter(book => book.hiddenBy === web3Service.account)
        : hiddenBooksLS;
      
      setHiddenBooks(filteredBooks);
    } catch (error) {
      console.error("Erreur lors du chargement des livres masqués", error);
      setNotification({
        message: "Impossible de charger les livres masqués",
        type: "error"
      });
    }
  };

  // Fonction pour restaurer un livre masqué
  const handleRestoreBook = async (bookId) => {
    let stopLoadingFn;
    try {
      // Démarrer l'indicateur de chargement si la fonction startLoading existe
      if (typeof startLoading === 'function') {
        stopLoadingFn = startLoading('removeBook', 15000);
      }
      
      console.log(`Tentative de restauration du livre #${bookId}`);
      setIsLoading(true);
      
      // Trouver le livre dans la liste des livres masqués
      const bookToRestore = hiddenBooks.find(book => book.id === bookId);
      if (!bookToRestore) {
        console.error(`Livre #${bookId} non trouvé dans la liste des livres masqués`);
        setNotification({
          message: "Erreur: Livre introuvable",
          type: "error"
        });
        return;
      }
      
      // Vérifier si le livre existe toujours dans le contrat
      let doesExist = false;
      try {
        doesExist = await web3Service.doesBookExist(bookId);
      } catch (error) {
        console.warn(`Erreur lors de la vérification de l'existence du livre #${bookId}:`, error);
      }
      
      if (!doesExist) {
        console.warn(`Le livre avec l'ID ${bookId} n'existe pas ou a été supprimé du contrat.`);
        setNotification({
          message: `Attention: Le livre "${bookToRestore.title}" n'existe plus sur la blockchain mais sera retiré de la liste des livres masqués.`,
          type: "warning"
        });
      }
      
      // Supprimer le livre de la liste des livres masqués dans le localStorage
      const hiddenBooksLS = JSON.parse(localStorage.getItem('hidden_books') || '[]');
      const updatedHiddenBooks = hiddenBooksLS.filter(book => book.id !== bookId);
      localStorage.setItem('hidden_books', JSON.stringify(updatedHiddenBooks));
      
      // Mettre à jour l'état local
      setHiddenBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      // Si le livre existe sur la blockchain, mettre à jour son statut via le contrat
      if (doesExist) {
        // Si un contrat existe, appeler la méthode pour restaurer le livre
        await web3Service.callContractMethod('unhideBook', [bookId]);
      }
      
      // Afficher une notification de succès
      setNotification({
        message: `Le livre "${bookToRestore.title}" a été restauré avec succès${!doesExist ? ' (supprimé de la liste uniquement)' : ''}`,
        type: "success"
      });
      
      // Recharger la liste des livres
      await loadBooks();
      
    } catch (error) {
      console.error("Erreur lors de la restauration du livre", error);
      setNotification({
        message: `Erreur lors de la restauration du livre: ${error.message || 'Erreur inconnue'}`,
        type: "error"
      });
    } finally {
      setIsLoading(false);
      
      // Arrêter l'indicateur de chargement si la fonction existe
      if (typeof stopLoadingFn === 'function') {
        try {
          stopLoadingFn();
        } catch (err) {
          console.warn('Erreur lors de l\'arrêt de l\'indicateur de chargement:', err);
        }
      }
    }
  };

  // Fonction pour charger les utilisateurs
  const loadUsers = async () => {
    const stopLoading = startLoading('users', 15000);
    setIsLoadingUsers(true);
    
    try {
      let usersList = [];
      
      // Récupérer tous les utilisateurs
      usersList = await web3Service.getAllRegisteredUsers();
      
      setUsers(usersList);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      setNotification({
        message: "Erreur lors du chargement des utilisateurs: " + error.message,
        type: "error"
      });
    } finally {
      stopLoading();
      setIsLoadingUsers(false);
    }
  };

  // Composant pour afficher la liste des utilisateurs
  const UsersPanel = () => {
    // Filtrer les utilisateurs selon le filtre actif et le terme de recherche
    const filteredUsers = users.filter(user => {
      // Appliquer le filtre par type d'utilisateur
      if (userFilter === 'students' && user.role !== 0) return false;
      if (userFilter === 'professors' && user.role !== 1) return false;
      
      // Appliquer le filtre de recherche
      if (userSearchTerm) {
        const searchLower = userSearchTerm.toLowerCase();
        return (
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.address && user.address.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
    
    // Compter les étudiants et professeurs
    const studentsCount = users.filter(user => user.role === 0).length;
    const professorsCount = users.filter(user => user.role === 1).length;
    
    // Génère un fond de couleur différent selon le rôle
    const getRoleBackgroundColor = (role) => {
      return role === 1 ? 'bg-indigo-50' : 'bg-emerald-50';
    };
    
    // Génère un texte de couleur différent selon le rôle
    const getRoleTextColor = (role) => {
      return role === 1 ? 'text-indigo-700' : 'text-emerald-700';
    };
    
    // Formater une adresse Ethereum pour l'affichage
    const formatAddress = (address) => {
      if (!address) return 'Adresse inconnue';
      if (address === web3Service.account) return `${address.substring(0, 6)}...${address.substring(address.length - 4)} (Vous)`;
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#6A1B9A]/5">
          <h2 className="text-lg font-semibold text-[#6A1B9A]">Utilisateurs</h2>
          <p className="text-sm text-gray-500">Liste des utilisateurs inscrits à la bibliothèque</p>
        </div>
        
        <div className="p-6">
          {/* En-tête avec statistiques */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total utilisateurs</p>
                  <p className="text-2xl font-bold text-[#6A1B9A]">{users.length}</p>
                </div>
                <div className="bg-[#6A1B9A]/10 rounded-full p-3">
                  <User className="h-6 w-6 text-[#6A1B9A]" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Étudiants</p>
                  <p className="text-2xl font-bold text-emerald-600">{studentsCount}</p>
                </div>
                <div className="bg-emerald-50 rounded-full p-3">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Professeurs</p>
                  <p className="text-2xl font-bold text-indigo-600">{professorsCount}</p>
                </div>
                <div className="bg-indigo-50 rounded-full p-3">
                  <Award className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Barre de recherche et filtres */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom ou adresse"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10 w-full border-gray-300 rounded-md focus:ring-[#6A1B9A] focus:border-[#6A1B9A] py-2 px-3 border"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Filtrer par :</span>
              <div className="flex rounded-md shadow-sm">
                <button
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                    userFilter === 'all' ? 'bg-[#6A1B9A] text-white z-10' : 'bg-white text-gray-700'
                  }`}
                  onClick={() => setUserFilter('all')}
                >
                  Tous
                </button>
                <button
                  className={`relative -ml-px inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                    userFilter === 'students' ? 'bg-emerald-600 text-white z-10' : 'bg-white text-gray-700'
                  }`}
                  onClick={() => setUserFilter('students')}
                >
                  Étudiants
                </button>
                <button
                  className={`relative -ml-px inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                    userFilter === 'professors' ? 'bg-indigo-600 text-white z-10' : 'bg-white text-gray-700'
                  }`}
                  onClick={() => setUserFilter('professors')}
                >
                  Professeurs
                </button>
              </div>
              
              <button
                onClick={loadUsers}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                title="Rafraîchir la liste"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Liste des utilisateurs */}
          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-[#6A1B9A] border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-gray-500">Chargement des utilisateurs...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun utilisateur trouvé</h3>
              <p className="text-gray-500 mb-4">Aucun utilisateur n'est inscrit à la bibliothèque pour le moment.</p>
              <button
                onClick={loadUsers}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#6A1B9A] hover:bg-[#590D88]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
                <Search className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun résultat</h3>
              <p className="text-gray-500 mb-4">
                Aucun utilisateur ne correspond à votre recherche
                {userFilter !== 'all' ? ` dans la catégorie ${userFilter === 'students' ? 'étudiants' : 'professeurs'}` : ''}.
              </p>
              <button
                onClick={() => {
                  setUserSearchTerm('');
                  setUserFilter('all');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#6A1B9A] hover:bg-[#590D88]"
              >
                <Filter className="h-4 w-4 mr-2" />
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Réputation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adresse
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'inscription
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${getRoleBackgroundColor(user.role)}`}>
                            {user.role === 1 ? (
                              <Award className={`h-5 w-5 ${getRoleTextColor(user.role)}`} />
                            ) : (
                              <User className={`h-5 w-5 ${getRoleTextColor(user.role)}`} />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Utilisateur sans nom'}
                              {user.address === web3Service.account && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Vous
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 1 
                            ? 'bg-indigo-100 text-indigo-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {user.role === 1 ? 'Professeur' : 'Étudiant'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden max-w-[100px]">
                            <div 
                              className={`h-2 rounded-full ${
                                user.reputation >= 90 ? 'bg-green-500' :
                                user.reputation >= 70 ? 'bg-teal-500' :
                                user.reputation >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${user.reputation}%` }}
                            ></div>
                          </div>
                          <div className="ml-2 text-xs text-gray-500">{user.reputation}/100</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-mono">
                          {formatAddress(user.address)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.registrationTime ? (
                          new Date(user.registrationTime).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        ) : (
                          'Inconnue'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Indicateur de chargement global */}
      <LoadingIndicator />
      
      <h1 className="text-2xl font-bold text-[#6A1B9A] mb-6">Administration</h1>

      {/* Admin Status Banner */}
      {isAdmin && (
        <div className="mb-6 bg-green-50 p-4 rounded-lg border-l-4 border-green-500 shadow flex items-center">
          <CheckCircle size={20} className="text-green-500 mr-3" />
          <span className="font-medium text-green-700">
            Connecté en tant qu'administrateur
          </span>
        </div>
      )}

      {/* IPFS Connection Status */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <div className="flex items-center">
          {loadingStates.ipfs ? (
            <div className="w-5 h-5 mr-3 border-2 border-[#6A1B9A] border-t-transparent rounded-full animate-spin"></div>
          ) : ipfsStatus.connected ? (
            <Wifi size={20} className="text-green-500 mr-3" />
          ) : (
            <WifiOff size={20} className="text-red-500 mr-3" />
          )}
          <span className="font-medium">
            Statut IPFS: {loadingStates.ipfs ? 'Vérification...' : ipfsStatus.connected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            className="bg-[#6A1B9A] text-white px-3 py-1.5 rounded text-sm hover:bg-[#590D88] transition flex items-center"
            onClick={checkIPFSConnection}
            disabled={loadingStates.ipfs}
          >
            {loadingStates.ipfs ? (
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <RefreshCw size={16} className="mr-1" />
            )}
            Vérifier la connexion
          </button>
          <button
            className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 transition flex items-center"
            onClick={() => {
              // Proposer à l'utilisateur de réinitialiser son compte MetaMask
              if (window.confirm("Résoudre les problèmes de transaction MetaMask ?\n\nCette action vous guidera pour résoudre les erreurs JSON-RPC dans MetaMask. Aucune donnée ne sera perdue.")) {
                setNotification({
                  message: "Pour réinitialiser MetaMask: 1) Ouvrez l'extension 2) Cliquez sur les 3 points verticaux 3) Paramètres > Avancé > Réinitialiser le compte",
                  type: "info"
                });
                
                // Ouvrir une nouvelle fenêtre avec des instructions détaillées
                window.open("https://metamask.zendesk.com/hc/en-us/articles/360015488891-How-to-reset-an-account", "_blank");
              }
            }}
          >
            <RefreshCw size={16} className="mr-1" />
            Résoudre problèmes MetaMask
          </button>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <UsersPanel />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-[#6A1B9A]/5">
          <h2 className="text-lg font-semibold text-[#6A1B9A]">Ajouter un Nouveau Livre</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="title">
                Titre
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={newBook.title}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="Titre du livre"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="author">
                Auteur
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={newBook.author}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="Nom de l'auteur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="category">
                Catégorie
              </label>
              <select
                id="category"
                name="category"
                value={newBook.category}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="Sciences">Sciences</option>
                <option value="Littérature">Littérature</option>
                <option value="Histoire">Histoire</option>
                <option value="Technologie">Technologie</option>
                <option value="Économie">Économie</option>
                <option value="Informatique">Informatique</option>
                <option value="Art">Art</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="isbn">
                ISBN
              </label>
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={newBook.isbn}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="ISBN du livre"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="pageCount">
                Nombre de pages
              </label>
              <input
                type="number"
                id="pageCount"
                name="pageCount"
                value={newBook.pageCount}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="Nombre de pages"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="price">
                Prix (ETH)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={newBook.price}
                onChange={handleNewBookChange}
                step="0.01"
                min="0"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="Prix en ETH"
              />
              <p className="text-xs text-gray-500 mt-1">Le prix sera converti en Wei sur la blockchain</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="publishedDate">
                Date de publication
              </label>
              <input
                type="date"
                id="publishedDate"
                name="publishedDate"
                value={newBook.publishedDate}
                onChange={handleNewBookChange}
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={newBook.description}
                onChange={handleNewBookChange}
                rows="3"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                placeholder="Description du livre"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image de Couverture
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center group hover:border-[#6A1B9A] transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {bookCoverPreview ? (
                  <div className="relative w-full max-w-xs">
                    <img
                      src={bookCoverPreview}
                      alt="Prévisualisation de la couverture"
                      className="max-w-full h-auto rounded"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookCover(null);
                        setBookCoverPreview('');
                      }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-100"
                    >
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={36} className="text-gray-400 group-hover:text-[#6A1B9A] transition mb-2" />
                    <p className="text-sm text-gray-500 mb-1">Déposez une image ou</p>
                    <button className="text-sm text-[#6A1B9A] font-medium">parcourez vos fichiers</button>
                    <p className="text-xs text-gray-400 mt-2">L'image sera stockée sur IPFS</p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier PDF du Livre
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center group hover:border-[#6A1B9A] transition cursor-pointer"
                onClick={() => pdfInputRef.current?.click()}
              >
                {bookPDF ? (
                  <div className="relative w-full">
                    <div className="flex items-center justify-center p-3 bg-gray-100 rounded-md">
                      <FileText size={36} className="text-[#6A1B9A] mr-3" />
                      <div className="flex-1 truncate">
                        <p className="font-medium">{bookPDF.name || 'Fichier sans nom'}</p>
                        <p className="text-xs text-gray-500">{bookPDF.size ? Math.round(bookPDF.size / 1024) : 0} KB</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookPDF(null);
                        }}
                        className="bg-white rounded-full p-1 shadow-md hover:bg-red-100"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileText size={36} className="text-gray-400 group-hover:text-[#6A1B9A] transition mb-2" />
                    <p className="text-sm text-gray-500 mb-1">Déposez un fichier PDF ou</p>
                    <button className="text-sm text-[#6A1B9A] font-medium">parcourez vos fichiers</button>
                    <p className="text-xs text-gray-400 mt-2">Le PDF sera stocké sur IPFS</p>
                  </>
                )}
                <input
                  type="file"
                  ref={pdfInputRef}
                  className="hidden"
                  accept="application/pdf"
                  onChange={handlePDFChange}
                />
              </div>
            </div>

            {ipfsHash && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="ipfsHash">
                  Hash IPFS
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="ipfsHash"
                    className="w-full border rounded-l-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#6A1B9A] focus:border-[#6A1B9A]"
                    value={ipfsHash}
                    readOnly
                  />
                  <a
                    href={`https://ipfs.io/ipfs/${ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#F8F9FA] border border-l-0 rounded-r-md px-4 text-[#6A1B9A] hover:bg-[#6A1B9A]/5 transition flex items-center"
                  >
                    Voir
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-1">Hash IPFS des métadonnées du livre</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 transition mr-3"
              onClick={resetForm}
            >
              Annuler
            </button>
            {!ipfsHash ? (
              <button
                className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition flex items-center"
                onClick={uploadToIPFS}
                disabled={isUploading || !bookCover || !ipfsStatus.connected}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    Télécharger sur IPFS
                  </>
                )}
              </button>
            ) : (
              <button
                className="bg-[#6A1B9A] text-white px-4 py-2 rounded-md font-medium hover:bg-[#590D88] transition"
                onClick={handleAddBook}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Ajout en cours...
                  </>
                ) : (
                  "Ajouter le Livre"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-700">Gestion des Livres</h2>
          <p className="text-sm text-red-600">Supprimez des livres du catalogue (cette action est irréversible)</p>
        </div>

        <div className="p-6">
          {isLoadingBooks ? (
            <div className="flex justify-center items-center h-20">
              <div className="w-6 h-6 border-2 border-t-transparent border-red-500 rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Chargement des livres...</span>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucun livre trouvé dans la bibliothèque.</p>
              <div className="mt-4 flex justify-center gap-3">
                <button 
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md font-medium hover:bg-indigo-600 transition"
                  onClick={loadBooks}
                >
                  Actualiser la liste
                </button>
                <button 
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md font-medium hover:bg-yellow-600 transition flex items-center"
                  onClick={runContractDiagnostic}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Diagnostiquer le contrat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-md font-semibold text-gray-700">Liste des livres disponibles</h3>
                <div className="flex items-center space-x-2">
                  <button
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => setShowDiagnostic(true)}
                    title="Vérifier l'état du contrat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Diagnostiquer le contrat
                  </button>
                  
                  <button
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => setShowHiddenBooks(!showHiddenBooks)}
                    title="Gérer les livres masqués"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                    {showHiddenBooks ? 'Masquer la liste' : `Livres masqués (${hiddenBooks.length})`}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Titre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Auteur
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {book.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{book.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{book.author}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {book.isAvailable ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Disponible
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Emprunté
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedBookToRemove(book);
                              setShowDeleteConfirm(true);
                            }}
                            disabled={!book.isAvailable}
                            className={`text-red-600 hover:text-red-900 ${!book.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={!book.isAvailable ? "Les livres empruntés ne peuvent pas être supprimés" : "Supprimer ce livre"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal />
      
      {/* Modal de diagnostic */}
      <DiagnosticModal />
      
      {/* Composant pour afficher les livres masqués */}
      <HiddenBooksPanel books={hiddenBooks} onRestore={handleRestoreBook} isRestoring={isLoading} />
    </div>
  );
};

export default AdminTab;