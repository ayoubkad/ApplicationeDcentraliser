import React from 'react';
import { User, Book, CheckCircle } from 'lucide-react';
import BookCard from './common/BookCard';

const recentBooks = [
  { id: 1, title: "Principes d'Économie", author: "Gregory Mankiw", isAvailable: true, ipfsHash: "QmX...", category: "Économie", pageCount: 528, publishedDate: "2019-05-10", isbn: "978-2-7590-2369-1" },
  { id: 2, title: "Introduction à l'Algorithmique", author: "Thomas Cormen", isAvailable: false, ipfsHash: "QmY...", category: "Informatique", pageCount: 752, publishedDate: "2015-03-22", isbn: "978-2-1007-2998-7" },
  { id: 3, title: "Physique Quantique", author: "Claude Cohen-Tannoudji", isAvailable: true, ipfsHash: "QmZ...", category: "Sciences", pageCount: 624, publishedDate: "2018-09-15", isbn: "978-2-1007-1288-0" },
  { id: 4, title: "Histoire de l'Art", author: "Ernst Gombrich", isAvailable: true, ipfsHash: "QmA...", category: "Art", pageCount: 412, publishedDate: "2020-01-30", isbn: "978-2-0814-1212-2" }
];

const HomeTab = ({ setActiveTab, handleBorrowBook }) => {
  return (
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
          <BookCard 
            key={book.id} 
            book={book} 
            handleBorrowBook={handleBorrowBook}
          />
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
};

export default HomeTab;