import React, { useState } from 'react';
import { BookOpen, Download, Image } from 'lucide-react';
import web3Service from '../../services/Web3Service';

const BookCard = ({ book, handleBorrowBook, showDetails = false, isConnected, isRegistered }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Fonction pour gérer l'emprunt avec affichage de chargement
  const onBorrowClick = async () => {
    setIsLoading(true);
    await handleBorrowBook(book.id);
    setIsLoading(false);
  };
  
  // Fonction pour rediriger vers l'inscription en indiquant la provenance (emprunt)
  const redirectToSignup = () => {
    // Créer et dispatcher un événement personnalisé pour indiquer la redirection depuis emprunt
    window.dispatchEvent(new CustomEvent('borrowRedirect'));
    
    // Ajouter un paramètre à l'URL pour indiquer la source
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('source', 'borrow');
    window.history.pushState({}, '', currentUrl);
    
    // Déclencher l'événement pour ouvrir la page d'inscription
    window.dispatchEvent(new CustomEvent('openLoginTab'));
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {/* Image de couverture */}
      <div className="h-48 bg-gray-200 relative">
        {book.coverImageUrl ? (
          <img 
            src={book.coverImageUrl} 
            alt={`Couverture de ${book.title}`}
            className="h-full w-full object-cover"
            onError={(e) => {
              console.error("Erreur de chargement de l'image IPFS, utilisation d'une image alternative");
              e.target.onerror = null;
              e.target.src = `https://picsum.photos/seed/${book.id}/300/200`;
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100">
            <div className="text-center p-4">
              <Image 
                size={40} 
                className="mx-auto text-gray-400" 
              />
              <p className="text-sm text-gray-500 mt-2">
                {book.title || "Couverture non disponible"}
              </p>
            </div>
          </div>
        )}
        
        {!book.isAvailable && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 m-2 rounded">
            Emprunté
          </div>
        )}
      </div>
      
      {/* Contenu */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{book.title}</h3>
        <p className="text-gray-600 text-sm mb-2">{book.author}</p>
        
        {showDetails && (
          <>
            <div className="text-xs text-gray-500 mb-3">
              <span className="inline-block mr-3">{book.category}</span>
              {book.pageCount && <span>{book.pageCount} pages</span>}
            </div>
          </>
        )}
        
        <div className="flex justify-between items-center">
          {book.isAvailable ? (
            <>
              {!isConnected ? (
                <button 
                  className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm cursor-not-allowed"
                  disabled
                  title="Connectez-vous pour emprunter"
                >
                  Connectez-vous
                </button>
              ) : !isRegistered ? (
                <button 
                  className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200 transition"
                  onClick={redirectToSignup}
                >
                  S'inscrire pour emprunter
                </button>
              ) : (
                <button 
                  className={`bg-[#2A3B8C] text-white px-3 py-1 rounded text-sm hover:bg-[#1F2D6B] transition flex items-center ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
                  onClick={onBorrowClick}
                  disabled={isLoading}
                >
                  {isLoading ? 'En cours...' : 'Emprunter'}
                  {!isLoading && <Download size={14} className="ml-1" />}
                </button>
              )}
            </>
          ) : (
            <span className="text-gray-500 text-sm">Non disponible</span>
          )}
          
          <button 
            className="text-[#2A3B8C] hover:text-[#4D5EC9] transition"
            title="Voir le détail"
          >
            <BookOpen size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard; 