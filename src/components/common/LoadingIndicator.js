import React, { useEffect, useState } from 'react';

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
    <div className="fixed inset-0 bg-black/20 flex flex-col items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col items-center">
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 border-2 border-[#2A3B8C] border-t-transparent rounded-full animate-spin mr-3"></div>
          <span>Chargement en cours...</span>
        </div>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
          <div 
            className="bg-[#2A3B8C] h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Message si le chargement prend du temps */}
        {timeElapsed > 10000 && (
          <p className="text-xs text-gray-500 mt-2">
            Le chargement prend plus de temps que prévu...
          </p>
        )}
        
        {/* Bouton pour forcer la fermeture */}
        {timeElapsed > 15000 && (
          <button 
            onClick={() => setVisible(false)}
            className="mt-3 text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingIndicator; 