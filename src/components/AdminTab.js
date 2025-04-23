import React, { useState, useRef, useEffect } from 'react';
import { Plus, User, CheckCircle, Upload, X, FileText, Wifi, WifiOff, RefreshCw } from 'lucide-react';
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
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    checkIPFSConnection();
  }, []);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#6A1B9A] mb-6">Administration</h1>

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
    </div>
  );
};

export default AdminTab;