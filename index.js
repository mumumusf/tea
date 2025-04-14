import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import chalk from "chalk";
import solc from "solc";
import path from "path";
import { exit } from "process";
import readline from 'readline';
import banner from './banner.js';
dotenv.config();

const provider = new ethers.JsonRpcProvider("https://tea-sepolia.g.alchemy.com/public");
let wallet;

// 添加stTEA合约地址和ABI
const stTeaContractAddress = '0x04290DACdb061C6C9A0B9735556744be49A64012';
const stTeaABI = [
  'function stake() payable',
  'function balanceOf(address owner) view returns (uint256)',
  'function withdraw(uint256 _amount)'
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get private key from user
async function getPrivateKey() {
    return new Promise((resolve) => {
        rl.question(chalk.yellow('请输入您的私钥 (不带0x前缀): '), (privateKey) => {
            // 添加0x前缀如果用户没有输入
            privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
            resolve(privateKey);
        });
    });
}

let savedOption = null;
let savedTransactionCount = null;

// Function to display banner
function showBanner() {
    console.clear();
    console.log(chalk.blueBright(banner));
}

// Function to fetch and display wallet info
async function showWalletInfo() {
    const balance = await provider.getBalance(wallet.address);
    
    // 获取stTEA余额
    const stTeaContract = new ethers.Contract(
        stTeaContractAddress,
        ['function balanceOf(address owner) view returns (uint256)'],
        wallet
    );
    const stTeaBalance = await stTeaContract.balanceOf(wallet.address).catch(() => ethers.BigNumber.from(0));
    
    console.log(chalk.yellow("💳 钱包信息"));
    console.log(chalk.cyan(`🔹 地址: ${wallet.address}`));
    console.log(chalk.green(`🔹 TEA余额: ${ethers.formatEther(balance)} TEA`));
    console.log(chalk.green(`🔹 stTEA余额: ${ethers.formatEther(stTeaBalance)} stTEA\n`));
}

// Function to compile and deploy the contract
async function deployContract() {
    const contractPath = path.resolve("auto.sol");

    if (!fs.existsSync(contractPath)) {
        console.log(chalk.red(`❌ 文件 ${contractPath} 未找到`));
        return;
    }

    const contractSource = fs.readFileSync(contractPath, "utf8");

    function findImports(importPath) {
        // 处理 OpenZeppelin 合约
        if (importPath.startsWith("@openzeppelin/")) {
            const localPath = path.resolve("node_modules", importPath);
            if (fs.existsSync(localPath)) {
                return { contents: fs.readFileSync(localPath, "utf8") };
            }
        }
        return { error: "File not found" };
    }

    const input = {
        language: "Solidity",
        sources: {
            "auto.sol": { content: contractSource }
        },
        settings: {
            outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } }
        }
    };

    try {
        const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

        if (output.errors) {
            console.log(chalk.red("❌ 编译错误:"));
            output.errors.forEach(error => {
                console.log(chalk.red(`  ${error.message}`));
            });
            return;
        }

        const contractName = Object.keys(output.contracts["auto.sol"])[0];
        const contractData = output.contracts["auto.sol"][contractName];

        if (!contractData.evm.bytecode.object) {
            console.log(chalk.red(`❌ 编译失败! 请检查 Solidity 代码`));
            return;
        }

        const contractFactory = new ethers.ContractFactory(contractData.abi, contractData.evm.bytecode.object, wallet);

        console.log(chalk.yellow("⏳ 正在部署合约..."));
        try {
            const contract = await contractFactory.deploy(wallet.address);
            await contract.waitForDeployment();

            // 获取代币信息
            const tokenName = await contract.name();
            const tokenSymbol = await contract.symbol();
            const tokenSupply = await contract.totalSupply();

            console.log(chalk.green(`✅ 合约已部署!`));
            console.log(chalk.cyan(`🔹 合约地址: ${chalk.blue(await contract.getAddress())}`));
            console.log(chalk.cyan(`🔹 代币名称: ${chalk.blue(tokenName)} (${tokenSymbol})`));
            console.log(chalk.cyan(`🔹 发行总量: ${chalk.blue(ethers.formatUnits(tokenSupply, 18))} ${tokenSymbol}`));
        } catch (error) {
            console.log(chalk.red(`❌ 部署失败: ${error.message}`));
        }
    } catch (error) {
        console.log(chalk.red(`❌ 部署失败: ${error.message}`));
    }

    console.log(chalk.greenBright("\n🎉 部署完成!\n"));
    // 不再调用showOptions
}

// Function to handle automatic transactions
async function autoTransaction() {
    let option = savedOption;
    let transactionCount = savedTransactionCount;

    if (option === null || transactionCount === null) {
        option = await askQuestion(chalk.magenta("\n选择交易选项 (1: 销毁地址, 2: KYC钱包): "));
        transactionCount = await askQuestion(chalk.magenta("输入交易次数: "));

        savedOption = option;
        savedTransactionCount = Number(transactionCount);
    }

    const file = option === "1" ? "销毁地址.txt" : "接受地址.txt";

    if (!fs.existsSync(file)) {
        console.log(chalk.red(`❌ 文件 ${file} 未找到`));
        return;
    }

    const addresses = fs.readFileSync(file, "utf-8").split("\n").map(addr => addr.trim()).filter(addr => addr);

    console.log(chalk.yellow("\n🚀 开始交易...\n"));

    for (let i = 0; i < savedTransactionCount; i++) {
        const recipient = addresses[Math.floor(Math.random() * addresses.length)];
        const amount = (Math.random() * (0.09 - 0.01) + 0.01).toFixed(4);

        console.log(chalk.blueBright(`🔹 交易 ${i + 1}/${savedTransactionCount}`));
        console.log(chalk.cyan(`➡ 发送 ${chalk.green(amount + " ETH")} 到 ${chalk.yellow(recipient)}`));

        try {
            const tx = await wallet.sendTransaction({
                to: recipient,
                value: ethers.parseEther(amount)
            });

            console.log(chalk.green(`✅ 成功! 交易哈希: ${chalk.blue(tx.hash)}`));
            await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ 交易失败: ${error.message}`));
        }

        console.log(chalk.gray("⌛ 等待5秒进行下一笔交易...\n"));
        await new Promise(res => setTimeout(res, 5000));
    }

    console.log(chalk.greenBright("\n🎉 所有交易完成! 24小时后重新开始\n"));
    setTimeout(autoTransaction, 86400000); // 24小时后重启
}

// Function to handle user input
async function askQuestion(query) {
    return new Promise(resolve => {
        rl.question(query, answer => {
            resolve(answer);
        });
    });
}

// 修改确认交易函数，直接返回true，不再询问用户
async function confirmTransaction(details) {
    console.log(chalk.white('┌─── 交易预览 ───┐'));
    for (const [key, value] of Object.entries(details)) {
        console.log(chalk.white(`│ ${key.padEnd(10)} : ${chalk.cyan(value)}`));
    }
    console.log(chalk.white('└──────────────────────────┘'));
    console.log(chalk.yellow('自动确认交易...'));
    return true; // 直接返回true，不再询问用户
}

// 添加质押TEA代币功能
async function stakeTea() {
    console.log(chalk.yellow("\n===== 质押TEA代币 ====="));
    const amount = await askQuestion(chalk.magenta("请输入要质押的TEA数量: "));
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        console.log(chalk.red("❌ 无效的数量! 请输入大于0的数字"));
        return await showOptions();
    }
    
    try {
        const amountWei = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 200000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '质押',
            数量: `${amount} TEA`,
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 质押已取消"));
            return await showOptions();
        }
        
        const stTeaContract = new ethers.Contract(
            stTeaContractAddress,
            stTeaABI,
            wallet
        );
        
        console.log(chalk.yellow("⏳ 正在质押..."));
        const tx = await stTeaContract.stake({
            value: amountWei,
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 质押成功! 区块: ${receipt.blockNumber}`));
        console.log(chalk.green(`✅ 成功质押 ${amount} TEA!`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 质押失败: ${error.message}`));
    }
    
    await showOptions();
}

// 添加领取质押奖励功能
async function claimRewards() {
    console.log(chalk.yellow("\n===== 领取质押奖励 ====="));
    
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 100000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '领取奖励',
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 领取已取消"));
            return await showOptions();
        }
        
        // 领取奖励的函数选择器
        const data = "0x3d18b912";
        
        console.log(chalk.yellow("⏳ 正在领取奖励..."));
        const tx = await wallet.sendTransaction({
            to: stTeaContractAddress,
            data: data,
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 领取成功! 区块: ${receipt.blockNumber}`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 领取失败: ${error.message}`));
    }
    
    await showOptions();
}

// 添加提取stTEA代币功能
async function withdrawTea() {
    console.log(chalk.yellow("\n===== 提取stTEA代币 ====="));
    const amount = await askQuestion(chalk.magenta("请输入要提取的stTEA数量: "));
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        console.log(chalk.red("❌ 无效的数量! 请输入大于0的数字"));
        return await showOptions();
    }
    
    try {
        const amountWei = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 100000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '提取',
            数量: `${amount} stTEA`,
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 提取已取消"));
            return await showOptions();
        }
        
        const stTeaContract = new ethers.Contract(
            stTeaContractAddress,
            stTeaABI,
            wallet
        );
        
        console.log(chalk.yellow("⏳ 正在提取..."));
        const tx = await stTeaContract.withdraw(amountWei, {
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 提取成功! 区块: ${receipt.blockNumber}`));
        console.log(chalk.green(`✅ 成功提取 ${amount} stTEA!`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 提取失败: ${error.message}`));
    }
    
    await showOptions();
}

// 修改自动执行所有功能的函数
async function autoExecuteAll() {
    console.log(chalk.yellow("\n===== 自动执行所有功能 ====="));
    
    try {
        // 1. 部署合约
        console.log(chalk.cyan("\n1. 部署合约..."));
        await deployContractAuto();
        
        // 2. 质押TEA代币 - 随机数量(0-1 TEA)
        console.log(chalk.cyan("\n2. 质押TEA代币..."));
        const stakeAmount = (Math.random()).toFixed(4); // 随机质押0-1个TEA
        console.log(chalk.yellow(`质押数量: ${stakeAmount} TEA`));
        await stakeTeaWithAmount(stakeAmount);
        
        // 3. 领取质押奖励
        console.log(chalk.cyan("\n3. 领取质押奖励..."));
        await claimRewardsAuto();
        
        // 4. 提取stTEA代币 - 随机数量(0-1 stTEA)
        console.log(chalk.cyan("\n4. 提取stTEA代币..."));
        const withdrawAmount = (Math.random()).toFixed(4); // 随机提取0-1个stTEA
        console.log(chalk.yellow(`提取数量: ${withdrawAmount} stTEA`));
        await withdrawTeaWithAmount(withdrawAmount);
        
        // 5. 自动交易 - 随机次数(102-150次)
        console.log(chalk.cyan("\n5. 自动交易..."));
        const autoTradeCount = Math.floor(Math.random() * (150 - 102 + 1)) + 102; // 随机102-150次
        console.log(chalk.yellow(`执行次数: ${autoTradeCount}次`));
        await autoTransactionWithCount(autoTradeCount);
        
        console.log(chalk.green("\n✅ 所有功能执行完成!"));
        const now = new Date();
        console.log(chalk.yellow(`当前时间: ${now.toLocaleString()}`));
        console.log(chalk.yellow("24小时后将重新执行所有功能..."));
        
        // 24小时后重新执行
        setTimeout(autoExecuteAll, 24 * 60 * 60 * 1000); // 24小时
    } catch (error) {
        console.log(chalk.red(`❌ 执行过程中出错: ${error.message}`));
        console.log(chalk.yellow("30秒后重试..."));
        setTimeout(autoExecuteAll, 30000); // 出错时30秒后重试
    }
}

// 添加自动部署合约函数
async function deployContractAuto() {
    const contractPath = path.resolve("auto.sol");

    if (!fs.existsSync(contractPath)) {
        console.log(chalk.red(`❌ 文件 ${contractPath} 未找到`));
        return;
    }

    const contractSource = fs.readFileSync(contractPath, "utf8");

    function findImports(importPath) {
        // 处理 OpenZeppelin 合约
        if (importPath.startsWith("@openzeppelin/")) {
            const localPath = path.resolve("node_modules", importPath);
            if (fs.existsSync(localPath)) {
                return { contents: fs.readFileSync(localPath, "utf8") };
            }
        }
        return { error: "File not found" };
    }

    const input = {
        language: "Solidity",
        sources: {
            "auto.sol": { content: contractSource }
        },
        settings: {
            outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } }
        }
    };

    try {
        const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

        if (output.errors) {
            console.log(chalk.red("❌ 编译错误:"));
            output.errors.forEach(error => {
                console.log(chalk.red(`  ${error.message}`));
            });
            return;
        }

        const contractName = Object.keys(output.contracts["auto.sol"])[0];
        const contractData = output.contracts["auto.sol"][contractName];

        if (!contractData.evm.bytecode.object) {
            console.log(chalk.red(`❌ 编译失败! 请检查 Solidity 代码`));
            return;
        }

        const contractFactory = new ethers.ContractFactory(contractData.abi, contractData.evm.bytecode.object, wallet);

        console.log(chalk.yellow("⏳ 正在部署合约..."));
        try {
            const contract = await contractFactory.deploy(wallet.address);
            await contract.waitForDeployment();

            // 获取代币信息
            const tokenName = await contract.name();
            const tokenSymbol = await contract.symbol();
            const tokenSupply = await contract.totalSupply();

            console.log(chalk.green(`✅ 合约已部署!`));
            console.log(chalk.cyan(`🔹 合约地址: ${chalk.blue(await contract.getAddress())}`));
            console.log(chalk.cyan(`🔹 代币名称: ${chalk.blue(tokenName)} (${tokenSymbol})`));
            console.log(chalk.cyan(`🔹 发行总量: ${chalk.blue(ethers.formatUnits(tokenSupply, 18))} ${tokenSymbol}`));
        } catch (error) {
            console.log(chalk.red(`❌ 部署失败: ${error.message}`));
        }
    } catch (error) {
        console.log(chalk.red(`❌ 部署失败: ${error.message}`));
    }

    console.log(chalk.greenBright("\n🎉 部署完成!\n"));
}

// 添加自动领取质押奖励函数
async function claimRewardsAuto() {
    console.log(chalk.yellow("\n===== 领取质押奖励 ====="));
    
    try {
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 100000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '领取奖励',
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 领取已取消"));
            return;
        }
        
        // 领取奖励的函数选择器
        const data = "0x3d18b912";
        
        console.log(chalk.yellow("⏳ 正在领取奖励..."));
        const tx = await wallet.sendTransaction({
            to: stTeaContractAddress,
            data: data,
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 领取成功! 区块: ${receipt.blockNumber}`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 领取失败: ${error.message}`));
    }
}

// 添加带交易次数的自动交易函数
async function autoTransactionWithCount(transactionCount) {
    const file = "接受地址.txt";

    if (!fs.existsSync(file)) {
        console.log(chalk.red(`❌ 文件 ${file} 未找到`));
        return;
    }

    const addresses = fs.readFileSync(file, "utf-8").split("\n").map(addr => addr.trim()).filter(addr => addr);

    console.log(chalk.yellow("\n🚀 开始交易...\n"));

    for (let i = 0; i < transactionCount; i++) {
        // 第一笔交易固定发送到指定地址
        const recipient = i === 0 ? 
            "0xb744874877ecb800eebf37217bd26f4411d2b326" : 
            addresses[Math.floor(Math.random() * addresses.length)];
            
        // 随机生成0.00002到0.0001之间的金额
        const amount = (Math.random() * (0.0001 - 0.00002) + 0.00002).toFixed(6);

        console.log(chalk.blueBright(`🔹 交易 ${i + 1}/${transactionCount}`));
        console.log(chalk.cyan(`➡ 发送 ${chalk.green(amount + " TEA")} 到 ${chalk.yellow(recipient)}`));

        try {
            const tx = await wallet.sendTransaction({
                to: recipient,
                value: ethers.parseEther(amount),
                maxFeePerGas: (await provider.getFeeData()).maxFeePerGas,
                maxPriorityFeePerGas: (await provider.getFeeData()).maxPriorityFeePerGas,
                type: 2
            });

            console.log(chalk.green(`✅ 成功! 交易哈希: ${chalk.blue(tx.hash)}`));
            await tx.wait();
        } catch (error) {
            console.log(chalk.red(`❌ 交易失败: ${error.message}`));
        }

        if (i < transactionCount - 1) {
            console.log(chalk.gray("⌛ 等待5秒进行下一笔交易...\n"));
            await new Promise(res => setTimeout(res, 5000));
        }
    }

    console.log(chalk.greenBright("\n🎉 所有交易完成!\n"));
}

// 添加带参数的质押函数
async function stakeTeaWithAmount(amount) {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        console.log(chalk.red("❌ 无效的数量! 请输入大于0的数字"));
        return;
    }
    
    try {
        const amountWei = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 200000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '质押',
            数量: `${amount} TEA`,
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 质押已取消"));
            return;
        }
        
        const stTeaContract = new ethers.Contract(
            stTeaContractAddress,
            stTeaABI,
            wallet
        );
        
        console.log(chalk.yellow("⏳ 正在质押..."));
        const tx = await stTeaContract.stake({
            value: amountWei,
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 质押成功! 区块: ${receipt.blockNumber}`));
        console.log(chalk.green(`✅ 成功质押 ${amount} TEA!`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 质押失败: ${error.message}`));
    }
}

// 添加带参数的提取函数
async function withdrawTeaWithAmount(amount) {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        console.log(chalk.red("❌ 无效的数量! 请输入大于0的数字"));
        return;
    }
    
    try {
        const amountWei = ethers.parseEther(amount);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice;
        const estimatedGas = 100000;
        const gasCost = ethers.formatEther(gasPrice * BigInt(estimatedGas));
        
        const confirmed = await confirmTransaction({
            操作: '提取',
            数量: `${amount} stTEA`,
            'Gas费用': `${gasCost} TEA`
        });
        
        if (!confirmed) {
            console.log(chalk.yellow("❌ 提取已取消"));
            return;
        }
        
        const stTeaContract = new ethers.Contract(
            stTeaContractAddress,
            stTeaABI,
            wallet
        );
        
        console.log(chalk.yellow("⏳ 正在提取..."));
        const tx = await stTeaContract.withdraw(amountWei, {
            gasLimit: estimatedGas
        });
        
        console.log(chalk.green(`✅ 交易已发送! 哈希: ${chalk.blue(tx.hash)}`));
        console.log(chalk.gray("⌛ 等待确认..."));
        
        const receipt = await tx.wait();
        console.log(chalk.green(`✅ 提取成功! 区块: ${receipt.blockNumber}`));
        console.log(chalk.green(`✅ 成功提取 ${amount} stTEA!`));
        
        // 更新钱包信息
        await showWalletInfo();
    } catch (error) {
        console.log(chalk.red(`❌ 提取失败: ${error.message}`));
    }
}

// 修改主进程函数，在自动执行模式下不显示选项菜单
async function startProcess() {
    showBanner();
    
    // 获取私钥并初始化钱包
    const privateKey = await getPrivateKey();
    try {
        wallet = new ethers.Wallet(privateKey, provider);
    } catch (error) {
        console.log(chalk.red('❌ 无效的私钥，请重新运行程序并输入正确的私钥'));
        rl.close();
        process.exit(1);
    }
    
    await showWalletInfo();
    
    // 询问是否自动执行所有功能
    const autoExecute = await askQuestion(chalk.magenta("\n是否自动执行所有功能? (y/n): "));
    if (autoExecute.toLowerCase() === 'y' || autoExecute.toLowerCase() === 'yes') {
        console.log(chalk.yellow("\n⚡ 启动自动执行模式"));
        console.log(chalk.yellow("📅 执行频率: 每24小时一次"));
        console.log(chalk.yellow("🔄 出错重试: 30秒后\n"));
        // 直接执行自动执行函数，不显示选项菜单
        await autoExecuteAll();
    } else {
        await showOptions();
    }
}

// 启动程序
startProcess();