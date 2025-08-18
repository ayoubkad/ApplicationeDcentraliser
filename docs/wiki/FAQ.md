# Frequently Asked Questions (FAQ)

This FAQ covers the most common questions about using the Library DApp. Find quick answers to help you get the most out of the system.

## 📋 Table of Contents

1. [General Questions](#general-questions)
2. [Getting Started](#getting-started)
3. [MetaMask and Wallet Issues](#metamask-and-wallet-issues)
4. [Borrowing and Returning Books](#borrowing-and-returning-books)
5. [Technical Issues](#technical-issues)
6. [Administrative Questions](#administrative-questions)
7. [Security and Privacy](#security-and-privacy)

## 🌟 General Questions

### What is Library DApp?

**Q: What is Library DApp and how does it work?**

A: Library DApp is a decentralized library management system built on blockchain technology. It allows users to:
- Browse and borrow books digitally
- Track borrowing history transparently
- Earn reputation scores for responsible usage
- Interact with a decentralized system that doesn't rely on a central authority

The system uses Ethereum blockchain for transactions and IPFS for storing book covers and content.

### Who can use Library DApp?

**Q: Who is eligible to use the Library DApp?**

A: The system supports three types of users:
- **Students**: Standard borrowing privileges (3 books, 7-day loans)
- **Professors**: Extended privileges (5 books, 14-day loans)
- **Administrators**: Full system management access

Anyone with an Ethereum wallet can register, but role assignment may require institutional verification.

### Is Library DApp free to use?

**Q: Are there any costs to use the system?**

A: While the Library DApp itself is free, users need to pay:
- **Gas fees**: Small Ethereum network fees for transactions (borrowing, returning, registration)
- **ETH for wallet**: Minimal amount to cover transaction costs

Typical gas costs are very low (usually under $1 per transaction on testnets).

## 🚀 Getting Started

### How do I start using Library DApp?

**Q: What's the quickest way to get started?**

A: Follow these simple steps:
1. **Install MetaMask**: Add the browser extension
2. **Create/Import Wallet**: Set up your Ethereum account
3. **Get Test ETH**: Add funds for gas fees (testnets provide free test ETH)
4. **Visit Library DApp**: Go to the application URL
5. **Connect Wallet**: Click "Connect Wallet" and approve
6. **Register**: Complete your user registration
7. **Start Browsing**: Explore the book catalog

**⏱️ Time required**: About 10-15 minutes for first-time setup

### Do I need technical knowledge?

**Q: Is programming or blockchain knowledge required?**

A: **No!** The Library DApp is designed for regular library users. You only need to:
- Install MetaMask (like installing any browser extension)
- Know how to click "Approve" for transactions
- Understand basic concepts like "borrowing" and "returning"

The interface is intuitive and similar to traditional library systems.

### What browsers are supported?

**Q: Which web browsers work with Library DApp?**

A: **Supported browsers**:
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Edge
- ✅ Brave
- ⚠️ Safari (limited MetaMask support)

**Requirements**: Browser must support MetaMask extension.

## 🦊 MetaMask and Wallet Issues

### MetaMask setup problems

**Q: I'm having trouble setting up MetaMask. What should I do?**

A: **Common solutions**:

1. **Extension not installing**:
   - Try incognito/private mode
   - Disable other extensions temporarily
   - Download from official MetaMask website only

2. **Can't create wallet**:
   - Ensure strong internet connection
   - Clear browser cache and cookies
   - Try different browser

3. **Lost password/seed phrase**:
   - Use "Import wallet" with seed phrase
   - Contact MetaMask support for account recovery
   - ⚠️ Never share your seed phrase with anyone

### Network configuration issues

**Q: MetaMask shows wrong network or won't connect**

A: **Network setup**:

For **local development** (Ganache):
- Network Name: Ganache Local
- RPC URL: http://127.0.0.1:7545
- Chain ID: 1337
- Currency Symbol: ETH

For **testnet** (Sepolia):
- Network Name: Sepolia Testnet
- RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
- Chain ID: 11155111
- Currency Symbol: ETH

**Steps to add network**:
1. Open MetaMask
2. Click network dropdown
3. Select "Add Network"
4. Enter network details
5. Save and switch

### Transaction failures

**Q: My transactions keep failing. Why?**

A: **Common causes and solutions**:

1. **Insufficient gas**:
   - Increase gas limit in MetaMask
   - Check current network gas prices
   - Wait for lower gas periods

2. **Wrong network**:
   - Ensure you're on the correct network
   - Switch networks in MetaMask

3. **Insufficient balance**:
   - Check ETH balance for gas fees
   - Get test ETH from faucets (testnets)

4. **Nonce issues**:
   - Reset MetaMask account in settings
   - Clear transaction history

## 📚 Borrowing and Returning Books

### Borrowing limits and rules

**Q: How many books can I borrow and for how long?**

A: **Borrowing limits by role**:

| Role | Max Books | Loan Period | Extensions |
|------|-----------|-------------|------------|
| Student | 3 books | 7 days | 1 extension (3 days) |
| Professor | 5 books | 14 days | 2 extensions (7 days each) |

**Additional rules**:
- Must return overdue books before borrowing new ones
- Good reputation (50+) required for maximum limits
- Some popular books may have shorter loan periods

### Book availability

**Q: The book I want shows as "unavailable". What does this mean?**

A: **Book status meanings**:
- **Available**: Ready to borrow immediately
- **Borrowed**: Currently on loan to another user
- **Due [Date]**: Expected return date
- **Overdue**: Late return, being processed
- **Maintenance**: Temporarily unavailable for updates

**What to do**:
- **Join waitlist**: Get notified when book becomes available
- **Check similar books**: Browse related titles
- **Contact admin**: Report issues with book status

### Late returns and penalties

**Q: What happens if I return a book late?**

A: **Penalty system**:

| Lateness | Reputation Impact | Additional Consequences |
|----------|------------------|------------------------|
| 1-2 days late | -1 point | Warning notification |
| 3-5 days late | -3 points | Borrowing suspended 24h |
| 6+ days late | -5 points | Borrowing suspended 7 days |
| Very overdue (14+ days) | -10 points | Account review required |

**Recovery options**:
- Return book immediately to stop further penalties
- Contact admin for special circumstances
- Rebuild reputation with on-time returns

### Digital book access

**Q: Can I download books or only view them online?**

A: **Access options depend on book type**:

1. **PDF books**: 
   - View online through integrated PDF viewer
   - Download for offline reading (some books)
   - Print pages (if permitted by publisher)

2. **Reference materials**:
   - Online viewing only
   - Bookmark important pages
   - Share specific page links

3. **Restricted content**:
   - View-only access
   - No downloading or printing
   - Time-limited access sessions

## 🔧 Technical Issues

### Performance problems

**Q: The app is slow or images won't load. How can I fix this?**

A: **Performance troubleshooting**:

1. **Slow image loading**:
   - Wait for IPFS network sync (can take 10-30 seconds)
   - Refresh page to try different IPFS gateways
   - Check internet connection speed

2. **App responsiveness**:
   - Close other tabs/applications
   - Clear browser cache and cookies
   - Disable unnecessary browser extensions
   - Try incognito mode

3. **MetaMask delays**:
   - Update MetaMask to latest version
   - Restart browser
   - Check MetaMask network connection

### Error messages

**Q: I'm getting error messages. What do they mean?**

A: **Common error messages**:

**"Transaction reverted"**:
- Smart contract rejected the transaction
- Check if you meet requirements (e.g., book availability)
- Verify sufficient gas and ETH balance

**"User denied transaction"**:
- You cancelled the MetaMask confirmation
- Try the action again and approve the transaction

**"Network error"**:
- Check internet connection
- Verify correct network in MetaMask
- Try refreshing the page

**"IPFS timeout"**:
- IPFS content taking time to load
- Wait and refresh, or try again later
- Report persistent issues to admin

### Browser compatibility

**Q: Some features don't work in my browser. What should I do?**

A: **Compatibility solutions**:

1. **Update browser**: Ensure latest version
2. **Enable JavaScript**: Required for DApp functionality
3. **Allow pop-ups**: Some features need pop-up windows
4. **Check extensions**: Disable ad-blockers temporarily
5. **Try different browser**: Chrome works best with MetaMask

## 👨‍💼 Administrative Questions

### Account management

**Q: How do I change my role or update my information?**

A: **Profile updates**:

**Role changes**:
- Contact system administrator
- Provide verification documents
- Role changes require admin approval
- Changes take effect after blockchain confirmation

**Information updates**:
- Name changes: Request through admin
- Contact info: Update in profile settings
- Wallet address: Cannot be changed (create new account)

### Reporting issues

**Q: I found a bug or have a suggestion. How do I report it?**

A: **Reporting channels**:

1. **Technical bugs**:
   - Use "Report Issue" in app
   - Email: support@library-dapp.edu
   - GitHub issues (for developers)

2. **Feature requests**:
   - Submit via feedback form
   - Join community discussions
   - Contact administration

3. **Security issues**:
   - Email: security@library-dapp.edu
   - Use encrypted communication
   - Do not post publicly

## 🔒 Security and Privacy

### Wallet security

**Q: How do I keep my wallet and account secure?**

A: **Security best practices**:

1. **Protect your seed phrase**:
   - ⚠️ Never share with anyone
   - Store offline in secure location
   - Don't screenshot or email it

2. **Use strong passwords**:
   - Unique MetaMask password
   - Enable browser password manager
   - Consider hardware wallet for large amounts

3. **Verify transactions**:
   - Always check transaction details
   - Verify recipient addresses
   - Don't approve suspicious requests

4. **Keep software updated**:
   - Update MetaMask regularly
   - Use latest browser version
   - Enable automatic security updates

### Privacy considerations

**Q: What information is stored and who can see it?**

A: **Data transparency**:

**Public on blockchain**:
- Wallet addresses
- Transaction history
- Borrowing records
- Reputation scores

**Private information**:
- Real names (encrypted)
- Contact details
- Personal communications

**IPFS storage**:
- Book covers (public)
- Book content (access controlled)
- User uploads (if any)

**Who can access**:
- You: All your data
- Admins: User management data
- Public: Anonymized statistics only

### Reporting security issues

**Q: I think I've found a security vulnerability. What should I do?**

A: **Security reporting process**:

1. **Do not** post publicly
2. **Email immediately**: security@library-dapp.edu
3. **Include details**: Steps to reproduce, potential impact
4. **Use encryption**: PGP key available on request
5. **Wait for response**: Team will acknowledge within 24 hours

**Responsible disclosure**: We appreciate security researchers and have a responsible disclosure policy.

## 💡 Still Need Help?

### Contact Support

- **General Questions**: help@library-dapp.edu
- **Technical Support**: support@library-dapp.edu  
- **Administrative Issues**: admin@library-dapp.edu
- **Security Concerns**: security@library-dapp.edu

### Community Resources

- **User Guide**: Complete [User Guide](User-Guide.md)
- **Admin Guide**: [Admin Guide](Admin-Guide.md) for administrators
- **Developer Docs**: [Developer Guide](Developer-Guide.md) for contributors
- **Troubleshooting**: [Troubleshooting Guide](Troubleshooting.md)

### Response Times

- **Critical issues**: Within 2 hours
- **General support**: Within 24 hours
- **Feature requests**: Within 1 week
- **Community questions**: Best effort basis

---

**Can't find your answer?** [Contact our support team](mailto:support@library-dapp.edu) or check our [Troubleshooting Guide](Troubleshooting.md).