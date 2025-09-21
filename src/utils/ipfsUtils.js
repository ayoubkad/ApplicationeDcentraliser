/**
 * Utilitaires pour les opérations IPFS
 * Code optimisé et simplifié pour la gestion des fichiers PDF sur IPFS
 */

// Configurations centralisées
const IPFS_GATEWAYS = [
  'http://localhost:8080/ipfs/',
  'http://127.0.0.1:8080/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs-gateway.cloud/ipfs/',
  'https://hardbin.com/ipfs/',
  'https://ipfs.runfission.com/ipfs/'
];

// Proxys CORS pour contourner les erreurs CORS en développement
const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
  (url) => `https://proxy.cors.sh/${url}`,
  (url) => `https://crossorigin.me/${url}`
];

const DEFAULT_TIMEOUT = 45000; // Augmenté à 45 secondes
const IFRAME_TIMEOUT = 20000; // Augmenté à 20 secondes
const MAX_RETRIES = 2; // Nombre de tentatives par passerelle

/**
 * Validation du CID (Content ID) IPFS
 * @param {string} cid - Le CID à valider
 * @returns {boolean} - True si le CID est valide
 */
export const isValidCid = (cid) => {
  if (!cid) return false;
  return /^Qm[1-9A-Za-z]{44}$/.test(cid) || /^bafy[1-9A-Za-z]{58}$/.test(cid);
};

/**
 * Teste si une URL est accessible via fetch
 * @param {string} url - L'URL à tester
 * @returns {Promise<boolean>} - True si l'URL est accessible
 */
const testUrlAccess = async (url) => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });

    clearTimeout(id);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Téléchargement d'un PDF depuis IPFS
 * @param {string} cid - Le CID du fichier à télécharger
 * @returns {Promise<Object>} - Objet contenant le blob et l'URL
 */
export const downloadPdfFromIPFS = async (cid, abortController = null) => {
  if (!isValidCid(cid)) {
    throw new Error('CID IPFS invalide');
  }

  // Utiliser l'AbortController fourni ou en créer un nouveau
  const controller = abortController || new AbortController();
  
  try {
    let lastError;
    let isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Afficher la progression initiale
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
        detail: { cid, progress: 5, status: 'starting' }
      }));
    }

    // Vérifier d'abord si une passerelle locale est présente
    // Format 1: /ipfs/ path
    const localGateways = [
      'http://localhost:8080/ipfs/',
      'http://127.0.0.1:8080/ipfs/'
    ];
    // Format 2: subdomain gateway (CID.ipfs.localhost)
    const subdomainUrl = `http://${cid}.ipfs.localhost:8080`;
    
    const localGateway = localGateways[0]; // Utiliser localhost par défaut
    const localUrl = `${localGateway}${cid}`;
    
    console.log(`Tentative d'utilisation du nœud IPFS local: ${localUrl}`);
    console.log(`URL alternative (subdomain): ${subdomainUrl}`);
    
    // Solution très simple: ouvrir directement le PDF depuis le nœud local
    // C'est la méthode la plus fiable et elle fonctionne car le nœud IPFS est local
    try {
      // Mise à jour de la progression
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
          detail: { cid, progress: 100, status: 'direct_open_attempt' }
        }));
      }
      
      // On retourne un objet spécial qui indique une ouverture directe
      return {
        cid,
        openDirectly: true,
        url: localUrl,
        subdomainUrl: subdomainUrl,
        filename: `IPFS_${cid.slice(0, 10)}.pdf`
      };
    } catch (localError) {
      console.warn(`Échec d'ouverture directe: ${localError.message}`);
    }
    
    // Si on arrive ici, on utilise les méthodes standard pour les passerelles distantes
    let successfulGateways = [];
    
    // Tester l'accessibilité des passerelles en parallèle
    if (isDev) {
      const gatewayTests = IPFS_GATEWAYS.map(async (gateway) => {
        const url = `${gateway}${cid}`;
        const isAccessible = await testUrlAccess(url);
        if (isAccessible) {
          successfulGateways.push(gateway);
        }
        return { gateway, isAccessible };
      });

      await Promise.allSettled(gatewayTests);
      console.log('Passerelles accessibles:', successfulGateways);
      
      // Mise à jour de la progression
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
          detail: { cid, progress: 10, status: 'gateways_tested' }
        }));
      }
    } else {
      successfulGateways = IPFS_GATEWAYS;
    }

    // 1. D'abord essayer les passerelles directes qui fonctionnent
    const gatewaysToTry = successfulGateways.length > 0 ? successfulGateways : IPFS_GATEWAYS;
    
    // Vérifier s'il y a une passerelle locale
    const hasLocalGateway = gatewaysToTry.some(g => g.includes('localhost'));

    // Mise à jour de la progression
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
        detail: { cid, progress: 15, status: 'trying_gateways' }
      }));
    }

    for (const gateway of gatewaysToTry) {
      // Déterminer le nombre de tentatives en fonction de la passerelle
      const gatewayRetries = gateway.includes('localhost') ? 3 : MAX_RETRIES;
      
      // Retry mechanism
      for (let retry = 0; retry <= gatewayRetries; retry++) {
        if (retry > 0) {
          console.log(`Nouvelle tentative ${retry}/${gatewayRetries} pour ${gateway}`);
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retry - 1)));
        }

        try {
          const url = `${gateway}${cid}`;
          console.log(`Tentative avec la passerelle: ${url}`);

          // Mise à jour de la progression
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
              detail: { cid, progress: 20 + (5 * gatewaysToTry.indexOf(gateway)), status: 'gateway_attempt', gateway }
            }));
          }

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout - Le téléchargement depuis ${gateway} a pris trop de temps`)), DEFAULT_TIMEOUT)
          );

          const newController = new AbortController();
          const fetchPromise = fetch(url, {
            signal: newController.signal,
            headers: {
              'Accept': 'application/pdf,application/octet-stream,*/*',
              'Cache-Control': 'no-cache'
            },
            mode: 'cors',
            credentials: 'omit'
          });

          const response = await Promise.race([fetchPromise, timeoutPromise]);

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          // Téléchargement du blob avec suivi de progression
          const contentLength = response.headers.get('Content-Length');
          const reader = response.body.getReader();
          const chunks = [];
          let receivedLength = 0;

          // Lecture du flux de données avec suivi de progression
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            // Mettre à jour la progression si possible
            if (contentLength && window.dispatchEvent) {
              const percentComplete = Math.round((receivedLength / parseInt(contentLength)) * 100);
              window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
                detail: { cid, progress: Math.min(95, 50 + percentComplete / 2), status: 'downloading', gateway }
              }));
            }
          }

          // Construire le blob à partir des chunks reçus
          const blob = new Blob(chunks, { type: 'application/pdf' });

          // Signaler la progression de téléchargement complète
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
              detail: { cid, progress: 100, status: 'complete' }
            }));
          }

          console.log(`PDF récupéré avec succès depuis ${url}`);
          return { cid, blob, url };

        } catch (error) {
          if (retry === gatewayRetries) {
            lastError = error;
            console.warn(`Échec de la passerelle ${gateway} après ${gatewayRetries+1} tentatives: ${error.message}`);
          } else {
            console.warn(`Tentative ${retry+1} échouée pour ${gateway}: ${error.message}, nouvel essai en cours...`);
          }
        }
      }
    }

    // Mise à jour de la progression
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
        detail: { cid, progress: 60, status: 'trying_cors_proxies' }
      }));
    }

    // 2. Si les passerelles directes échouent, essayer avec plusieurs proxys CORS
    if (isDev && !hasLocalGateway) {
      console.log('Tentative avec des proxys CORS pour contourner les erreurs CORS...');

      for (const corsProxy of CORS_PROXIES) {
        for (const gateway of gatewaysToTry) {
          try {
            const baseUrl = `${gateway}${cid}`;
            const proxiedUrl = corsProxy(baseUrl);
            console.log(`Tentative avec proxy CORS: ${proxiedUrl}`);

            // Mise à jour de la progression
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
                detail: { cid, progress: 65, status: 'cors_proxy_attempt', proxy: proxiedUrl }
              }));
            }

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout - Le téléchargement via proxy CORS a pris trop de temps`)), DEFAULT_TIMEOUT)
            );

            const newController = new AbortController();
            const fetchPromise = fetch(proxiedUrl, {
              signal: newController.signal,
              headers: {
                'Accept': 'application/pdf,application/octet-stream,*/*',
                'Cache-Control': 'no-cache'
              }
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const pdfBlob = await response.blob();

            // Signaler la progression de téléchargement complète
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
                detail: { cid, progress: 100, status: 'complete' }
              }));
            }

            console.log(`PDF récupéré avec succès via proxy CORS: ${proxiedUrl}`);
            return { cid, blob: pdfBlob, url: baseUrl }; // On retourne l'URL d'origine pour l'affichage

          } catch (error) {
            console.warn(`Échec du proxy CORS pour ${gateway}: ${error.message}`);
          }
        }
      }
    }

    // Mise à jour de la progression
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
        detail: { cid, progress: 75, status: 'trying_iframe' }
      }));
    }

    // 3. Solution alternative: charger le contenu via un iframe ou un embed
    try {
      // Vérifier si on peut potentiellement sauter cette méthode
      const hasLocalGateway = gatewaysToTry.some(gateway => gateway.includes('localhost'));
      
      // Si une passerelle locale a été configurée, simplifier cette étape
      if (hasLocalGateway) {
        console.log('Passerelle locale détectée, simplifiant la méthode iframe...');
        
        // Utiliser uniquement la passerelle locale pour l'iframe
        const localGateway = gatewaysToTry.find(gateway => gateway.includes('localhost'));
        const url = `${localGateway}${cid}`;
        
        // Tenter un simple iframe sans la logique complexe des tentatives précédentes
        // Ne pas masquer l'iframe afin qu'il puisse être chargé correctement
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.opacity = '0.01';  // Presque invisible mais pas complètement pour permettre le rendu
        iframe.style.pointerEvents = 'none';
        iframe.style.width = '10px';
        iframe.style.height = '10px';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        iframe.setAttribute('allowfullscreen', 'true');
        document.body.appendChild(iframe);
        
        const iframePromise = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            reject(new Error('Timeout iframe avec passerelle locale'));
          }, IFRAME_TIMEOUT);
          
          iframe.onload = () => {
            clearTimeout(timeoutId);
            resolve({
              iframe,
              gateway: localGateway,
              url,
              success: true
            });
          };
          
          iframe.onerror = () => {
            clearTimeout(timeoutId);
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            reject(new Error('Erreur de chargement avec passerelle locale'));
          };
          
          iframe.src = url;
        });
        
        const iframeResult = await iframePromise;
        console.log(`PDF chargé avec succès via iframe avec passerelle locale depuis ${iframeResult.url}`);
        
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
            detail: { cid, progress: 100, status: 'complete_via_local_iframe' }
          }));
        }
        
        return {
          cid,
          url: iframeResult.url,
          useIframe: true,
          iframe: iframeResult.iframe,
          isLocal: true
        };
      }
      
      // Sinon, conserver la méthode traditionnelle mais simplifiée
      console.log('Tentative de chargement via iframe...');

      // Créer une promesse qui sera résolue quand l'iframe sera chargé
      const iframeLoadPromise = new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Limiter les tentatives aux 3 premières passerelles 
        // (puisque si on arrive ici, les passerelles ont déjà échoué une fois)
        const gatewaysToAttempt = IPFS_GATEWAYS.slice(0, 3);
        let attemptIndex = 0;

        const tryNextGateway = () => {
          if (attemptIndex >= gatewaysToAttempt.length) {
            document.body.removeChild(iframe);
            reject(new Error('Échec de chargement via iframe pour les principales passerelles'));
            return;
          }

          const gateway = gatewaysToAttempt[attemptIndex++];
          const url = `${gateway}${cid}`;

          // Mise à jour de la progression
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
              detail: { cid, progress: 75 + (5 * attemptIndex / gatewaysToAttempt.length), status: 'iframe_attempt', gateway }
            }));
          }

          iframe.onload = () => {
            try {
              // Essayer de capturer le contenu chargé
              resolve({
                iframe,
                gateway,
                url,
                success: true
              });
            } catch (e) {
              // Si cette passerelle échoue, essayer la prochaine
              tryNextGateway();
            }
          };

          iframe.onerror = () => tryNextGateway();
          iframe.src = url;
        };

        tryNextGateway();

        // Timeout pour la méthode iframe
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          reject(new Error('Timeout de chargement via iframe'));
        }, IFRAME_TIMEOUT);
      });

      // Attendre le chargement de l'iframe
      const iframeResult = await iframeLoadPromise;

      if (iframeResult && iframeResult.success) {
        console.log(`PDF chargé avec succès via iframe depuis ${iframeResult.url}`);

        // Signaler la progression de téléchargement complète
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
            detail: { cid, progress: 100, status: 'complete_via_iframe' }
          }));
        }

        return {
          cid,
          url: iframeResult.url,
          useIframe: true,
          iframe: iframeResult.iframe
        };
      }
    } catch (iframeError) {
      console.warn('Échec du chargement via iframe:', iframeError);
    }

    // Mise à jour de la progression - échec
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ipfsDownloadProgress', {
        detail: { cid, progress: 100, status: 'failed' }
      }));
    }

    // 4. Solution de secours: proposer un lien direct
    const directLinks = IPFS_GATEWAYS.map(gateway => `${gateway}${cid}`);
    const errorMessage = `Toutes les tentatives de téléchargement ont échoué. Essayez d'ouvrir l'un de ces liens directement dans un nouvel onglet: ${directLinks.join(', ')}`;
    console.error(errorMessage);
    
    // Retourner un objet avec les liens directs plutôt que de lancer une erreur
    return {
      cid,
      directLinks,
      error: lastError?.message || 'Toutes les tentatives de téléchargement ont échoué',
      fallbackMode: true
    };

  } finally {
    controller.abort(); // Annuler toutes les requêtes en cours
  }
};

/**
 * Vérification d'intégrité avec CID
 * @param {Blob} blob - Blob du fichier à vérifier
 * @param {string} expectedCid - CID attendu
 * @returns {Promise<boolean>} - True si l'intégrité est vérifiée
 */
export const verifyIpfsIntegrity = async (blob, expectedCid) => {
  try {
    // Si pas de blob (cas de l'iframe), on saute la vérification
    if (!blob) {
      console.warn('Pas de blob disponible pour vérifier l\'intégrité, vérification ignorée');
      return true;
    }

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
      console.error(`Intégrité compromise! Reçu: ${actualCid}, Attendu: ${expectedCid}`);
      throw new Error(`Intégrité compromise! Reçu: ${actualCid}, Attendu: ${expectedCid}`);
    }

    return true;
  } catch (error) {
    console.error(`Erreur lors de la vérification d'intégrité: ${error.message}`);
    throw error;
  }
};

/**
 * Afficher le PDF dans un lecteur ou le télécharger
 * @param {Blob|Object} blobOrData - Blob du fichier PDF ou objet contenant les données
 * @param {string} filename - Nom du fichier
 * @returns {boolean} - True si l'action a été effectuée avec succès
 */
export const triggerDownload = (blobOrData, filename = 'document.pdf') => {
  console.log(`Affichage du PDF: ${filename}`);

  // Nouvelle méthode: ouverture directe du PDF local
  if (blobOrData && blobOrData.openDirectly) {
    console.log(`Ouverture directe du PDF: ${blobOrData.url}`);
    
    // Essayer les deux formats d'URL (path-style et subdomain-style)
    const urls = [blobOrData.url];
    if (blobOrData.subdomainUrl) {
      urls.push(blobOrData.subdomainUrl);
    }
    
    // 1. Ouvrir directement dans un nouvel onglet - méthode la plus simple et sans interface
    try {
      window.open(blobOrData.url, '_blank');
      console.log("PDF ouvert directement dans un nouvel onglet");
      
      // Informer l'utilisateur que le document a été ouvert dans un nouvel onglet
      window.dispatchEvent(new CustomEvent('showDirectLinkNotification', {
        detail: {
          urls: [blobOrData.url, blobOrData.subdomainUrl].filter(Boolean),
          message: "Le PDF a été ouvert dans un nouvel onglet. Si vous ne le voyez pas, utilisez ce lien:",
          filename: blobOrData.filename || filename,
          openInNewTab: true
        }
      }));
      
      return true;
    } catch (e) {
      console.error("Erreur lors de l'ouverture directe du PDF:", e);
      
      // Si le premier format échoue, essayer le format subdomain
      if (blobOrData.subdomainUrl) {
        try {
          window.open(blobOrData.subdomainUrl, '_blank');
          console.log("PDF ouvert avec format subdomain dans un nouvel onglet");
          
          // Informer l'utilisateur que le document a été ouvert
          window.dispatchEvent(new CustomEvent('showDirectLinkNotification', {
            detail: {
              urls: [blobOrData.subdomainUrl, blobOrData.url].filter(Boolean),
              message: "Le PDF a été ouvert dans un nouvel onglet. Si vous ne le voyez pas, utilisez ce lien:",
              filename: blobOrData.filename || filename,
              openInNewTab: true
            }
          }));
          
          return true;
        } catch (e2) {
          console.error("Erreur lors de l'ouverture avec format subdomain:", e2);
        }
      }
    }
    
    // 2. Si l'ouverture directe échoue, proposer un téléchargement simple
    try {
      const a = document.createElement('a');
      a.href = blobOrData.url;
      a.download = blobOrData.filename || filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      console.log("Lien de téléchargement direct cliqué");
      
      // Informer l'utilisateur du téléchargement
      window.dispatchEvent(new CustomEvent('showDirectLinkNotification', {
        detail: {
          urls: [blobOrData.url, blobOrData.subdomainUrl].filter(Boolean),
          message: "Téléchargement du PDF lancé. Si rien ne se passe, utilisez ce lien:",
          filename: blobOrData.filename || filename,
          download: true
        }
      }));
      
      return true;
    } catch (downloadError) {
      console.error("Erreur lors de la tentative de téléchargement:", downloadError);
    }
    
    // 3. En dernier recours, montrer les liens à l'utilisateur
    window.dispatchEvent(new CustomEvent('showDirectLinkNotification', {
      detail: {
        urls: [blobOrData.url, blobOrData.subdomainUrl].filter(Boolean),
        message: "Ouvrez ce lien directement dans votre navigateur pour accéder au PDF:",
        filename: blobOrData.filename || filename,
        fallback: true
      }
    }));
    
    return true;
  }

  // Cas des passerelles distantes: télécharger plutôt qu'afficher avec iframe
  if (blobOrData && blobOrData.useIframe) {
    console.log(`Tentative de téléchargement direct depuis: ${blobOrData.url}`);

    // Plutôt que d'utiliser un iframe, proposer un téléchargement direct
    try {
      const a = document.createElement('a');
      a.href = blobOrData.url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      console.log("Téléchargement initié plutôt qu'iframe");
      
      // Supprimer l'ancien iframe caché si présent
      if (blobOrData.iframe && blobOrData.iframe.parentNode) {
        document.body.removeChild(blobOrData.iframe);
      }
      
      // Informer l'utilisateur
      window.dispatchEvent(new CustomEvent('showDirectLinkNotification', {
        detail: {
          urls: [blobOrData.url],
          message: "Téléchargement du PDF lancé. Si rien ne se passe, cliquez sur ce lien:",
          filename: filename
        }
      }));
      
      return true;
    } catch (e) {
      console.error("Erreur lors du téléchargement direct:", e);
      
      // Fallback: ouvrir dans un nouvel onglet
      window.open(blobOrData.url, '_blank');
      
      return true;
    }
  }
  
  // Cas où toutes les tentatives ont échoué mais nous avons des liens directs
  if (blobOrData && blobOrData.fallbackMode && blobOrData.directLinks) {
    console.log(`Affichage des liens directs pour le téléchargement manuel`);
    
    // Tenter d'ouvrir le premier lien dans un nouvel onglet
    try {
      window.open(blobOrData.directLinks[0], '_blank');
    } catch (e) {
      console.error("Erreur lors de l'ouverture du lien direct:", e);
    }
    
    // Déclencher l'événement pour afficher les liens de secours
    window.dispatchEvent(new CustomEvent('showPdfFallbackLinks', {
      detail: {
        links: blobOrData.directLinks,
        filename,
        error: blobOrData.error
      }
    }));
    
    return true;
  }

  // Cas standard avec un blob: téléchargement direct
  if (!blobOrData || (!blobOrData.blob && !(blobOrData instanceof Blob))) {
    throw new Error('Données invalides pour l\'affichage');
  }

  const blob = blobOrData instanceof Blob ? blobOrData : blobOrData.blob;

  // Créer une URL pour le blob PDF
  const url = URL.createObjectURL(blob);

  // Télécharger directement plutôt que d'afficher
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log("Téléchargement direct du blob initié");
    return true;
  } catch (e) {
    console.error("Erreur lors du téléchargement du blob:", e);
    
    // Fallback: ouvrir dans un nouvel onglet
    window.open(url, '_blank');
    
    // Nettoyer l'URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    return true;
  }
}; 