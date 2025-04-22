import React from 'react';

const LoadingIndicator = () => {
  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 shadow-lg flex items-center">
        <div className="w-5 h-5 border-2 border-[#2A3B8C] border-t-transparent rounded-full animate-spin mr-3"></div>
        <span>Chargement en cours...</span>
      </div>
    </div>
  );
};

export default LoadingIndicator; 