import { create } from 'ipfs-http-client';

class IPFSService {
  constructor() {
    // تكوين وكيل IPFS - يستخدم Infura بشكل افتراضي
    // اعد تكوينه لاستخدام خدمة IPFS الخاصة بك إذا لزم الأمر
    this.ipfs = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      // استخدم Infura كمزود IPFS افتراضي
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
      console.error('فشل في تهيئة IPFS:', error);
      return false;
    }
  }

  // تحميل ملف إلى IPFS
  async uploadFile(file) {
    if (!this.initialized) await this.initialize();
    
    try {
      const added = await this.ipfs.add(file, {
        progress: (prog) => console.log(`تم تحميل: ${prog}`)
      });
      
      // إرجاع هاش IPFS للملف المحمل
      return added.path;
    } catch (error) {
      console.error('خطأ في تحميل الملف إلى IPFS:', error);
      throw error;
    }
  }

  // تحميل بيانات الكتاب (البيانات الوصفية والصورة) إلى IPFS
  async uploadBookData(bookData, coverImage) {
    if (!this.initialized) await this.initialize();
    
    try {
      // تحميل صورة الغلاف أولاً
      let coverHash = null;
      if (coverImage) {
        coverHash = await this.uploadFile(coverImage);
      }
      
      // إضافة هاش صورة الغلاف إلى بيانات الكتاب
      const bookMetadata = {
        ...bookData,
        coverImageHash: coverHash,
        dateAdded: new Date().toISOString()
      };
      
      // تحويل بيانات الكتاب إلى JSON وتحميلها إلى IPFS
      const jsonData = JSON.stringify(bookMetadata);
      const added = await this.ipfs.add(jsonData);
      
      return {
        metadataHash: added.path,
        coverHash: coverHash
      };
    } catch (error) {
      console.error('خطأ في تحميل بيانات الكتاب إلى IPFS:', error);
      throw error;
    }
  }

  // استرجاع ملف من IPFS بواسطة الهاش
  async getFile(ipfsHash) {
    if (!this.initialized) await this.initialize();
    
    try {
      const data = [];
      
      // استخدام cat لاسترجاع الملف
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        data.push(chunk);
      }
      
      return Buffer.concat(data);
    } catch (error) {
      console.error(`خطأ في استرجاع الملف من IPFS (${ipfsHash}):`, error);
      throw error;
    }
  }

  // الحصول على رابط IPFS Gateway للوصول إلى الملف
  getIPFSGatewayURL(ipfsHash) {
    // استخدام بوابة Infura IPFS
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }
}

// نسخة واحدة من الخدمة
const ipfsService = new IPFSService();
export default ipfsService; 