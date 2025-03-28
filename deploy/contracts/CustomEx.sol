// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CustomToken
 * @notice A simple ERC20 token. The DEX enforces a global supply limit.
 *         If using standard OpenZeppelin Ownable, remove (msg.sender) from inheritance.
 */
// If using standard Ownable, do `contract CustomToken is ERC20, Ownable`
contract CustomToken is ERC20, Ownable(msg.sender) {
    /**
     * @dev Constructor sets name & symbol, then optionally mints an initial supply
     *      to the `initialOwner` address. The DEX or other contract enforces the global cap.
     */
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        // Transfer ownership to the specified address (the DEX, if that's your intention)
        _transferOwnership(initialOwner);

        // Mint initial supply if specified
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /**
     * @dev Mints tokens to `to`. Only the owner can call this. No internal max supply check.
     *      The DEX ensures we never exceed the global cap.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title CustomDex
 * @notice A minimal DEX that enforces a single global max supply across all CustomTokens,
 *         uses SafeERC20 for token transfers, applies a 0.3% fee for token-to-token swaps,
 *         and offers naive ETH <-> token conversion for demonstration only.
 */
// If using standard OpenZeppelin Ownable, do `contract CustomDex is ReentrancyGuard, Ownable`
contract CustomDex is ReentrancyGuard, Ownable(msg.sender) {
    using SafeERC20 for IERC20;

    // -----------------------------
    //       Global Supply Cap
    // -----------------------------
    uint256 public constant GLOBAL_MAX_SUPPLY = 1_000_000 * 10**18;
    uint256 public mintedSoFar;

    // -----------------------------
    //       Token Registry
    // -----------------------------
    mapping(string => CustomToken) public tokenInstanceMap;
    string[] public tokenList; // Keep track of token "keys" for iteration if needed

    // -----------------------------
    //   Simplified ETH Conversion
    // -----------------------------
    /**
     * @dev For demonstration: 1 ETH = 1 * 10^18 tokens. This is not a real market rate!
     *      In production, use a pricing oracle or an AMM approach for ETH <-> token conversions.
     */
    uint256 public constant ETH_BASE_RATE = 1 ether; 

    // Fee for token-to-token swaps (0.3%)
    uint256 public swapFeeBps = 30; // 30 basis points = 0.3%

    // -----------------------------
    //         Swap Events
    // -----------------------------
    event Swapped(
        address indexed user,
        string indexed tokenA,
        string indexed tokenB,
        uint256 inputAmount,
        uint256 outputAmount
    );

    /**
     * @dev Deploys some initial tokens (e.g., "tUSD", "BNB", etc.).
     *      Each with 100k supply minted to the DEX. This usage is optional.
     */
    constructor() {
        _addToken("tUSD", "tUSD", 100_000 * 10**18);
        _addToken("BNB", "BNB", 100_000 * 10**18);
        _addToken("USDC", "USDC", 100_000 * 10**18);
        _addToken("TRON", "TRON", 100_000 * 10**18);
        _addToken("MATIC", "MATIC", 100_000 * 10**18);
    }

    /**
     * @dev Owner can deploy a new CustomToken with `initialSupply`. 
     *      This counts against the global 1M supply. 
     *      The DEX becomes the token's owner.
     */
    function addToken(string memory name, string memory symbol, uint256 initialSupply)
        external
        onlyOwner
    {
        _addToken(name, symbol, initialSupply);
    }

    /**
     * @dev Internal helper that checks global limits and deploys a new token contract.
     */
    function _addToken(string memory name, string memory symbol, uint256 initialSupply)
        internal
    {
        require(bytes(name).length > 0, "Invalid token name");
        require(address(tokenInstanceMap[name]) == address(0), "Token already exists");

        // Enforce global max supply across all tokens
        require(mintedSoFar + initialSupply <= GLOBAL_MAX_SUPPLY, "Exceeds global supply");
        mintedSoFar += initialSupply;

        // Deploy new token. Dex is the owner (i.e., address(this)).
        CustomToken token = new CustomToken(name, symbol, address(this), 0);
        tokenInstanceMap[name] = token;
        tokenList.push(name);

        // If initialSupply > 0, mint to Dex
        if (initialSupply > 0) {
            token.mint(address(this), initialSupply);
        }
    }

    /**
     * @dev Mint additional supply for an existing token, subject to the global cap.
     */
    function mintToken(string memory tokenName, uint256 amount) external onlyOwner {
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");
        require(mintedSoFar + amount <= GLOBAL_MAX_SUPPLY, "Exceeds global supply");
        mintedSoFar += amount;

        // Mint to the DEX (or potentially to the owner if desired)
        tokenInstanceMap[tokenName].mint(address(this), amount);
    }

    // ----------------------------------------
    //        GETTERS & VIEW FUNCTIONS
    // ----------------------------------------
    function getBalance(string memory tokenName, address user) public view returns (uint256) {
        return tokenInstanceMap[tokenName].balanceOf(user);
    }

    function getTokenAddress(string memory tokenName) public view returns (address) {
        return address(tokenInstanceMap[tokenName]);
    }

    function getEthBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // ----------------------------------------
    //        ETH <--> TOKEN SWAPS
    // ----------------------------------------

    /**
     * @dev Swap native ETH to a given token at a fixed demonstration rate:
     *      1 ETH => 1 * 10^18 tokens, scaled by msg.value.
     *      Slippage check ensures the user won't receive fewer tokens than expected.
     */
    function swapEthToToken(string memory tokenName, uint256 minOutputValue)
        public
        payable
        nonReentrant
        returns (uint256)
    {
        require(msg.value > 0, "No ETH sent");
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");

        // For example: if msg.value = 0.5 ETH => outputValue = 0.5 * 10^18 tokens
        uint256 outputValue = (msg.value * 10**18) / ETH_BASE_RATE;

        require(outputValue >= minOutputValue, "Slippage too high");

        // Ensure DEX has enough tokens in its balance
        IERC20 token = IERC20(tokenInstanceMap[tokenName]);
        require(token.balanceOf(address(this)) >= outputValue, "Insufficient DEX token balance");

        // Transfer tokens to msg.sender
        token.safeTransfer(msg.sender, outputValue);

        // Emit an event for off-chain indexing
        emit Swapped(msg.sender, "ETH", tokenName, msg.value, outputValue);

        return outputValue;
    }

    /**
     * @dev Swap tokens for ETH at the same fixed rate. 
     *      Slippage check ensures user won't receive less ETH than minOutputValue.
     */
    function swapTokenToEth(string memory tokenName, uint256 amount, uint256 minOutputValue)
        public
        nonReentrant
        returns (uint256)
    {
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");
        require(amount > 0, "Invalid amount");

        // For example: if amount = 1 * 10^18 tokens => ethToTransfer = 1 ETH
        uint256 ethToTransfer = (amount * ETH_BASE_RATE) / (10**18);

        require(ethToTransfer >= minOutputValue, "Slippage too high");
        require(address(this).balance >= ethToTransfer, "Insufficient DEX ETH balance");

        // Transfer tokens in
        IERC20(tokenInstanceMap[tokenName]).safeTransferFrom(msg.sender, address(this), amount);

        // Transfer ETH out
        (bool success, ) = payable(msg.sender).call{value: ethToTransfer}("");
        require(success, "ETH transfer failed");

        emit Swapped(msg.sender, tokenName, "ETH", amount, ethToTransfer);

        return ethToTransfer;
    }

    // ----------------------------------------
    //        TOKEN <--> TOKEN SWAPS
    // ----------------------------------------

    /**
     * @dev Swap one token to another using a Uniswap-style constant product formula 
     *      plus a 0.3% fee. This is still a simplified version. 
     */
    function swapTokenToToken(
        string memory srcTokenName,
        string memory destTokenName,
        uint256 amountIn,
        uint256 minOutputValue
    )
        public
        nonReentrant
        returns (uint256 outputValue)
    {
        require(address(tokenInstanceMap[srcTokenName]) != address(0), "Src token does not exist");
        require(address(tokenInstanceMap[destTokenName]) != address(0), "Dest token does not exist");
        require(amountIn > 0, "Invalid amount");
        require(
            keccak256(bytes(srcTokenName)) != keccak256(bytes(destTokenName)),
            "Cannot swap same token"
        );

        IERC20 srcToken = IERC20(tokenInstanceMap[srcTokenName]);
        IERC20 destToken = IERC20(tokenInstanceMap[destTokenName]);

        // Gather current DEX liquidity
        uint256 srcBalance = srcToken.balanceOf(address(this));
        uint256 destBalance = destToken.balanceOf(address(this));
        require(srcBalance > 0 && destBalance > 0, "No liquidity available");

        // Apply 0.3% fee
        uint256 amountInAfterFee = (amountIn * (1000 - swapFeeBps)) / 1000;

        // Uniswap-style formula: output = (destBalance * amountInAfterFee) / (srcBalance + amountInAfterFee)
        outputValue = (destBalance * amountInAfterFee) / (srcBalance + amountInAfterFee);

        require(outputValue >= minOutputValue, "Slippage too high");
        require(outputValue <= destBalance, "Insufficient DEX token balance");

        // Transfer srcTokens in
        srcToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Transfer destTokens out
        destToken.safeTransfer(msg.sender, outputValue);

        emit Swapped(msg.sender, srcTokenName, destTokenName, amountIn, outputValue);

        return outputValue;
    }

    // ----------------------------------------
    //       Owner / Admin Utilities
    // ----------------------------------------

    /**
     * @dev Allows the owner to withdraw ETH from the contract, e.g. to collect fees.
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Not enough ETH in contract");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdraw failed");
    }

    /**
     * @dev Fallback to receive ETH sent directly to the contract address.
     */
    receive() external payable {}
}
