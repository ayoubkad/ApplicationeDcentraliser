import React, { useEffect, useState } from 'react';

/**
 * Composant LoadingIndicator amélioré avec le design Tutoreel
 * Affiche un indicateur de chargement avec une barre de progression
 *
 * @param {Object} props - Les propriétés du composant
 * @param {number} props.timeout - Délai en millisecondes avant que l'indicateur ne se cache automatiquement
 * @returns {JSX.Element|null} - Le composant LoadingIndicator ou null si caché
 */
const LoadingIndicator = ({ timeout = 30000 }) => {
  const [visible, setVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    // Commencer le timer
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1000);
    }, 1000);

    // Masquer automatiquement après le timeout
    const timer = setTimeout(() => {
      setVisible(false);
    }, timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [timeout]);

  // Cacher le composant si le temps est écoulé
  if (!visible) return null;

  // Calculer le pourcentage de temps écoulé
  const progressPercent = Math.min((timeElapsed / timeout) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/20 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <div className="tutoreel-glass rounded-xl p-6 shadow-xl flex flex-col items-center animate-fadeIn">
        <div className="flex items-center mb-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-gray-800 font-medium">Chargement en cours...</span>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Message si le chargement prend du temps */}
        {timeElapsed > 10000 && (
          <p className="text-xs text-gray-600 mt-3 animate-fadeIn">
            Le chargement prend plus de temps que prévu...
          </p>
        )}

        {/* Bouton pour forcer la fermeture */}
        {timeElapsed > 15000 && (
          <button
            onClick={() => setVisible(false)}
            className="tutoreel-btn tutoreel-btn-outline mt-4 text-xs px-4 py-2 focus-ring animate-fadeIn"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingIndicator;