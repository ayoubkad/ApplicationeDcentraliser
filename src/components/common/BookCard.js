import React, { useState, useEffect } from 'react';
import { BookOpen, Download, Image, AlertTriangle, Shield, Clock, Calendar, Info } from 'lucide-react';
import web3Service from '../../services/Web3Service';
import ipfsService from '../../services/IPFSService';

const BookCard = ({ book, handleBorrowBook, showDetails = false, isConnected, isRegistered, showAddedBy = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageState, setImageState] = useState({
    loading: true,
    error: false,
    src: book.coverImageUrl || null
  });

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

  // Récupérer l'URL optimisée pour l'image dès le chargement du composant
  useEffect(() => {
    const loadOptimizedImage = async () => {
      // Si on a un hash IPFS mais pas d'URL ou une URL qui ne fonctionne pas
      if (book.coverImageHash && (!book.coverImageUrl || imageState.error)) {
        try {
          setImageState(prev => ({ ...prev, loading: true, error: false }));
          // Utiliser la méthode optimisée pour obtenir l'URL IPFS
          const optimizedUrl = await ipfsService.generateIPFSImageUrl(book.coverImageHash);
          if (optimizedUrl) {
            setImageState({
              loading: false,
              error: false,
              src: optimizedUrl
            });
          } else {
            throw new Error("Impossible de charger l'image");
          }
        } catch (error) {
          console.error("Erreur lors du chargement de l'image optimisée:", error);
          setImageState({
            loading: false,
            error: true,
            src: `https://picsum.photos/seed/${book.id}/300/200`
          });
        }
      } else if (book.coverImageUrl) {
        setImageState({
          loading: false,
          error: false,
          src: book.coverImageUrl
        });
      } else {
        setImageState({
          loading: false,
          error: true,
          src: null
        });
      }
    };

    loadOptimizedImage();
  }, [book.coverImageHash, book.coverImageUrl, book.id]);

  // Gérer l'erreur de chargement d'image
  const handleImageError = async (e) => {
    console.warn("Erreur de chargement de l'image IPFS, tentative avec alternative");
    e.target.onerror = null; // Éviter les boucles d'erreur

    if (book.coverImageHash) {
      try {
        // Dernière tentative avec un proxy CORS
        const corsProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://cloudflare-ipfs.com/ipfs/${book.coverImageHash}`)}`;
        setImageState({
          loading: false,
          error: false,
          src: corsProxy
        });
      } catch (error) {
        // Fallback final
        setImageState({
          loading: false,
          error: true,
          src: `https://picsum.photos/seed/${book.id}/300/200`
        });
      }
    } else {
      // Pas de hash, utiliser une image générique
      setImageState({
        loading: false,
        error: true,
        src: `https://picsum.photos/seed/${book.id}/300/200`
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      {/* Image de couverture */}
      <div className="h-48 bg-gray-200 relative">
        {imageState.loading ? (
          <div className="h-full w-full flex items-center justify-center bg-gray-100 animate-pulse">
            <div className="text-center p-4">
              <span className="text-sm text-gray-500">Chargement...</span>
            </div>
          </div>
        ) : imageState.src ? (
          <img
            src={imageState.src}
            alt={`Couverture de ${book.title}`}
            className="h-full w-full object-cover"
            onError={handleImageError}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-100">
            <div className="text-center p-4">
              {imageState.error ? (
                <AlertTriangle
                  size={40}
                  className="mx-auto text-yellow-400"
                />
              ) : (
                <Image
                  size={40}
                  className="mx-auto text-gray-400"
                />
              )}
              <p className="text-sm text-gray-500 mt-2">
                {imageState.error ? "Image indisponible" : (book.title || "Couverture non disponible")}
              </p>
            </div>
          </div>
        )}

        {!book.isAvailable && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 m-2 rounded">
            Emprunté
          </div>
        )}

        {/* Badge pour indiquer que le livre a été ajouté par l'administrateur */}
        {showAddedBy && book.addedBy === 'admin' && (
          <div className="absolute bottom-0 left-0 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 m-2 rounded-full flex items-center">
            <Shield size={12} className="mr-1" />
            Admin
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

        {/* Afficher la date d'ajout si disponible */}
        {showAddedBy && book.addedDate && (
          <div className="flex items-center text-xs text-gray-500 mb-2">
            <Clock size={12} className="mr-1" />
            Ajouté le {new Date(book.addedDate).toLocaleDateString('fr-FR')}
          </div>
        )}

        <div className="flex justify-between items-center">
          {book.isAvailable ? (
            <>
              {!isConnected ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('openLoginTab'))}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-sm transition-colors"
                  title="Connectez-vous pour emprunter"
                >
                  Emprunter
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
                  {!isLoading && <Download size={16} className="ml-2" />}
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