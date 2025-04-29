import axios from 'axios';

class IPFSService {
  constructor() {
    // Configuration par défaut pour les nœuds local et distant
    this.config = {
      useRemoteNode: false, // False pour local, True pour distant
      localNode: {
        apiUrl: 'http://127.0.0.1:5001/api/v0',
        gateway: 'http://127.0.0.1:8080',
        auth: {
          username: null,
          password: null
        }
      },
      remoteNode: {
        apiUrl: 'http://41.249.228.140:5001/api/v0',
        gateway: 'http://41.249.228.140:8080',
        auth: {
          username: null, // Ajoutez si nécessaire
          password: null  // Ajoutez si nécessaire
        }
      },
      debug: true // Activer le mode debug pour le suivi des erreurs
    };

    // Sélectionner la configuration initiale
    this.currentConfig = this.getCurrentConfig();
  }

  // Sélectionner la configuration actuelle (local ou distant)
  getCurrentConfig() {
    return this.config.useRemoteNode ? this.config.remoteNode : this.config.localNode;
  }

  // Configurer le service avec des paramètres personnalisés
  configure(customConfig = {}) {
    this.config = {
      ...this.config,
      ...customConfig
    };
    this.currentConfig = this.getCurrentConfig();
    return this;
  }

  // Logger les messages pour le débogage
  log(message, level = 'info') {
    if (this.config.debug || level === 'error') {
      const timestamp = new Date().toISOString();
      console[level](`[IPFS ${timestamp}] ${message}`);
    }
  }

  // Tester la connexion au nœud IPFS
  async testConnection() {
    try {
      this.log(`Test de connexion à: ${this.currentConfig.apiUrl}`);
      const headers = this.getAuthHeaders();
      const response = await axios.post(`${this.currentConfig.apiUrl}/id`, null, { headers });
      this.log('Connexion réussie !');
      return {
        connected: true,
        nodeInfo: response.data
      };
    } catch (error) {
      this.log(`Erreur de connexion: ${error.message}`, 'error');
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // Générer les en-têtes pour l'authentification si nécessaire
  getAuthHeaders() {
    const headers = {};
    const { username, password } = this.currentConfig.auth;
    if (username && password) {
      const auth = btoa(`${username}:${password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }
    return headers;
  }

  // Téléverser un fichier sur IPFS
  async uploadFile(file) {
    if (!file) throw new Error('Aucun fichier fourni.');

    try {
      this.log(`Téléversement du fichier: ${file.name}`);
      const formData = new FormData();
      formData.append('file', file);

      const headers = {
        'Content-Type': 'multipart/form-data',
        ...this.getAuthHeaders()
      };

      const response = await axios.post(`${this.currentConfig.apiUrl}/add`, formData, { headers });
      this.log(`Fichier téléversé avec succès: ${response.data.Hash}`);
      return response.data.Hash;
    } catch (error) {
      const errorMessage = error.response?.data?.Message || error.message;
      this.log(`Erreur lors du téléversement: ${errorMessage}`, 'error');
      throw new Error(`Erreur téléversement fichier: ${errorMessage}`);
    }
  }

  // Téléverser un fichier PDF
  async uploadPDF(pdfFile) {
    if (!pdfFile || pdfFile.type !== 'application/pdf') {
      throw new Error('Fichier PDF valide requis.');
    }
    return await this.uploadFile(pdfFile);
  }

  // Téléverser les données d'un livre (métadonnées, image de couverture, PDF)
  async uploadBookData(bookData, coverImage, pdfFile = null) {
    try {
      // Validation des champs requis
      if (!bookData.title?.trim() || !bookData.author?.trim()) {
        throw new Error("Titre et auteur requis");
      }

      this.log('Téléversement des données du livre...');
      // Téléversement parallèle des fichiers
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

      // Téléversement des métadonnées
      const metadataHash = await this.uploadFile(metadataFile);
      this.log(`Données du livre téléversées avec succès: ${metadataHash}`);

      return {
        metadataHash,
        coverHash,
        pdfHash
      };
    } catch (error) {
      this.log(`Erreur lors du téléversement du livre: ${error.message}`, 'error');
      throw new Error(`Erreur téléversement livre: ${error.message}`);
    }
  }

  // Récupérer un fichier depuis IPFS
  async getFile(ipfsHash) {
    try {
      this.log(`Récupération du fichier: ${ipfsHash}`);
      const headers = this.getAuthHeaders();
      const response = await axios.post(
        `${this.currentConfig.apiUrl}/cat?arg=${ipfsHash}`,
        null,
        {
          headers,
          responseType: 'arraybuffer',
        }
      );
      this.log(`Fichier récupéré avec succès: ${ipfsHash}`);
      return Buffer.from(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.Message || error.message;
      this.log(`Erreur lors de la récupération ${ipfsHash}: ${errorMessage}`, 'error');
      throw new Error(`Erreur récupération ${ipfsHash}: ${errorMessage}`);
    }
  }

  // Fonction pour générer une URL avec proxy CORS pour les ressources IPFS
  getIPFSGatewayURL(ipfsHash) {
    if (!ipfsHash) return null;
    
    // Liste de passerelles IPFS publiques avec configuration CORS améliorée
    const gateways = [
      // Utiliser le nœud local en priorité si disponible
      `${this.currentConfig.gateway}/ipfs/${ipfsHash}`,
      // Passerelles tierces avec proxy CORS
      `https://ipfs.infura-ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://nftstorage.link/ipfs/${ipfsHash}`,
      // API directe (si le CORS est autorisé)
      `${this.currentConfig.apiUrl}/cat?arg=${ipfsHash}`,
      // Méthodes de secours
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://gateway.ipfs.io/ipfs/${ipfsHash}`
    ];
    
    // Utiliser la première passerelle par défaut
    return gateways[0];
  }

  // Récupérer les métadonnées d'un livre stocké sur IPFS avec contournement CORS
  async getBookMetadata(ipfsHash) {
    if (!ipfsHash) {
      console.error("Hash IPFS manquant pour récupérer les métadonnées du livre");
      return null;
    }

    this.log(`Récupération des métadonnées du livre depuis IPFS: ${ipfsHash}`);
    
    // Liste des passerelles à essayer
    const gateways = [
      // Utiliser le nœud local en priorité
      `${this.currentConfig.gateway}/ipfs/${ipfsHash}`,
      // Passerelles supportant CORS
      `https://ipfs.infura-ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://nftstorage.link/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
    ];
    
    // API directe avec authentification si nécessaire (évite les problèmes CORS)
    try {
      // Essayer d'abord via l'API directe du nœud IPFS si disponible
      const headers = this.getAuthHeaders();
      const response = await axios.post(
        `${this.currentConfig.apiUrl}/cat?arg=${ipfsHash}`,
        null,
        {
          headers,
          responseType: 'json'
        }
      ).catch(() => null);
      
      if (response && response.data) {
        this.log(`Métadonnées récupérées via API IPFS locale`);
        return typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
      }
    } catch (directError) {
      this.log(`Échec de récupération via API directe: ${directError.message}`, 'warn');
    }
    
    // Essayer chaque passerelle jusqu'à ce qu'une fonctionne
    for (const gateway of gateways) {
      try {
        this.log(`Tentative via passerelle: ${gateway}`);
        
        // Utiliser axios avec timeout et gestion d'erreur
        const response = await axios.get(gateway, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }).catch(() => null);
        
        if (response && response.data) {
          this.log(`Métadonnées récupérées via: ${gateway}`);
          return response.data;
        }
      } catch (error) {
        this.log(`Échec avec passerelle ${gateway}: ${error.message}`, 'warn');
        continue; // Continuer avec la passerelle suivante
      }
    }
    
    // Si toutes les méthodes échouent, essayer le contournement CORS avec JSONP ou un proxy
    try {
      // Utiliser un service proxy CORS public
      const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://cloudflare-ipfs.com/ipfs/${ipfsHash}`)}`;
      
      this.log(`Tentative finale via proxy CORS: ${corsProxyUrl}`);
      const response = await axios.get(corsProxyUrl, { timeout: 10000 });
      
      if (response && response.data) {
        this.log(`Métadonnées récupérées via proxy CORS`);
        return response.data;
      }
    } catch (proxyError) {
      this.log(`Échec via proxy CORS: ${proxyError.message}`, 'error');
    }
    
    // Échec de toutes les tentatives
    console.error("Toutes les tentatives de récupération des métadonnées ont échoué");
    return null;
  }
  
  // Récupérer l'URL d'une image stockée sur IPFS avec contournement CORS
  async getIPFSImageUrl(ipfsHash) {
    if (!ipfsHash) return null;
    
    // Liste des passerelles à essayer pour les images
    const imageGateways = [
      // Nœud local en priorité
      `${this.currentConfig.gateway}/ipfs/${ipfsHash}`,
      // Services compatibles CORS pour les images
      `https://nftstorage.link/ipfs/${ipfsHash}`,
      `https://ipfs.infura-ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
    ];
    
    // Fonction pour vérifier si une URL d'image est accessible
    const checkImageUrl = async (url) => {
      try {
        const response = await axios.head(url, { 
          timeout: 3000,
          headers: { 'Cache-Control': 'no-cache' }
        }).catch(() => null);
        
        return response && response.status === 200 && 
               response.headers['content-type']?.includes('image');
      } catch (error) {
        return false;
      }
    };
    
    // Vérifier chaque passerelle et retourner la première qui fonctionne
    for (const gateway of imageGateways) {
      const isValid = await checkImageUrl(gateway);
      if (isValid) {
        this.log(`Image IPFS trouvée sur: ${gateway}`, 'info');
        return gateway;
      }
    }
    
    // Contournement via proxy CORS pour les images
    const corsProxyImageUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://cloudflare-ipfs.com/ipfs/${ipfsHash}`)}`;
    const isProxyValid = await checkImageUrl(corsProxyImageUrl);
    
    if (isProxyValid) {
      this.log(`Image IPFS trouvée via proxy CORS`, 'info');
      return corsProxyImageUrl;
    }
    
    // Si aucun moyen ne fonctionne, retourner une URL avec indication d'erreur
    this.log(`Aucune passerelle IPFS ne répond pour l'image: ${ipfsHash}`, 'warn');
    
    // Fallback : utiliser une URL qui passera par le gestionnaire d'erreur du composant d'image
    return `${this.currentConfig.gateway}/ipfs/${ipfsHash}`;
  }

  // Nouvelle fonction améliorée pour générer les URLs d'images IPFS avec plusieurs passerelles
  async generateIPFSImageUrl(ipfsHash) {
    if (!ipfsHash) return null;
    
    // Liste de passerelles IPFS publiques pour les images
    const imageGateways = [
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.ipfs.io/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://dweb.link/ipfs/${ipfsHash}`
    ];
    
    // Fonction pour vérifier si une URL est accessible
    const checkImageUrl = async (url) => {
      try {
        const response = await fetch(url, { 
          method: 'HEAD', 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('image')) {
            return true;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    };
    
    // Vérifier chaque passerelle et retourner la première qui fonctionne
    for (const gateway of imageGateways) {
      const isValid = await checkImageUrl(gateway);
      if (isValid) {
        this.log(`Image IPFS trouvée sur: ${gateway}`, 'info');
        return gateway;
      }
    }
    
    // Si aucune passerelle ne fonctionne, retourner quand même la première URL
    // pour permettre au composant d'affichage de gérer l'erreur si nécessaire
    this.log(`Aucune passerelle IPFS ne répond pour l'image: ${ipfsHash}`, 'warn');
    return imageGateways[0];
  }
}

const ipfsService = new IPFSService();
export default ipfsService;