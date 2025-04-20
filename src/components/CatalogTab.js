import React, { useState, useEffect } from 'react';
import { Search, Filter, Book, BookX, ArrowDown, ArrowUp, Info, Download } from 'lucide-react';
import BookCard from './common/BookCard';

// Simuler des données pour la maquette
const books = [
  { id: 1, title: "Principes d'Économie", author: "Gregory Mankiw", isAvailable: true, ipfsHash: "QmX...", category: "Économie", pageCount: 528, publishedDate: "2019-05-10", isbn: "978-2-7590-2369-1" },
  { id: 2, title: "Introduction à l'Algorithmique", author: "Thomas Cormen", isAvailable: false, ipfsHash: "QmY...", category: "Informatique", pageCount: 752, publishedDate: "2015-03-22", isbn: "978-2-1007-2998-7" },
  { id: 3, title: "Physique Quantique", author: "Claude Cohen-Tannoudji", isAvailable: true, ipfsHash: "QmZ...", category: "Sciences", pageCount: 624, publishedDate: "2018-09-15", isbn: "978-2-1007-1288-0" },
  { id: 4, title: "Histoire de l'Art", author: "Ernst Gombrich", isAvailable: true, ipfsHash: "QmA...", category: "Art", pageCount: 412, publishedDate: "2020-01-30", isbn: "978-2-0814-1212-2" },
  { id: 5, title: "Bases de données", author: "Abraham Silberschatz", isAvailable: true, ipfsHash: "QmB...", category: "Informatique", pageCount: 620, publishedDate: "2018-05-21", isbn: "978-2-4159-0357-1" },
  { id: 6, title: "Les Misérables", author: "Victor Hugo", isAvailable: false, ipfsHash: "QmC...", category: "Littérature", pageCount: 1200, publishedDate: "1862-01-01", isbn: "978-2-0703-7951-4" },
  { id: 7, title: "Macroéconomie", author: "Paul Krugman", isAvailable: true, ipfsHash: "QmD...", category: "Économie", pageCount: 450, publishedDate: "2017-09-10", isbn: "978-2-0814-1212-2" },
  { id: 8, title: "Introduction à l'Intelligence Artificielle", author: "Stuart Russell", isAvailable: true, ipfsHash: "QmE...", category: "Informatique", pageCount: 520, publishedDate: "2019-02-15", isbn: "978-2-8652-1749-5" },
];

const CatalogTab = ({ handleBorrowBook, isConnected, isRegistered }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [stats, setStats] = useState({ total: 0, available: 0, categories: {} });
  const booksPerPage = 8;

  // Calculer les statistiques du catalogue
  useEffect(() => {
    const categoriesCount = {};
    let availableCount = 0;
    
    books.forEach(book => {
      // Compter par catégorie
      if (categoriesCount[book.category]) {
        categoriesCount[book.category]++;
      } else {
        categoriesCount[book.category] = 1;
      }
      
      // Compter les livres disponibles
      if (book.isAvailable) {
        availableCount++;
      }
    });
    
    setStats({
      total: books.length,
      available: availableCount,
      categories: categoriesCount
    });
  }, []);

  // Filtrer et trier les livres
  const getFilteredBooks = () => {
    // Filtrage
    const filtered = books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) || 
                           book.author.toLowerCase().includes(search.toLowerCase()) ||
                           book.isbn.includes(search);
      const matchesCategory = categoryFilter === '' || book.category === categoryFilter;
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
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'author') {
        comparison = a.author.localeCompare(b.author);
      } else if (sortBy === 'date') {
        comparison = new Date(a.publishedDate) - new Date(b.publishedDate);
      } else if (sortBy === 'pages') {
        comparison = a.pageCount - b.pageCount;
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

      {/* Message de résultats */}
      <div className="text-sm text-gray-600 mb-4">
        {filteredBooks.length === 0 ? (
          "Aucun livre ne correspond à votre recherche."
        ) : (
          `${filteredBooks.length} livre${filteredBooks.length > 1 ? 's' : ''} trouvé${filteredBooks.length > 1 ? 's' : ''}`
        )}
      </div>

      {filteredBooks.length === 0 ? (
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
      )}

      {/* Pagination */}
      {filteredBooks.length > booksPerPage && (
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