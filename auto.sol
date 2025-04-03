// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20, Ownable {
    // 定义一些前缀和后缀用于生成随机名称
    string[] private prefixes = ["Super", "Mega", "Ultra", "Hyper", "Power", "Magic", "Crypto", "Meta", "Digi", "Tech"];
    string[] private suffixes = ["Coin", "Token", "Chain", "Net", "Verse", "World", "Link", "Node", "Base", "Hub"];
    
    constructor(address initialOwner) ERC20(generateName(), generateSymbol()) Ownable(initialOwner) {
        // 铸造10000代币
        _mint(initialOwner, 10000 * 10 ** decimals());
    }

    // 生成随机代币名称
    function generateName() private view returns (string memory) {
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        string memory prefix = prefixes[randomSeed % prefixes.length];
        string memory suffix = suffixes[(randomSeed / prefixes.length) % suffixes.length];
        return string(abi.encodePacked(prefix, suffix));
    }

    // 生成随机代币符号
    function generateSymbol() private view returns (string memory) {
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        string memory prefix = prefixes[randomSeed % prefixes.length];
        string memory suffix = suffixes[(randomSeed / prefixes.length) % suffixes.length];
        return string(abi.encodePacked(
            bytes1(bytes(prefix)[0]),
            bytes1(bytes(suffix)[0])
        ));
    }
}