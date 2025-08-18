# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Library DApp. Follow the step-by-step solutions to get back to using the system quickly.

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [MetaMask Issues](#metamask-issues)
3. [Connection Problems](#connection-problems)
4. [Transaction Failures](#transaction-failures)
5. [Book Browsing Issues](#book-browsing-issues)
6. [IPFS and Image Problems](#ipfs-and-image-problems)
7. [Performance Issues](#performance-issues)
8. [Error Messages](#error-messages)
9. [Advanced Troubleshooting](#advanced-troubleshooting)

## 🔍 Quick Diagnostics

### Before You Start

Run through this quick checklist to identify the problem area:

#### ✅ Basic System Check

1. **Browser Compatibility**
   - [ ] Using Chrome, Firefox, Edge, or Brave
   - [ ] Browser is up to date
   - [ ] JavaScript is enabled

2. **MetaMask Status**
   - [ ] MetaMask extension is installed
   - [ ] MetaMask is unlocked
   - [ ] Connected to correct network
   - [ ] Has sufficient ETH for gas fees

3. **Network Connection**
   - [ ] Stable internet connection
   - [ ] Can access other websites
   - [ ] No firewall blocking the app

4. **Application Status**
   - [ ] Library DApp loads completely
   - [ ] Can see the main interface
   - [ ] Wallet connection button is visible

### Problem Categories

| Symptoms | Likely Issue | Quick Fix |
|----------|-------------|-----------|
| Can't connect wallet | MetaMask problem | [MetaMask Issues](#metamask-issues) |
| Transactions fail | Network/gas issues | [Transaction Failures](#transaction-failures) |
| Images don't load | IPFS connectivity | [IPFS Problems](#ipfs-and-image-problems) |
| App is slow | Performance issues | [Performance Issues](#performance-issues) |
| Error messages | Various causes | [Error Messages](#error-messages) |

## 🦊 MetaMask Issues

### MetaMask Won't Connect

**Problem**: MetaMask button shows "Install MetaMask" even though it's installed.

**Solutions**:

1. **Refresh the page**
   ```
   Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   ```

2. **Check MetaMask status**
   - Click MetaMask extension icon
   - Ensure wallet is unlocked
   - Enter password if needed

3. **Enable DApp permissions**
   - Open MetaMask settings
   - Go to "Advanced" > "Privacy & Security"
   - Enable "Use Phishing Detection"
   - Reload the Library DApp

4. **Clear browser data**
   ```
   Chrome: Settings > Privacy > Clear browsing data
   Firefox: Settings > Privacy > Clear Data
   ```

### Wrong Network Selected

**Problem**: MetaMask is connected to the wrong blockchain network.

**Solutions**:

1. **Switch network in MetaMask**
   - Click network dropdown in MetaMask
   - Select correct network (Ganache Local, Sepolia, etc.)

2. **Add custom network**
   For local development (Ganache):
   ```
   Network Name: Ganache Local
   RPC URL: http://127.0.0.1:7545
   Chain ID: 1337
   Currency Symbol: ETH
   ```

3. **Reset network configuration**
   - Go to MetaMask Settings > Advanced
   - Click "Reset Account"
   - ⚠️ This clears transaction history but not funds

### MetaMask Account Issues

**Problem**: Wrong account selected or account not recognized.

**Solutions**:

1. **Switch accounts**
   - Click account icon in MetaMask
   - Select correct account
   - Refresh Library DApp

2. **Import account**
   - Click "Import Account" in MetaMask
   - Enter private key from Ganache
   - Set as active account

3. **Account not registered**
   - Complete user registration process
   - Ensure transaction was confirmed
   - Check registration status on dashboard

## 🌐 Connection Problems

### Can't Load Application

**Problem**: Library DApp won't load or shows blank page.

**Solutions**:

1. **Check URL**
   - Verify correct application URL
   - Look for HTTPS if required
   - Try direct IP address if using localhost

2. **Clear browser cache**
   ```bash
   # Chrome
   Settings > Privacy > Clear browsing data > All time
   
   # Firefox  
   Settings > Privacy > Clear Data > Everything
   ```

3. **Disable browser extensions**
   - Temporarily disable ad blockers
   - Disable privacy extensions
   - Try incognito/private mode

4. **Check development server**
   ```bash
   # If running locally
   npm start
   # Should show "compiled successfully"
   ```

### Slow Loading Times

**Problem**: Application takes very long to load.

**Solutions**:

1. **Check internet speed**
   - Test with speed test website
   - Try different network connection
   - Use ethernet instead of WiFi

2. **Optimize browser performance**
   - Close unnecessary tabs
   - Restart browser
   - Clear temporary files

3. **Development server issues**
   ```bash
   # Restart development server
   npm start
   
   # Or try different port
   PORT=3001 npm start
   ```

## 💸 Transaction Failures

### "Transaction Reverted" Error

**Problem**: Transactions fail with revert message.

**Common Causes & Solutions**:

1. **Insufficient gas limit**
   ```
   Solution: Increase gas limit in MetaMask
   - Click "Edit" on transaction
   - Increase gas limit to 300,000+
   - Confirm transaction
   ```

2. **Contract requirements not met**
   - **Book unavailable**: Check book status before borrowing
   - **Not registered**: Complete user registration first
   - **Already borrowed**: Can't borrow same book twice
   - **Borrowing limit**: Check if you're at max books

3. **Smart contract state issues**
   - Refresh page and try again
   - Check if book was returned by someone else
   - Verify your registration status

### Gas Price Too Low

**Problem**: Transactions stuck pending with low gas price.

**Solutions**:

1. **Cancel pending transaction**
   - Open MetaMask
   - Find pending transaction
   - Click "Cancel" or "Speed Up"

2. **Use higher gas price**
   - Check current gas prices on ETH Gas Station
   - Set gas price 20% above recommended
   - For testnets, use standard gas prices

3. **Reset account nonce**
   ```
   MetaMask Settings > Advanced > Reset Account
   ```
   ⚠️ This clears transaction history

### Out of Gas Error

**Problem**: Transaction fails due to insufficient gas.

**Solutions**:

1. **Increase gas limit**
   ```
   Recommended gas limits:
   - User registration: 200,000
   - Book borrowing: 150,000
   - Book returning: 100,000
   - Book addition: 300,000
   ```

2. **Check ETH balance**
   - Ensure sufficient ETH for gas fees
   - Get test ETH from faucets (testnets)
   - Transfer ETH from another account

## 📚 Book Browsing Issues

### Books Not Loading

**Problem**: Book catalog appears empty or won't load.

**Solutions**:

1. **Check network connection**
   - Verify MetaMask network matches DApp network
   - Ensure blockchain node is running (local development)

2. **Contract interaction issues**
   ```javascript
   // Check browser console for errors
   F12 > Console tab
   Look for red error messages
   ```

3. **Refresh book data**
   - Click refresh button in catalog
   - Clear browser cache
   - Reload application

### Search Not Working

**Problem**: Search function returns no results or errors.

**Solutions**:

1. **Check search terms**
   - Try partial matches
   - Search by author or title separately
   - Use exact case matching

2. **Clear filters**
   - Reset all filter options
   - Try searching without filters
   - Check if category filters are limiting results

3. **Browser JavaScript issues**
   ```
   F12 > Console > Look for JavaScript errors
   Refresh page if errors found
   ```

### Book Details Won't Open

**Problem**: Clicking books doesn't show details.

**Solutions**:

1. **JavaScript issues**
   - Enable JavaScript in browser
   - Check for script blockers
   - Try different browser

2. **Modal dialog problems**
   - Check if pop-ups are blocked
   - Try right-click > "Open in new tab"
   - Disable browser extensions temporarily

## 🖼️ IPFS and Image Problems

### Images Not Loading

**Problem**: Book cover images show as broken or don't load.

**Solutions**:

1. **Wait for IPFS sync**
   - Images can take 10-30 seconds to load
   - IPFS network may be slow
   - Try refreshing after waiting

2. **Gateway issues**
   ```javascript
   // Check multiple IPFS gateways
   https://ipfs.io/ipfs/[hash]
   https://cloudflare-ipfs.com/ipfs/[hash]
   https://gateway.pinata.cloud/ipfs/[hash]
   ```

3. **Clear image cache**
   - Library DApp Admin Panel > Clear IPFS Cache
   - Or clear browser cache completely

4. **Local IPFS node issues**
   ```bash
   # Check if IPFS daemon is running
   ipfs daemon
   
   # Check IPFS API
   curl http://localhost:5001/api/v0/version
   ```

### IPFS Upload Failures

**Problem**: Can't upload book covers or content to IPFS.

**Solutions**:

1. **Check IPFS daemon**
   ```bash
   # Start IPFS daemon
   ipfs daemon
   
   # Check CORS settings
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST"]'
   ```

2. **File size and format**
   - Check file size limits (usually 10MB max)
   - Verify supported formats (JPG, PNG for images)
   - Try smaller file sizes

3. **Network connectivity**
   - Check internet connection
   - Try different IPFS gateway
   - Restart IPFS daemon

### Slow IPFS Access

**Problem**: IPFS content loads very slowly.

**Solutions**:

1. **Use faster gateways**
   ```javascript
   // Priority order for gateways
   1. Local node: http://127.0.0.1:8080/ipfs/
   2. Cloudflare: https://cloudflare-ipfs.com/ipfs/
   3. Official: https://ipfs.io/ipfs/
   ```

2. **Pre-cache content**
   - Admin can pre-load popular content
   - Pin important files to local node

3. **Optimize network**
   - Use wired connection instead of WiFi
   - Close bandwidth-heavy applications

## ⚡ Performance Issues

### Application Runs Slowly

**Problem**: Library DApp is slow or unresponsive.

**Solutions**:

1. **Browser optimization**
   ```
   - Close other tabs and applications
   - Clear browser cache and cookies
   - Restart browser completely
   - Try incognito/private mode
   ```

2. **Disable extensions**
   - Temporarily disable all browser extensions
   - Re-enable one by one to identify conflicts
   - Keep only essential extensions

3. **Hardware considerations**
   - Close memory-intensive applications
   - Check available RAM and CPU usage
   - Use task manager to identify resource hogs

### MetaMask Delays

**Problem**: MetaMask takes long time to respond.

**Solutions**:

1. **Update MetaMask**
   - Install latest version from official website
   - Restart browser after update

2. **Reset MetaMask**
   ```
   Settings > Advanced > Reset Account
   ```
   ⚠️ Backup seed phrase first

3. **Reduce network load**
   - Switch to less congested network
   - Use custom RPC endpoint
   - Wait for low network activity periods

## ❌ Error Messages

### Common Error Messages and Solutions

#### "Failed to fetch"
**Cause**: Network connectivity issues
**Solution**: 
- Check internet connection
- Verify correct RPC URL in MetaMask
- Try reloading page

#### "Invalid JSON RPC response"
**Cause**: Blockchain node connection issues
**Solution**:
- Restart Ganache (local development)
- Check network configuration
- Try different RPC endpoint

#### "Nonce too high"
**Cause**: Transaction ordering issues
**Solution**:
```
MetaMask Settings > Advanced > Reset Account
```

#### "User rejected request"
**Cause**: Transaction cancelled in MetaMask
**Solution**:
- Try transaction again
- Approve in MetaMask when prompted

#### "Execution reverted"
**Cause**: Smart contract validation failed
**Solution**:
- Check transaction requirements
- Verify you meet all conditions
- Check error details in console

### Browser Console Debugging

**Access browser console**:
```
Windows: F12 or Ctrl+Shift+I
Mac: Cmd+Option+I
```

**Look for**:
- Red error messages
- Network request failures  
- JavaScript exceptions
- Warning messages

**Common console errors**:

1. **MetaMask not found**
   ```javascript
   Error: window.ethereum is undefined
   Solution: Install MetaMask extension
   ```

2. **Contract not deployed**
   ```javascript
   Error: Contract not deployed at address
   Solution: Run truffle migrate --reset
   ```

3. **IPFS connection failed**
   ```javascript
   Error: IPFS daemon not available
   Solution: Start IPFS daemon
   ```

## 🔧 Advanced Troubleshooting

### Reset Everything

If all else fails, try a complete reset:

1. **Clear all browser data**
   ```
   Settings > Privacy > Clear all data
   Include: Cookies, Cache, Local Storage
   ```

2. **Reset MetaMask**
   ```
   MetaMask Settings > Advanced > Reset Account
   ```

3. **Redeploy contracts** (development)
   ```bash
   truffle migrate --reset
   ```

4. **Restart development environment**
   ```bash
   # Stop all services
   Ctrl+C to stop npm start
   Stop Ganache
   
   # Restart everything
   ganache-cli --deterministic
   truffle migrate --reset
   npm start
   ```

### Development Environment Issues

#### Node.js and npm problems
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node version
nvm use 16
npm install
```

#### Truffle compilation issues
```bash
# Clean build artifacts
truffle compile --all

# Reset migrations
rm -rf build/
truffle migrate --reset
```

#### Port conflicts
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000

# Kill process using port
kill -9 [PID]

# Use different port
PORT=3001 npm start
```

### Network-Specific Issues

#### Ganache Issues
- Restart Ganache with same mnemonic
- Check port configuration (7545)
- Verify accounts have ETH balance

#### Testnet Issues  
- Get test ETH from faucets
- Check network status on status pages
- Try different testnet if available

#### Mainnet Issues
- Verify sufficient real ETH
- Check gas prices are reasonable
- Ensure using production contract addresses

## 📞 Getting Additional Help

### Before Contacting Support

1. **Try all relevant solutions above**
2. **Check browser console for errors** 
3. **Note exact error messages**
4. **Document steps to reproduce**

### Contact Information

- **General Help**: [FAQ](FAQ.md)
- **User Guide**: [User Guide](User-Guide.md)
- **Developer Issues**: [Developer Guide](Developer-Guide.md)
- **GitHub Issues**: Report bugs on GitHub repository

### Information to Include

When reporting issues, include:
- Browser and version
- MetaMask version
- Network being used
- Exact error messages
- Steps to reproduce
- Screenshots if applicable

---

**Still having issues?** Check our [FAQ](FAQ.md) or contact support with detailed information about your problem.