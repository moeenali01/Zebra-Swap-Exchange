import { BigNumber, ethers } from 'ethers';
import { contract, tokenContract, contractExc, contractExc2 } from './contract';




export async function hasValidAllowance(owner, tokenAddress, amount) {
    try {
        // Ensure tokenContract returns a valid contract instance
        const tokenContractObj = await tokenContract(tokenAddress);
        if (!tokenContractObj) {
            console.error("Invalid token contract object");
            return false;
        }

        // Log the ABI to ensure allowance method exists
        // console.log("Contract ABI:", tokenContractObj.interface);

        // Check allowance with detailed logging
        const allowanceData = await tokenContractObj.allowance(owner, "0x091a19D021D1a37B7e5d50051c99E1CaedFf8f70");
        // console.log("Allowance Data:", allowanceData.toString());

        // Ensure amount is being converted properly using BigNumber
        const result = BigNumber.from(allowanceData.toString()).gte(BigNumber.from(toWei(amount.toString())));
        // console.log("Allowance check result:", result.toString());

        return result; // Return the result of the comparison
    } catch (err) {
        console.error("Error:", err);
        return parseErrorMsg(err); // Handle errors with your custom error parser
    }
}

export async function increaseAllowance(tokenAddress, amount) {
    try {


        const tokenContractObj = await tokenContract(tokenAddress);
        const data = await tokenContractObj.approve("0x091a19D021D1a37B7e5d50051c99E1CaedFf8f70", toWei(amount));
        const receipt = await data.wait();
        return receipt;
    }
    catch (err) {
        return parseErrorMsg(err);
    }

}


export async function swapWanToToken(tokenAdd, amount) {
    try {
        let tx = { value: toWei(amount) };
        const contractObj = await contract();
        console.log("contractObj", contractObj);
        // console.log("tokenAdd", tokenAdd, "amount", amount, "tx", tx);
        const data = await contractObj.swapWANToToken(tokenAdd, tx);
        const receipt = await data.wait();
        return receipt;

    }
    catch (err) {
        console.log("failed")
        if (err.code === -32603) {
            return "Insufficient WAN balance";
        }
        return parseErrorMsg(err);
    }
}
export async function tradeWanToToken(tokenAdd, amount) {
    try {
        let tx = { value: toWei(amount) };
        const contractObj = await contractExc2();
        // console.log("contractObj", contractObj);
        // console.log("tokenAdd", tokenAdd, "amount", amount, "tx", tx);
        const data = await contractObj.buyToken(tokenAdd, tx);
        const receipt = await data.wait();
        return receipt;

    }
    catch (err) {
        console.log(" trade failed")
        if (err.code === -32603) {
            return "Insufficient WAN balance";
        }
        return parseErrorMsg(err);
    }
}
export async function tradeTokenToWan(tokenAdd, amount) {
    try {
        let amountInWei = toWei(amount);
        const contractObj = await contractExc2();
        // console.log("contractObj", contractObj);
        // console.log("tokenAdd", tokenAdd, "amount", amount, "tx", tx);
        const data = await contractObj.sellToken(tokenAdd, amountInWei);
        const receipt = await data.wait();
        return receipt;

    }
    catch (err) {
        console.log(" trade failed")
        return parseErrorMsg(err);
    }
}

export async function getTradeHistory() {
    try {
        // Get contract instance
        const contractObj = await contractExc2();
        // console.log("contractObj", contractObj);

        // Call the getSwapHistory function from the contract
        const history = await contractObj.getTradeHistory();

        // Log the swap history
        console.log("Trade History:", history);

        // Return the swap history
        return history;
    } catch (err) {
        console.log("Failed to get swap history", err);
        return parseErrorMsg(err); // Error handling function
    }
}


// export async function swapTokenToWan(inputSymbol, amount) {
//     try {
//         const contractObj = await contract();
//         const data = await contractObj.TokenToWan(inputSymbol, amount);
//         const receipt = await data.wait();
//         return receipt;
//     }
//     catch (err) {
//         return parseErrorMsg(err);
//     }
// }

//amount is in wei
export async function swapTokenToToken(inputAdd, outputAdd, amount) {
    try {
        const contractObj = await contract();
        const data = await contractObj.swapTokens(inputAdd, outputAdd, amount);
        const receipt = await data.wait();
        return receipt;
    }
    catch (err) {
        return parseErrorMsg(err);
    }
}

export async function getOutputBalance(inputAdd, outputAdd, amount) {
    try {
        const contractObj = await contract();
        const balance = await contractObj.getBestOutputs(inputAdd, outputAdd, amount);
        return balance;
    }
    catch (err) {
        console.log("error", err);
        return parseErrorMsg(err);
    }
}



// export async function getTokenBalance(address) {
//     const contractObj = await contract();
//     const balance = contractObj.getTokenBalance(address);
//     return balance;
// }




// export async function getTokenAddress(tokenName) {
//     try {
//         const contractObj = await contract();
//         const address = await contractObj.getTokenAddress(tokenName);
//         return address;
//     }
//     catch (err) {
//         return parseErrorMsg(err);
//     }
// }





function toWei(amount) {
    const toWei = ethers.utils.parseEther(amount.toString());
    return toWei.toString();
}

function parseErrorMsg(err) {
    const json = JSON.parse(JSON.stringify(err));
    return json?.reason || json?.error?.message;
}
