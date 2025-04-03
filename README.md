# Tea 自动化工具使用指南

[English Version](README_EN.md) | [中文版本](README.md)

## 1. 环境准备

### 1.1 安装 nvm (Node Version Manager)
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 加载 nvm
source ~/.bashrc   # 如果使用 bash
source ~/.zshrc    # 如果使用 zsh
```

### 1.2 安装 Node.js
```bash
# 安装 Node.js 22
nvm install 22
nvm list

# 使用 Node.js 22
nvm use 22
nvm alias default 22

# 验证安装
node -v   # 预期输出: v22.13.1
nvm current # 预期输出: v22.13.1
npm -v    # 预期输出: 10.9.2
```

## 2. Tea Sepolia 测试网配置

### 2.1 网络信息
- 网络名称：Tea Sepolia Testnet
- 链 ID：10218
- RPC URL：https://tea-sepolia.g.alchemy.com/public
- 货币符号：TEA
- 区块浏览器：https://sepolia.tea.xyz/

### 2.2 注册和配置
1. 访问 https://tea.xyz/sepolia 进行注册
2. 完成 KYC 验证（支持 Binance、Bybit、Okx）
3. 领取测试币：https://faucet-sepolia.tea.xyz/

## 3. 安装和运行程序

### 3.1 克隆仓库
```bash
git clone https://github.com/mumumusf/tea.git
cd tea
```

### 3.2 安装依赖
```bash
npm install
```

### 3.3 使用 screen 运行程序
```bash
# 创建新的 screen 会话
screen -S tea

# 运行程序
node index.js

# 分离 screen 会话（按 Ctrl+A 然后按 D）

# 重新连接 screen 会话
screen -r tea
```

## 4. 程序使用说明

### 4.1 启动程序
1. 运行 `node index.js`
2. 输入私钥（不带 0x 前缀）
3. 查看钱包信息

### 4.2 功能选项
1. 部署合约（仅一次）
2. 自动交易（每24小时循环）
3. 向特定地址发送固定金额（可设置循环）

### 4.3 注意事项
- 请确保钱包中有足够的 TEA 代币
- 建议使用 screen 保持程序在后台运行
- 定期检查程序运行状态

## 5. 常见问题

### 5.1 程序无法启动
- 检查 Node.js 版本是否正确
- 确认所有依赖已正确安装
- 验证私钥格式是否正确

### 5.2 交易失败
- 检查钱包余额是否充足
- 确认网络连接正常
- 验证目标地址是否正确

## 6. 技术支持

如有问题，请访问：
- GitHub: https://github.com/mumumusf/tea
- 作者: @YOYOMYOYOA

## 📞 联系方式

如有任何问题或建议，欢迎通过以下方式联系作者:

- Twitter：[@YOYOMYOYOA](https://x.com/YOYOMYOYOA)
- Telegram：[@YOYOZKS](https://t.me/YOYOZKS)

## ⚖️ 免责声明

1. 本程序仅供学习交流使用
2. 禁止用于商业用途
3. 使用本程序产生的任何后果由用户自行承担

## 🔒 安全说明

### 私钥安全
1. 私钥仅用于本地签名交易，不会被发送到任何外部服务器
2. 私钥仅在程序运行时保存在内存中，不会写入任何文件
3. 建议使用专门的测试网钱包，不要使用主网钱包
4. 定期更换私钥以提高安全性

### 使用建议
1. 在安全的服务器环境中运行程序
2. 确保服务器有足够的安全措施
3. 定期检查程序运行状态
4. 发现异常及时停止程序

---
Made with ❤️ by [@YOYOMYOYOA](https://x.com/YOYOMYOYOA) 