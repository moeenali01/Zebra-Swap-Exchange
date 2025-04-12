// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Chainlink Price Feed interface
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title CustomToken
 * @notice A simple ERC20 token. The DEX enforces a global supply limit.
 */
contract CustomToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        // Transfer ownership to initialOwner.
        transferOwnership(initialOwner);
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /**
     * @dev Mints tokens to `to`. Only the owner can call this.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title CustomDex
 * @notice A minimal DEX that enforces a single global max supply across all CustomTokens.
 *         It uses Chainlink for ETH/USD pricing, applies a 0.3% fee on token-to-token swaps,
 *         and includes fixes to safely handle fee-on-transfer tokens and slippage.
 */
contract CustomDex is ReentrancyGuard, Ownable {
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
    string[] public tokenList;

    // -----------------------------
    //      Chainlink Price Feed
    // -----------------------------
    AggregatorV3Interface public priceFeed;

    // -----------------------------
    //       Swap Fee & Events
    // -----------------------------
    uint256 public swapFeeBps = 30; // 0.3%
    event Swapped(
        address indexed user,
        string indexed tokenA,
        string indexed tokenB,
        uint256 inputAmount,
        uint256 outputAmount
    );

    // -----------------------------
    //          Constructor
    // -----------------------------
    constructor(address _priceFeed) Ownable(msg.sender){
        priceFeed = AggregatorV3Interface(_priceFeed);
        // Deploy initial tokens with 100k supply minted to the DEX.
        _addToken("tUSD", "tUSD", 100_000 * 10**18);
        _addToken("BNB", "BNB", 100_000 * 10**18);
        _addToken("USDC", "USDC", 100_000 * 10**18);
        _addToken("TRON", "TRON", 100_000 * 10**18);
        _addToken("MATIC", "MATIC", 100_000 * 10**18);
    }

    /**
     * @dev Allows the owner to update the Chainlink price feed address.
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * @dev Owner can deploy a new CustomToken.
     */
    function addToken(string memory name, string memory symbol, uint256 initialSupply)
        external
        onlyOwner
    {
        _addToken(name, symbol, initialSupply);
    }

    /**
     * @dev Internal helper to deploy a new token and enforce the global cap.
     */
    function _addToken(string memory name, string memory symbol, uint256 initialSupply)
        internal
    {
        require(bytes(name).length > 0, "Invalid token name");
        require(address(tokenInstanceMap[name]) == address(0), "Token already exists");
        require(mintedSoFar + initialSupply <= GLOBAL_MAX_SUPPLY, "Exceeds global supply");
        mintedSoFar += initialSupply;

        CustomToken token = new CustomToken(name, symbol, address(this), 0);
        tokenInstanceMap[name] = token;
        tokenList.push(name);

        if (initialSupply > 0) {
            token.mint(address(this), initialSupply);
        }
    }

    /**
     * @dev Mint additional supply for an existing token.
     */
    function mintToken(string memory tokenName, uint256 amount) external onlyOwner {
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");
        require(mintedSoFar + amount <= GLOBAL_MAX_SUPPLY, "Exceeds global supply");
        mintedSoFar += amount;
        tokenInstanceMap[tokenName].mint(address(this), amount);
    }

    // ----------------------------------------
    //         GETTERS & VIEW FUNCTIONS
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
    //      ETH <--> TOKEN SWAPS (Chainlink Price)
    // ----------------------------------------

    /**
     * @dev Swap ETH to token using Chainlink ETH/USD price.
     * Uses actual token balance difference to account for fee-on-transfer tokens.
     *
     * Formula:
     *   tokenAmount = (msg.value * ethPrice * 1e10) / 1e18
     * where ethPrice is provided by Chainlink with 8 decimals.
     */
    function swapEthToToken(string memory tokenName, uint256 minOutputValue)
        public
        payable
        nonReentrant
        returns (uint256)
    {
        require(msg.value > 0, "No ETH sent");
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");

        // Get the latest ETH/USD price.
        (, int256 price, , ,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        uint256 ethPrice = uint256(price);

        // Calculate the expected token output.
        uint256 expectedOutput = (msg.value * ethPrice * 1e10) / 1e18;
        require(expectedOutput >= minOutputValue, "Slippage too high");

        // Check DEX token balance before transfer.
        IERC20 token = IERC20(tokenInstanceMap[tokenName]);
        uint256 balanceBefore = token.balanceOf(address(msg.sender));

        // Transfer tokens from DEX to user.
        token.safeTransfer(msg.sender, expectedOutput);

        // Use post-transfer balance to ensure actual amount transferred (for fee-on-transfer tokens).
        uint256 balanceAfter = token.balanceOf(address(msg.sender));
        uint256 actualOutput = balanceAfter - balanceBefore;
        require(actualOutput >= minOutputValue, "Actual output less than minimum");

        emit Swapped(msg.sender, "ETH", tokenName, msg.value, actualOutput);
        return actualOutput;
    }

    /**
     * @dev Swap token to ETH using Chainlink ETH/USD price.
     * Uses balance difference to account for fee-on-transfer tokens.
     *
     * Formula:
     *   ethAmount = (tokenReceived * 1e18) / (ethPrice * 1e10)
     */
    function swapTokenToEth(string memory tokenName, uint256 amount, uint256 minOutputValue)
        public
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Invalid amount");
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");

        IERC20 token = IERC20(tokenInstanceMap[tokenName]);
        // Record contract’s token balance before transfer.
        uint256 balanceBefore = token.balanceOf(address(this));
        // Transfer tokens from user to contract.
        token.safeTransferFrom(msg.sender, address(this), amount);
        // Calculate the actual amount received.
        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 effectiveAmount = balanceAfter - balanceBefore;
        require(effectiveAmount > 0, "No tokens received");

        // Get the latest ETH/USD price.
        (, int256 price, , ,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        uint256 ethPrice = uint256(price);

        // Calculate ETH to transfer.
        
        uint256 denominator = ethPrice * 1e10;
        uint256 expectedEth = ((effectiveAmount * 1e18) + denominator - 1) / denominator;

        require(expectedEth >= minOutputValue, "Slippage too high");
        require(address(this).balance >= expectedEth, "Insufficient DEX ETH balance");

        // Transfer ETH to user.
        (bool success, ) = payable(msg.sender).call{value: expectedEth}("");
        require(success, "ETH transfer failed");

        emit Swapped(msg.sender, tokenName, "ETH", effectiveAmount, expectedEth);
        return expectedEth;
    }

    // ----------------------------------------
    //      TOKEN <--> TOKEN SWAPS
    // ----------------------------------------

    /**
     * @dev Swap one token for another using a Uniswap-style formula with fee adjustment.
     * Uses balance differences to account for fee-on-transfer tokens.
     *
     * The process:
     *   1. Transfer source tokens and calculate the effective received amount.
     *   2. Apply a 0.3% fee.
     *   3. Compute output using the constant product formula based on DEX reserves.
     *   4. Perform the token output transfer and verify actual amount transferred.
     */
    function swapTokenToToken(
        string memory srcTokenName,
        string memory destTokenName,
        uint256 amountIn,
        uint256 minOutputValue
    ) public nonReentrant returns (uint256 outputValue) {
        require(amountIn > 0, "Invalid amount");
        require(
            keccak256(bytes(srcTokenName)) != keccak256(bytes(destTokenName)),
            "Cannot swap same token"
        );
        require(address(tokenInstanceMap[srcTokenName]) != address(0), "Src token does not exist");
        require(address(tokenInstanceMap[destTokenName]) != address(0), "Dest token does not exist");

        IERC20 srcToken = IERC20(tokenInstanceMap[srcTokenName]);
        IERC20 destToken = IERC20(tokenInstanceMap[destTokenName]);

        // Determine the effective amount received from srcToken (accounting for fee-on-transfer).
        uint256 srcBalanceBefore = srcToken.balanceOf(address(this));
        srcToken.safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 srcBalanceAfter = srcToken.balanceOf(address(this));
        uint256 effectiveAmountIn = srcBalanceAfter - srcBalanceBefore;
        require(effectiveAmountIn > 0, "No tokens received");

        // Apply the swap fee.
        uint256 amountInAfterFee = (effectiveAmountIn * (1000 - swapFeeBps)) / 1000;

        // Use the current liquidity in the DEX for both tokens.
        uint256 srcReserve = srcToken.balanceOf(address(this));
        uint256 destReserve = destToken.balanceOf(address(this));
        require(srcReserve > 0 && destReserve > 0, "No liquidity available");

        // Uniswap-style constant product formula.
        outputValue = (destReserve * amountInAfterFee) / (srcReserve + amountInAfterFee);
        require(outputValue >= minOutputValue, "Slippage too high");
        require(outputValue <= destReserve, "Insufficient liquidity for swap");

        // Record destination token balance of the user before transfer.
        uint256 userBalanceBefore = destToken.balanceOf(msg.sender);
        // Transfer destination tokens.
        destToken.safeTransfer(msg.sender, outputValue);
        // Check actual amount received.
        uint256 userBalanceAfter = destToken.balanceOf(msg.sender);
        uint256 actualOutput = userBalanceAfter - userBalanceBefore;
        require(actualOutput >= minOutputValue, "Actual output less than minimum");

        // emit Swapped(msg.sender, srcTokenName, destTokenName, effectiveAmountIn, actualOutput);
        return actualOutput;
    }

    // ----------------------------------------
    //         Owner / Admin Utilities
    // ----------------------------------------
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Not enough ETH");
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdraw failed");
    }

    /**
     * @dev Fallback function to accept ETH.
     */
    receive() external payable {}
}
