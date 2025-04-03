# Tea Automation Tool Guide

[English Version](README_EN.md) | [中文版本](README.md)

## 🔒 Security Notice

### Private Key Security
1. Private keys are only used for local transaction signing and are not sent to any external servers
2. Private keys are only stored in memory during program execution and are not written to any files
3. It is recommended to use dedicated testnet wallets, not mainnet wallets
4. Regularly change private keys to enhance security

### Usage Recommendations
1. Run the program in a secure server environment
2. Ensure the server has adequate security measures
3. Regularly check program status
4. Stop the program immediately if any abnormalities are detected

## 1. Environment Setup

### 1.1 Install nvm (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load nvm
source ~/.bashrc   # if using bash
source ~/.zshrc    # if using zsh
```

### 1.2 Install Node.js
```bash
# Install Node.js 22
nvm install 22
nvm list

# Use Node.js 22
nvm use 22
nvm alias default 22

# Verify installation
node -v   # Expected output: v22.13.1
nvm current # Expected output: v22.13.1
npm -v    # Expected output: 10.9.2
```

## 2. Tea Sepolia Testnet Configuration

### 2.1 Network Information
- Network Name: Tea Sepolia Testnet
- Chain ID: 10218
- RPC URL: https://tea-sepolia.g.alchemy.com/public
- Currency Symbol: TEA
- Block Explorer: https://sepolia.tea.xyz/

### 2.2 Registration and Setup
1. Visit https://tea.xyz/sepolia to register
2. Complete KYC verification (supports Binance, Bybit, Okx)
3. Claim test tokens: https://faucet-sepolia.tea.xyz/

## 3. Installation and Running

### 3.1 Clone Repository
```bash
git clone https://github.com/mumumusf/tea.git
cd tea
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Run with Screen
```bash
# Create new screen session
screen -S tea

# Run program
node index.js

# Detach screen session (Press Ctrl+A then D)

# Reconnect to screen session
screen -r tea
```

## 4. Program Usage Guide

### 4.1 Starting the Program
1. Run `node index.js`
2. Enter private key (without 0x prefix)
3. View wallet information

### 4.2 Feature Options
1. Deploy Contract (one-time)
2. Auto Trading (24-hour cycle)
3. Send Fixed Amount to Specific Address (with loop option)

### 4.3 Important Notes
- Ensure sufficient TEA tokens in wallet
- Recommended to use screen for background operation
- Regularly check program status

## 5. Frequently Asked Questions

### 5.1 Program Won't Start
- Check Node.js version
- Verify all dependencies are installed
- Confirm private key format

### 5.2 Transaction Failures
- Check wallet balance
- Verify network connection
- Confirm target address

## 6. Technical Support

For issues, please visit:
- GitHub: https://github.com/mumumusf/tea
- Author: @YOYOMYOYOA

## 📞 Contact

For any questions or suggestions, feel free to contact the author:

- Twitter: [@YOYOMYOYOA](https://x.com/YOYOMYOYOA)
- Telegram: [@YOYOZKS](https://t.me/YOYOZKS)

## ⚖️ Disclaimer

1. This program is for educational purposes only
2. Commercial use is prohibited
3. Users are responsible for any consequences resulting from the use of this program

---
Made with ❤️ by [@YOYOMYOYOA](https://x.com/YOYOMYOYOA) 