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

  // Obtenir l'URL de la passerelle IPFS
  getIPFSGatewayURL(ipfsHash) {
    return ipfsHash ? `${this.currentConfig.gateway}/ipfs/${ipfsHash}` : '';
  }
}

const ipfsService = new IPFSService();
export default ipfsService;