// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

// Interfaces for ERC20 token and Router
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IUniswapV2Router {
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapETHForExactTokens(uint256 amountOut, address[] calldata path, address to, uint256 deadline)
        external
        payable
        returns (uint256[] memory amounts);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract Swap {
    IUniswapV2Router public router; // Wanswap router address
    address public owner;
    uint256 public feePercentage;
    address public w_wan;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event SwapExecuted(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event WWanAddressUpdated(address indexed oldWwan, address indexed newWwan);
    event FeeCollected(address indexed owner, uint256 feeAmount);
    event RouterAddressUpdated(address indexed oldRouter, address indexed newRouter);
    event OwnershipTransferProposed(address indexed proposedOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    // Set the Wanswap router address
    constructor() {
        router = IUniswapV2Router(address(0xEd34EE41cA84042b619E9AEBF6175bB4a0069a05)); //wan main
        w_wan = address(0xA7Df470a490197Af8fdD72bDB40a68709266027b);
        owner = msg.sender;
        feePercentage = 100; // Default 1% fee
    }

    function setWWanAddress(address newWWan) external onlyOwner {
        require(newWWan != address(0), "New WWan address cannot be zero");
        emit WWanAddressUpdated(w_wan, newWWan);
        w_wan = newWWan;
    }

    function setRouterAddress(address newRouter) external onlyOwner {
        require(newRouter != address(0), "New router address cannot be zero");
        emit RouterAddressUpdated(address(router), newRouter);
        router = IUniswapV2Router(newRouter);
    }

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // function proposeNewOwner(address newOwner) external onlyOwner {
    // transferOwnership(newOwner);  // Propose the new owner
    // }

    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        emit FeeUpdated(feePercentage, newFee);
        feePercentage = newFee;
    }

    function getBestOutputs(address fromToken, address toToken, uint256 amountIn) public view returns (uint256) {
        require(amountIn > 0, "AmountIn must be greater than 0");
        require(fromToken != address(0) && toToken != address(0), "Invalid token addresses");

        // Set up the path
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = toToken;

        // Call getAmountsOut and handle potential reverts
        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amountsOut) {
            require(amountsOut.length > 0 && amountsOut[1] != 0, "Invalid output value");
            return amountsOut[1];
        } catch {
            revert("Router failed to calculate output. Check liquidity or token path.");
        }
    }

    function swapTokens(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 minAmount // Minimum acceptable amount of toToken to receive
    ) external {
        require(IERC20(fromToken).balanceOf(msg.sender) >= amountIn, "Insufficient balance");

        uint256 fee = (amountIn * feePercentage) / 10000;
        uint256 amountAfterFee = amountIn - fee;

        // Calculate the minimum output using getBestOutputs
        uint256 amountOutMin = getBestOutputs(fromToken, toToken, amountAfterFee);
        require(amountOutMin > 0, "Calculated output is invalid");
        require(amountOutMin >= minAmount, "Calculated output is too low");
        // Check if the token has a fee-on-transfer mechanism
        uint256 initialBalance = IERC20(fromToken).balanceOf(address(this));
        require(IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");

        // After the transfer, check how much was actually received
        uint256 finalBalance = IERC20(fromToken).balanceOf(address(this));
        uint256 actualAmountReceived = finalBalance - initialBalance;

        // Ensure the contract receives the expected amount of tokens after fees
        require(actualAmountReceived >= amountAfterFee, "Fee-on-transfer token: Insufficient amount received");

        // Transfer tokens from the sender to the contract
        require(IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");
        require(IERC20(fromToken).transfer(owner, fee), "Fee transfer failed");
        emit FeeCollected(owner, fee);

        // Approve the router to spend the tokens
        require(IERC20(fromToken).approve(address(router), amountAfterFee), "Router approve failed");
        // Check the current allowance for the router
        uint256 currentAllowance = IERC20(fromToken).allowance(address(this), address(router));

        // If the allowance is less than the amount needed, approve the router
        if (currentAllowance < amountAfterFee) {
            // For safe approval, set the allowance to 0 first, then to the new amount
            require(IERC20(fromToken).approve(address(router), 0), "Failed to reset allowance");
            require(IERC20(fromToken).approve(address(router), amountAfterFee), "Router approve failed");
        }

        // Set up the path for the swap (fromToken -> toToken)
        address[] memory path = new address[](2); // Initialize the path array with 2 elements
        path[0] = fromToken;
        path[1] = toToken;

        // Execute the swap
        try router.swapExactTokensForTokens(amountAfterFee, amountOutMin, path, msg.sender, block.timestamp) {
            // Swap successful
            emit SwapExecuted(fromToken, toToken, amountIn, amountOutMin);
        } catch {
            revert("Router failed to execute the swap. Check liquidity or token path.");
        }
    }

    function swapWANToToken(address toToken) external payable {
        require(toToken != address(0), "Invalid token address");
        require(msg.value > 0, "No WAN sent");

        uint256 fee = (msg.value * feePercentage) / 10000;
        uint256 amountAfterFee = msg.value - fee;

        IWETH(w_wan).deposit{value: amountAfterFee}();
        payable(owner).transfer(fee);
        emit FeeCollected(owner, fee);

        uint256 amountOutMin = getBestOutputs(w_wan, toToken, amountAfterFee);
        require(amountOutMin > 0, "Calculated output is invalid");

        address[] memory _path = new address[](2); // Initialize the path array with 2 elements
        _path[0] = w_wan;
        _path[1] = toToken;

        IERC20(w_wan).approve(address(router), amountAfterFee);

        router.swapExactTokensForTokens(amountAfterFee, amountOutMin, _path, msg.sender, block.timestamp + 300);
        emit SwapExecuted(address(0), toToken, msg.value, amountOutMin);
    }
}
