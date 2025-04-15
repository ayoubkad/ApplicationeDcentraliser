import React, { useState } from 'react';
import { Search } from 'lucide-react';
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

const CatalogTab = ({ handleBorrowBook }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 8;

  // Filtrer les livres
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase()) || 
                          book.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === '' || book.category === categoryFilter;
    const matchesAvailability = availabilityFilter === '' || 
                               (availabilityFilter === 'available' && book.isAvailable) || 
                               (availabilityFilter === 'borrowed' && !book.isAvailable);
    
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Pagination
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  // Gestionnaire de filtre
  const handleFilter = () => {
    setCurrentPage(1); // Réinitialiser à la première page lors du filtrage
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2A3B8C] mb-4 md:mb-0">Catalogue des Livres</h1>
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full md:w-64 pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            aria-label="Rechercher des livres"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
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
          <div className="flex items-end">
            <button
              className="bg-[#2A3B8C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#1F2D6B] transition w-full flex items-center justify-center"
              onClick={handleFilter}
              aria-label="Appliquer les filtres de recherche"
            >
              <Search size={18} className="mr-2" aria-hidden="true" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            handleBorrowBook={handleBorrowBook}
            showDetails={true}
          />
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun livre ne correspond à votre recherche.</p>
        </div>
      )}

      {filteredBooks.length > 0 && (
        <div className="flex justify-center mt-8">
          <nav className="flex items-center space-x-1" aria-label="Pagination">
            <button 
              className="px-3 py-1 rounded hover:bg-[#F8F9FA]" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              Précédent
            </button>
            
            {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
              const pageNumber = currentPage <= 2 ? index + 1 : currentPage - 1 + index;
              if (pageNumber <= totalPages) {
                return (
                  <button 
                    key={pageNumber}
                    className={`px-3 py-1 rounded ${currentPage === pageNumber ? 'bg-[#2A3B8C] text-white' : 'hover:bg-[#F8F9FA]'}`}
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-current={currentPage === pageNumber ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                );
              }
              return null;
            })}
            
            <button 
              className="px-3 py-1 rounded hover:bg-[#F8F9FA]" 
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
