import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Book, BookX, ArrowDown, ArrowUp, Info, Download, RefreshCw } from 'lucide-react';
import BookCard from './common/BookCard';
import web3Service from '../services/Web3Service';

const CatalogTab = ({ handleBorrowBook, isConnected, isRegistered }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [stats, setStats] = useState({ total: 0, available: 0, categories: {} });
  const booksPerPage = 8;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Charger les livres depuis la blockchain
  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Vérifier si Web3Service est initialisé
      if (!web3Service.isInitialized()) {
        await web3Service.initialize();
      }
      
      console.log("Chargement des livres depuis le contrat...");
      
      // Utiliser la nouvelle fonction getAllLivres pour récupérer les livres avec toutes leurs métadonnées
      const livresComplets = await web3Service.getAllLivres();
      console.log("Livres complets récupérés depuis IPFS et blockchain:", livresComplets);
      
      // S'assurer que les livres sont correctement triés par ID pour afficher les plus récents
      const livresTries = livresComplets.sort((a, b) => Number(b.id) - Number(a.id));
      
      setBooks(livresTries);
      calculateStats(livresTries);
      
      // Réinitialiser la page si nécessaire
      if (currentPage > 1 && livresTries.length <= (currentPage - 1) * booksPerPage) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des livres:", error);
      setError("Impossible de charger les livres. Veuillez vérifier votre connexion et réessayer.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, booksPerPage]);

  // Calculer les statistiques du catalogue
  const calculateStats = (bookList) => {
    if (!bookList || bookList.length === 0) {
      setStats({ total: 0, available: 0, categories: {} });
      return;
    }
    
    const categoriesCount = {};
    let availableCount = 0;
    
    bookList.forEach(book => {
      // Compter par catégorie
      if (book.category) {
        if (categoriesCount[book.category]) {
          categoriesCount[book.category]++;
        } else {
          categoriesCount[book.category] = 1;
        }
      }
      
      // Compter les livres disponibles
      if (book.isAvailable) {
        availableCount++;
      }
    });
    
    setStats({
      total: bookList.length,
      available: availableCount,
      categories: categoriesCount
    });
  };

  // Gestionnaire d'événement pour le nouvel événement refreshBooks
  const handleRefreshBooks = useCallback(() => {
    console.log("Événement refreshBooks reçu, rechargement du catalogue...");
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Gestionnaire d'événement pour bookAdded
  const handleBookAdded = useCallback((event) => {
    console.log("Événement bookAdded reçu:", event.detail);
    
    // Afficher une notification temporaire pour indiquer l'ajout du livre
    const newBookTitle = event.detail.title;
    const bookInfo = document.createElement('div');
    bookInfo.className = 'book-added-notification';
    bookInfo.innerHTML = `
      <div class="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Nouveau livre ajouté: <strong>${newBookTitle}</strong></span>
        </div>
      </div>
    `;
    document.body.appendChild(bookInfo);
    
    // Supprimer la notification après 3 secondes
    setTimeout(() => {
      if (bookInfo.parentNode) {
        bookInfo.parentNode.removeChild(bookInfo);
      }
    }, 3000);
    
    // Rafraîchir la liste des livres
    setRefreshTrigger(prev => prev + 1);
    
    // Forcer un nouveau chargement des livres
    loadBooks();
  }, [loadBooks]);

  // Gestionnaire d'événement pour bookBorrowed
  const handleBookBorrowed = useCallback((event) => {
    console.log("Événement bookBorrowed reçu:", event.detail);
    
    // Rafraîchir la liste des livres pour mettre à jour les statuts
    loadBooks();
  }, [loadBooks]);

  // Gestionnaire d'événement pour bookReturned
  const handleBookReturned = useCallback((event) => {
    console.log("Événement bookReturned reçu:", event.detail);
    
    // Rafraîchir la liste des livres pour mettre à jour les statuts
    loadBooks();
  }, [loadBooks]);

  // Charger les livres au montage du composant et quand isConnected change
  useEffect(() => {
    loadBooks();
    
    // Écouter les événements d'ajout de livre et de rafraîchissement
    window.addEventListener('bookAdded', handleBookAdded);
    window.addEventListener('refreshBooks', handleRefreshBooks);
    window.addEventListener('bookBorrowed', handleBookBorrowed);
    window.addEventListener('bookReturned', handleBookReturned);
    
    return () => {
      window.removeEventListener('bookAdded', handleBookAdded);
      window.removeEventListener('refreshBooks', handleRefreshBooks);
      window.removeEventListener('bookBorrowed', handleBookBorrowed);
      window.removeEventListener('bookReturned', handleBookReturned);
    };
  }, [isConnected, loadBooks, handleBookAdded, handleRefreshBooks, handleBookBorrowed, handleBookReturned, refreshTrigger]);

  // Ajouter un style pour l'animation de la notification
  useEffect(() => {
    // Créer une feuille de style pour l'animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Gestionnaire de réinitialisation du catalogue après le chargement initial
  useEffect(() => {
    // Si le catalogue est vide après le chargement et qu'il n'y a pas d'erreur, forcer un rechargement
    if (!loading && books.length === 0 && !error) {
      console.log("Aucun livre trouvé après le chargement initial, tentative de rechargement...");
      
      // Attendre un moment avant de recharger
      const timer = setTimeout(() => {
        console.log("Rechargement forcé du catalogue...");
        
        // Réinitialiser le service Web3 si nécessaire
        web3Service.resetState(false);
        
        // Puis recharger les livres
        loadBooks();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, books.length, error, loadBooks]);
  
  // Afficher un message dans la console si aucun livre n'est trouvé après le chargement
  useEffect(() => {
    if (!loading && books.length === 0) {
      console.log("=== DIAGNOSTIC CATALOGUE ===");
      console.log("État du catalogue:", { 
        livresChargés: books.length, 
        enChargement: loading, 
        erreur: error, 
        filtres: { 
          catégorie: categoryFilter, 
          disponibilité: availabilityFilter,
          recherche: search 
        }
      });
    }
  }, [loading, books, error, categoryFilter, availabilityFilter, search]);

  // Filtrer et trier les livres
  const getFilteredBooks = () => {
    // Si aucun livre, retourner un tableau vide
    if (!books || books.length === 0) {
      return [];
    }
    
    // Filtrage
    const filtered = books.filter(book => {
      const matchesSearch = 
        (book.title && book.title.toLowerCase().includes(search.toLowerCase())) || 
        (book.author && book.author.toLowerCase().includes(search.toLowerCase())) ||
        (book.isbn && book.isbn.includes(search));
      
      const matchesCategory = categoryFilter === '' || 
                             (book.category && book.category === categoryFilter);
      
      const matchesAvailability = availabilityFilter === '' || 
                                 (availabilityFilter === 'available' && book.isAvailable) || 
                                 (availabilityFilter === 'borrowed' && !book.isAvailable);
      
      return matchesSearch && matchesCategory && matchesAvailability;
    });

    // Tri
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      // Tri par différents champs
      if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'author') {
        comparison = (a.author || '').localeCompare(b.author || '');
      } else if (sortBy === 'date') {
        // Gérer le cas où l'une des dates est manquante
        const dateA = a.publishedDate ? new Date(a.publishedDate) : new Date(0);
        const dateB = b.publishedDate ? new Date(b.publishedDate) : new Date(0);
        comparison = dateA - dateB;
      } else if (sortBy === 'pages') {
        comparison = (a.pageCount || 0) - (b.pageCount || 0);
      } else if (sortBy === 'id') {
        // Tri par ID (plus récent en premier par défaut)
        comparison = parseInt(a.id) - parseInt(b.id);
      }
      
      // Inverser le tri si descendant
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const filteredBooks = getFilteredBooks();

  // Pagination
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  // Gestionnaire de tri
  const handleSort = (field) => {
    if (sortBy === field) {
      // Si le même champ, inverser la direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouveau champ, définir ascendant par défaut
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setAvailabilityFilter('');
    setSortBy('title');
    setSortDirection('asc');
    setCurrentPage(1);
  };

  // Gestionnaire d'application des filtres
  const handleFilter = () => {
    setCurrentPage(1); // Réinitialiser à la première page lors du filtrage
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2A3B8C] mb-4 md:mb-0">Catalogue des Livres</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Rechercher par titre, auteur, ISBN..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
              aria-label="Rechercher des livres"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value === '') {
                  handleFilter();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFilter();
                }
              }}
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-400" aria-hidden="true" />
          </div>
          <button
            className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            aria-label={isFiltersVisible ? "Masquer les filtres" : "Afficher les filtres"}
            aria-expanded={isFiltersVisible}
          >
            <Filter size={18} className="mr-2 text-[#2A3B8C]" />
            <span>{isFiltersVisible ? "Masquer les filtres" : "Filtres et tri"}</span>
            {isFiltersVisible ? 
              <ArrowUp size={18} className="ml-2 text-gray-500" /> : 
              <ArrowDown size={18} className="ml-2 text-gray-500" />
            }
          </button>
          <button
            className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            onClick={() => {
              setLoading(true);
              // Indicateur visuel de rafraîchissement
              const refreshButton = document.getElementById('refresh-button');
              if (refreshButton) {
                refreshButton.classList.add('animate-spin');
              }
              
              // Petit délai avant de charger pour montrer l'animation
              setTimeout(() => {
                loadBooks().finally(() => {
                  // Arrêter l'animation une fois le chargement terminé
                  if (refreshButton) {
                    refreshButton.classList.remove('animate-spin');
                  }
                });
              }, 300);
            }}
            aria-label="Rafraîchir la liste des livres"
          >
            <RefreshCw id="refresh-button" size={18} className="mr-2 text-[#2A3B8C]" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Panneau de statistiques */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Book size={20} className="text-[#2A3B8C] mr-2" />
            <span><strong>{stats.total}</strong> livres au total</span>
          </div>
          <div className="flex items-center">
            <Download size={20} className="text-green-600 mr-2" />
            <span><strong>{stats.available}</strong> disponibles</span>
          </div>
          <div className="flex items-center">
            <BookX size={20} className="text-red-500 mr-2" />
            <span><strong>{stats.total - stats.available}</strong> empruntés</span>
          </div>
          <div className="flex items-center">
            <Info size={20} className="text-blue-500 mr-2" />
            <span><strong>{Object.keys(stats.categories).length}</strong> catégories</span>
          </div>
        </div>
      </div>

      {isFiltersVisible && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category-filter">Catégorie</label>
              <select
                id="category-filter"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {Object.keys(stats.categories).sort().map(category => (
                  <option key={category} value={category}>
                    {category} ({stats.categories[category]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="availability-filter">Disponibilité</label>
              <select
                id="availability-filter"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="available">Disponibles</option>
                <option value="borrowed">Empruntés</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sort-by">Trier par</label>
              <select
                id="sort-by"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
              >
                <option value="title">Titre</option>
                <option value="author">Auteur</option>
                <option value="date">Date de publication</option>
                <option value="pages">Nombre de pages</option>
                <option value="id">Identifiant (récent d'abord)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sort-direction">Ordre</label>
              <select
                id="sort-direction"
                className="w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value)}
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 border rounded-md hover:bg-gray-100 transition"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>
            <button
              className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition"
              onClick={handleFilter}
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* État de chargement */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A3B8C]"></div>
          <span className="ml-3 text-gray-600">Chargement des livres...</span>
        </div>
      )}

      {/* Message de résultats */}
      {!loading && (
        <div className="text-sm text-gray-600 mb-4">
          {filteredBooks.length === 0 ? (
            "Aucun livre ne correspond à votre recherche."
          ) : (
            `${filteredBooks.length} livre${filteredBooks.length > 1 ? 's' : ''} trouvé${filteredBooks.length > 1 ? 's' : ''}`
          )}
        </div>
      )}

      {!loading && filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <BookX size={64} className="text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Aucun livre ne correspond à votre recherche.</p>
          <p className="text-gray-400 mt-2">Essayez de modifier vos critères de recherche.</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-100 text-[#2A3B8C] rounded-md hover:bg-blue-200 transition"
            onClick={resetFilters}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                handleBorrowBook={handleBorrowBook}
                showDetails={true}
                isConnected={isConnected}
                isRegistered={isRegistered}
              />
            ))}
          </div>
        )
      )}

      {/* Pagination */}
      {!loading && filteredBooks.length > booksPerPage && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center space-x-1" aria-label="Pagination">
            <button 
              className={`px-3 py-1.5 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-[#F8F9FA] text-[#2A3B8C]'}`}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              Précédent
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                let pageNumber;
                
                // Logique avancée pour afficher les pages correctement
                if (totalPages <= 5) {
                  // Moins de 5 pages au total, afficher toutes
                  pageNumber = index + 1;
                } else if (currentPage <= 3) {
                  // Au début, afficher les 5 premières pages
                  pageNumber = index + 1;
                } else if (currentPage >= totalPages - 2) {
                  // À la fin, afficher les 5 dernières pages
                  pageNumber = totalPages - 4 + index;
                } else {
                  // Au milieu, afficher 2 avant et 2 après la page actuelle
                  pageNumber = currentPage - 2 + index;
                }
                
                return (
                  <button 
                    key={pageNumber}
                    className={`px-3 py-1.5 rounded-md ${currentPage === pageNumber ? 'bg-[#2A3B8C] text-white font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-current={currentPage === pageNumber ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <button 
              className={`px-3 py-1.5 rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-[#F8F9FA] text-[#2A3B8C]'}`}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Page suivante"
            >
              Suivant
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default CatalogTab;