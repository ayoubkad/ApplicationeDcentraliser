import React, { useState, useEffect } from 'react';
import { Database, Layers, CreditCard, Activity, RefreshCw, Search, ChevronRight, ChevronDown, Clock, Hash, DollarSign, FileText } from 'lucide-react';
import web3Service from '../../services/Web3Service';
import PdfDownloader from '../common/PdfDownloader';
import '../../styles/tutoreel-design.css';
import '../../styles/tutoreel-application.css';

const BlockchainExplorer = () => {
  const [networkInfo, setNetworkInfo] = useState({
    id: null,
    name: '',
    blockNumber: 0,
    gasPrice: 0,
    accounts: [],
    isConnected: false
  });
  const [blocks, setBlocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [expandedTxs, setExpandedTxs] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Fonction pour charger les informations du réseau
  const loadNetworkInfo = async () => {
    try {
      setIsLoading(true);
      
      // Initialiser Web3Service si nécessaire
      if (!web3Service.initialized) {
        await web3Service.initialize(false);
      }
      
      const web3 = web3Service.web3;
      if (!web3) {
        throw new Error("Web3 n'est pas initialisé");
      }

      // Récupérer les informations du réseau
      const networkId = await web3.eth.net.getId();
      const networkName = web3Service.getNetworkName(networkId);
      const blockNumber = await web3.eth.getBlockNumber();
      const gasPrice = await web3.eth.getGasPrice();
      const accounts = await web3.eth.getAccounts();
      
      setNetworkInfo({
        id: networkId,
        name: networkName,
        blockNumber,
        gasPrice: web3.utils.fromWei(gasPrice, 'gwei'),
        accounts,
        isConnected: true
      });

      // Charger les blocs récents
      await loadRecentBlocks(blockNumber);
      
    } catch (error) {
      console.error("Erreur lors du chargement des informations du réseau:", error);
      setNetworkInfo({
        ...networkInfo,
        isConnected: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour charger les blocs récents
  const loadRecentBlocks = async (latestBlockNumber) => {
    try {
      const web3 = web3Service.web3;
      if (!web3) return;

      const blocksToFetch = 10; // Nombre de blocs à récupérer
      const blockPromises = [];
      const allTransactions = [];

      // Récupérer les 10 derniers blocs
      for (let i = 0; i < blocksToFetch && latestBlockNumber - i >= 0; i++) {
        blockPromises.push(web3.eth.getBlock(latestBlockNumber - i, true));
      }

      const fetchedBlocks = await Promise.all(blockPromises);
      
      // Extraire les transactions de tous les blocs
      fetchedBlocks.forEach(block => {
        if (block && block.transactions) {
          allTransactions.push(...block.transactions);
        }
      });

      setBlocks(fetchedBlocks);
      setTransactions(allTransactions.slice(0, 20)); // Limiter à 20 transactions pour les performances

    } catch (error) {
      console.error("Erreur lors du chargement des blocs récents:", error);
    }
  };

  // Fonction pour rechercher un bloc, une transaction ou un compte
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const web3 = web3Service.web3;
      
      // Vérifier si c'est un numéro de bloc
      if (/^\d+$/.test(searchQuery)) {
        const block = await web3.eth.getBlock(parseInt(searchQuery));
        if (block) {
          setSearchResults({ type: 'block', data: block });
          return;
        }
      }
      
      // Vérifier si c'est un hash de transaction
      if (/^0x[a-fA-F0-9]{64}$/.test(searchQuery)) {
        try {
          const tx = await web3.eth.getTransaction(searchQuery);
          if (tx) {
            setSearchResults({ type: 'transaction', data: tx });
            return;
          }
          
          // Si ce n'est pas une transaction, essayer comme un bloc
          const block = await web3.eth.getBlock(searchQuery);
          if (block) {
            setSearchResults({ type: 'block', data: block });
            return;
          }
        } catch (e) {
          console.log("Pas une transaction ou un bloc");
        }
      }
      
      // Vérifier si c'est une adresse
      if (/^0x[a-fA-F0-9]{40}$/.test(searchQuery)) {
        const balance = await web3.eth.getBalance(searchQuery);
        const txCount = await web3.eth.getTransactionCount(searchQuery);
        
        setSearchResults({
          type: 'account',
          data: {
            address: searchQuery,
            balance: web3.utils.fromWei(balance, 'ether'),
            txCount
          }
        });
        return;
      }
      
      // Aucun résultat trouvé
      setSearchResults({ type: 'notFound' });
      
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      setSearchResults({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Formater une adresse pour l'affichage
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Formater un timestamp en date lisible
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Basculer l'état d'expansion d'un bloc
  const toggleBlockExpansion = (blockNumber) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockNumber]: !prev[blockNumber]
    }));
  };

  // Basculer l'état d'expansion d'une transaction
  const toggleTxExpansion = (txHash) => {
    setExpandedTxs(prev => ({
      ...prev,
      [txHash]: !prev[txHash]
    }));
  };

  // Charger les données au chargement du composant
  useEffect(() => {
    loadNetworkInfo();
    
    // Rafraîchir les données toutes les 15 secondes
    const intervalId = setInterval(() => {
      loadNetworkInfo();
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Afficher un indicateur de chargement
  if (isLoading && !networkInfo.isConnected) {
    return (
      <div className="min-h-screen tutoreel-background flex justify-center items-center">
        <div className="tutoreel-glass p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-indigo-700 font-medium">Connexion à la blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tutoreel-background">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête avec design Tutoreel */}
        <div className="tutoreel-gradient-header p-8 mb-8 rounded-2xl">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
              <Database className="mr-3 animate-pulse" size={40} />
              Explorateur Blockchain Ganache
            </h1>
            <p className="text-lg opacity-90">
              Explorez en temps réel les données de votre blockchain Ganache locale
            </p>
          </div>
        </div>

        {/* Barre de recherche avec design Tutoreel */}
        <div className="mb-8">
          <div className="tutoreel-glass p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
              <Search className="mr-2" size={20} />
              Recherche dans la blockchain
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Rechercher par adresse, hash de transaction ou numéro de bloc"
                className="flex-grow p-4 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="tutoreel-btn tutoreel-btn-primary px-6 py-4 rounded-xl"
                onClick={handleSearch}
                disabled={isLoading}
              >
                <Search size={18} className="mr-2" />
                {isLoading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </div>
        </div>

      {/* Affichage des résultats de recherche */}
      {searchResults && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Résultats de recherche</h2>
          
          {searchResults.type === 'notFound' && (
            <div className="text-red-500">Aucun résultat trouvé pour cette recherche.</div>
          )}
          
          {searchResults.type === 'error' && (
            <div className="text-red-500">Erreur: {searchResults.message}</div>
          )}
          
          {searchResults.type === 'block' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Bloc #{searchResults.data.number}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Hash:</span> {searchResults.data.hash}</p>
                  <p><span className="font-medium">Hash parent:</span> {searchResults.data.parentHash}</p>
                  <p><span className="font-medium">Timestamp:</span> {formatTimestamp(searchResults.data.timestamp)}</p>
                </div>
                <div>
                  <p><span className="font-medium">Transactions:</span> {searchResults.data.transactions.length}</p>
                  <p><span className="font-medium">Gas utilisé:</span> {searchResults.data.gasUsed}</p>
                  <p><span className="font-medium">Mineur:</span> {formatAddress(searchResults.data.miner)}</p>
                </div>
              </div>
            </div>
          )}
          
          {searchResults.type === 'transaction' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Transaction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Hash:</span> {searchResults.data.hash}</p>
                  <p><span className="font-medium">Bloc:</span> {searchResults.data.blockNumber}</p>
                  <p><span className="font-medium">De:</span> {formatAddress(searchResults.data.from)}</p>
                  <p><span className="font-medium">À:</span> {formatAddress(searchResults.data.to)}</p>
                </div>
                <div>
                  <p><span className="font-medium">Valeur:</span> {web3Service.web3.utils.fromWei(searchResults.data.value, 'ether')} ETH</p>
                  <p><span className="font-medium">Gas:</span> {searchResults.data.gas}</p>
                  <p><span className="font-medium">Gas Price:</span> {web3Service.web3.utils.fromWei(searchResults.data.gasPrice, 'gwei')} Gwei</p>
                  <p><span className="font-medium">Nonce:</span> {searchResults.data.nonce}</p>
                </div>
              </div>
            </div>
          )}
          
          {searchResults.type === 'account' && (
            <div>
              <h3 className="text-lg font-medium mb-2">Compte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Adresse:</span> {searchResults.data.address}</p>
                  <p><span className="font-medium">Solde:</span> {searchResults.data.balance} ETH</p>
                  <p><span className="font-medium">Nombre de transactions:</span> {searchResults.data.txCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* Onglets avec design Tutoreel */}
        <div className="mb-8">
          <div className="tutoreel-glass p-2 rounded-2xl">
            <div className="flex gap-2">
              <button
                className={`tutoreel-btn flex-1 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'overview'
                    ? 'tutoreel-btn-primary'
                    : 'tutoreel-btn-secondary hover:bg-indigo-50'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                <Activity size={18} className="mr-2" /> Aperçu
              </button>
              <button
                className={`tutoreel-btn flex-1 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'blocks'
                    ? 'tutoreel-btn-primary'
                    : 'tutoreel-btn-secondary hover:bg-indigo-50'
                }`}
                onClick={() => setActiveTab('blocks')}
              >
                <Layers size={18} className="mr-2" /> Blocs
              </button>
              <button
                className={`tutoreel-btn flex-1 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'transactions'
                    ? 'tutoreel-btn-primary'
                    : 'tutoreel-btn-secondary hover:bg-indigo-50'
                }`}
                onClick={() => setActiveTab('transactions')}
              >
                <FileText size={18} className="mr-2" /> Transactions
              </button>
              <button
                className={`tutoreel-btn flex-1 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'accounts'
                    ? 'tutoreel-btn-primary'
                    : 'tutoreel-btn-secondary hover:bg-indigo-50'
                }`}
                onClick={() => setActiveTab('accounts')}
              >
                <CreditCard size={18} className="mr-2" /> Comptes
              </button>
              <button
                className={`tutoreel-btn flex-1 px-6 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === 'ipfs'
                    ? 'tutoreel-btn-primary'
                    : 'tutoreel-btn-secondary hover:bg-indigo-50'
                }`}
                onClick={() => setActiveTab('ipfs')}
              >
                <FileText size={18} className="mr-2" /> Téléchargeur IPFS
              </button>
            </div>
          </div>
        </div>

        {/* Contenu des onglets avec design Tutoreel */}
        <div className="tutoreel-glass rounded-2xl p-8">
          {/* Onglet Aperçu */}
          {activeTab === 'overview' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-indigo-800 flex items-center">
                  <Activity className="mr-3" size={28} />
                  Informations du réseau
                </h2>
                <button
                  onClick={loadNetworkInfo}
                  className="tutoreel-btn tutoreel-btn-secondary"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Actualisation...' : 'Rafraîchir'}
                </button>
              </div>

              {/* Cartes de statistiques avec dégradés animés */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="tutoreel-card-gradient-primary p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium opacity-90">Réseau</h3>
                    <Database size={24} className="opacity-80" />
                  </div>
                  <p className="text-3xl font-bold mb-1">{networkInfo.name}</p>
                  <p className="text-sm opacity-80">ID: {networkInfo.id}</p>
                </div>

                <div className="tutoreel-card-gradient-success p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium opacity-90">Dernier bloc</h3>
                    <Layers size={24} className="opacity-80" />
                  </div>
                  <p className="text-3xl font-bold mb-1">{networkInfo.blockNumber}</p>
                  <p className="text-sm opacity-80">Hauteur actuelle</p>
                </div>

                <div className="tutoreel-card-gradient-accent p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium opacity-90">Prix du Gas</h3>
                    <DollarSign size={24} className="opacity-80" />
                  </div>
                  <p className="text-3xl font-bold mb-1">{networkInfo.gasPrice} Gwei</p>
                  <p className="text-sm opacity-80">Prix moyen</p>
                </div>

                <div className="tutoreel-card-gradient-warning p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium opacity-90">Comptes</h3>
                    <CreditCard size={24} className="opacity-80" />
                  </div>
                  <p className="text-3xl font-bold mb-1">{networkInfo.accounts.length}</p>
                  <p className="text-sm opacity-80">Disponibles</p>
                </div>
              </div>

              {/* Tableaux optimisés avec design Tutoreel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-indigo-100">
                  <h3 className="text-xl font-bold text-indigo-800 mb-4 flex items-center">
                    <Layers className="mr-2" size={20} />
                    Derniers blocs
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-indigo-200">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Bloc</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Transactions</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-indigo-100">
                        {blocks.slice(0, 5).map((block) => (
                          <tr key={block.number} className="hover:bg-indigo-50/80 transition-all duration-200 hover:scale-[1.01]">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-bold text-indigo-600">#{block.number}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-medium">{block.transactions.length}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs text-gray-600">{formatTimestamp(block.timestamp)}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-indigo-100">
                  <h3 className="text-xl font-bold text-indigo-800 mb-4 flex items-center">
                    <FileText className="mr-2" size={20} />
                    Dernières transactions
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-indigo-200">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Hash</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">De</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">À</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Valeur</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-indigo-100">
                        {transactions.slice(0, 5).map((tx) => (
                          <tr key={tx.hash} className="hover:bg-indigo-50/80 transition-all duration-200 hover:scale-[1.01]">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-bold text-indigo-600">{formatAddress(tx.hash)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-medium">{formatAddress(tx.from)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-medium">{formatAddress(tx.to)}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-bold">{web3Service.web3.utils.fromWei(tx.value, 'ether')} ETH</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          </div>
        )}

          {/* Onglet Blocs avec design Tutoreel */}
          {activeTab === 'blocks' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-indigo-800 flex items-center">
                  <Layers className="mr-3" size={28} />
                  Blocs récents
                </h2>
                <button
                  onClick={loadNetworkInfo}
                  className="tutoreel-btn tutoreel-btn-secondary"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Actualisation...' : 'Rafraîchir'}
                </button>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-indigo-100 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Bloc</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Hash</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Transactions</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Gas utilisé</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-indigo-100">
                    {blocks.map(block => (
                      <React.Fragment key={block.number}>
                        <tr className="hover:bg-indigo-50/80 transition-all duration-200 hover:scale-[1.005]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-indigo-600">#{block.number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-mono">{formatAddress(block.hash)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {block.transactions.length}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-medium">{block.gasUsed.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-600">{formatTimestamp(block.timestamp)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleBlockExpansion(block.number)}
                              className="tutoreel-btn tutoreel-btn-outline p-2 rounded-lg"
                            >
                              {expandedBlocks[block.number] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                        </tr>
                        {expandedBlocks[block.number] && (
                          <tr>
                            <td colSpan="6" className="px-6 py-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 backdrop-blur-sm">
                              <div className="bg-white/80 rounded-xl p-6 border border-indigo-200">
                                <h4 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
                                  <Hash className="mr-2" size={20} />
                                  Détails du bloc #{block.number}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Hash parent:</span>
                                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{formatAddress(block.parentHash)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Mineur:</span>
                                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{formatAddress(block.miner)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Difficulté:</span>
                                      <span className="text-sm text-gray-600">{block.difficulty}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Taille:</span>
                                      <span className="text-sm text-gray-600">{block.size} octets</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Gas Limit:</span>
                                      <span className="text-sm text-gray-600">{block.gasLimit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-24">Nonce:</span>
                                      <span className="text-sm text-gray-600">{block.nonce}</span>
                                    </div>
                                  </div>
                                </div>
                                {block.transactions.length > 0 && (
                                  <div className="mt-6 p-4 bg-indigo-50/50 rounded-lg">
                                    <h5 className="font-semibold text-indigo-800 mb-3 flex items-center">
                                      <FileText className="mr-2" size={16} />
                                      Transactions dans ce bloc ({block.transactions.length})
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {block.transactions.slice(0, 6).map((tx, index) => (
                                        <div key={index} className="text-xs font-mono text-indigo-600 bg-white/60 px-2 py-1 rounded">
                                          {typeof tx === 'string' ? formatAddress(tx) : formatAddress(tx.hash)}
                                        </div>
                                      ))}
                                      {block.transactions.length > 6 && (
                                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                          + {block.transactions.length - 6} autres transactions
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {/* Onglet Transactions avec design Tutoreel */}
          {activeTab === 'transactions' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-indigo-800 flex items-center">
                  <FileText className="mr-3" size={28} />
                  Transactions récentes
                </h2>
                <button
                  onClick={loadNetworkInfo}
                  className="tutoreel-btn tutoreel-btn-secondary"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Actualisation...' : 'Rafraîchir'}
                </button>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-indigo-100 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Hash</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Bloc</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">De</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">À</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Valeur</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Détails</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-indigo-100">
                    {transactions.map(tx => (
                      <React.Fragment key={tx.hash}>
                        <tr className="hover:bg-indigo-50/80 transition-all duration-200 hover:scale-[1.005]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-indigo-600 font-mono">{formatAddress(tx.hash)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              #{tx.blockNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-mono">{formatAddress(tx.from)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-mono">{formatAddress(tx.to)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-bold">{web3Service.web3.utils.fromWei(tx.value, 'ether')} ETH</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleTxExpansion(tx.hash)}
                              className="tutoreel-btn tutoreel-btn-outline p-2 rounded-lg"
                            >
                              {expandedTxs[tx.hash] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </td>
                        </tr>
                        {expandedTxs[tx.hash] && (
                          <tr>
                            <td colSpan="6" className="px-6 py-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 backdrop-blur-sm">
                              <div className="bg-white/80 rounded-xl p-6 border border-indigo-200">
                                <h4 className="text-lg font-bold text-indigo-800 mb-4 flex items-center">
                                  <Hash className="mr-2" size={20} />
                                  Détails de la transaction
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-32">Hash complet:</span>
                                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded break-all">{tx.hash}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-32">Nonce:</span>
                                      <span className="text-sm text-gray-600">{tx.nonce}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-32">Index:</span>
                                      <span className="text-sm text-gray-600">{tx.transactionIndex}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-32">Gas:</span>
                                      <span className="text-sm text-gray-600">{tx.gas.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="font-semibold text-gray-700 w-32">Gas Price:</span>
                                      <span className="text-sm text-gray-600">{web3Service.web3.utils.fromWei(tx.gasPrice, 'gwei')} Gwei</span>
                                    </div>
                                    <div className="flex items-start">
                                      <span className="font-semibold text-gray-700 w-32">Input Data:</span>
                                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded break-all">
                                        {tx.input && tx.input.length > 20 ? `${tx.input.substring(0, 20)}...` : tx.input || 'Aucune donnée'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Onglet Comptes avec design Tutoreel */}
          {activeTab === 'accounts' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-indigo-800 flex items-center">
                  <CreditCard className="mr-3" size={28} />
                  Comptes disponibles
                </h2>
                <button
                  onClick={loadNetworkInfo}
                  className="tutoreel-btn tutoreel-btn-secondary"
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Actualisation...' : 'Rafraîchir'}
                </button>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-indigo-100 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Adresse</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Solde</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/80 backdrop-blur-sm divide-y divide-indigo-100">
                    {networkInfo.accounts.map((account, index) => {
                      // Note: Cette approche async dans le render n'est pas optimale
                      // Dans une vraie application, il faudrait charger ces données dans useEffect
                      return (
                        <tr key={index} className="hover:bg-indigo-50/80 transition-all duration-200 hover:scale-[1.005]">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-indigo-600 font-mono">{account}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-bold">-- ETH</div>
                            <div className="text-xs text-gray-500">Chargement...</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              --
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Onglet Téléchargeur IPFS avec design Tutoreel */}
          {activeTab === 'ipfs' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-indigo-800 flex items-center">
                  <FileText className="mr-3" size={28} />
                  Téléchargeur de fichiers IPFS
                </h2>
              </div>
              <div className="max-w-2xl mx-auto">
                <PdfDownloader />
              </div>
            </div>
          )}
      </div>
      </div>
    </div>
  );
};

export default BlockchainExplorer;