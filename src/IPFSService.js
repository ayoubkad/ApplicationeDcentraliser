import axios from 'axios';

class IPFSService {
  constructor() {
    this.ipfs = axios.create({
      baseURL: 'http://localhost:5001/api/v0',
      timeout: 5000,
    });
    
    // Cache for uploaded files to avoid duplicate uploads
    this.fileCache = new Map();
  }

  async testConnection() {
    try {
      const response = await this.ipfs.post('/id');
      
      if (response.status === 200 && response.data) {
        console.log('Connected to IPFS node:', response.data.ID);
        return {
          connected: true,
          nodeInfo: `Node ID: ${response.data.ID.substring(0, 10)}...`,
          version: response.data.AgentVersion,
          protocols: response.data.Protocols ? response.data.Protocols.length : 0
        };
      } else {
        console.error('IPFS connection test failed with unexpected response:', response);
        return {
          connected: false,
          error: 'Réponse IPFS invalide'
        };
      }
    } catch (error) {
      console.error('IPFS connection error:', error);
      
      // Detailed error information
      let errorDetail = "Erreur inconnue";
      if (error.code === 'ECONNREFUSED') {
        errorDetail = "Connexion refusée - assurez-vous que le daemon IPFS est en cours d'exécution";
      } else if (error.code === 'ETIMEDOUT') {
        errorDetail = "Délai de connexion dépassé";
      } else if (error.response) {
        errorDetail = `Erreur serveur: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        errorDetail = "Aucune réponse reçue du serveur";
      } else {
        errorDetail = error.message;
      }
      
      return {
        connected: false,
        error: errorDetail
      };
    }
  }

  // Cache key generation for file data
  _getCacheKey(fileData) {
    // Simple hash function for ArrayBuffer
    let hash = 0;
    const view = new Uint8Array(fileData);
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash |= 0; // Convert to 32bit integer
    }
    return `file-${hash}`;
  }

  async uploadFile(file) {
    try {
      // Check if file is already in cache
      const fileData = await file.arrayBuffer();
      const cacheKey = this._getCacheKey(fileData);
      
      if (this.fileCache.has(cacheKey)) {
        console.log('File retrieved from cache');
        return this.fileCache.get(cacheKey);
      }
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.ipfs.post('/add?pin=true', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        const result = {
          cid: response.data.Hash,
          size: response.data.Size,
          name: file.name,
          path: `https://ipfs.io/ipfs/${response.data.Hash}`
        };
        
        // Cache the result
        this.fileCache.set(cacheKey, result);
        return result;
      } else {
        throw new Error(`Échec du téléversement du fichier: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw new Error(`Échec du téléversement du fichier: ${error.message}`);
    }
  }

  uploadPDF = async (pdfFile) => {
    if (!pdfFile || pdfFile.type !== 'application/pdf') {
      throw new Error('Fichier PDF valide requis.');
    }
    return await this.uploadFile(pdfFile);
  }

  uploadBookData = async (bookData, coverImage, pdfFile = null) => {
    try {
      // Validation améliorée
      if (!bookData.title?.trim() || !bookData.author?.trim()) {
        throw new Error("Titre et auteur requis");
      }

      // Gestion parallèle des uploads
      const [coverHash, pdfHash] = await Promise.all([
        coverImage ? this.uploadFile(coverImage) : Promise.resolve(null),
        pdfFile ? this.uploadPDF(pdfFile) : Promise.resolve(null)
      ]);

      // Construction des métadonnées
      const bookMetadata = {
        ...bookData,
        coverImageHash: coverHash,
        pdfHash: pdfHash,
        dateAdded: new Date().toISOString(),
      };

      // Sérialisation sécurisée
      const jsonData = JSON.stringify(bookMetadata, (key, value) => {
        return value ?? null; // Gestion des undefined
      });

      // Création du fichier metadata
      const blob = new Blob([jsonData], { type: 'application/json' });
      const metadataFile = new File([blob], 'metadata.json', {
        type: 'application/json',
      });

      // Upload des métadonnées
      const metadataHash = await this.uploadFile(metadataFile);

      return {
        metadataHash,
        coverHash,
        pdfHash
      };
    } catch (error) {
      // Stack trace complète
      throw new Error(`Erreur upload livre: ${error.message}`);
    }
  }

  getFile = async (ipfsHash) => {
    try {
      const response = await this.ipfs.post('/cat?arg=' + ipfsHash, null, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Erreur récupération ${ipfsHash}: ${error.response?.data || error.message}`);
    }
  }

  getIPFSGatewayURL = (ipfsHash) => {
    return ipfsHash ? `http://localhost:8080/ipfs/${ipfsHash}` : '';
  }
}

// Créer une seule instance du service et l'exporter par défaut
const ipfsService = new IPFSService();
export default ipfsService;
