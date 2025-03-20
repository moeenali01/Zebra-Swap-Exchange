// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZebraLiquidityNFT is ERC721, Pausable, Ownable(msg.sender), ReentrancyGuard {
    uint256 private _nextTokenId;

    // Struct to store token information in the NFT
    struct LiquidityNFTInfo {
        address tokenAddress;
        uint256 amount;
        uint256 createdTimestamp;
        uint256 lastUpdatedTimestamp;
    }

    // Mapping of NFT ID to Liquidity NFT Info
    mapping(uint256 => LiquidityNFTInfo) public nftInfo;

    constructor() ERC721("Liquidity Provider NFT", "LP-NFT") {}

    // Mint the NFT with token liquidity info
    function mint(address to, address tokenAddress, uint256 amount) public whenNotPaused onlyOwner returns (uint256) {
        _safeMint(to, _nextTokenId);
        _nextTokenId++;

        // Store the liquidity info with the minted NFT
        nftInfo[_nextTokenId] = LiquidityNFTInfo({
            tokenAddress: tokenAddress,
            amount: amount,
            createdTimestamp: block.timestamp, // Set creation timestamp
            lastUpdatedTimestamp: block.timestamp // Set last updated timestamp
        });

        return _nextTokenId;
    }

    // Update NFT info, including the timestamps
    function updateNFTInfo(uint256 tokenId, uint256 amount) external {
        // Ensure that the sender is the owner of the NFT
        require(ownerOf(tokenId) == msg.sender, "You are not the owner of this NFT");
        // Update the NFT info with the new data
        LiquidityNFTInfo storage info = nftInfo[tokenId];
        info.amount = amount;
        info.lastUpdatedTimestamp = block.timestamp; // Update last updated timestamp

        emit MetadataUpdated(tokenId, amount);
    }

    // Event for updating the NFT metadata
    event MetadataUpdated(uint256 tokenId, uint256 amount);

    // Function to get NFT info, including timestamps
    function getNFTInfo(uint256 tokenId)
        external
        view
        returns (address tokenAddress, uint256 amount, uint256 createdTimestamp, uint256 lastUpdatedTimestamp)
    {
        LiquidityNFTInfo memory info = nftInfo[tokenId];
        return (info.tokenAddress, info.amount, info.createdTimestamp, info.lastUpdatedTimestamp);
    }

    // Function to pause the contract (onlyOwner)
    function pause() external onlyOwner {
        _pause(); // Internal function from Pausable contract
    }

    // Function to unpause the contract (onlyOwner)
    function unpause() external onlyOwner {
        _unpause(); // Internal function from Pausable contract
    }
}

contract ZebraSwap is Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct TokenInfo {
        address tokenAddress;
        bool isAllowed;
        uint256 price; // in USD
        uint8 decimals; // Token decimals
    }

    struct LiquidityPosition {
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public FEE_PERCENTAGE = 1; // 1% swap fee

    mapping(string => TokenInfo) public allowedTokens;
    mapping(address => mapping(address => LiquidityPosition)) public liquidityPositions;

    ZebraLiquidityNFT public liquidityNFT;
    address public feeCollector;

    struct History {
        uint256 historyId;
        string tokenA;
        string tokenB;
        uint256 inputValue;
        uint256 outputValue;
        address userAddress;
    }

    uint256 public _historyIndex;

    mapping(uint256 => History) private historys;

    mapping(uint256 => address) private _nftowners;

    event TokenAllowed(string symbol, address tokenAddress, uint256 price, uint8 decimals);
    event LiquidityAdded(address user, address token, uint256 amount);
    event LiquidityRemoved(address user, address token, uint256 amount);
    event Swapped(
        address indexed user, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount
    );
    event FeesCollected(uint256 amount);
    event FeeCollectorChanged(address indexed oldFeeCollector, address indexed newFeeCollector);
    event ETHWithdrawn(address indexed owner, uint256 amount);

    constructor(address liquidityNFTAddress) Ownable(msg.sender) {
        liquidityNFT = ZebraLiquidityNFT(liquidityNFTAddress);
        feeCollector = msg.sender;
    }

    // Function to change the fee collector (only owner can change)
    function setFeeCollector(address payable newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "New fee collector address cannot be zero");
        address oldFeeCollector = feeCollector;
        feeCollector = newFeeCollector;
        emit FeeCollectorChanged(oldFeeCollector, newFeeCollector);
    }

    function setFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 100, "Fee percentage cannot exceed 100");
        FEE_PERCENTAGE = newFeePercentage;
    }

    function getTokenInfo(string memory symbol)
        external
        view
        returns (address tokenAddress, uint256 price, bool isAllowed)
    {
        TokenInfo memory token = allowedTokens[symbol];
        return (token.tokenAddress, token.price, token.isAllowed);
    }

    // Function to get the balance of any token this contract holds
    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function allowToken(string memory symbol, address tokenAddress, uint256 price, uint8 decimals) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        allowedTokens[symbol] =
            TokenInfo({tokenAddress: tokenAddress, isAllowed: true, price: price, decimals: decimals});

        emit TokenAllowed(symbol, tokenAddress, price, decimals);
    }

    function addLiquidity(string memory symbol, uint256 amount) external whenNotPaused {
        TokenInfo memory token = allowedTokens[symbol];
        require(token.isAllowed, "Token not allowed");

        IERC20 tokenContract = IERC20(token.tokenAddress);

        // Validate if the user is providing the correct amount relative to the token's decimals
        uint256 amountWithDecimals;

        // If the token has decimals (e.g., 18 decimals for most ERC20 tokens)
        if (token.decimals == 18) {
            // The amount is already in the correct scale, no need to multiply
            amountWithDecimals = amount;
        } else {
            // Scale the amount according to the token's decimals
            amountWithDecimals = amount * (10 ** token.decimals);
        }

        // Ensure that the amount is not too small to prevent rounding issues
        require(amountWithDecimals > 0, "Amount must be greater than zero");

        // Record the contract's balance before the transfer
        uint256 initialBalance = tokenContract.balanceOf(address(this));

        // Transfer tokens from user considering decimals
        // uint256 amountWithDecimals = amount * (10 ** token.decimals);
        tokenContract.safeTransferFrom(msg.sender, address(this), amountWithDecimals);

        // Record the contract's balance after the transfer
        uint256 finalBalance = tokenContract.balanceOf(address(this));

        // Calculate the actual amount received (after fee deduction)
        uint256 actualAmountReceived = finalBalance - initialBalance;

        // Ensure that the transfer was successful and the contract received a positive amount
        require(actualAmountReceived > 0, "Fee on transfer token: No tokens received after fee");

        // Update liquidity position

        LiquidityPosition storage position = liquidityPositions[msg.sender][token.tokenAddress];
        position.amount += amountWithDecimals;
        position.timestamp = block.timestamp;

        // Mint Liquidity NFT with token and actual received amount info
        uint256 nftid = liquidityNFT.mint(msg.sender, token.tokenAddress, amountWithDecimals);
        _nftowners[nftid] = msg.sender;

        emit LiquidityAdded(msg.sender, token.tokenAddress, amountWithDecimals);
    }

    function removeLiquidity(
        string memory symbol,
        uint256 amount,
        uint256 nftId // Added NFT ID as input
    ) external whenNotPaused {
        TokenInfo memory token = allowedTokens[symbol];
        require(token.isAllowed, "Token not allowed");
        require(_nftowners[nftId] == msg.sender, "You do not own this NFT");

        LiquidityPosition storage position = liquidityPositions[msg.sender][token.tokenAddress];
        require(position.amount >= amount, "Insufficient liquidity");

        IERC20 tokenContract = IERC20(token.tokenAddress);

        // Record the contract's balance before the transfer
        uint256 initialBalance = tokenContract.balanceOf(address(this));

        // Update liquidity position
        position.amount -= amount;

        // Transfer tokens back to the user
        tokenContract.safeTransfer(msg.sender, amount);

        // Find the user's liquidity NFT (NFT ID provided by user)

        // Record the contract's balance after the transfer
        uint256 finalBalance = tokenContract.balanceOf(address(this));

        // Calculate the actual amount transferred to the user (after fee deduction)
        uint256 actualAmountTransferred = initialBalance - finalBalance;

        // Ensure that the transfer was successful and the contract sent a positive amount
        require(actualAmountTransferred > 0, "Fee on transfer token: No tokens sent after fee");

        // Get current NFT information from ZebraLiquidityNFT
        (, uint256 nftAmount,,) = liquidityNFT.getNFTInfo(nftId); // Get the current amount from the NFT

        // Update the NFT info with the new liquidity amount and timestamp only if the amount has changed
        if (position.amount != nftAmount) {
            liquidityNFT.updateNFTInfo(nftId, position.amount);
        }

        emit LiquidityRemoved(msg.sender, token.tokenAddress, amount);
    }

    function _transactionHistory(
        string memory tokenName,
        string memory etherToken,
        uint256 inputValue,
        uint256 outputValue
    ) internal {
        _historyIndex++;
        uint256 _historyId = _historyIndex;
        History storage history = historys[_historyId];
        history.historyId = _historyId;
        history.userAddress = msg.sender;
        history.tokenA = tokenName;
        history.tokenB = etherToken;
        history.inputValue = inputValue;
        history.outputValue = outputValue;
    }

    function WanToToken(string memory outputSymbol) external payable whenNotPaused {
        uint256 inputAmount = msg.value; // Use msg.value to get the amount of WAN sent

        TokenInfo memory outputToken = allowedTokens[outputSymbol];
        require(outputToken.isAllowed, "Output token not allowed");

        TokenInfo memory inputToken = allowedTokens["WAN"];
        // Get decimals for WAN (native token) and the output token
        uint8 inputDecimals = 18; // WAN (native token) generally has 18 decimals
        uint8 outputDecimals = outputToken.decimals; // Output token decimals

        // Calculate the fee and the amount to swap

        uint256 feeAmount = (inputAmount * FEE_PERCENTAGE * (10 ** inputDecimals)) / (100 * (10 ** inputDecimals));

        uint256 swapAmount = inputAmount - feeAmount;

        // Transfer the fee to the fee collector (in native tokens)
        payable(feeCollector).transfer(feeAmount);

        // Calculate the output amount based on the price and adjust for decimals
        uint256 outputAmount =
            (swapAmount * outputToken.price * (10 ** outputDecimals)) / (inputToken.price * (10 ** inputDecimals));

        // Ensure there's sufficient liquidity of the output token
        require(IERC20(outputToken.tokenAddress).balanceOf(address(this)) >= outputAmount, "Insufficient liquidity");

        // Transfer the output tokens to the user
        IERC20(outputToken.tokenAddress).safeTransfer(msg.sender, outputAmount);

        _transactionHistory("WAN", outputSymbol, inputAmount, outputAmount);

        // Emit the swap event
        emit Swapped(msg.sender, address(0), outputToken.tokenAddress, inputAmount, outputAmount);
    }

    function TokenToWan(string memory inputSymbol, uint256 inputAmount) external whenNotPaused {
        TokenInfo memory inputToken = allowedTokens[inputSymbol];
        require(inputToken.isAllowed, "Input token not allowed");
        // Get decimals for input token
        uint8 inputDecimals = inputToken.decimals;

        uint8 outputDecimals = 18;
        uint256 scaledInputAmount = inputAmount * (10 ** inputDecimals); // Correctly scale the input amount based on the input token's decimals

        uint256 feeAmount = (scaledInputAmount * FEE_PERCENTAGE) / 100;
        uint256 swapAmount = scaledInputAmount - feeAmount;

        // Transfer the input tokens from the user to the contract
        IERC20(inputToken.tokenAddress).safeTransferFrom(msg.sender, address(this), scaledInputAmount);

        // Transfer the fee to the fee collector
        uint256 feeAmountScaled = feeAmount / (10 ** inputDecimals); // scale the fee back

        IERC20(inputToken.tokenAddress).safeTransfer(feeCollector, feeAmountScaled);

        // Calculate the output amount in WAN (adjusted for decimals and price)
        uint256 outputAmount = (swapAmount * inputToken.price * (10 ** outputDecimals)) / (10 ** inputDecimals); // Correct the calculation to include decimals

        // Ensure there's enough balance of WAN to complete the swap
        require(address(this).balance >= outputAmount, "Insufficient liquidity");

        // Transfer the output amount (WAN) to the user
        payable(msg.sender).transfer(outputAmount);

        _transactionHistory(inputSymbol, "WAN", inputAmount, outputAmount);

        // Emit the swap event
        emit Swapped(msg.sender, inputToken.tokenAddress, address(0), inputAmount, outputAmount);
    }

    function TokenToToken(string memory inputSymbol, string memory outputSymbol, uint256 inputAmount)
        external
        whenNotPaused
    {
        TokenInfo memory inputToken = allowedTokens[inputSymbol];
        TokenInfo memory outputToken = allowedTokens[outputSymbol];

        require(inputToken.isAllowed, "Input token not allowed");
        require(outputToken.isAllowed, "Output token not allowed");

        // Get decimals for input and output tokens
        uint8 inputDecimals = inputToken.decimals;
        uint8 outputDecimals = outputToken.decimals;
        // Ensure inputAmount is in the correct scale
        uint256 scaledInputAmount = inputAmount * (10 ** inputDecimals); // Scale input based on the token's decimals

        // Calculate the fee and swap amount
        uint256 feeAmount = (scaledInputAmount * FEE_PERCENTAGE) / 100;
        uint256 swapAmount = scaledInputAmount - feeAmount;

        // Transfer the input tokens from the user to the contract
        IERC20(inputToken.tokenAddress).safeTransferFrom(msg.sender, address(this), scaledInputAmount);

        // Transfer the fee to the fee collector
        uint256 feeAmountScaled = feeAmount / (10 ** inputDecimals); // scale the fee back to the original amount

        IERC20(inputToken.tokenAddress).safeTransfer(feeCollector, feeAmountScaled);

        // Calculate the output amount considering token prices and decimals
        uint256 outputAmount =
            (swapAmount * inputToken.price * (10 ** outputDecimals)) / (outputToken.price * (10 ** inputDecimals));

        // Ensure there's sufficient liquidity of the output token
        require(IERC20(outputToken.tokenAddress).balanceOf(address(this)) >= outputAmount, "Insufficient liquidity");

        // Transfer the output tokens to the user
        IERC20(outputToken.tokenAddress).safeTransfer(msg.sender, outputAmount);

        _transactionHistory(inputSymbol, outputSymbol, inputAmount, outputAmount);
        // Emit the swap event

        emit Swapped(msg.sender, inputToken.tokenAddress, outputToken.tokenAddress, inputAmount, outputAmount);
    }

    function changeTokenPrice(string memory symbol, uint256 newPrice) external onlyOwner {
        TokenInfo storage token = allowedTokens[symbol];
        require(token.isAllowed, "Token is not allowed");

        // Update the token price only if the token exists and is allowed
        token.price = newPrice;
    }

    function getAllHistory() public view returns (History[] memory) {
        uint256 itemCount = _historyIndex;
        uint256 currentIndex = 0;

        History[] memory items = new History[](itemCount);
        for (uint256 i = 1; i < itemCount; i++) {
            uint256 currentId = i + 1;
            History storage currentItem = historys[currentId];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }

    // Function to pause the contract (onlyOwner)
    function pause() external onlyOwner {
        _pause(); // Internal function from Pausable contract
    }

    // Function to unpause the contract (onlyOwner)
    function unpause() external onlyOwner {
        _unpause(); // Internal function from Pausable contract
    }

    receive() external payable {}

    //Functon to Withdraw ETH from Contract
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");

        // Transfer the specified amount of ETH to the owner
        payable(owner()).transfer(amount);

        // Emit an event for transparency
        emit ETHWithdrawn(owner(), amount);
    }
}
