import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, User, CheckCircle, Upload, X, FileText, Wifi, WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import ipfsService from '../services/IPFSService';
import web3Service from '../services/Web3Service';

const AdminTab = ({ setNotification, isLoading, setIsLoading }) => {
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    category: '',
    isbn: '',
    pageCount: '',
    publishedDate: '',
    description: '',
    price: '0',
  });
  const [bookCover, setBookCover] = useState(null);
  const [bookCoverPreview, setBookCoverPreview] = useState('');
  const [bookPDF, setBookPDF] = useState(null);
  const [ipfsHash, setIpfsHash] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [ipfsStatus, setIpfsStatus] = useState({ checking: true, connected: false });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [books, setBooks] = useState([]);
  const [selectedBookToRemove, setSelectedBookToRemove] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [hiddenBooks, setHiddenBooks] = useState([]);
  const [showHiddenBooks, setShowHiddenBooks] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState('stats');
  const [networkId, setNetworkId] = useState(null);
  const [bookStats, setBookStats] = useState({ total: 0, borrowed: 0, available: 0, overdue: 0 });
  const [ipfsError, setIpfsError] = useState(null);

  useEffect(() => {
    checkIPFSConnection();
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
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    setIsCheckingAdmin(true);
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
          message: 'Attention: Vous n\'avez pas les droits d\'administrateur pour ajouter des livres', 
          type: 'warning' 
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut d'administrateur:", error);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  const checkIPFSConnection = async () => {
    setIpfsStatus({ checking: true, connected: false });

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
    setIsLoading(true);
    try {
      const hash = await uploadToIPFS();
      if (hash) {
        setNotification({ 
          message: "Transaction en cours d'envoi à la blockchain... Veuillez confirmer dans MetaMask", 
          type: "info" 
        });
        
        // Appel à addBook avec les paramètres exacts attendus par le contrat: titre, auteur, ipfsHash
        await web3Service.addBook(
          newBook.title, 
          newBook.author, 
          hash // Hash IPFS généré
        );
        
        setNotification({ 
          message: 'Livre ajouté avec succès à la blockchain! Vous pouvez maintenant le voir dans le catalogue.', 
          type: 'success' 
        });
        
        // Déclencher un événement pour informer les autres composants qu'un livre a été ajouté
        window.dispatchEvent(new CustomEvent('bookAdded', {
          detail: {
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
        
        resetForm();
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
      setIsLoadingBooks(false);
    }
  };

  const handleRemoveBook = async () => {
    if (!selectedBookToRemove) return;
    
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

  // Fonction pour charger les livres masqués
  const loadHiddenBooks = useCallback(() => {
    try {
      const hiddenBooksData = localStorage.getItem('hidden_books');
      if (hiddenBooksData) {
        setHiddenBooks(JSON.parse(hiddenBooksData));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des livres masqués:", error);
    }
  }, []);

  // Fonction pour restaurer un livre masqué
  const handleRestoreBook = async (bookId) => {
    try {
      setIsLoading(true);
      // Trouver le livre dans la liste des livres masqués
      const bookToRestore = hiddenBooks.find(book => book.id === bookId);
      if (!bookToRestore) {
        throw new Error("Livre non trouvé");
      }

      // Appeler le contrat pour restaurer le livre (si nécessaire)
      const web3Service = new Web3Service();
      await web3Service.restoreHiddenBook(bookId);

      // Mettre à jour le stockage local
      const updatedHiddenBooks = hiddenBooks.filter(book => book.id !== bookId);
      localStorage.setItem('hidden_books', JSON.stringify(updatedHiddenBooks));
      setHiddenBooks(updatedHiddenBooks);
      
      setSuccess(`Le livre "${bookToRestore.title}" a été restauré avec succès`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Erreur lors de la restauration du livre:", error);
      setError(`Erreur lors de la restauration du livre: ${error.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger les livres masqués au chargement du composant
  useEffect(() => {
    loadHiddenBooks();
  }, [loadHiddenBooks]);

  // Composant pour afficher les livres masqués
  const HiddenBooksPanel = ({ books, onRestore, isRestoring }) => {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-semibold text-gray-700">Livres masqués ({books.length})</h3>
          <button 
            onClick={() => setShowHiddenBooks(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {books.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun livre masqué</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titre
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auteur
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de masquage
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {book.id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{book.title}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{book.author}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(book.hiddenAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onRestore(book.id)}
                        disabled={isRestoring}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        title="Restaurer ce livre"
                      >
                        {isRestoring ? (
                          <div className="w-4 h-4 mr-1 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                        )}
                        Restaurer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

  return (
    <div className="container mx-auto px-4 py-8">
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
          {ipfsStatus.checking ? (
            <div className="w-5 h-5 mr-3 border-2 border-[#6A1B9A] border-t-transparent rounded-full animate-spin"></div>
          ) : ipfsStatus.connected ? (
            <Wifi size={20} className="text-green-500 mr-3" />
          ) : (
            <WifiOff size={20} className="text-red-500 mr-3" />
          )}
          <span className="font-medium">
            Statut IPFS: {ipfsStatus.checking ? 'Vérification...' : ipfsStatus.connected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            className="bg-[#6A1B9A] text-white px-3 py-1.5 rounded text-sm hover:bg-[#590D88] transition"
            onClick={checkIPFSConnection}
          >
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#6A1B9A]">Livres</h2>
            <span className="text-sm font-semibold bg-[#6A1B9A]/10 text-[#6A1B9A] rounded-full px-3 py-1">{recentBooks.length} total</span>
          </div>
          <p className="text-gray-600 mb-4">Gérez le catalogue de la bibliothèque.</p>
          <button className="w-full bg-[#6A1B9A] text-white px-4 py-2 rounded-md font-medium hover:bg-[#590D88] transition flex items-center justify-center">
            <Plus size={18} className="mr-2" />
            Ajouter un livre
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#6A1B9A]">Utilisateurs</h2>
            <span className="text-sm font-semibold bg-[#6A1B9A]/10 text-[#6A1B9A] rounded-full px-3 py-1">12 total</span>
          </div>
          <p className="text-gray-600 mb-4">Gérez les comptes utilisateurs.</p>
          <button className="w-full bg-[#6A1B9A] text-white px-4 py-2 rounded-md font-medium hover:bg-[#590D88] transition flex items-center justify-center">
            <User size={18} className="mr-2" />
            Gérer les utilisateurs
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#6A1B9A]">Emprunts</h2>
            <span className="text-sm font-semibold bg-[#6A1B9A]/10 text-[#6A1B9A] rounded-full px-3 py-1">5 actifs</span>
          </div>
          <p className="text-gray-600 mb-4">Suivez les emprunts et les retours.</p>
          <button className="w-full bg-[#6A1B9A] text-white px-4 py-2 rounded-md font-medium hover:bg-[#590D88] transition flex items-center justify-center">
            <CheckCircle size={18} className="mr-2" />
            Voir les transactions
          </button>
        </div>
      </div>

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
        <div className="px-6 py-4 border-b border-gray-200 bg-[#6A1B9A]/5">
          <h2 className="text-lg font-semibold text-[#6A1B9A]">Statistiques de la Bibliothèque</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Emprunts par Jour</h3>
              <div className="h-48 bg-[#F8F9FA] rounded-md flex items-center justify-center">
                <p className="text-gray-500 text-sm">Graphique des emprunts journaliers</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Distribution des Réputations</h3>
              <div className="h-48 bg-[#F8F9FA] rounded-md flex items-center justify-center">
                <p className="text-gray-500 text-sm">Graphique de répartition des scores</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="text-[#6A1B9A] hover:underline text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter les données
            </button>
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