import React, { useState, useEffect } from 'react';
import ipfsService from '../../services/IPFSService';
import { toast } from 'react-hot-toast';
import { Download, FileCheck, AlertTriangle, Clock } from 'lucide-react';

// Composant de téléchargement direct de PDF par CID IPFS
const PdfDownloader = () => {
  const [cid, setCid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('document.pdf');
  const [progress, setProgress] = useState(0);

  // Écouter les événements de progression de téléchargement
  useEffect(() => {
    const handleProgress = (event) => {
      if (event.detail && event.detail.progress && isLoading) {
        setProgress(event.detail.progress);
      }
    };

    window.addEventListener('ipfsDownloadProgress', handleProgress);
    
    return () => {
      window.removeEventListener('ipfsDownloadProgress', handleProgress);
    };
  }, [isLoading]);

  const handleDownload = async (e) => {
    e.preventDefault();
    
    const trimmedCid = cid.trim();
    if (!trimmedCid) {
      toast.error('Veuillez entrer un CID IPFS valide');
      return;
    }
    
    // Vérification basique de la validité du CID
    if (!ipfsService.isValidCid(trimmedCid) && !trimmedCid.startsWith('ipfs://')) {
      toast.warning('Ce CID IPFS semble invalide. Tentative de téléchargement quand même...');
    }
    
    setIsLoading(true);
    setProgress(0);
    
    // Utiliser un toast persistant pour montrer la progression, mais avec une durée maximale
    const loadingToastId = toast.loading(
      <div>
        <div className="font-medium">Téléchargement en cours...</div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-xs mt-1 text-gray-500">{progress}% complété</div>
      </div>,
      { duration: 30000 } // Timeout de 30 secondes
    );
    
    // Timer de sécurité supplémentaire pour s'assurer que le toast disparaît
    const safetyTimer = setTimeout(() => {
      toast.dismiss(loadingToastId);
      toast.error('Le téléchargement prend plus de temps que prévu. Veuillez réessayer ou utiliser un lien direct.', {
        duration: 5000
      });
    }, 45000); // 45 secondes
    
    try {
      // Utiliser le service IPFS pour télécharger le PDF
      const result = await ipfsService.downloadPDF(trimmedCid, fileName);
      
      // Annuler le timer de sécurité
      clearTimeout(safetyTimer);
      
      // Signaler que le téléchargement est terminé
      setProgress(100);
      
      // Traiter le résultat
      if (result.success) {
        toast.success(
          result.verified 
            ? 'Téléchargement réussi avec vérification d\'intégrité ✓' 
            : 'Téléchargement réussi',
          { id: loadingToastId, duration: 3000 }
        );
      }
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      
      // Annuler le timer de sécurité
      clearTimeout(safetyTimer);
      
      // Fermer le toast de chargement
      toast.dismiss(loadingToastId);
      
      // Créer des URLs alternatives pour un accès direct
      const cidToUse = trimmedCid.startsWith('ipfs://') ? trimmedCid.substring(7) : trimmedCid;
      const directUrls = [
        `https://ipfs.io/ipfs/${cidToUse}`,
        `https://cloudflare-ipfs.com/ipfs/${cidToUse}`,
        `https://gateway.pinata.cloud/ipfs/${cidToUse}`,
        `https://dweb.link/ipfs/${cidToUse}`
      ];
      
      // Message d'erreur adapté au type d'erreur
      let errorMessage = 'Erreur de téléchargement automatique.';
      
      if (error.message.includes('Timeout')) {
        errorMessage = 'Temps de téléchargement dépassé. Le fichier est peut-être trop volumineux.';
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'Le fichier PDF n\'a pas été trouvé sur IPFS.';
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Problème de connexion réseau.';
      }
      
      // Proposer les liens alternatifs en cas d'échec
      toast.error(
        <div className="space-y-3">
          <p>{errorMessage}</p>
          <div>
            <p className="text-sm font-medium mb-2">Essayez ces liens alternatifs:</p>
            <div className="flex flex-col space-y-2">
              {directUrls.map((url, index) => (
                <a 
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md transition duration-150 text-center"
                >
                  Passerelle {index + 1}
                </a>
              ))}
            </div>
          </div>
        </div>,
        { duration: 15000 }
      );
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
        <FileCheck className="mr-2 text-[#2A3B8C]" /> Téléchargement direct IPFS
      </h3>
      
      <form onSubmit={handleDownload} className="space-y-4">
        <div>
          <label htmlFor="cid-input" className="block text-sm font-medium text-gray-700 mb-1">
            CID IPFS
          </label>
          <input
            id="cid-input"
            type="text"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="Qm... ou ipfs://Qm..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            disabled={isLoading}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Exemple: QmSYokJ8j9sszXYQoZf5zqsTBzVu78dfqtZ3QMjLiLx8Jf
          </p>
        </div>
        
        <div>
          <label htmlFor="filename-input" className="block text-sm font-medium text-gray-700 mb-1">
            Nom du fichier (optionnel)
          </label>
          <input
            id="filename-input"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="document.pdf"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A3B8C] focus:border-[#2A3B8C]"
            disabled={isLoading}
          />
        </div>
        
        {isLoading && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                Téléchargement en cours
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1 text-gray-600">
              <span>{progress}% complété</span>
              <span>Veuillez patienter...</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center pt-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
          <span className="text-xs text-gray-600">
            Le téléchargement peut prendre du temps selon la taille du fichier
          </span>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2A3B8C] hover:bg-[#1F2D6B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2A3B8C] ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Téléchargement...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Télécharger le PDF
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default PdfDownloader; 