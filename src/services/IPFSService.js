import axios from 'axios';

class IPFSService {
  constructor() {
    this.apiUrl = 'http://127.0.0.1:5001/api/v0';
  }

  async testConnection() {
    try {
      const response = await axios.post(`${this.apiUrl}/id`);
      return {
        connected: true,
        nodeInfo: response.data
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async uploadFile(file) {
    if (!file) throw new Error('Aucun fichier fourni.');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${this.apiUrl}/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Correction clé : Ne pas parser une réponse déjà parsée par Axios
      return response.data.Hash; // Accès direct au Hash
    } catch (error) {
      // Amélioration du message d'erreur
      throw new Error(`Erreur upload fichier: ${error.response?.data || error.message}`);
    }
  }

  async uploadPDF(pdfFile) {
    if (!pdfFile || pdfFile.type !== 'application/pdf') {
      throw new Error('Fichier PDF valide requis.');
    }
    return await this.uploadFile(pdfFile);
  }

  async uploadBookData(bookData, coverImage, pdfFile = null) {
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

  async getFile(ipfsHash) {
    try {
      const response = await axios.post(`${this.apiUrl}/cat?arg=${ipfsHash}`, null, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Erreur récupération ${ipfsHash}: ${error.response?.data || error.message}`);
    }
  }

  getIPFSGatewayURL(ipfsHash) {
    return ipfsHash ? `http://127.0.0.1:8080/ipfs/${ipfsHash}` : '';
  }
}

const ipfsService = new IPFSService();
export default ipfsService;
