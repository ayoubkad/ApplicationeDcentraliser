import React, { useState, useEffect } from 'react';

/**
 * Composant d'animation de chargement pour le retour de livre
 * Affiche une animation de chargement avec un spinner et une barre de progression
 *
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.message - Message principal à afficher
 * @param {string} props.subMessage - Message secondaire à afficher
 * @returns {JSX.Element} - Le composant ReturnBookLoadingModal
 */
const ReturnBookLoadingModal = ({ message = "Chargement en cours...", subMessage = "Le chargement prend plus de temps que prévu..." }) => {
  const [progress, setProgress] = useState(0);

  // Simuler une progression pour la barre de chargement
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Progression plus lente après 70%
        const increment = prev < 70 ? 5 : 1;
        return Math.min(prev + increment, 95);
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-auto">
      <div className="flex items-center mb-4">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <h3 className="text-gray-800 font-medium">{message}</h3>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Message secondaire */}
      <p className="text-xs text-gray-600 mt-1">
        {subMessage}
      </p>
    </div>
  );
};

export default ReturnBookLoadingModal;
