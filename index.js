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
    console.log(chalk.yellow("💳 钱包信息"));
    console.log(chalk.cyan(`🔹 地址: ${wallet.address}`));
    console.log(chalk.green(`🔹 余额: ${ethers.formatEther(balance)} ETH\n`));
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
    // 不再退出程序，而是继续显示选项
    await showOptions();
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

// 添加新的函数来显示选项
async function showOptions() {
    console.log(chalk.magenta("\n选择选项:"));
    console.log(chalk.yellow("1: 部署合约 (仅一次)"));
    console.log(chalk.yellow("2: 自动交易 (每24小时循环)"));
    console.log(chalk.yellow("3: 向特定地址发送固定金额 (可设置循环)"));

    const choice = await askQuestion("请选择: ");

    if (choice === "1") {
        await deployContract();
    } else if (choice === "2") {
        await autoTransaction();
    } else if (choice === "3") {
        await sendFixedAmountWithLoop();
    } else {
        console.log(chalk.red("❌ 无效选项! 请重新选择..."));
        await showOptions();
    }
}

// Main process function
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
    await showOptions();
}

// 添加新函数：向特定地址发送固定金额并循环
async function sendFixedAmountWithLoop() {
    const targetAddress = "0xea527A208e920d679b7Bf2dC00db71eb1B936571";
    const amount = "0.005"; // 0.005 ETH
    
    // 获取用户输入的循环次数
    const loopCount = await askQuestion(chalk.magenta("请输入循环次数: "));
    const loopNumber = parseInt(loopCount);
    
    if (isNaN(loopNumber) || loopNumber <= 0) {
        console.log(chalk.red("❌ 请输入有效的循环次数!"));
        rl.close();
        process.exit(1);
    }

    console.log(chalk.yellow("\n🚀 开始发送交易..."));
    console.log(chalk.cyan(`➡ 每次发送 ${chalk.green(amount + " ETH")} 到 ${chalk.yellow(targetAddress)}`));
    console.log(chalk.cyan(`➡ 循环次数: ${chalk.green(loopNumber)}`));

    let currentLoop = 0;
    
    async function sendTransaction() {
        if (currentLoop >= loopNumber) {
            console.log(chalk.greenBright("\n🎉 所有循环完成! 24小时后重新开始"));
            setTimeout(sendFixedAmountWithLoop, 86400000); // 24小时后重启
            return;
        }

        currentLoop++;
        console.log(chalk.blueBright(`\n🔹 循环 ${currentLoop}/${loopNumber}`));
        console.log(chalk.cyan(`➡ 发送 ${chalk.green(amount + " ETH")} 到 ${chalk.yellow(targetAddress)}`));

        try {
            const tx = await wallet.sendTransaction({
                to: targetAddress,
                value: ethers.parseEther(amount)
            });

            console.log(chalk.green(`✅ 成功! 交易哈希: ${chalk.blue(tx.hash)}`));
            await tx.wait();
            console.log(chalk.gray("⌛ 等待5秒进行下一笔交易...\n"));
            await new Promise(res => setTimeout(res, 5000));
            
            // 继续下一次循环
            sendTransaction();
        } catch (error) {
            console.log(chalk.red(`❌ 交易失败: ${error.message}`));
            console.log(chalk.gray("⌛ 等待5秒后重试...\n"));
            await new Promise(res => setTimeout(res, 5000));
            sendTransaction(); // 重试
        }
    }

    // 开始第一次循环
    sendTransaction();
}

// Start the process
startProcess();
