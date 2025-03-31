// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";


/**
 * @title ZebraLiquidityNFT
 * @notice This ERC721 contract represents Liquidity NFTs, each storing metadata about
 *         the token address, amount of liquidity, and timestamps.
 */
contract ZebraLiquidityNFT is ERC721, Pausable, Ownable(msg.sender), ReentrancyGuard {
    using Strings for uint256;

    /// @notice NFT token ID counter
    uint256 private _nextTokenId;

    /// @notice Precision for fee calculations or percentages
    uint256 public constant FEE_DENOMINATOR = 1_000_000;

    /// @notice Fee percentage (10,000 means 1% if / 1,000,000)
    uint256 public FEE_PERCENTAGE = 10_000;

    /// @dev Stores metadata about the underlying liquidity of each NFT
    struct LiquidityNFTInfo {
        address tokenAddress;
        uint256 amount;
        uint256 createdTimestamp;
        uint256 lastUpdatedTimestamp;
    }

    /// @dev Mapping of NFT ID to its Liquidity Info
    mapping(uint256 => LiquidityNFTInfo) public nftInfo;
    


    /// @dev Emitted when NFT metadata is updated
    event MetadataUpdated(uint256 indexed tokenId, uint256 newAmount);

    /**
     * @dev Sets up the NFT with a name and symbol.
     */
    constructor() ERC721("Liquidity Provider NFT", "LP-NFT") {}

    /**
     * @notice Mint a new Liquidity NFT.
     * @dev Only callable by the owner. Pausable for emergencies.
     * @param to Recipient address of the NFT
     * @param tokenAddress The ERC20 token address for the liquidity
     * @param amount The liquidity amount stored in the NFT
     * @return The minted NFT's tokenId
     */
    function mint(
        address to,
        address tokenAddress,
        uint256 amount
    )
        external
        whenNotPaused
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        uint256 currentTokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, currentTokenId);

        nftInfo[currentTokenId] = LiquidityNFTInfo({
            tokenAddress: tokenAddress,
            amount: amount,
            createdTimestamp: block.timestamp,
            lastUpdatedTimestamp: block.timestamp
        });

        return currentTokenId;
    }

    /**
     * @notice Update the metadata (amount) of an existing NFT.
     * @dev Only the NFT owner can update. Also updates the lastUpdatedTimestamp.
     * @param tokenId The NFT ID to update
     * @param amount New amount of liquidity to store
     */
    function updateNFTInfo(uint256 tokenId, uint256 amount) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        LiquidityNFTInfo storage info = nftInfo[tokenId];
        info.amount = amount;
        info.lastUpdatedTimestamp = block.timestamp;
        emit MetadataUpdated(tokenId, amount);
    }

    /**
     * @notice Returns the liquidity NFT metadata for a given tokenId.
     * @param tokenId The NFT ID to query.
     */
    function getNFTInfo(uint256 tokenId)
        external
        view
        returns (
            address tokenAddress,
            uint256 amount,
            uint256 createdTimestamp,
            uint256 lastUpdatedTimestamp
        )
    {
        LiquidityNFTInfo storage info = nftInfo[tokenId];
        return (
            info.tokenAddress,
            info.amount,
            info.createdTimestamp,
            info.lastUpdatedTimestamp
        );
    }
}

/**
 * @title ZebraSwap
 * @notice The main swapping contract that holds ERC20 liquidity and uses a feeCollector to collect fees.
 *         Integrates with ZebraLiquidityNFT to track liquidity positions as NFTs.
 */
contract ZebraSwap is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Precision constant for percentage math
    uint256 public constant FEE_DENOMINATOR = 1_000_000;

    /// @notice Fee percentage (10,000 means 1% if / 1,000,000)
    uint256 public FEE_PERCENTAGE = 10_000; // 1%

    /// @dev Address authorized to collect fees
    address public feeCollector;

    /// @dev Liquidity NFT contract (manages minted NFTs)
    ZebraLiquidityNFT public liquidityNFT;

    /**
     * @dev Stores data about a token allowed for swapping.
     * @param tokenAddress The ERC20 address.
     * @param isAllowed Whether swapping/liquidity is permitted for this token.
     * @param price Price in USD-based units (owner-managed).
     * @param decimals The token's own decimals.
     */
    struct TokenInfo {
        address tokenAddress;
        bool isAllowed;
        uint256 price; // in "USD" units (centralized)
        uint8 decimals;
    }

    /**
     * @dev Tracks the liquidity added by a user for a specific token.
     *      This mapping is only partially relevant if also using NFTs.
     */
    struct LiquidityPosition {
        uint256 amount;
        uint256 timestamp;
    }

    /// @dev symbol => TokenInfo
    mapping(string => TokenInfo) public allowedTokens;

    /// @dev user => (tokenAddress => LiquidityPosition)
    mapping(address => mapping(address => LiquidityPosition)) public liquidityPositions;

    /**
     * @dev Stores swap history info for frontends.
     * @param historyId Auto-incrementing ID
     * @param tokenA Input token symbol
     * @param tokenB Output token symbol
     * @param inputValue Amount of input
     * @param outputValue Amount of output
     * @param userAddress The user performing the swap
     */
    struct History {
        uint256 historyId;
        string tokenA;
        string tokenB;
        uint256 inputValue;
        uint256 outputValue;
        address userAddress;
    }

    /// @dev Internal index for swap history
    uint256 private _historyIndex;

    /// @dev Mapping of historyId => History
    mapping(uint256 => History) private _histories;

    mapping(address => uint256) private wanBalances;


    /// ------------------ EVENTS ------------------ ///
    event TokenAllowed(string symbol, address tokenAddress, uint256 price, uint8 decimals);
    event TokenDisallowed(string symbol);
    event LiquidityAdded(address indexed user, address indexed token, uint256 amount,uint256 tokenId);
    event LiquidityRemoved(address indexed user, address indexed token, uint256 amount);
    event Swapped(
        address indexed user,
        address indexed inputToken,
        address indexed outputToken,
        uint256 inputAmount,
        uint256 outputAmount
    );
    event FeeCollectorChanged(address indexed oldFeeCollector, address indexed newFeeCollector);
    event ETHWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev Deploy with reference to the existing LiquidityNFT contract.
     * @param liquidityNFTAddress The deployed ZebraLiquidityNFT address.
     */
    constructor(address liquidityNFTAddress) Ownable(msg.sender) {
        require(liquidityNFTAddress != address(0), "Invalid NFT address");
        liquidityNFT = ZebraLiquidityNFT(liquidityNFTAddress);
        feeCollector = msg.sender;
    }

    /**
     * @notice Set a new address for fee collection.
     * @param newFeeCollector The address to receive swap fees.
     */
    function setFeeCollector(address payable newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Cannot set zero address");
        address oldFeeCollector = feeCollector;
        feeCollector = newFeeCollector;
        emit FeeCollectorChanged(oldFeeCollector, newFeeCollector);
    }

    /**
     * @notice Update the fee percentage used in swaps.
     * @dev 1_000_000 in denominator => 10_000 means 1%.
     * @param newFeePercentage The new fee fraction of FEE_DENOMINATOR.
     */
    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= FEE_DENOMINATOR, "Fee percentage too high");
        FEE_PERCENTAGE = newFeePercentage;
    }

    /**
     * @notice Retrieve details about a token from its symbol.
     * @param symbol The string symbol of the token (e.g., "USDT", "WAN").
     */
    function getTokenInfo(string memory symbol)
        external
        view
        returns (address tokenAddress, uint256 price, bool isAllowed)
    {
        TokenInfo storage token = allowedTokens[symbol];
        return (token.tokenAddress, token.price, token.isAllowed);
    }

    /**
     * @notice Get this contract's current balance of a given token.
     * @param tokenAddress The ERC20 address to check.
     */
    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    /**
     * @notice Allow a new token to be used for liquidity and swapping.
     * @param symbol The symbol (mapping key).
     * @param tokenAddress The ERC20 address.
     * @param price A price in USD-based units.
     * @param decimals The token's decimals.
     */
    function allowToken(
        string memory symbol,
        address tokenAddress,
        uint256 price,
        uint8 decimals
    )
        external
        onlyOwner
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(price > 1e15, "Price too small");
        require(!allowedTokens[symbol].isAllowed, "Token already allowed");

        allowedTokens[symbol] = TokenInfo({
            tokenAddress: tokenAddress,
            isAllowed: true,
            price: price,
            decimals: decimals
        });

        emit TokenAllowed(symbol, tokenAddress, price, decimals);
    }

    /**
     * @notice Disallow a previously allowed token.
     * @param symbol The symbol to disallow.
     */
    function disallowToken(string memory symbol) external onlyOwner {
        require(allowedTokens[symbol].isAllowed, "Token already disallowed");
        allowedTokens[symbol].isAllowed = false;
        emit TokenDisallowed(symbol);
    }

    /**
     * @notice Add liquidity of a given allowed token.
     * @param symbol The token's symbol (must be allowed).
     * @param amount The unscaled amount of tokens to add (e.g., 100).
     */
    function addLiquidity(string memory symbol, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        TokenInfo memory token = allowedTokens[symbol];
        require(token.isAllowed, "Token not allowed");

        IERC20 tokenContract = IERC20(token.tokenAddress);

        // Scale the user's input by token decimals
        uint256 amountWithDecimals = token.decimals == 18
            ? amount
            : amount * (10 ** token.decimals);
        require(amountWithDecimals > 0, "Amount must be greater than zero");

        // Track balance before & after to confirm exact transfer
        uint256 initialBalance = tokenContract.balanceOf(address(this));
        tokenContract.safeTransferFrom(msg.sender, address(this), amountWithDecimals);
        uint256 finalBalance = tokenContract.balanceOf(address(this));
        uint256 actualAmountReceived = finalBalance - initialBalance;

        // Allow a tolerance of 2% (i.e. require at least 98% of the expected tokens are received)
        uint256 minimumAcceptable = (amountWithDecimals * 98) / 100;
        require(actualAmountReceived >= minimumAcceptable, "Transfer amount mismatch");


        // Update user's liquidity mapping
        LiquidityPosition storage position = liquidityPositions[msg.sender][token.tokenAddress];
        position.amount += actualAmountReceived;
        position.timestamp = block.timestamp;

        // Mint an NFT representing this liquidity
        // The minted NFT tracks the entire amount; in a real system, you might
        // want to create or update existing NFTs if you prefer one NFT per user+token.
        // liquidityNFT.mint(msg.sender, token.tokenAddress, actualAmountReceived);
            uint256 tokenId = liquidityNFT.mint(msg.sender, token.tokenAddress, actualAmountReceived);

        emit LiquidityAdded(msg.sender, token.tokenAddress, actualAmountReceived,tokenId);
    }

    /**
     * @notice Remove liquidity from the contract. Uses an NFT-based check for ownership.
     * @param symbol The symbol of the token to remove.
     * @param amount The amount (scaled) of tokens to remove.
     * @param nftId The NFT ID that represents this liquidity position.
     */
    function removeLiquidity(
        string memory symbol,
        uint256 amount,
        uint256 nftId
    )
        external
        whenNotPaused
        nonReentrant
    {
        TokenInfo memory token = allowedTokens[symbol];
        require(token.isAllowed, "Token not allowed");

        // Check that the caller is indeed the owner of the relevant NFT
        require(liquidityNFT.ownerOf(nftId) == msg.sender, "Not the NFT owner");

        // Check in the liquidity mapping that user has enough tokens
        LiquidityPosition storage position = liquidityPositions[msg.sender][token.tokenAddress];
        require(position.amount >= amount, "Insufficient liquidity");

        // Update internal accounting
        position.amount -= amount;

        // // Optional: we also check the NFT's stored amount, then update it
        // (
        //     ,
        //     uint256 nftAmount,
        //     ,
        // ) = liquidityNFT.getNFTInfo(nftId);

        // if (position.amount != nftAmount) {
        //     // Update the NFT's metadata to reflect the new total
        //     liquidityNFT.updateNFTInfo(nftId, position.amount);
        // }

        // Transfer the tokens out
        IERC20 tokenContract = IERC20(token.tokenAddress);
        uint256 initialBalance = tokenContract.balanceOf(address(this));
        tokenContract.safeTransfer(msg.sender, amount);
        uint256 finalBalance = tokenContract.balanceOf(address(this));

        uint256 actualAmountTransferred = initialBalance - finalBalance;
        require(actualAmountTransferred > 0, "No tokens transferred; fee on transfer?");

        emit LiquidityRemoved(msg.sender, token.tokenAddress, amount);
    }

    /**
     * @dev Internal function to record transaction history for swaps.
     */
    function _recordTransactionHistory(
        string memory tokenA,
        string memory tokenB,
        uint256 inputValue,
        uint256 outputValue
    ) internal {
        _historyIndex++;
        uint256 historyId = _historyIndex;

        History storage newHistory = _histories[historyId];
        newHistory.historyId = historyId;
        newHistory.userAddress = msg.sender;
        newHistory.tokenA = tokenA;
        newHistory.tokenB = tokenB;
        newHistory.inputValue = inputValue;
        newHistory.outputValue = outputValue;
    }

    /**
     * @notice Swap WAN -> ERC20 token. (WAN is assumed to have symbol "WAN" in allowedTokens.)
     * @param outputSymbol The symbol of the token to receive.
     */
    function WanToToken(string memory outputSymbol)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        uint256 inputAmount = msg.value;
        require(inputAmount > 0, "Input must be > 0");

        TokenInfo memory outputToken = allowedTokens[outputSymbol];
        require(outputToken.isAllowed, "Output token not allowed");

        TokenInfo memory inputToken = allowedTokens["WAN"];
        require(inputToken.isAllowed, "WAN token must be registered");

        // Calculate fee and swap amount
        uint256 feeAmount = (inputAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        require(feeAmount < inputAmount, "Fee exceeds input");
        uint256 swapAmount = inputAmount - feeAmount;

        // Transfer fee to feeCollector
        (bool feeSent, ) = payable(feeCollector).call{value: feeAmount}("");
        require(feeSent, "Fee transfer failed");

        // Scale prices to 18 decimals
        uint8 inputDecimals = 18; // native WAN
        uint8 outputDecimals = outputToken.decimals;

        uint256 normalizedInputPrice = inputToken.price * (10 ** (18 - inputDecimals));
        uint256 normalizedOutputPrice = outputToken.price * (10 ** (18 - outputDecimals));

        // Calculate output tokens
        uint256 outputAmount = (swapAmount * normalizedInputPrice) / normalizedOutputPrice;
        require(outputAmount > 0, "Output = 0");

        // Ensure contract has enough tokens
        uint256 tokenBalance = IERC20(outputToken.tokenAddress).balanceOf(address(this));
        require(tokenBalance >= outputAmount, "Insufficient liquidity");

        // Transfer to user
        IERC20(outputToken.tokenAddress).safeTransfer(msg.sender, outputAmount);

        // Record history & emit event
        _recordTransactionHistory("WAN", outputSymbol, inputAmount, outputAmount);
        emit Swapped(msg.sender, address(0), outputToken.tokenAddress, inputAmount, outputAmount);
    }

    /**
     * @notice Swap an ERC20 token to WAN.
     * @param inputSymbol The symbol of the token being sold.
     * @param inputAmount The unscaled amount of tokens to swap.
     */
    function TokenToWan(string memory inputSymbol, uint256 inputAmount)
        external
        whenNotPaused
        nonReentrant
    {
        TokenInfo memory inputToken = allowedTokens[inputSymbol];
        require(inputToken.isAllowed, "Input token not allowed");

        // Scale input by decimals
        uint8 inputDecimals = inputToken.decimals;
        uint256 scaledInputAmount = inputAmount * (10 ** inputDecimals);

        // Calculate fee
        uint256 scaledFeeAmount = (scaledInputAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 swapAmount = scaledInputAmount - scaledFeeAmount;
        require(swapAmount > 0, "Swap amount too small");

        // Transfer input from user
        IERC20(inputToken.tokenAddress).safeTransferFrom(msg.sender, address(this), scaledInputAmount);

        // Transfer fee portion to feeCollector
        IERC20(inputToken.tokenAddress).safeTransfer(feeCollector, scaledFeeAmount);

        // Calculate how many WAN to send
        // We assume WAN has 18 decimals
        uint8 outputDecimals = 18;
        uint256 outputAmount = (swapAmount * inputToken.price * (10 ** outputDecimals))
            / (10 ** inputDecimals);

        require(address(this).balance >= outputAmount, "Insufficient WAN liquidity");

        // Transfer WAN out
        // payable(msg.sender).transfer(outputAmount);

        Address.sendValue(payable(msg.sender), outputAmount);

    
        

        _recordTransactionHistory(inputSymbol, "WAN", inputAmount, outputAmount);
        emit Swapped(msg.sender, inputToken.tokenAddress, address(0), inputAmount, outputAmount);
    }

    /**
     * @notice Swap one ERC20 token into another ERC20 token.
     * @param inputSymbol The symbol of the token being sold.
     * @param outputSymbol The symbol of the token to buy.
     * @param inputAmount The unscaled amount of the input token.
     */
    function TokenToToken(
        string memory inputSymbol,
        string memory outputSymbol,
        uint256 inputAmount
    )
        external
        whenNotPaused
        nonReentrant
    {
        TokenInfo memory inputToken = allowedTokens[inputSymbol];
        TokenInfo memory outputToken = allowedTokens[outputSymbol];
        require(inputToken.isAllowed, "Input token not allowed");
        require(outputToken.isAllowed, "Output token not allowed");

        // Scale input by decimals
        uint8 inputDecimals = inputToken.decimals;
        uint8 outputDecimals = outputToken.decimals;
        uint256 scaledInputAmount = inputAmount * (10 ** inputDecimals);

        // Fee
        uint256 scaledFeeAmount = (scaledInputAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 swapAmount = scaledInputAmount - scaledFeeAmount;
        require(swapAmount > 0, "Swap amount too small");

        // Transfer from user
        IERC20(inputToken.tokenAddress).safeTransferFrom(msg.sender, address(this), scaledInputAmount);

        // Transfer fee
        IERC20(inputToken.tokenAddress).safeTransfer(feeCollector, scaledFeeAmount);

        // Price-based output calculation
        uint256 outputAmount = (swapAmount * inputToken.price * (10 ** outputDecimals))
            / (outputToken.price * (10 ** inputDecimals));

        require(
            IERC20(outputToken.tokenAddress).balanceOf(address(this)) >= outputAmount,
            "Insufficient liquidity"
        );

        // Transfer out
        IERC20(outputToken.tokenAddress).safeTransfer(msg.sender, outputAmount);

        _recordTransactionHistory(inputSymbol, outputSymbol, inputAmount, outputAmount);
        emit Swapped(msg.sender, inputToken.tokenAddress, outputToken.tokenAddress, inputAmount, outputAmount);
    }

    /**
     * @notice Change the price of a given token. Centralized function for demonstration.
     * @param symbol The token symbol to change.
     * @param newPrice The new price in the same "USD" scale used initially.
     */
    function changeTokenPrice(string memory symbol, uint256 newPrice) external onlyOwner {
        TokenInfo storage token = allowedTokens[symbol];
        require(token.isAllowed, "Token is not allowed");
        token.price = newPrice;
    }

    /**
     * @notice Get the entire swap history in an array of History structs.
     * @return An array of History entries.
     */
    function getAllHistory() external view returns (History[] memory) {
        uint256 itemCount = _historyIndex;
        History[] memory items = new History[](itemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            items[i - 1] = _histories[i];
        }
        return items;
    }

    /**
     * @notice Retrieve a single history entry by ID.
     * @param historyId The ID to retrieve (1-based).
     */
    function getHistory(uint256 historyId) external view returns (History memory) {
        require(historyId > 0 && historyId <= _historyIndex, "Invalid history ID");
        return _histories[historyId];
    }

    /**
     * @notice Pause the contract (onlyOwner).
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract (onlyOwner).
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Receive WAN/ETH directly. Typically from TokenToWan redemption.
     */
    receive() external payable {}

    /**
     * @notice Fallback to revert any unknown calls.
     */
    fallback() external payable {
        revert("Fallback not allowed");
    }

    /**
     * @notice Withdraw WAN/ETH from contract to owner.
     * @param amount The amount of ETH to withdraw.
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool sent, ) = payable(owner()).call{value: amount}("");
        require(sent, "Withdraw transfer failed");
        emit ETHWithdrawn(owner(), amount);
    }


}
