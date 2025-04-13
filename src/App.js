import React, { useState, useEffect, useRef } from 'react';
import { Search, Book, User, LogOut, Menu, X, BookOpen, Clock, CheckCircle, AlertTriangle, Plus, Upload } from 'lucide-react';
import web3Service from './Web3Service';
import ipfsService from './IPFSService';

const LibraryDApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGanache, setIsGanache] = useState(false);
  
  // متغيرات الحالة لإضافة كتاب
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    category: '',
    isbn: '',
    pageCount: '',
    publishedDate: '',
    description: ''
  });
  const [bookCover, setBookCover] = useState(null);
  const [bookCoverPreview, setBookCoverPreview] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Définir la direction RTL au chargement de la page
  useEffect(() => {
    document.documentElement.dir = 'rtl';
  }, []);
  
  // Simuler des données pour la maquette
  const recentBooks = [
    { id: 1, title: "Principes d'Économie", author: "Gregory Mankiw", isAvailable: true, ipfsHash: "QmX...", category: "Économie", pageCount: 528, publishedDate: "2019-05-10", isbn: "978-2-7590-2369-1" },
    { id: 2, title: "Introduction à l'Algorithmique", author: "Thomas Cormen", isAvailable: false, ipfsHash: "QmY...", category: "Informatique", pageCount: 752, publishedDate: "2015-03-22", isbn: "978-2-1007-2998-7" },
    { id: 3, title: "Physique Quantique", author: "Claude Cohen-Tannoudji", isAvailable: true, ipfsHash: "QmZ...", category: "Sciences", pageCount: 624, publishedDate: "2018-09-15", isbn: "978-2-1007-1288-0" },
    { id: 4, title: "Histoire de l'Art", author: "Ernst Gombrich", isAvailable: true, ipfsHash: "QmA...", category: "Art", pageCount: 412, publishedDate: "2020-01-30", isbn: "978-2-0814-1212-2" }
  ];
  
  const userLoans = [
    { id: 101, bookId: 5, title: "Introduction à la Sociologie", author: "Anthony Giddens", dueDate: "2025-04-20" },
    { id: 102, bookId: 7, title: "Littérature Française du XXe siècle", author: "Michel Raimond", dueDate: "2025-04-15" }
  ];
  
  // Afficher une notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    
    // Faire disparaître la notification après 5 secondes
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };
  
  // Fonction pour se connecter à MetaMask
  const connectToMetaMask = async () => {
    try {
      setIsLoading(true);
      const success = await web3Service.initialize();
      if (success) {
        setIsConnected(true);
        setAccount(web3Service.getAccount());
        
        // Vérifier si l'utilisateur est enregistré
        const registered = await web3Service.isUserRegistered();
        setIsRegistered(registered);
        
        if (registered) {
          // Récupérer la réputation de l'utilisateur
          const reputation = await web3Service.getUserReputation();
          setUserReputation(Number(reputation));
          showNotification("Connexion réussie à votre portefeuille", "success");
        } else {
          showNotification("Veuillez vous inscrire pour utiliser toutes les fonctionnalités", "warning");
        }
      } else {
        showNotification("Connexion au portefeuille échouée. Veuillez installer MetaMask.", "error");
      }
    } catch (error) {
      console.error("Erreur lors de la connexion à MetaMask:", error);
      showNotification("Erreur lors de la connexion: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  // معالج تغيير حقول إضافة الكتاب الجديد
  const handleNewBookChange = (e) => {
    const { name, value } = e.target;
    setNewBook(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // معالج تغيير صورة الغلاف
  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBookCover(file);
      // إنشاء معاينة للصورة
      const reader = new FileReader();
      reader.onloadend = () => {
        setBookCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // تحميل الكتاب والصورة إلى IPFS
  const uploadToIPFS = async () => {
    if (!bookCover) {
      showNotification("Veuillez sélectionner une image de couverture", "warning");
      return null;
    }
    
    setIsUploading(true);
    try {
      // تحميل بيانات الكتاب والصورة إلى IPFS
      const result = await ipfsService.uploadBookData(newBook, bookCover);
      
      setIpfsHash(result.metadataHash);
      showNotification("Livre téléchargé sur IPFS avec succès!", "success");
      return result.metadataHash;
    } catch (error) {
      console.error("Erreur lors du téléchargement vers IPFS:", error);
      showNotification("Erreur lors du téléchargement vers IPFS", "error");
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  // إضافة كتاب جديد
  const handleAddBook = async () => {
    // التحقق من البيانات
    if (!newBook.title || !newBook.author) {
      showNotification("Le titre et l'auteur sont obligatoires", "warning");
      return;
    }
    
    if (!isConnected) {
      showNotification("Veuillez vous connecter avec MetaMask", "warning");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // تحميل إلى IPFS أولاً
      const hash = await uploadToIPFS();
      if (!hash) return;
      
      // إضافة الكتاب إلى العقد الذكي
      await web3Service.addBook(
        newBook.title,
        newBook.author,
        hash
      );
      
      showNotification("Livre ajouté avec succès!", "success");
      
      // إعادة تعيين النموذج
      setNewBook({
        title: '',
        author: '',
        category: '',
        isbn: '',
        pageCount: '',
        publishedDate: '',
        description: ''
      });
      setBookCover(null);
      setBookCoverPreview('');
      setIpfsHash('');
    } catch (error) {
      console.error("Erreur lors de l'ajout du livre:", error);
      showNotification("Erreur lors de l'ajout du livre: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Composant pour afficher les notifications
  const NotificationComponent = () => {
    if (!notification) return null;
    
    const bgColors = {
      success: 'bg-[#4CAF50]/90',
      error: 'bg-[#E53935]/90',
      warning: 'bg-[#FFD700]/90',
      info: 'bg-[#2A3B8C]/90'
    };
    
    const icons = {
      success: <CheckCircle size={20} className="mr-2" />,
      error: <AlertTriangle size={20} className="mr-2" />,
      warning: <AlertTriangle size={20} className="mr-2" />,
      info: <BookOpen size={20} className="mr-2" />
    };
    
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <div className={`${bgColors[notification.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center`}>
          {icons[notification.type]}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-4 text-white hover:text-gray-200"
            aria-label="Fermer la notification"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  };
  
  // Composant pour afficher un indicateur de chargement
  const LoadingIndicator = () => {
    if (!isLoading) return null;
    
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 shadow-lg flex items-center">
          <div className="w-5 h-5 border-2 border-[#2A3B8C] border-t-transparent rounded-full animate-spin mr-3"></div>
          <span>Chargement en cours...</span>
        </div>
      </div>
    );
  };
  
  const renderHeader = () => (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-2xl font-bold text-[#2A3B8C] mr-2">
            <BookOpen size={28} className="inline mr-2" />
            <a href="#" onClick={(e) => {e.preventDefault(); setActiveTab('home');}} className="hover:text-[#1F2D6B] transition">BiblioChain</a>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-3 py-2 ${activeTab === 'home' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'home' ? 'page' : undefined}
          >
            Accueil
          </button>
          <button 
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-2 ${activeTab === 'catalog' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
          >
            Catalogue
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 ${activeTab === 'dashboard' ? 'text-[#2A3B8C] border-b-2 border-[#2A3B8C]' : 'text-gray-600'}`}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            Mon Espace
          </button>
          {/* Bouton Admin visible uniquement pour les administrateurs */}
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-2 ${activeTab === 'admin' ? 'text-[#6A1B9A] border-b-2 border-[#6A1B9A]' : 'text-gray-600'}`}
            aria-current={activeTab === 'admin' ? 'page' : undefined}
          >
            Admin
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="hidden md:block mr-4">
            <div className="flex items-center bg-[#F8F9FA] rounded-full px-3 py-1">
              <div className={`w-2 h-2 rounded-full ${isGanache ? 'bg-[#FFD700]' : 'bg-[#4CAF50]'} mr-2`} aria-hidden="true"></div>
              <span className="text-xs text-gray-600 mr-1" title="Adresse Ethereum">{isConnected ? web3Service.shortenAddress(account) : 'Non connecté'}</span>
              {isConnected && <span className="text-xs font-semibold text-[#4CAF50]" title="Score de réputation">Rep: {userReputation}</span>}
            </div>
          </div>
          
          {/* Bouton de connexion MetaMask */}
          {!isConnected ? (
            <button 
              className="hidden md:flex items-center text-gray-600 hover:text-[#2A3B8C] mr-4"
              onClick={connectToMetaMask}
              aria-label="Se connecter avec MetaMask"
            >
              <span className="text-sm">Connecter MetaMask</span>
            </button>
          ) : (
            <button 
              className="hidden md:flex items-center text-gray-600 hover:text-[#E53935]"
              aria-label="Déconnexion"
            >
              <LogOut size={18} className="mr-1" />
              <span className="text-sm">Déconnexion</span>
            </button>
          )}
          
          <button 
            className="md:hidden text-gray-600" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="container mx-auto px-4 py-2">
            <button 
              onClick={() => {setActiveTab('home'); setMobileMenuOpen(false)}}
              className={`block w-full text-right py-2 px-4 hover:bg-[#F8F9FA] ${activeTab === 'home' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'home' ? 'page' : undefined}
            >
              Accueil
            </button>
            <button 
              onClick={() => {setActiveTab('catalog'); setMobileMenuOpen(false)}}
              className={`block w-full text-right py-2 px-4 hover:bg-[#F8F9FA] ${activeTab === 'catalog' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'catalog' ? 'page' : undefined}
            >
              Catalogue
            </button>
            <button 
              onClick={() => {setActiveTab('dashboard'); setMobileMenuOpen(false)}}
              className={`block w-full text-right py-2 px-4 hover:bg-[#F8F9FA] ${activeTab === 'dashboard' ? 'text-[#2A3B8C] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            >
              Mon Espace
            </button>
            <button 
              onClick={() => {setActiveTab('admin'); setMobileMenuOpen(false)}}
              className={`block w-full text-right py-2 px-4 hover:bg-[#F8F9FA] ${activeTab === 'admin' ? 'text-[#6A1B9A] font-medium' : 'text-gray-600'}`}
              aria-current={activeTab === 'admin' ? 'page' : undefined}
            >
              Admin
            </button>
            {!isConnected ? (
              <button 
                onClick={connectToMetaMask}
                className="block w-full text-right py-2 px-4 hover:bg-[#F8F9FA] text-[#2A3B8C]"
              >
                Connecter MetaMask
              </button>
            ) : (
              <>
                <div className="flex items-center py-2 px-4">
                  <div className="w-2 h-2 rounded-full bg-[#4CAF50] mr-2" aria-hidden="true"></div>
                  <span className="text-xs text-gray-600 mr-1">{web3Service.shortenAddress(account)}</span>
                  <span className="text-xs font-semibold text-[#4CAF50]">Rep: {userReputation}</span>
                </div>
                <button 
                  className="flex items-center text-[#E53935] py-2 px-4"
                  onClick={() => {setMobileMenuOpen(false)}}
                  aria-label="Déconnexion"
                >
                  <LogOut size={18} className="mr-2" />
                  <span>Déconnexion</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
  
  const renderHome = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[#2A3B8C] text-[#F8F9FA] rounded-lg shadow-md overflow-hidden mb-8">
        <div className="md:flex">
          <div className="p-8 md:w-1/2">
            <h1 className="text-3xl font-bold mb-4">Bibliothèque Universitaire Décentralisée</h1>
            <p className="mb-6">Une solution moderne pour emprunter et gérer des livres universitaires avec transparence et sécurité grâce à la blockchain.</p>
            <button 
              className="bg-[#FFD700] text-[#2A3B8C] px-6 py-2 rounded-md font-semibold shadow-sm hover:bg-yellow-400 transition"
              onClick={() => setActiveTab('catalog')}
              aria-label="Explorer le catalogue de livres"
            >
              Explorer le catalogue
            </button>
          </div>
          <div className="md:w-1/2 h-64 bg-[#1F2D6B] flex items-center justify-center">
            <img src="/api/placeholder/600/400" alt="Bibliothèque universitaire" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Livres récemment ajoutés</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {recentBooks.map(book => (
          <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1 duration-300">
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              <img src={`/api/placeholder/300/200`} alt={`Couverture du livre ${book.title}`} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-800 mb-1">{book.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{book.author}</p>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${book.isAvailable ? 'bg-[#4CAF50]/20 text-[#4CAF50]' : 'bg-[#E53935]/20 text-[#E53935]'}`}>
                  {book.isAvailable ? 'Disponible' : 'Emprunté'}
                </span>
                <button 
                  className={`text-sm px-3 py-1 rounded font-medium ${book.isAvailable ? 'bg-[#2A3B8C] text-white hover:bg-[#1F2D6B]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  disabled={!book.isAvailable}
                  onClick={() => handleBorrowBook(book.id)}
                  aria-label={book.isAvailable ? `Emprunter ${book.title}` : `${book.title} indisponible`}
                >
                  {book.isAvailable ? 'Emprunter' : 'Indisponible'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Comment ça marche</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <User size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">1. Inscrivez-vous</h3>
          <p className="text-gray-600">Connectez votre portefeuille et inscrivez-vous comme étudiant ou professeur.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Book size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">2. Empruntez</h3>
          <p className="text-gray-600">Parcourez le catalogue et empruntez les livres qui vous intéressent.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
          <div className="bg-[#2A3B8C]/10 text-[#2A3B8C] w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={24} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">3. Retournez</h3>
          <p className="text-gray-600">Retournez les livres avant la date limite pour maintenir votre réputation.</p>
        </div>
      </div>
    </div>
  );
  
  const renderCatalog = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2A3B8C] mb-4 md:mb-0">Catalogue des Livres</h1>
        <div className="relative w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="w-full md:w-64 pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            aria-label="Rechercher des livres"
          />
          <Search size={18} className="absolute left-3 top-3 text-gray-400" aria-hidden="true" />
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category-filter">Catégorie</label>
            <select 
              id="category-filter"
              className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            >
              <option value="">Toutes les catégories</option>
              <option value="science">Sciences</option>
              <option value="literature">Littérature</option>
              <option value="history">Histoire</option>
              <option value="technology">Technologie</option>
              <option value="economics">Économie</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="availability-filter">Disponibilité</label>
            <select 
              id="availability-filter"
              className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            >
              <option value="">Tous</option>
              <option value="available">Disponibles</option>
              <option value="borrowed">Empruntés</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition w-full flex items-center justify-center"
              aria-label="Appliquer les filtres de recherche"
            >
              <Search size={18} className="mr-2" aria-hidden="true" />
              Filtrer
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...recentBooks, ...recentBooks].map((book, index) => (
          <div key={`${book.id}-${index}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="relative h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
              <img src={`/api/placeholder/300/200`} alt={`Couverture du livre ${book.title}`} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
              <div className="absolute top-2 right-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${book.isAvailable ? 'bg-[#4CAF50]/90 text-white' : 'bg-[#E53935]/90 text-white'}`}>
                  {book.isAvailable ? 'Disponible' : 'Emprunté'}
                </span>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/70 to-transparent"></div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">{book.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{book.author}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  IPFS: {book.ipfsHash.substring(0, 6)}...
                </span>
                <button 
                  className={`text-sm px-3 py-1 rounded-md font-medium ${book.isAvailable ? 'bg-[#2A3B8C] text-white hover:bg-[#1F2D6B]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  disabled={!book.isAvailable}
                  onClick={() => handleBorrowBook(book.id)}
                  aria-label={book.isAvailable ? `Emprunter ${book.title}` : `${book.title} indisponible`}
                >
                  {book.isAvailable ? 'Emprunter' : 'Indisponible'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <nav className="flex items-center space-x-1" aria-label="Pagination">
          <button className="px-3 py-1 rounded hover:bg-[#F8F9FA]" aria-label="Page précédente">Précédent</button>
          <button className="px-3 py-1 rounded bg-[#2A3B8C] text-white" aria-current="page">1</button>
          <button className="px-3 py-1 rounded hover:bg-[#F8F9FA]">2</button>
          <button className="px-3 py-1 rounded hover:bg-[#F8F9FA]">3</button>
          <button className="px-3 py-1 rounded hover:bg-[#F8F9FA]" aria-label="Page suivante">Suivant</button>
        </nav>
      </div>
    </div>
  );
  
  const renderDashboard = () => (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2A3B8C] mb-6">Mon Espace Personnel</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-wrap justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">Votre Réputation</h2>
            <p className="text-gray-600 text-sm mb-2">Une bonne réputation vous permet d'emprunter plus de livres.</p>
            <div className="flex items-center">
              <span className="inline-block px-2 py-1 text-xs rounded bg-[#F8F9FA] text-gray-600 mr-2">
                Minimum: 50
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded bg-[#4CAF50]/20 text-[#4CAF50]">
                Votre score: 85
              </span>
            </div>
          </div>
          <div className="w-full md:w-1/3">
            <div className="relative">
              <div className="w-32 h-32 mx-auto">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F8F9FA" strokeWidth="2" />
                  <path className="circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4CAF50" strokeWidth="2" strokeDasharray="85, 100" />
                  <text x="18" y="20.5" textAnchor="middle" className="text-[#4CAF50] font-bold text-3xl">85</text>
                </svg>
              </div>
              <div className="text-center text-sm text-gray-600 mt-2">
                <span className="text-[#FFD700]">★</span> Excellente réputation
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Vos Emprunts Actifs</h2>
          <span className="text-sm bg-[#2A3B8C]/10 text-[#2A3B8C] font-medium px-3 py-1 rounded-full">{userLoans.length} livre(s) emprunté(s)</span>
        </div>
        
        {userLoans.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#2A3B8C]/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Auteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Date limite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#2A3B8C] uppercase tracking-wider">Action</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#2A3B8C] hover:text-[#1F2D6B] transition" onClick={() => handleReturnBook(loan.bookId)}>Retourner</button>
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
        </div>
      </div>

      <style jsx>{`
        .circular-chart {
          width: 100%;
          height: auto;
        }
        .circle {
          transition: stroke-dasharray 0.5s ease;
        }
      `}</style>
    </div>
  );
  
  const renderAdmin = () => (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#6A1B9A] mb-6">Administration</h1>
      
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
                <option value="science">Sciences</option>
                <option value="literature">Littérature</option>
                <option value="history">Histoire</option>
                <option value="technology">Technologie</option>
                <option value="economics">Économie</option>
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
            
            <div className="md:col-span-2">
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
                    href={ipfsService.getIPFSGatewayURL(ipfsHash)} 
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
              onClick={() => {
                setNewBook({
                  title: '',
                  author: '',
                  category: '',
                  isbn: '',
                  pageCount: '',
                  publishedDate: '',
                  description: ''
                });
                setBookCover(null);
                setBookCoverPreview('');
                setIpfsHash('');
              }}
            >
              Annuler
            </button>
            {!ipfsHash ? (
              <button 
                className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition flex items-center"
                onClick={uploadToIPFS}
                disabled={isUploading || !bookCover}
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
  
  const renderFooter = () => (
    <footer className="bg-[#F8F9FA] border-t mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">BiblioChain</h3>
            <p className="text-gray-600 text-sm">
              Une bibliothèque universitaire décentralisée, fonctionnant sur la blockchain Ethereum pour une gestion transparente et sécurisée des emprunts.
            </p>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <div className="h-2 w-2 rounded-full bg-[#4CAF50] mr-2"></div>
              <span>Réseau: Ethereum (Sepolia)</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              <li><button onClick={() => setActiveTab('home')} className="text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline">Accueil</button></li>
              <li><button onClick={() => setActiveTab('catalog')} className="text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline">Catalogue</button></li>
              <li><button onClick={() => setActiveTab('dashboard')} className="text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline">Mon Espace</button></li>
              <li><button onClick={() => setActiveTab('admin')} className="text-[#2A3B8C] hover:text-[#1F2D6B] hover:underline">Administration</button></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-[#2A3B8C] mb-4">Contact & Infos</h3>
            <p className="text-gray-600 text-sm mb-4">
              Contrat: <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="font-mono text-xs bg-[#2A3B8C]/10 px-2 py-1 rounded text-[#2A3B8C] hover:bg-[#2A3B8C]/20 transition">0x1234...5678</a>
            </p>
            <div className="flex items-center text-sm mb-4">
              <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-[#FFD700]/20 text-[#FFD700]`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contrat audité par TrustSec
              </span>
            </div>
            <div className="flex space-x-4">
              <button className="text-gray-500 hover:text-[#2A3B8C] transition" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </button>
              <button className="text-gray-500 hover:text-[#2A3B8C] transition" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </button>
              <button className="text-gray-500 hover:text-[#2A3B8C] transition" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </button>
              <button className="text-gray-500 hover:text-[#2A3B8C] transition" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-wrap justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} BiblioChain. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-xs text-gray-500 hover:text-[#2A3B8C] hover:underline">Conditions d'utilisation</a>
              <a href="#" className="text-xs text-gray-500 hover:text-[#2A3B8C] hover:underline">Politique de confidentialité</a>
              <a href="#" className="text-xs flex items-center text-gray-500 hover:text-[#2A3B8C]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aide
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
  
  // Initialiser la connexion avec MetaMask
  useEffect(() => {
    const connectWallet = async () => {
      try {
        setIsLoading(true);
        // Vérifier si MetaMask est déjà connecté
        if (window.ethereum && window.ethereum.selectedAddress) {
          await connectToMetaMask();
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de connexion:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    connectWallet();
  }, []);
  
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-right">
      {renderHeader()}
      <main className="flex-grow">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'catalog' && renderCatalog()}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'admin' && renderAdmin()}
      </main>
      {renderFooter()}
      <NotificationComponent />
      <LoadingIndicator />
    </div>
  );
};

export default LibraryDApp;