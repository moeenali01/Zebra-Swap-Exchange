// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//-----------------------------------------------
// 1. Imports
//-----------------------------------------------
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
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
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

//-----------------------------------------------
// 2. Contract Definition
//-----------------------------------------------
contract Swap is ReentrancyGuard {
    //-----------------------------------------------
    // 2.1 State Variables
    //-----------------------------------------------

    /**
     * @dev Whitelisted router addresses. The owner can set `router` only 
     *      if the address is in this array. Prevents malicious router injection.
     */
    address[] public approvedRouters;

    /**
     * @dev Current router in use. Must be one of the addresses in `approvedRouters`.
     */
    IUniswapV2Router public router;

    /**
     * @dev Owner of the contract; can set fees, router, WWAN address, etc.
     */
    address public owner;

    /**
     * @dev Fee percentage in basis points (BPS). 
     * E.g., 100 means 1%, 1000 means 10%. 
     */
    uint256 public feePercentage;

    /**
     * @dev Wrapped WAN token (WWAN). 
     * If on Wanchain, set this to the correct WWAN address.
     */
    address public w_wan;

    //-----------------------------------------------
    // 2.2 Events
    //-----------------------------------------------
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event SwapExecuted(address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);
    event WWanAddressUpdated(address indexed oldWwan, address indexed newWwan);
    event FeeCollected(address indexed owner, uint256 feeAmount);
    event RouterAddressUpdated(address indexed oldRouter, address indexed newRouter);
    event RouterWhitelisted(address indexed newRouter);

    //-----------------------------------------------
    // 2.3 Modifiers
    //-----------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    //-----------------------------------------------
    // 2.4 Constructor
    //-----------------------------------------------
    /**
     * @dev Initializes the contract with default router/WWAN addresses, 
     * and sets the owner and default fee (1%).
     * 
     * IMPORTANT: You must call `addApprovedRouter(...)` to whitelist 
     * a valid router, then `setRouterAddress(...)` to set it for use.
     */
    constructor() {
        // Owner is the contract deployer
        owner = msg.sender;

        // Default fee = 1% (100 BPS)
        feePercentage = 100;

        // Example WWAN address on Wanchain mainnet:
        w_wan = 0xA7Df470a490197Af8fdD72bDB40a68709266027b;
    }

    //-----------------------------------------------
    // 3. Admin Functions
    //-----------------------------------------------

    /**
     * @dev Lets the owner whitelist a new router address. 
     * Once whitelisted, it can be set as the active router.
     */
    function addApprovedRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "Zero router address");
        approvedRouters.push(newRouter);
        emit RouterWhitelisted(newRouter);
    }

    /**
     * @dev Sets the contract's active router, if it is in the whitelist.
     */
    function setRouterAddress(address newRouter) external onlyOwner {
        require(newRouter != address(0), "Router cannot be zero");
        require(isApprovedRouter(newRouter), "Router not whitelisted");

        emit RouterAddressUpdated(address(router), newRouter);
        router = IUniswapV2Router(newRouter);
    }

    /**
     * @dev Checks if a router address is in the `approvedRouters` array.
     */
    function isApprovedRouter(address _router) public view returns (bool) {
        for (uint256 i = 0; i < approvedRouters.length; i++) {
            if (approvedRouters[i] == _router) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Transfers ownership to a new address. Must not be zero address.
     */
    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner cannot be zero");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @dev Updates the WWAN token address. Must not be zero address.
     */
    function setWWanAddress(address newWWan) external onlyOwner {
        require(newWWan != address(0), "WWAN cannot be zero");
        emit WWanAddressUpdated(w_wan, newWWan);
        w_wan = newWWan;
    }

    /**
     * @dev Sets a new fee in basis points. Max 10%.
     */
    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        emit FeeUpdated(feePercentage, newFee);
        feePercentage = newFee;
    }

    //-----------------------------------------------
    // 4. View Functions
    //-----------------------------------------------

    /**
     * @dev Provides the best output for a direct path [fromToken -> toToken].
     * Reverts if the router cannot produce an output.
     */
    function getBestOutputs(
        address fromToken,
        address toToken,
        uint256 amountIn
    ) public view returns (uint256) {
        require(amountIn > 0, "Amount must be > 0");
        require(fromToken != address(0) && toToken != address(0), "Zero address token");
        require(address(router) != address(0), "Router not set");

        // Single-hop path
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = toToken;

        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amountsOut) {
            require(amountsOut.length > 1 && amountsOut[1] > 0, "Invalid router output");
            return amountsOut[1];
        } catch {
            revert("Router failed to calculate output");
        }
    }

    //-----------------------------------------------
    // 5. Main Swap Functions
    //-----------------------------------------------

    /**
     * @notice Swap ERC20 -> ERC20 with a single-hop path, using a built-in 1% slippage buffer.
     * 
     * @param fromToken      The token the user sends in.
     * @param toToken        The token the user wants out.
     * @param amountIn       The *nominal* amount the user wants to transfer.
     * @param userMinOut     The user’s absolute floor for how many `toToken` they expect 
     *                       (additional slippage protection).
     */
    function swapTokens(
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 userMinOut
    ) external nonReentrant {
        // Basic checks
        require(fromToken != address(0) && toToken != address(0), "Zero address token");
        require(amountIn > 0, "Nothing to swap");
        require(address(router) != address(0), "Router not set");

        //-----------------------------------------------
        // 5.1 Pull the fromToken from user & measure actual received
        //-----------------------------------------------
        uint256 initialBalance = IERC20(fromToken).balanceOf(address(this));
        bool pulled = IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn);
        require(pulled, "transferFrom failed");

        // Actual amount contract received (handles fee-on-transfer tokens)
        uint256 finalBalance = IERC20(fromToken).balanceOf(address(this));
        uint256 receivedAmount = finalBalance - initialBalance;
        require(receivedAmount > 0, "No tokens received");

        //-----------------------------------------------
        // 5.2 Protocol fee from the actual amount
        //-----------------------------------------------
        uint256 fee = (receivedAmount * feePercentage) / 10000;
        uint256 amountAfterFee = receivedAmount - fee;

        //-----------------------------------------------
        // 5.3 Transfer fee to owner
        //-----------------------------------------------
        require(IERC20(fromToken).transfer(owner, fee), "Fee transfer failed");
        emit FeeCollected(owner, fee);

        //-----------------------------------------------
        // 5.4 Slippage handling
        //-----------------------------------------------
        //  (a) We estimate output from the router.
        //  (b) Apply a 1% slippage buffer: e.g., 0.99 * quoted.
        //  (c) We then ensure userMinOut <= amountOutMin, so user’s 
        //      own limit is respected if they want more strict slippage.
        uint256 estimatedOutput = getBestOutputs(fromToken, toToken, amountAfterFee);
        uint256 amountOutMin = (estimatedOutput * 99) / 100; // 1% slippage tolerance

        // Make sure our final min is at least the user’s stated minOut
        require(amountOutMin >= userMinOut, "Slippage too high");

        //-----------------------------------------------
        // 5.5 Approve router for amountAfterFee (single call)
        //-----------------------------------------------
        IERC20(fromToken).approve(address(router), amountAfterFee);

        //-----------------------------------------------
        // 5.6 Execute the swap
        //-----------------------------------------------
        address[] memory path = new address[](2);
        path[0] = fromToken;
        path[1] = toToken;

        uint256 deadline = block.timestamp + 300; // 5-minute

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountAfterFee,
            amountOutMin, 
            path,
            msg.sender,
            deadline
        );

        // amounts[amounts.length - 1] is the actual toToken output
        emit SwapExecuted(fromToken, toToken, amountIn, amounts[amounts.length - 1]);

    }

    /**
     * @notice Swap native WAN -> ERC20, single-hop path, with a 1% slippage buffer.
     *
     * @param toToken       The token the user wants after swapping from WAN.
     * @param userMinOut    The user’s minimum acceptable tokens out (extra slippage protection).
     */
    function swapWANToToken(address toToken, uint256 userMinOut)
        external
        payable
        nonReentrant
    {
        // Basic checks
        require(toToken != address(0), "Zero address token");
        require(msg.value > 0, "No WAN sent");
        require(address(router) != address(0), "Router not set");

        //-----------------------------------------------
        // 5.1 Calculate fee in WAN, deposit remainder as WWAN
        //-----------------------------------------------
        uint256 feeInWan = (msg.value * feePercentage) / 10000;
        uint256 amountAfterFee = msg.value - feeInWan;

        //-----------------------------------------------
        // 5.2 Transfer fee to owner
        //-----------------------------------------------
        (bool feeSent, ) = payable(owner).call{value: feeInWan}("");
        require(feeSent, "Fee WAN transfer failed");
        emit FeeCollected(owner, feeInWan);

        //-----------------------------------------------
        // 5.3 Wrap the remaining WAN into WWAN
        //-----------------------------------------------
        IWETH(w_wan).deposit{value: amountAfterFee}();

        //-----------------------------------------------
        // 5.4 Slippage handling
        //-----------------------------------------------
        uint256 estimatedOutput = getBestOutputs(w_wan, toToken, amountAfterFee);
        uint256 amountOutMin = (estimatedOutput * 99) / 100; // 1% slippage
        require(amountOutMin >= userMinOut, "Slippage too high");

        //-----------------------------------------------
        // 5.5 Approve the router
        //-----------------------------------------------
        IERC20(w_wan).approve(address(router), amountAfterFee);

        //-----------------------------------------------
        // 5.6 Execute the swap (WWAN -> toToken)
        //-----------------------------------------------
        address[] memory path = new address[](2);
        path[0] = w_wan;
        path[1] = toToken;

        uint256 deadline = block.timestamp + 300;

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountAfterFee,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );

        uint256 actualOut = amounts[amounts.length - 1];
        emit SwapExecuted(address(0), toToken, msg.value, actualOut);
    }
}
