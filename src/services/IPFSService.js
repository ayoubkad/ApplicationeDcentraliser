import { create } from 'ipfs-http-client';

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.initialized = false;

    // Configuration par défaut pour votre nœud IPFS
    this.config = {
      useRemoteNode: false, // false للاتصال المحلي، true للاتصال الخارجي
      remoteNode: {
        ipfsHost: '41.249.228.140', // العنوان العام لعقدتك
        ipfsPort: 5001,
        ipfsProtocol: 'http',
        ipfsGateway: 'http://41.249.228.140:8080',
        auth: {
          username: null, // أضف اسم المستخدم إذا كنت تستخدم التوثيق
          password: null  // أضف كلمة المرور إذا كنت تستخدم التوثيق
        }
      },
      localNode: {
        ipfsHost: '127.0.0.1', // العقدة المحلية
        ipfsPort: 5001,
        ipfsProtocol: 'http',
        ipfsGateway: 'http://127.0.0.1:8080',
        auth: {
          username: null,
          password: null
        }
      },
      peerID: '12D3KooWMhC55WnFvTdMx1Y2PaskHPuw4kXbxLmUyMYDMvL9mrqN',
      debug: true // تفعيل وضع التصحيح لتتبع الأخطاء
    };

    this.connectionStatus = {
      connected: false,
      lastCheck: null,
      error: null,
      peers: []
    };
  }

  // تحديد إعدادات العقدة بناءً على وضع الاتصال
  getCurrentConfig() {
    return this.config.useRemoteNode ? this.config.remoteNode : this.config.localNode;
  }

  // دالة لتسجيل الرسائل
  log(message, level = 'info') {
    if (this.config.debug || level === 'error') {
      const timestamp = new Date().toISOString();
      console[level](`[IPFS ${timestamp}] ${message}`);
    }
  }

  // تكوين الخدمة مع إعدادات مخصصة
  configure(customConfig = {}) {
    this.config = {
      ...this.config,
      ...customConfig
    };

    // إعادة تهيئة الاتصال لتطبيق الإعدادات الجديدة
    this.initialized = false;
    this.ipfs = null;

    return this;
  }

  // تهيئة الاتصال بـ IPFS
  async initialize() {
    if (this.initialized) return true;

    const currentConfig = this.getCurrentConfig();

    try {
      this.log(`Tentative de connexion au nœud IPFS: ${currentConfig.ipfsProtocol}://${currentConfig.ipfsHost}:${currentConfig.ipfsPort}`);

      // إعداد رؤوس التوثيق إذا كانت موجودة
      const headers = {};
      if (currentConfig.auth.username && currentConfig.auth.password) {
        const auth = btoa(`${currentConfig.auth.username}:${currentConfig.auth.password}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      // إنشاء عميل IPFS
      this.ipfs = create({
        host: currentConfig.ipfsHost,
        port: currentConfig.ipfsPort,
        protocol: currentConfig.ipfsProtocol,
        headers: headers
      });

      // التحقق من الاتصال
      const id = await this.ipfs.id();
      this.log(`Connecté au nœud IPFS avec ID: ${id.id}`);

      // التحقق من PeerID
      if (this.config.peerID && id.id !== this.config.peerID) {
        this.log(`Le PeerID du nœud (${id.id}) ne correspond pas au PeerID attendu (${this.config.peerID}).`, 'warn');
      }

      // تحديث حالة الاتصال
      this.connectionStatus = {
        connected: true,
        lastCheck: new Date(),
        error: null,
        nodeInfo: id
      };

      this.initialized = true;
      return true;
    } catch (error) {
      this.log(`Échec de l'initialisation d'IPFS: ${error.message}`, 'error');

      this.connectionStatus = {
        connected: false,
        lastCheck: new Date(),
        error: error.message,
        nodeInfo: null
      };

      return false;
    }
  }

  // التحقق من حالة الاتصال
  async checkConnection() {
    try {
      if (!this.ipfs) {
        await this.initialize();
        return this.connectionStatus;
      }

      const id = await this.ipfs.id();
      const peers = await this.ipfs.swarm.peers();

      this.connectionStatus = {
        connected: true,
        lastCheck: new Date(),
        error: null,
        nodeInfo: id,
        peers: peers.map(peer => ({
          addr: peer.addr.toString(),
          peer: peer.peer.toString()
        }))
      };

      this.log(`Connexion vérifiée, ${peers.length} pairs connectés`);
      return this.connectionStatus;
    } catch (error) {
      this.log(`Erreur lors de la vérification de la connexion: ${error.message}`, 'error');

      this.connectionStatus = {
        connected: false,
        lastCheck: new Date(),
        error: error.message,
        peers: []
      };

      return this.connectionStatus;
    }
  }

  // الحصول على إحصائيات العقدة
  async getNodeStats() {
    if (!this.initialized) await this.initialize();

    try {
      const stats = {
        nodeInfo: await this.ipfs.id(),
        bandwidth: await this.ipfs.stats.bw(),
        repoStats: await this.ipfs.stats.repo(),
        peers: (await this.ipfs.swarm.peers()).length
      };

      return stats;
    } catch (error) {
      this.log(`Erreur lors de la récupération des statistiques: ${error.message}`, 'error');
      throw error;
    }
  }

  // رفع ملف إلى IPFS
  async uploadFile(file) {
    if (!this.initialized) await this.initialize();

    try {
      const added = await this.ipfs.add(file, {
        progress: (prog) => this.log(`Téléversement: ${prog} octets`)
      });

      this.log(`Fichier téléversé avec succès: ${added.path}`);
      return added.path;
    } catch (error) {
      this.log(`Erreur lors du téléversement du fichier sur IPFS: ${error.message}`, 'error');
      throw error;
    }
  }

  // رفع بيانات كتاب إلى IPFS
  async uploadBookData(bookData, coverImage) {
    if (!this.initialized) await this.initialize();

    try {
      let coverHash = null;
      if (coverImage) {
        this.log('Téléversement de l\'image de couverture');
        coverHash = await this.uploadFile(coverImage);
      }

      const bookMetadata = {
        ...bookData,
        coverImageHash: coverHash,
        dateAdded: new Date().toISOString()
      };

      this.log('Téléversement des métadonnées du livre');
      const jsonData = JSON.stringify(bookMetadata);
      const added = await this.ipfs.add(jsonData);

      this.log(`Données du livre téléversées avec succès: ${added.path}`);
      return {
        metadataHash: added.path,
        coverHash: coverHash
      };
    } catch (error) {
      this.log(`Erreur lors du téléversement des données du livre sur IPFS: ${error.message}`, 'error');
      throw error;
    }
  }

  // استرجاع ملف من IPFS
  async getFile(ipfsHash) {
    if (!this.initialized) await this.initialize();

    try {
      this.log(`Récupération du fichier avec hash: ${ipfsHash}`);

      const data = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        data.push(chunk);
      }

      const result = Buffer.concat(data);
      this.log(`Fichier récupéré avec succès, taille: ${result.length} octets`);

      return result;
    } catch (error) {
      this.log(`Erreur lors de la récupération du fichier depuis IPFS (${ipfsHash}): ${error.message}`, 'error');
      throw error;
    }
  }

  // الحصول على رابط البوابة
  getIPFSGatewayURL(ipfsHash) {
    const currentConfig = this.getCurrentConfig();
    return `${currentConfig.ipfsGateway}/ipfs/${ipfsHash}`;
  }

  // استخدام بوابة عامة كبديل
  getPublicGatewayURL(ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  // اختبار إمكانية الوصول إلى البوابة
  async testGateway(gateway = null, timeout = 5000) {
    const currentConfig = this.getCurrentConfig();
    const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const url = gateway || currentConfig.ipfsGateway;

    try {
      this.log(`Test de la passerelle IPFS: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/ipfs/${testHash}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const success = response.ok;
      this.log(`Passerelle ${url} ${success ? 'accessible' : 'inaccessible'} (status: ${response.status})`);

      return {
        gateway: url,
        accessible: success,
        status: response.status,
        timeStamp: new Date()
      };
    } catch (error) {
      this.log(`Erreur lors du test de la passerelle ${url}: ${error.message}`, 'error');

      return {
        gateway: url,
        accessible: false,
        error: error.message,
        timeStamp: new Date()
      };
    }
  }
}

const ipfsService = new IPFSService();
export default ipfsService;