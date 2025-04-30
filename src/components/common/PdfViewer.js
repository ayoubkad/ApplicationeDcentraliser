import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink } from 'lucide-react';

const PdfViewer = ({ pdfUrl, fileName, onClose, directUrl = false, iframe = null }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframe) {
      // Si un iframe est fourni, on l'utilise directement
      const existingIframe = iframe;
      existingIframe.style.display = 'block';
      existingIframe.style.width = '100%';
      existingIframe.style.height = '100%';
      existingIframe.style.border = 'none';
      
      if (iframeRef.current) {
        iframeRef.current.appendChild(existingIframe);
      }
      
      setIsLoading(false);
      
      return () => {
        // Nettoyer l'iframe à la fermeture
        if (existingIframe.parentNode) {
          existingIframe.parentNode.removeChild(existingIframe);
        }
      };
    }
    
    const timer = setTimeout(() => {
      // Si après 5 secondes le PDF n'est toujours pas chargé, on considère qu'il y a un problème
      if (isLoading) {
        setLoadError(true);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [iframe, isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const renderContent = () => {
    if (iframe && iframeRef.current) {
      return <div ref={iframeRef} className="w-full h-full"></div>;
    }
    
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement du document...</p>
        </div>
      );
    }
    
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Erreur de chargement</p>
            <p className="text-sm mt-2">Impossible de charger le PDF dans le visualiseur intégré.</p>
          </div>
          <div className="mt-6">
            <button 
              onClick={handleOpenInNewTab}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            >
              <ExternalLink size={18} className="mr-2" />
              Ouvrir dans un nouvel onglet
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <iframe 
        src={directUrl ? pdfUrl : `${pdfUrl}#toolbar=0&navpanes=0`}
        className="w-full h-[75vh] border-0 shadow-lg bg-white"
        title="PDF Viewer"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-6xl h-[90vh]">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800 truncate flex-1">
            {fileName || 'Document PDF'}
          </h3>
          <div className="flex space-x-3">
            <button 
              onClick={handleZoomIn}
              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
              title="Zoom avant"
              disabled={!!iframe}
            >
              <ZoomIn size={18} />
            </button>
            <button 
              onClick={handleZoomOut}
              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
              title="Zoom arrière"
              disabled={!!iframe}
            >
              <ZoomOut size={18} />
            </button>
            <button 
              onClick={handleRotate}
              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
              title="Pivoter"
              disabled={!!iframe}
            >
              <RotateCw size={18} />
            </button>
            <button 
              onClick={handleOpenInNewTab}
              className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink size={18} />
            </button>
            <button 
              onClick={handleDownload}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
              title="Télécharger"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100" 
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
          <div 
            style={{ 
              transform: iframe ? 'none' : `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              width: iframe ? '100%' : 'auto',
              height: iframe ? '100%' : 'auto'
            }}
            className="p-4"
          >
            {renderContent()}
          </div>
        </div>
        
        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 rounded-b-lg border-t">
          Visualisation de {fileName || 'document.pdf'}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer; 