# Admin Guide

This comprehensive guide covers all administrative features and responsibilities in the Library DApp. Administrators have full control over users, books, and system management.

## 📋 Table of Contents

1. [Admin Overview](#admin-overview)
2. [User Management](#user-management)
3. [Book Management](#book-management)
4. [Transaction Monitoring](#transaction-monitoring)
5. [System Administration](#system-administration)
6. [Reports and Analytics](#reports-and-analytics)
7. [Troubleshooting](#troubleshooting)

## 🔐 Admin Overview

### Admin Responsibilities

As an administrator, you are responsible for:

- **User Management**: Registering, updating, and managing user accounts
- **Book Catalog**: Adding, updating, and removing books from the system
- **System Monitoring**: Tracking transactions and user activities
- **Policy Enforcement**: Ensuring adherence to library rules and policies
- **Technical Support**: Helping users with technical issues

### Admin Dashboard

Your admin dashboard provides access to:

- 📊 **Statistics Panel**: User count, book count, active loans
- 👥 **User Management**: Complete user administration
- 📚 **Book Management**: Catalog administration
- 📈 **Transaction History**: All borrowing and return activities
- ⚙️ **System Settings**: Configuration and maintenance tools

## 👥 User Management

### Viewing All Users

The Users Panel displays:

- **User List**: All registered users with their details
- **Role Information**: Student, Professor, or Admin status
- **Reputation Scores**: Current standing of each user
- **Activity Status**: Last login and activity
- **Registration Dates**: When users joined the system

### User Registration Process

1. **Manual Registration**
   - Navigate to Admin > Users
   - Click "Add New User"
   - Enter user details:
     - Full name
     - Ethereum address
     - Role (Student/Professor)
   - Submit transaction

2. **Bulk Registration**
   - Prepare CSV file with user data
   - Use bulk import feature
   - Review and confirm registrations

### Managing User Roles

#### Role Types and Permissions

| Role | Borrowing Limit | Loan Period | Special Privileges |
|------|----------------|-------------|-------------------|
| Student | 3 books | 7 days | Standard access |
| Professor | 5 books | 14 days | Extended loans |
| Admin | Unlimited | Unlimited | Full system access |

#### Changing User Roles

1. Navigate to Users Panel
2. Find the target user
3. Click "Edit Role"
4. Select new role
5. Confirm transaction

### User Account Management

#### Deactivating Users

1. Go to Users Panel
2. Select user to deactivate
3. Click "Deactivate Account"
4. Confirm the action
5. User loses access immediately

#### Reactivating Users

1. Filter for deactivated users
2. Select user to reactivate
3. Click "Reactivate Account"
4. User regains previous permissions

### Reputation Management

#### Adjusting Reputation Scores

Administrators can manually adjust user reputation:

1. Access user profile
2. Navigate to Reputation section
3. Enter new score (0-100)
4. Provide reason for adjustment
5. Submit changes

#### Common Reputation Adjustments

- **Bonus Points**: For community contributions
- **Penalty Points**: For rule violations
- **Reset Scores**: For new semester/year
- **Emergency Adjustments**: For system errors

## 📚 Book Management

### Adding New Books

#### Single Book Addition

1. **Access Book Management**
   - Go to Admin > Books
   - Click "Add New Book"

2. **Enter Book Details**
   - Title
   - Author
   - Category
   - ISBN (if available)
   - Page count
   - Publication date
   - Description

3. **Upload Cover Image**
   - Select image file
   - Upload to IPFS
   - Verify IPFS hash
   - Preview image

4. **Upload Book PDF** (optional)
   - Select PDF file
   - Upload to IPFS
   - Set access permissions

5. **Submit Transaction**
   - Review all details
   - Confirm in MetaMask
   - Wait for blockchain confirmation

#### Bulk Book Import

1. **Prepare Data File**
   - Use provided CSV template
   - Include all required fields
   - Validate data format

2. **Upload Process**
   - Select import file
   - Map columns to fields
   - Preview import data
   - Execute import

### Managing Existing Books

#### Editing Book Information

1. Find book in catalog
2. Click "Edit" button
3. Modify necessary fields
4. Update IPFS content if needed
5. Submit changes

#### Book Availability

- **Available**: Ready for borrowing
- **Borrowed**: Currently on loan
- **Maintenance**: Temporarily unavailable
- **Removed**: Permanently unavailable

#### Removing Books

⚠️ **Important**: Only remove books that are currently available (not borrowed)

1. Navigate to book in catalog
2. Verify book is not borrowed
3. Click "Remove Book"
4. Confirm removal action
5. Book becomes unavailable

### IPFS Management

#### Monitoring IPFS Status

The admin panel shows:
- **IPFS Node Status**: Connected/Disconnected
- **Gateway Health**: Response times and availability
- **Storage Usage**: Current IPFS storage metrics
- **Hash Verification**: Content integrity checks

#### IPFS Troubleshooting

Common IPFS issues and solutions:

1. **Slow Image Loading**
   - Check gateway status
   - Clear image cache
   - Try alternative gateways

2. **Failed Uploads**
   - Verify IPFS node connection
   - Check file size limits
   - Retry upload process

3. **Missing Images**
   - Verify IPFS hash
   - Check gateway availability
   - Re-upload if necessary

## 📊 Transaction Monitoring

### Transaction Dashboard

View and monitor all system transactions:

- **Recent Activity**: Latest borrowing and returns
- **Transaction History**: Complete audit trail
- **Failed Transactions**: Errors and issues
- **Gas Usage**: Network fee analytics

### Transaction Types

1. **Borrowing Transactions**
   - User initiated borrows
   - Automatic due date setting
   - Reputation impact

2. **Return Transactions**
   - User initiated returns
   - Late return penalties
   - Reputation updates

3. **Administrative Transactions**
   - User registration
   - Book additions
   - Role changes
   - System updates

### Monitoring Tools

#### Real-time Alerts

Set up notifications for:
- Failed transactions
- Overdue books
- System errors
- Unusual activity

#### Analytics and Reports

Generate reports on:
- User activity patterns
- Popular books
- System performance
- Financial metrics

## ⚙️ System Administration

### System Health Monitoring

#### Key Metrics to Monitor

- **Blockchain Connection**: Ethereum network status
- **IPFS Connectivity**: Decentralized storage health
- **User Activity**: Active users and engagement
- **Transaction Volume**: System usage patterns

#### Performance Optimization

1. **Cache Management**
   - Clear IPFS image cache
   - Reset user session data
   - Optimize database queries

2. **Network Optimization**
   - Monitor gas prices
   - Optimize transaction timing
   - Update network configurations

### Backup and Recovery

#### Data Backup

Critical data to backup:
- Smart contract state
- IPFS content hashes
- User registration data
- Transaction history

#### Disaster Recovery

1. **Smart Contract Recovery**
   - Deploy from verified source
   - Restore state from backups
   - Verify data integrity

2. **IPFS Recovery**
   - Re-pin important content
   - Verify hash integrity
   - Update gateway configurations

### Security Management

#### Access Control

- **Admin Permissions**: Full system access
- **User Permissions**: Limited to personal data
- **Guest Access**: Read-only catalog browsing

#### Security Best Practices

1. **Smart Contract Security**
   - Regular security audits
   - Monitor for vulnerabilities
   - Update dependencies

2. **User Security**
   - Educate on MetaMask security
   - Monitor suspicious activity
   - Implement rate limiting

## 📈 Reports and Analytics

### Usage Reports

Generate comprehensive reports on:

#### User Analytics
- Registration trends
- Activity patterns
- Reputation distributions
- Role demographics

#### Book Analytics
- Popular titles
- Category preferences
- Borrowing patterns
- Return rates

#### System Analytics
- Transaction volumes
- Performance metrics
- Error rates
- Cost analysis

### Custom Reports

Create custom reports for:
- Administrative reviews
- Usage statistics
- Performance analysis
- Financial planning

## 🔧 Troubleshooting

### Common Admin Issues

#### User Registration Problems

**Issue**: User cannot register
**Solutions**:
- Verify MetaMask connection
- Check gas prices
- Confirm network settings
- Validate user input

#### Book Upload Issues

**Issue**: IPFS upload fails
**Solutions**:
- Check IPFS node status
- Verify file format and size
- Try alternative gateways
- Clear browser cache

#### Transaction Failures

**Issue**: Transactions not confirming
**Solutions**:
- Check gas prices
- Verify network status
- Retry with higher gas limit
- Check wallet balance

### Emergency Procedures

#### System Downtime

1. **Identify Issue**: Check all system components
2. **Notify Users**: Update status page
3. **Implement Fix**: Address root cause
4. **Test Recovery**: Verify system functionality
5. **Resume Operations**: Announce resolution

#### Security Incidents

1. **Assess Threat**: Determine scope and impact
2. **Contain Issue**: Implement immediate protections
3. **Investigate**: Determine root cause
4. **Remediate**: Fix vulnerabilities
5. **Document**: Record incident and response

### Getting Support

- **Technical Issues**: Contact development team
- **User Questions**: Provide user support
- **System Errors**: Submit bug reports
- **Feature Requests**: Suggest improvements

---

**Questions?** Contact the development team or check our [Technical Documentation](Developer-Guide.md).