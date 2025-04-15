// useWeb3.js
import { useState, useEffect } from 'react';
import web3Service from './Web3Service';

const useWeb3 = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [userReputation, setUserReputation] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);

  const connect = async () => {
    const success = await web3Service.initialize();
    if (success) {
      setIsConnected(true);
      setAccount(web3Service.getAccount());
      const registered = await web3Service.isUserRegistered();
      setIsRegistered(registered);
      if (registered) setUserReputation(Number(await web3Service.getUserReputation()));
    }
    return success;
  };

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) connect();
  }, []);

  return { isConnected, account, userReputation, isRegistered, connect };
};

export default useWeb3;

// Updated LibraryDApp.js
import useWeb3 from './useWeb3';

const LibraryDApp = () => {
  const { isConnected, account, connect } = useWeb3();
  // ...
};