# MetaMask Setup Guide

This guide will walk you through installing and configuring MetaMask for use with the Library DApp. MetaMask is your gateway to the blockchain and is essential for using the system.

## 📋 Table of Contents

1. [What is MetaMask?](#what-is-metamask)
2. [Installation](#installation)
3. [Initial Setup](#initial-setup)
4. [Network Configuration](#network-configuration)
5. [Account Management](#account-management)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

## 🦊 What is MetaMask?

**MetaMask** is a browser extension that serves as:
- **Digital Wallet**: Store and manage your cryptocurrency
- **Identity Manager**: Authenticate with blockchain applications
- **Transaction Gateway**: Sign and send blockchain transactions
- **Network Bridge**: Connect to different Ethereum networks

### Why Do I Need MetaMask?

The Library DApp runs on blockchain technology, which requires:
- **Authentication**: Prove your identity without passwords
- **Digital Signatures**: Authorize transactions securely  
- **Gas Payments**: Pay small fees for blockchain operations
- **Decentralized Access**: No central login system

## 📥 Installation

### Step 1: Download MetaMask

1. **Visit Official Website**
   - Go to [metamask.io](https://metamask.io)
   - ⚠️ **Only use the official website** to avoid fake extensions

2. **Select Your Browser**
   - Click "Download" for your browser
   - Supported: Chrome, Firefox, Edge, Brave

3. **Install Extension**
   - Click "Add to Chrome/Firefox/Edge"
   - Confirm installation when prompted
   - Pin extension to toolbar for easy access

### Step 2: Verify Installation

1. **Check Extension Icon**
   - Look for MetaMask fox icon in browser toolbar
   - Icon should appear orange/brown colored

2. **Test Opening MetaMask**
   - Click the MetaMask icon
   - Should open setup screen or login prompt

## 🚀 Initial Setup

### Creating a New Wallet

1. **Start Setup Process**
   - Click "Get Started"
   - Select "Create a Wallet"

2. **Privacy Notice**
   - Review and accept privacy policy
   - Choose data collection preferences

3. **Create Password**
   - Choose strong password (8+ characters)
   - Include letters, numbers, and symbols
   - Confirm password
   - ✅ **Save this password securely**

4. **Secret Recovery Phrase**
   - MetaMask will show 12 words
   - ⚠️ **Critical**: Write these down on paper
   - Store in secure, offline location
   - Never share with anyone
   - This is your only way to recover your wallet

5. **Confirm Recovery Phrase**
   - Enter words in correct order
   - Double-check spelling and order
   - Complete wallet creation

### Importing Existing Wallet

If you already have a MetaMask wallet:

1. **Select Import Option**
   - Choose "Import Wallet"
   - Enter your 12-word recovery phrase
   - Set new password for this browser

2. **Verify Import**
   - Check account address matches
   - Verify balance is correct

## 🌐 Network Configuration

### Understanding Networks

MetaMask can connect to different blockchain networks:

- **Mainnet**: Real Ethereum with real money
- **Testnets**: Test networks with fake money
- **Local**: Development networks (Ganache)

### Adding Library DApp Networks

#### For Local Development (Ganache)

1. **Open Network Settings**
   - Click network dropdown (usually shows "Ethereum Mainnet")
   - Select "Add Network"

2. **Enter Network Details**
   ```
   Network Name: Ganache Local
   New RPC URL: http://127.0.0.1:7545
   Chain ID: 1337
   Currency Symbol: ETH
   Block Explorer URL: (leave blank)
   ```

3. **Save and Switch**
   - Click "Save"
   - Switch to new network

#### For Testnet (Sepolia)

1. **Add Sepolia Network**
   ```
   Network Name: Sepolia Testnet
   New RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
   Chain ID: 11155111
   Currency Symbol: ETH
   Block Explorer URL: https://sepolia.etherscan.io
   ```

2. **Get Test ETH**
   - Visit Sepolia faucet
   - Enter your wallet address
   - Request test ETH (usually free)

### Automatic Network Addition

Some DApps can automatically add networks:
1. Library DApp may prompt to add network
2. Click "Approve" to add automatically
3. Review network details before confirming

## 👤 Account Management

### Understanding Accounts

- **Account**: Each has unique address (0x...)
- **Private Key**: Secret key that controls account
- **Public Address**: Safe to share for receiving funds

### Creating Additional Accounts

1. **Add New Account**
   - Click account icon (circle with colors)
   - Select "Create Account"
   - Name your account
   - New account created with same recovery phrase

2. **Switching Between Accounts**
   - Click account dropdown
   - Select different account
   - Library DApp will see new account

### Importing Ganache Accounts

For local development with Ganache:

1. **Get Private Key from Ganache**
   - Open Ganache application
   - Click key icon next to account
   - Copy private key

2. **Import to MetaMask**
   - MetaMask account menu > "Import Account"
   - Paste private key
   - Account imported with test ETH

### Account Security

- **Never share private keys**
- **Each account is independent**
- **Same recovery phrase = same wallet**
- **Different browsers = separate MetaMask**

## 💰 Managing Funds

### Understanding Gas

**Gas** is the fee paid for blockchain transactions:
- Measured in Gwei (1 ETH = 1,000,000,000 Gwei)
- Required for all transactions
- Varies based on network congestion

### Getting Test ETH

For testnets, get free test ETH:

1. **Sepolia Faucet**
   - Visit: https://faucet.sepolia.dev/
   - Enter your wallet address
   - Request test ETH

2. **Other Faucets**
   - Search "Sepolia ETH faucet"
   - Use multiple faucets if needed
   - Wait for transactions to confirm

### Checking Balance

1. **In MetaMask**
   - Balance shown on main screen
   - Click account to see details

2. **On Block Explorer**
   - Copy your address
   - Visit Etherscan (mainnet) or testnet explorer
   - Paste address to view transactions

## 🔒 Security Best Practices

### Protect Your Recovery Phrase

- ✅ **Write on paper**: Never store digitally
- ✅ **Multiple copies**: Store in different secure locations
- ✅ **Tell no one**: Not even MetaMask support
- ❌ **Never screenshot**: Can be hacked
- ❌ **Don't email**: Email can be compromised

### Safe Browsing

1. **Verify URLs**
   - Always check URL before connecting
   - Look for HTTPS lock icon
   - Bookmark legitimate DApps

2. **Check Permissions**
   - Review what you're authorizing
   - Only approve trusted applications
   - Revoke unused permissions

3. **Transaction Verification**
   - Always read transaction details
   - Check recipient address
   - Verify amounts before confirming

### Password Security

- Use unique password for MetaMask
- Enable browser password manager
- Never use same password for multiple services
- Change password if compromised

### Regular Maintenance

1. **Update MetaMask**
   - Install updates promptly
   - Check for updates monthly

2. **Review Permissions**
   - Check connected sites in MetaMask
   - Disconnect unused applications

3. **Monitor Accounts**
   - Check transactions regularly
   - Report suspicious activity immediately

## 🔧 Troubleshooting

### MetaMask Won't Install

**Solutions:**
1. Use official metamask.io website
2. Try different browser
3. Disable other extensions temporarily
4. Clear browser cache and try again

### Can't Access Wallet

**Solutions:**
1. Check if MetaMask is unlocked
2. Enter correct password
3. Try importing with recovery phrase
4. Check if using correct browser/profile

### Transaction Issues

**Solutions:**
1. Check network connection
2. Ensure sufficient ETH for gas
3. Try increasing gas limit
4. Reset account if nonce issues

### Network Problems

**Solutions:**
1. Verify network configuration
2. Check RPC URL is correct
3. Try switching networks and back
4. Clear browser cache

### Getting Help

- **MetaMask Support**: support.metamask.io
- **Community Forums**: MetaMask Discord/Reddit
- **Knowledge Base**: metamask.zendesk.com
- **Library DApp Help**: [Troubleshooting Guide](Troubleshooting.md)

## ✅ Verification Checklist

Before using Library DApp, ensure:

- [ ] MetaMask installed from official source
- [ ] Wallet created or imported successfully
- [ ] Recovery phrase written down securely
- [ ] Correct network added and selected
- [ ] Account has sufficient ETH for gas fees
- [ ] Can connect to Library DApp
- [ ] Transactions work correctly

## 🎯 Quick Start Summary

1. **Install MetaMask** from metamask.io
2. **Create wallet** and save recovery phrase securely
3. **Add network** for Library DApp
4. **Get test ETH** from faucets (if using testnet)
5. **Connect to Library DApp** and register
6. **Start using** the library system!

---

**Ready to continue?** Check out our [Getting Started Guide](Getting-Started.md) to begin using Library DApp!