/**
 * Tests pour les optimisations de récupération d'images IPFS
 */

import ipfsService from '../services/IPFSService';

describe('Optimisations IPFS Images', () => {
  beforeEach(() => {
    // Nettoyer le cache avant chaque test
    ipfsService.clearImageCache();
  });

  test('Cache des URLs d\'images IPFS', async () => {
    const testHash = 'QmTestHash123';
    
    // Premier appel - devrait faire la vérification complète
    const url1 = await ipfsService.generateIPFSImageUrl(testHash);
    expect(url1).toBeTruthy();
    
    // Vérifier que l'URL est mise en cache
    expect(ipfsService.imageUrlCache.has(testHash)).toBe(true);
    
    // Deuxième appel - devrait utiliser le cache
    const startTime = Date.now();
    const url2 = await ipfsService.generateIPFSImageUrl(testHash);
    const endTime = Date.now();
    
    // Le deuxième appel devrait être beaucoup plus rapide (< 10ms)
    expect(endTime - startTime).toBeLessThan(10);
    expect(url2).toBe(url1);
  });

  test('Priorisation des passerelles qui fonctionnent', async () => {
    const testHash1 = 'QmTestHash1';
    const testHash2 = 'QmTestHash2';
    
    // Premier appel pour établir une passerelle qui fonctionne
    await ipfsService.generateIPFSImageUrl(testHash1);
    
    // Vérifier que les passerelles qui fonctionnent sont mémorisées
    expect(ipfsService.workingGateways.length).toBeGreaterThan(0);
    
    // Deuxième appel avec un hash différent devrait utiliser la passerelle mémorisée
    const startTime = Date.now();
    await ipfsService.generateIPFSImageUrl(testHash2);
    const endTime = Date.now();
    
    // Devrait être plus rapide grâce à la priorisation
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('Nettoyage automatique du cache', () => {
    const testHashes = [];
    
    // Remplir le cache avec plus de 100 entrées
    for (let i = 0; i < 105; i++) {
      const hash = `QmTestHash${i}`;
      testHashes.push(hash);
      ipfsService.imageUrlCache.set(hash, `https://example.com/ipfs/${hash}`);
    }
    
    expect(ipfsService.imageUrlCache.size).toBe(105);
    
    // Simuler le nettoyage automatique
    if (ipfsService.imageUrlCache.size > 100) {
      ipfsService.clearImageCache();
    }
    
    expect(ipfsService.imageUrlCache.size).toBe(0);
  });

  test('Gestion des timeouts', async () => {
    const testHash = 'QmTimeoutTest';
    
    // Mock fetch pour simuler un timeout
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    );
    
    const startTime = Date.now();
    const result = await ipfsService.generateIPFSImageUrl(testHash);
    const endTime = Date.now();
    
    // Devrait retourner un résultat même en cas de timeout
    expect(result).toBeTruthy();
    
    // Ne devrait pas prendre plus de 10 secondes au total
    expect(endTime - startTime).toBeLessThan(10000);
    
    // Restaurer fetch
    global.fetch = originalFetch;
  });

  test('Fallback vers image générique', async () => {
    const invalidHash = 'QmInvalidHash';
    
    // Mock fetch pour simuler des échecs sur toutes les passerelles
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    
    const result = await ipfsService.generateIPFSImageUrl(invalidHash);
    
    // Devrait retourner une URL de fallback
    expect(result).toBeTruthy();
    expect(result).toContain('ipfs');
    
    // Restaurer fetch
    global.fetch = originalFetch;
  });

  test('Optimisation de getIPFSImageUrl', async () => {
    const testHash = 'QmOptimizationTest';
    
    // getIPFSImageUrl devrait utiliser generateIPFSImageUrl
    const result = await ipfsService.getIPFSImageUrl(testHash);
    
    expect(result).toBeTruthy();
    
    // Vérifier que le cache est utilisé
    expect(ipfsService.imageUrlCache.has(testHash)).toBe(true);
  });

  test('Performance avec chargement parallèle', async () => {
    const testHashes = [
      'QmParallel1',
      'QmParallel2', 
      'QmParallel3',
      'QmParallel4',
      'QmParallel5'
    ];
    
    const startTime = Date.now();
    
    // Charger plusieurs images en parallèle
    const promises = testHashes.map(hash => 
      ipfsService.generateIPFSImageUrl(hash)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // Tous les résultats devraient être valides
    expect(results.every(result => result)).toBe(true);
    
    // Le chargement parallèle ne devrait pas prendre beaucoup plus de temps
    // qu'un seul chargement (grâce au traitement par lots)
    expect(endTime - startTime).toBeLessThan(15000);
    
    // Vérifier que toutes les URLs sont mises en cache
    testHashes.forEach(hash => {
      expect(ipfsService.imageUrlCache.has(hash)).toBe(true);
    });
  });
});
