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

    // Configurations centralisées pour les passerelles IPFS
    this.IPFS_GATEWAYS = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://nftstorage.link/ipfs/',
      'https://gateway.ipfs.io/ipfs/',
      'https://ipfs.fleek.co/ipfs/',
      'https://ipfs.eth.aragon.network/ipfs/',
      'https://cf-ipfs.com/ipfs/',
      'https://ipfs.best-practice.se/ipfs/'
    ];

    this.DEFAULT_TIMEOUT = 60000; // 60 secondes au lieu de 20 secondes
    
    // Sélectionner la configuration initiale
    this.currentConfig = this.getCurrentConfig();
  }

  // Validation du CID (Content ID) IPFS
  isValidCid(cid) {
    if (!cid) return false;
    // Accepter les CID v0 (commence par Qm) et v1 (commence par bafy) et autres formats valides
    return /^Qm[1-9A-Za-z]{44}$/.test(cid) || 
           /^bafy[1-9A-Za-z]{58}$/.test(cid) ||
           /^[a-zA-Z0-9]{46,59}$/.test(cid); // Pour accepter d'autres formats valides
  }

  // Téléchargement optimisé d'un PDF depuis IPFS avec gestion des erreurs et timeout
  async downloadPdfFromIPFS(cid) {
    if (!this.isValidCid(cid)) {
      this.log(`CID IPFS invalide: ${cid}`, 'error');
      throw new Error('CID IPFS invalide');
    }

    const controller = new AbortController();
    
    // Fonction pour créer une promesse avec timeout et progression
    const createTimeoutPromise = (ms, onProgress) => {
      return new Promise((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Timeout - Le téléchargement a pris trop de temps'));
        }, ms);
        
        // Mettre à jour la progression toutes les 2 secondes
        if (onProgress) {
          let elapsed = 0;
          const interval = setInterval(() => {
            elapsed += 2000;
            const progress = Math.min(95, Math.floor((elapsed / ms) * 100));
            onProgress(progress);
            if (elapsed >= ms) clearInterval(interval);
          }, 2000);
          
          // Nettoyer l'intervalle si le timeout est annulé
          // Fix: Dans certains environnements, timer est un nombre et non un objet
          // On crée donc un objet wrapper pour stocker les références
          const timerWrapper = {
            id: timer,
            unref: () => {
              clearInterval(interval);
              clearTimeout(timer);
            }
          };
          
          return timerWrapper;
        }
        
        // Si pas de onProgress, créer quand même un wrapper avec unref
        return {
          id: timer,
          unref: () => {
            clearTimeout(timer);
          }
        };
      });
    };

    // Fonction pour signaler la progression du téléchargement
    const onProgressUpdate = (progress) => {
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
          detail: { cid, progress }
        }));
      }
      this.log(`Téléchargement en cours: ${progress}%`, 'info');
    };

    let timeoutTimer;
    
    try {
      let lastError;
      
      // Ajouter la passerelle locale en premier dans la liste des passerelles à essayer
      const allGateways = [`${this.currentConfig.gateway}/ipfs/`, ...this.IPFS_GATEWAYS];
      
      // Ajouter des proxys CORS pour contourner les erreurs CORS
      const corsProxies = [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://cors-anywhere.herokuapp.com/${url}`
      ];
      
      // D'abord essayer les passerelles directes
      for (const gateway of allGateways) {
        try {
          const url = `${gateway}${cid}`;
          this.log(`Tentative avec la passerelle: ${url}`);
          
          // Créer la promesse de timeout avec suivi de progression
          timeoutTimer = createTimeoutPromise(this.DEFAULT_TIMEOUT, onProgressUpdate);
          
          const fetchPromise = fetch(url, {
            signal: controller.signal,
            headers: { 
              'Accept': 'application/pdf,application/octet-stream',
              'Cache-Control': 'no-cache'
            }
          });

          // Utiliser Promise.race pour comparer la réponse ou le timeout
          const response = await Promise.race([fetchPromise, timeoutTimer]);
          
          // Annuler le timer de timeout si la réponse arrive à temps
          if (timeoutTimer && timeoutTimer.unref) timeoutTimer.unref();

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          // Vérifier le type de contenu, mais accepter les types génériques aussi
          const contentType = response.headers.get('content-type');
          if (contentType && 
              !contentType.includes('pdf') && 
              !contentType.includes('octet-stream') && 
              !contentType.includes('binary')) {
            this.log(`Type de contenu non-PDF: ${contentType}`, 'warn');
            throw new Error('Le contenu récupéré ne semble pas être un PDF');
          }
          
          // Télécharger le blob avec suivi de progression si possible
          let pdfBlob;
          if (response.body && typeof response.body.getReader === 'function') {
            // Utiliser l'API ReadableStream pour suivre la progression
            const reader = response.body.getReader();
            const contentLength = response.headers.get('Content-Length') || 0;
            let receivedLength = 0;
            const chunks = [];
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              chunks.push(value);
              receivedLength += value.length;
              
              // Mettre à jour la progression si Content-Length est disponible
              if (contentLength > 0) {
                const progress = Math.min(98, Math.floor((receivedLength / contentLength) * 100));
                onProgressUpdate(progress);
              }
            }
            
            // Concaténer les chunks en un seul Uint8Array
            const chunksAll = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
              chunksAll.set(chunk, position);
              position += chunk.length;
            }
            
            // Convertir en blob
            pdfBlob = new Blob([chunksAll], { type: 'application/pdf' });
          } else {
            // Fallback au téléchargement standard
            pdfBlob = await response.blob();
          }
          
          // Signal 100% de progression
          onProgressUpdate(100);
          
          // Tenter la vérification d'intégrité lorsque possible
          try {
            const isVerified = await this.verifyIpfsIntegrity(pdfBlob, cid);
            if (isVerified) {
              this.log(`Intégrité du PDF vérifiée avec succès pour ${cid}`, 'info');
            }
          } catch (verifyError) {
            this.log(`Avertissement: Impossible de vérifier l'intégrité: ${verifyError.message}`, 'warn');
            // Continuer même si la vérification échoue
          }
          
          this.log(`PDF récupéré avec succès depuis ${url}`);
          return { cid, blob: pdfBlob, url };
          
        } catch (error) {
          // Annuler le timer de timeout en cas d'erreur
          if (timeoutTimer && timeoutTimer.unref) timeoutTimer.unref();
          
          lastError = error;
          this.log(`Échec de la passerelle ${gateway}: ${error.message}`, 'warn');
        }
      }
      
      // Si les passerelles directes échouent, essayer via proxys CORS
      this.log('Tentative de récupération via proxys CORS...', 'info');
      for (const corsProxy of corsProxies) {
        for (const gateway of allGateways.slice(0, 3)) { // Limiter aux 3 premières passerelles pour les proxys
          try {
            const baseUrl = `${gateway}${cid}`;
            const url = corsProxy(baseUrl);
            this.log(`Tentative avec proxy CORS: ${url}`);
            
            // Créer la promesse de timeout avec suivi de progression
            timeoutTimer = createTimeoutPromise(this.DEFAULT_TIMEOUT, onProgressUpdate);
            
            const fetchPromise = fetch(url, {
              signal: controller.signal,
              headers: { 
                'Accept': 'application/pdf,application/octet-stream',
                'Cache-Control': 'no-cache'
              }
            });

            const response = await Promise.race([fetchPromise, timeoutTimer]);
            
            // Annuler le timer de timeout si la réponse arrive à temps
            if (timeoutTimer && timeoutTimer.unref) timeoutTimer.unref();

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const pdfBlob = await response.blob();
            
            // Signal 100% de progression
            onProgressUpdate(100);
            
            // Tenter la vérification d'intégrité
            try {
              const isVerified = await this.verifyIpfsIntegrity(pdfBlob, cid);
              if (isVerified) {
                this.log(`Intégrité du PDF vérifiée avec succès pour ${cid}`, 'info');
              }
            } catch (verifyError) {
              this.log(`Avertissement: Impossible de vérifier l'intégrité: ${verifyError.message}`, 'warn');
              // Continuer même si la vérification échoue
            }
            
            this.log(`PDF récupéré avec succès via proxy CORS depuis ${baseUrl}`);
            return { cid, blob: pdfBlob, url: baseUrl };
            
          } catch (error) {
            // Annuler le timer de timeout en cas d'erreur
            if (timeoutTimer && timeoutTimer.unref) timeoutTimer.unref();
            
            lastError = error;
            this.log(`Échec du proxy CORS: ${error.message}`, 'warn');
          }
        }
      }
      
      // Si on arrive ici, c'est que toutes les tentatives ont échoué
      throw new Error(`Toutes les passerelles ont échoué : ${lastError?.message}`);

    } finally {
      // Nettoyer les timers et contrôleurs
      if (timeoutTimer && timeoutTimer.unref) timeoutTimer.unref();
      controller.abort(); // Annuler toutes les requêtes en cours
    }
  }

  // Vérification d'intégrité avancée avec CID
  async verifyIpfsIntegrity(blob, expectedCid) {
    try {
      // Importer dynamiquement ipfs-only-hash
      let ipfsHash;
      try {
        ipfsHash = await import('ipfs-only-hash');
      } catch (e) {
        // Si le module n'est pas disponible, on installe le script dynamiquement
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/ipfs-only-hash/dist/index.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Échec du chargement de ipfs-only-hash"));
          document.head.appendChild(script);
        });
        
        // Utiliser la version globale
        ipfsHash = window.IpfsOnlyHash;
      }
      
      if (!ipfsHash || !ipfsHash.create) {
        throw new Error("Module de hachage IPFS non disponible");
      }
      
      // Calculer le hash réel du fichier
      const buffer = await blob.arrayBuffer();
      const actualCid = await ipfsHash.create(new Uint8Array(buffer));
      
      // Comparer avec le CID attendu
      if (actualCid !== expectedCid) {
        this.log(`Intégrité compromise! Reçu: ${actualCid}, Attendu: ${expectedCid}`, 'error');
        throw new Error(`Intégrité compromise! Reçu: ${actualCid}, Attendu: ${expectedCid}`);
      }
      
      return true;
    } catch (error) {
      this.log(`Erreur lors de la vérification d'intégrité: ${error.message}`, 'error');
      throw error;
    }
  }

  // Déclencher le téléchargement côté client
  triggerDownload(blob, filename = 'document.pdf') {
    this.log(`Déclenchement du téléchargement pour ${filename}`);
    
    if (!blob) {
      throw new Error('Blob invalide pour le téléchargement');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    
    // Nettoyage asynchrone pour éviter les fuites mémoire
    requestAnimationFrame(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
    
    return true;
  }

  // Nouvelle méthode optimisée pour le téléchargement de PDF
  async downloadPDF(ipfsHash, fileName = 'document.pdf') {
    console.log("Début du téléchargement PDF pour le hash:", ipfsHash);
    
    if (!ipfsHash) {
      const error = new Error("Hash IPFS manquant pour le téléchargement");
      this.log(error.message, 'error');
      throw error;
    }
    
    // Enlever le préfixe 'ipfs://' s'il existe
    if (ipfsHash.startsWith('ipfs://')) {
      ipfsHash = ipfsHash.substring(7);
      this.log(`Préfixe 'ipfs://' supprimé, nouveau hash: ${ipfsHash}`);
    }
    
    // Si le hash n'est pas valide selon notre validation, on essaie quand même mais on le log
    if (!this.isValidCid(ipfsHash)) {
      console.warn(`Le hash IPFS ${ipfsHash} ne semble pas être un CID valide, mais on essaie quand même`);
    }
    
    this.log(`Tentative de téléchargement du PDF: ${ipfsHash}`);
    
    try {
      // Utiliser la nouvelle fonction de téléchargement optimisée
      const result = await this.downloadPdfFromIPFS(ipfsHash);
      
      if (!result || !result.blob) {
        throw new Error("Échec de récupération du fichier PDF");
      }
      
      // Tenter de vérifier l'intégrité du fichier, mais ne pas bloquer le téléchargement si ça échoue
      let integrityVerified = false;
      try {
        integrityVerified = await this.verifyIpfsIntegrity(result.blob, ipfsHash);
        this.log(`Vérification d'intégrité: ${integrityVerified ? 'Réussie ✓' : 'Échouée ✗'}`);
      } catch (integrityError) {
        // Log l'erreur mais continuer quand même
        this.log(`Avertissement: Échec de vérification d'intégrité: ${integrityError.message}`, 'warn');
        console.warn("Échec de vérification d'intégrité:", integrityError);
      }
      
      // Déclencher le téléchargement avec la fonction optimisée
      const downloadSucceeded = this.triggerDownload(result.blob, fileName);
      
      if (!downloadSucceeded) {
        throw new Error("Échec lors du déclenchement du téléchargement");
      }
      
      this.log(`Téléchargement du PDF initié avec succès depuis: ${result.url}`);
      
      return {
        success: true,
        message: "Téléchargement initié avec succès",
        url: result.url,
        verified: integrityVerified,
        source: "ipfs_direct_download",
        fileName: fileName
      };
      
    } catch (error) {
      this.log(`Erreur lors du téléchargement du PDF ${ipfsHash}: ${error.message}`, 'error');
      console.error("Erreur détaillée:", error);
      
      // Créer un objet d'erreur enrichi avec des métadonnées
      const enhancedError = new Error(`Téléchargement échoué: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.ipfsHash = ipfsHash;
      enhancedError.fileName = fileName;
      enhancedError.gateways = this.IPFS_GATEWAYS;
      
      // Liste de toutes les passerelles disponibles (pour utilisation en cas d'échec)
      enhancedError.alternativeUrls = this.IPFS_GATEWAYS.map(gateway => `${gateway}${ipfsHash}`);
      
      throw enhancedError;
    }
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
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://ipfs.infura-ipfs.io/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://nftstorage.link/ipfs/${ipfsHash}`,
      // Passerelles Cloudflare et autres
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://dweb.link/ipfs/${ipfsHash}`,
      `https://ipfs.eth.aragon.network/ipfs/${ipfsHash}`
    ];
    
    // Pour les téléchargements de fichiers, privilégier les passerelles les plus stables
    return gateways[0]; // Renvoyer la passerelle la plus fiable
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