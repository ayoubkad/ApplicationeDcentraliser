import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, LogOut, Check, RefreshCw, ExternalLink, Copy, BookOpen } from 'lucide-react';

const MetaMaskConnect = ({ onConnect, onDisconnect, initialAccount = null, web3Service }) => {
  const [account, setAccount] = useState(initialAccount);
  const [isConnected, setIsConnected] = useState(Boolean(initialAccount));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [userReputation, setUserReputation] = useState(0);
  const [copied, setCopied] = useState(false);

  // Networks configuration - réduit aux réseaux principaux
  const networks = {
    '0x1': { name: 'Ethereum', color: '#627EEA' },
    '0x89': { name: 'Polygon', color: '#8247E5' },
    '0xaa36a7': { name: 'Sepolia', color: '#37C5AB' },
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = async () => {
    if (!account) return;
    
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    if (type === 'error') {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Check connection and set up event listeners on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            handleAccountsChanged(accounts);
            handleChainChanged(chainId);
            
            // Check if user is registered if web3Service is provided
            if (web3Service && web3Service.isUserRegistered) {
              const registered = await web3Service.isUserRegistered();
              setIsRegistered(registered);
              
              if (registered && web3Service.getUserReputation) {
                const reputation = await web3Service.getUserReputation();
                setUserReputation(Number(reputation));
              }
            }
          }
        } catch (err) {
          console.error("Error checking initial connection:", err);
        }
      }
    };

    const setupListeners = () => {
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
      }
    };

    checkConnection();
    setupListeners();

    // Clean up listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [web3Service]);

  // Handle account changes
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      setAccount(accounts[0]);
      setIsConnected(true);
      setError(null);
      if (onConnect) onConnect(accounts[0]);
    }
  };

  // Handle network changes
  const handleChainChanged = (chainId) => {
    setChainId(chainId);
    const network = networks[chainId] || { name: `Chain ID: ${chainId}`, color: '#888888' };
    setNetworkName(network.name);
  };

  // Connect to MetaMask
  const connectToMetaMask = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      if (web3Service && web3Service.initialize) {
        const success = await web3Service.initialize();
        if (success) {
          setIsConnected(true);
          setAccount(web3Service.getAccount());
          
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          handleChainChanged(chainId);
          
          // Check if user is registered
          if (web3Service.isUserRegistered) {
            const registered = await web3Service.isUserRegistered();
            setIsRegistered(registered);
            
            if (registered && web3Service.getUserReputation) {
              const reputation = await web3Service.getUserReputation();
              setUserReputation(Number(reputation));
              showNotification("Connected successfully to your wallet", "success");
            } else {
              showNotification("Please register to use all features", "warning");
            }
          }
        } else {
          showNotification("Failed to connect to wallet", "error");
        }
      } else {
        // Fallback to direct ethereum request if web3Service not provided
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        handleAccountsChanged(accounts);
        handleChainChanged(chainId);
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Error connecting to MetaMask");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setNetworkName('');
    setIsRegistered(false);
    setUserReputation(0);
    if (onDisconnect) onDisconnect();
  };

  // Switch network
  const switchNetwork = async (targetChainId) => {
    setIsLoading(true);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (err) {
      setError(`Failed to switch network: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get color for current network
  const getNetworkColor = () => {
    return networks[chainId]?.color || '#888888';
  };

  // Navigate to explorer
  const openExplorer = () => {
    if (!account) return;
    
    const explorerUrls = {
      '0x1': 'https://etherscan.io/address/',
      '0x5': 'https://goerli.etherscan.io/address/',
      '0x89': 'https://polygonscan.com/address/',
      '0x13881': 'https://mumbai.polygonscan.com/address/',
      '0xa86a': 'https://snowtrace.io/address/',
      '0xa': 'https://optimistic.etherscan.io/address/',
      '0xaa36a7': 'https://sepolia.etherscan.io/address/',
    };
    
    const baseUrl = explorerUrls[chainId] || 'https://etherscan.io/address/';
    window.open(`${baseUrl}${account}`, '_blank');
  };

  return (
    <div className="flex flex-col">
      {/* Error message display */}
      {error && (
        <div className="flex items-center text-red-600 mb-2 p-2 bg-red-50 rounded-md">
          <AlertCircle size={16} className="mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Main display */}
      <div className="flex items-center space-x-4">
        {!isConnected ? (
          window.ethereum ? (
            <button
              onClick={connectToMetaMask}
              disabled={isLoading}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
              aria-label="Connect to MetaMask"
              aria-disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw size={18} className="mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Wallet size={18} className="mr-2" aria-hidden="true" />
              )}
              {isLoading ? 'Connexion...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="flex items-center text-red-600">
              <AlertCircle size={18} className="mr-2" aria-hidden="true" />
              <span className="text-sm">
                MetaMask n'est pas installé.{' '}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-red-800"
                >
                  Installer
                </a>
              </span>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between w-full bg-indigo-900 text-white rounded-md p-3">
            <div className="flex items-center">
              <div className="bg-indigo-800 p-2 rounded-md mr-3">
                <Wallet size={20} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="font-medium" title={account}>
                    {formatAddress(account)}
                  </span>
                  <button 
                    onClick={copyToClipboard} 
                    className="ml-2 p-1 hover:bg-indigo-800 rounded-md" 
                    title="Copier l'adresse"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={openExplorer} 
                    className="ml-1 p-1 hover:bg-indigo-800 rounded-md" 
                    title="Voir sur l'explorateur"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: getNetworkColor() }}
                  ></div>
                  <span className="text-xs text-gray-300">{networkName}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              {isRegistered && (
                <div className="mr-4 text-sm">
                  <span className="text-gray-300">Rep: </span>
                  <span className="font-semibold text-yellow-400">{userReputation}</span>
                </div>
              )}
              <button
                onClick={handleDisconnect}
                className="text-gray-300 hover:text-white transition flex items-center"
                aria-label="Déconnexion de MetaMask"
              >
                <LogOut size={18} className="mr-1" aria-hidden="true" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Network switching buttons - more discreet and less prominent */}
      {isConnected && (
        <div className="mt-3 mb-1">
          <details className="group">
            <summary className="flex items-center text-xs text-gray-400 cursor-pointer">
              <span>Options réseau</span>
              <svg className="w-3 h-3 ml-1 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(networks).map(([id, { name, color }]) => (
                <button
                  key={id}
                  onClick={() => switchNetwork(id)}
                  className={`text-xs px-2 py-1 rounded-md transition flex items-center ${
                    chainId === id ? 'bg-indigo-800 text-white' : 'bg-indigo-700 text-gray-300 hover:bg-indigo-800'
                  }`}
                  disabled={chainId === id || isLoading}
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: color }}
                  ></div>
                  {name}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default MetaMaskConnect;