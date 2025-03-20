// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CustomToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000 * 10 ** 18; // Maximum supply of 1M tokens

    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {
        // Only mint the initial supply once, and only to the owner
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    // Function to mint additional tokens (only callable by the owner)
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "ERC20: minting exceeds max supply");
        _mint(to, amount);
    }
}

contract CustomDex is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Custom tokens to be initialized
    string[] public tokens = ["tUSD", "BNB", "USDC", "TRON", "MATIC"];

    //map to mantain the tokens and its instance

    mapping(string => ERC20) public tokenInstanceMap;

    uint256 ethValue = 1 ether;

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

    constructor() {
        for (uint256 i = 0; i < tokens.length; i++) {
            CustomToken token = new CustomToken(tokens[i], tokens[i]);
            tokenInstanceMap[tokens[i]] = token;
        }
    }

    function getBalance(string memory tokenName, address _address) public view returns (uint256) {
        return tokenInstanceMap[tokenName].balanceOf(_address);
    }

    function getTotalSupply(string memory tokenName) public view returns (uint256) {
        return tokenInstanceMap[tokenName].totalSupply();
    }

    function getName(string memory tokenName) public view returns (string memory) {
        return tokenInstanceMap[tokenName].name();
    }

    function getTokenAddress(string memory tokenName) public view returns (address) {
        return address(tokenInstanceMap[tokenName]);
    }

    function getEthBalance() public view returns (uint256) {
        return address(this).balance;
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

    // native to any token
    function swapEthToToken(string memory tokenName, uint256 minOutputValue) public payable returns (uint256) {
        // Token existence check
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");

        uint256 inputValue = msg.value;
        uint256 outputValue = (inputValue / ethValue) * 10 ** 18;

        // Slippage protection: Ensure output is at least minOutputValue
        require(outputValue >= minOutputValue, "Slippage too high, output less than min");

        // Check if the contract has enough tokens to fulfill the swap
        uint256 tokenBalance = tokenInstanceMap[tokenName].balanceOf(address(this));
        require(tokenBalance >= outputValue, "Insufficient balance in contract to complete swap");

        // require(
        //     tokenInstanceMap[tokenName].transfer(msg.sender, outputValue),
        //     "Transfer failed"
        // );
        // Safe transfer to the user
        IERC20 token = IERC20(address(tokenInstanceMap[tokenName]));
        token.safeTransfer(msg.sender, outputValue);

        string memory etherToken = "Ether";
        _transactionHistory(tokenName, etherToken, inputValue, outputValue);
        return outputValue;
    }

    function swapTokenToEth(string memory tokenName, uint256 _amount, uint256 minOutputValue)
        public
        nonReentrant
        returns (uint256)
    {
        // Token existence check
        require(address(tokenInstanceMap[tokenName]) != address(0), "Token does not exist");

        // Ensure correct precision by keeping full decimals
        uint256 exactAmount = _amount;
        uint256 ethToBeTransfered = (exactAmount * ethValue) / 10 ** 18;

        // Slippage protection: Ensure output is at least minOutputValue
        require(ethToBeTransfered >= minOutputValue, "Slippage too high, output less than min");

        require(address(this).balance >= ethToBeTransfered, "Dex is running low on balance");

        // Check the approval for transferFrom
        IERC20 token = IERC20(address(tokenInstanceMap[tokenName]));
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= _amount, "Allowance is not enough for the transfer");

        // Update contract state before external interaction (checks-effects-interactions)

        // require(
        //     tokenInstanceMap[tokenName].transferFrom(
        //         msg.sender,
        //         address(this),
        //         _amount
        //     ),
        //     "Transfer failed"
        // );

        // // Now, interact with the external address (transfer Ether to the user)
        // payable(msg.sender).transfer(ethToBeTransfered);
        // Update contract state before external interaction (checks-effects-interactions)
        token.safeTransferFrom(msg.sender, address(this), _amount);

        // Now, transfer Ether to the user
        payable(msg.sender).transfer(ethToBeTransfered);

        string memory etherToken = "Ether";

        _transactionHistory(tokenName, etherToken, exactAmount, ethToBeTransfered);
        return ethToBeTransfered;
    }

    //We'll calculate the output value based on the ratio of the source and destination token balances in the contract,
    //ensuring that the value exchanged respects the current liquidity and preventing arbitrage.

    function swapTokenToToken(
        string memory srcTokenName,
        string memory destTokenName,
        uint256 _amount,
        uint256 minOutputValue
    ) public nonReentrant {
        // Token existence checks
        require(address(tokenInstanceMap[srcTokenName]) != address(0), "Source token does not exist");
        require(address(tokenInstanceMap[destTokenName]) != address(0), "Destination token does not exist");

        // Transfer the source token from the user to the contract

        // require(
        //     tokenInstanceMap[srcTokenName].transferFrom(
        //         msg.sender,
        //         address(this),
        //         _amount
        //     ),
        //     "Transfer failed"
        // );
        // Transfer the source token from the user to the contract
        IERC20 srcToken = IERC20(address(tokenInstanceMap[srcTokenName]));
        srcToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Get the contract's current balances of source and destination tokens
        uint256 srcTokenBalance = tokenInstanceMap[srcTokenName].balanceOf(address(this));
        uint256 destTokenBalance = tokenInstanceMap[destTokenName].balanceOf(address(this));

        // Calculate the output value based on the current ratio of the token balances
        uint256 outputValue = (_amount * destTokenBalance) / srcTokenBalance;

        // Slippage protection: Ensure output is at least minOutputValue
        require(outputValue >= minOutputValue, "Slippage too high, output less than min");

        // require(
        //     tokenInstanceMap[destTokenName].transfer(msg.sender, outputValue),
        //     "Transfer failed"
        // );
        // Transfer the destination token to the user
        IERC20 destToken = IERC20(address(tokenInstanceMap[destTokenName]));
        destToken.safeTransfer(msg.sender, outputValue);

        _transactionHistory(srcTokenName, destTokenName, _amount, outputValue);
    }

    function getAllHistory() public view returns (History[] memory) {
        uint256 itemCount = _historyIndex;
        uint256 currentIndex = 0;

        History[] memory items = new History[](itemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            uint256 currentId = i + 1;
            History storage currentItem = historys[currentId];
            items[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return items;
    }
}
