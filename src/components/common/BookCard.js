import React from 'react';

const BookCard = ({ book, handleBorrowBook, showDetails = false }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1 duration-300">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        <img src={`/api/placeholder/300/200`} alt={`Couverture du livre ${book.title}`} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-1">{book.title}</h3>
        <p className="text-gray-600 text-sm mb-3">{book.author}</p>
        
        {showDetails && (
          <div className="text-xs text-gray-500 mb-3">
            <p>Catégorie: {book.category}</p>
            <p>Pages: {book.pageCount}</p>
            <p>ISBN: {book.isbn}</p>
            <p>Date: {book.publishedDate}</p>
          </div>
        )}
        
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
  );
};

export default BookCard; 