import { create } from 'ipfs-http-client';

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      const projectId = 'YOUR_INFURA_PROJECT_ID';
      const projectSecret = 'YOUR_INFURA_PROJECT_SECRET';
      const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

      this.ipfs = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: auth,
        },
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Échec de l\'initialisation IPFS:', error);
      return false;
    }
  }

  async uploadFile(file) {
    if (!this.initialized) await this.initialize();
    
    try {
      const added = await this.ipfs.add(file, {
        progress: (prog) => console.log(`Téléchargement: ${prog}`)
      });
      
      return added.path;
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier vers IPFS:', error);
      throw error;
    }
  }

  async uploadBookData(bookData, coverImage) {
    if (!this.initialized) await this.initialize();
    
    try {
      let coverHash = null;
      if (coverImage) {
        coverHash = await this.uploadFile(coverImage);
      }
      
      const bookMetadata = {
        ...bookData,
        coverImageHash: coverHash,
        dateAdded: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(bookMetadata);
      const added = await this.ipfs.add(jsonData);
      
      return {
        metadataHash: added.path,
        coverHash: coverHash
      };
    } catch (error) {
      console.error('Erreur lors du téléchargement des données du livre vers IPFS:', error);
      throw error;
    }
  }

  async getFile(ipfsHash) {
    if (!this.initialized) await this.initialize();
    
    try {
      const data = [];
      
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        data.push(chunk);
      }
      
      return Buffer.concat(data);
    } catch (error) {
      console.error(`Erreur lors de la récupération du fichier depuis IPFS (${ipfsHash}):`, error);
      throw error;
    }
  }

  getIPFSGatewayURL(ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }
}

const ipfsService = new IPFSService();
export default ipfsService;
