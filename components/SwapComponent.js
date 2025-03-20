import React, { useEffect, useState, useRef } from "react";
import { ethers } from 'ethers';

import {
  hasValidAllowance,
  increaseAllowance,
  swapWanToToken,
  swapTokenToToken,
  getOutputBalance
} from "../utils/context";

import { tokenConfig } from "../utils/saleToken";

import { CogIcon, ArrowSmDownIcon } from "@heroicons/react/outline";
import SwapField from "./SwapField";

import TransactionStatus from "./TransactionStatus";
import toast, { Toaster } from "react-hot-toast";
import { DEFAULT_VALUE, WAN } from "../utils/saleToken";
import { parse } from "dotenv";
// import { toEth, toWei } from "../utils/utils";
// import { useAccount } from "wagmi";




const SwapComponent = () => {


  const [connectedAccount, setConnectedAccount] = useState('');

  const [srcToken, setSrcToken] = useState(WAN);
  const [destToken, setDestToken] = useState(DEFAULT_VALUE);

  const [inputValue, setInputValue] = useState();
  const [outputValue, setOutputValue] = useState();
  const [networkId, setNetorkId] = useState();

  const [isLoading, setIsLoading] = useState(false);

  const inputValueRef = useRef();
  const outputValueRef = useRef();

  const isReversed = useRef(false);

  const INCREASE_ALLOWANCE = "Increase Allowance";
  const ENTER_AMOUNT = "Enter Amount";
  const CONNECT_WALLET = "Connect Wallet";
  const SWAP = "Swap";

  const srcTokenObj = {
    id: "srcToken",
    value: inputValue,
    setValue: setInputValue,
    defaultValue: srcToken,
    ignoreValue: destToken,
    setToken: setSrcToken,
  };

  const destTokenObj = {
    id: "destToken",
    value: outputValue,
    setValue: setOutputValue,
    defaultValue: destToken,
    ignoreValue: srcToken,
    setToken: setDestToken,
  };

  const [srcTokenComp, setSrcTokenComp] = useState();
  const [destTokenComp, setDestTokenComp] = useState();
  const [swapBtnText, setSwapBtnText] = useState(ENTER_AMOUNT);
  const [txPending, setTxPending] = useState(false);

  const notifyError = (message) => toast.error(message, { duration: 6000 });
  const notifySuccess = () => toast.success("Transaction Successful");
  const getTokenDetails = (symbol) => {
    // console.log("fetching details for ", symbol);
    return tokenConfig[symbol]
  };

  // const { address } = useAccount();

  useEffect(() => {
    if (!connectedAccount) {
      setSwapBtnText(CONNECT_WALLET);
    }
    else if (!inputValue || !outputValue) {
      setSwapBtnText(ENTER_AMOUNT);
    }
    else {
      setSwapBtnText(SWAP);
    }
  }, [connectedAccount, inputValue, outputValue]);

  useEffect(() => {
    const getConnectedAccount = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        console.log("Connected Accounts:", accounts); // Debug log
        setConnectedAccount(accounts[0]);

        const network = await provider.getNetwork();
        setNetorkId(network.chainId);
        console.log("Current Network Chain ID:", network.chainId); // Debug log

        // Check if the connected network is Wanchain Mainnet
        if (network.chainId !== 888) {
          console.log("Not on Wanchain Mainnet. Attempting to switch...");
          await switchToWanchain();
        } else {
          console.log("Already on Wanchain Mainnet.");
        }
      } catch (error) {
        console.error("Error connecting account or switching network:", error);
      }
    };

    const switchToWanchain = async () => {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x378" }], // Wanchain Mainnet chain ID in hexadecimal (888 -> 0x378)
        });
        console.log("Successfully switched to Wanchain Mainnet.");
        const network = await provider.getNetwork();
        setNetorkId(network.chainId);

        setNetorkId()
      } catch (switchError) {
        console.error("Error switching network:", switchError);
        if (switchError.code === 4902) {
          // Network is not added to MetaMask, so we add it
          try {
            console.log("Wanchain not found. Adding Wanchain network...");
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x378",
                  chainName: "Wanchain Mainnet",
                  nativeCurrency: {
                    name: "Wanchain",
                    symbol: "WAN",
                    decimals: 18,
                  },
                  rpcUrls: ["https://gwan-ssl.wandevs.org:56891/"],
                  blockExplorerUrls: ["https://wanscan.org/"],
                },
              ],
            });
            console.log("Successfully added Wanchain Mainnet.");
          } catch (addError) {
            console.error("Error adding Wanchain network:", addError);
          }
        }
      }
    };

    const init = async () => {
      await getConnectedAccount();
    };

    init();
  }, [, networkId]);


  useEffect(() => {


    if (document.activeElement !== outputValueRef.current && document.activeElement.ariaLabel !== "srcToken" && !isReversed.current) {
      setIsLoading(true); // Start loading
      populateOutputValue(inputValue).finally(() => setIsLoading(false)); // Stop loading
    }

    setSrcTokenComp(<SwapField obj={srcTokenObj} ref={inputValueRef} />);

    if (inputValue?.length === 0) {
      setOutputValue("");
    }
  }
    , [inputValue, destToken]);


  useEffect(() => {
    if (document.activeElement !== inputValueRef.current && document.activeElement.ariaLabel !== "destToken" && !isReversed.current) {
      setIsLoading(true); // Start loading
      populateInputValue(outputValue).finally(() => setIsLoading(false)); // Stop loading
    }

    setDestTokenComp(<SwapField obj={destTokenObj} ref={outputValueRef} />);

    if (outputValue?.length === 0) {
      setInputValue("");
    }

    if (isReversed.current) {
      isReversed.current = false;
    }
  }, [outputValue, srcToken]);

  // console.log("connected account", connectedAccount);

  return (
    <div className="border-[1px]  border-gray-500 bg-black  shadow-lg w-[100%] p-4 px-6  rounded-xl">
      <div className="flex justify-between items-center py-4 px-1">
        {/* <p>Swap</p>
        <CogIcon className="h-6" /> */}
      </div>


      <div className="relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px]  border-transparent hover:border-zinc-600">
        {/* {srcTokenComp} */}
        <SwapField obj={{ id: "srcToken", value: inputValue, setValue: setInputValue, defaultValue: srcToken, ignoreValue: destToken, setToken: setSrcToken }} ref={inputValueRef} />
        <ArrowSmDownIcon className=" absolute  left-1/2  -translate-x-1/2 -bottom-6 h-10 p-1 bg-[#212429] border-4 border-zinc-900 text-zinc-300 rounded-xl cursor-pointer hover:scale-110"
          onClick={handleReverseExchange} />
      </div>
      <div className=" bg-[#212429] p-4 py-6 rounded-xl mt-2 border-[2px] border-transparent hover:border-zinc-600">
        {/* {destTokenComp} */}
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="text-center text-gray-600 font-mono text-xl font-semibold flex items-center space-x-2">
              <span>Loading</span>
              <span className="animate-pulse">.</span>
              <span className="animate-pulse delay-200">.</span>
              <span className="animate-pulse delay-400">.</span>
            </div>
          </div>
        )}
        <SwapField obj={{ id: "destToken", value: outputValue, setValue: setOutputValue, defaultValue: destToken, ignoreValue: srcToken, setToken: setDestToken }} ref={outputValueRef} />
      </div>

      <button className={getSwapBtnClassName()} onClick={() => {

        if (swapBtnText === INCREASE_ALLOWANCE) handleIncreaseAllowance();
        else if (swapBtnText === SWAP) handleSwap();
      }}>
        {swapBtnText}
      </button>

      {txPending && <TransactionStatus />}

      <Toaster />
    </div>
  );


  async function handleSwap() {
    if (srcToken === WAN && destToken !== WAN) {
      // console.log(srcToken, destToken, inputValue, outputValue);
      performSwap();
    }
    else {
      setTxPending(true);

      // console.log(srcToken, destToken, inputValue, outputValue);

      const tokenDetails = getTokenDetails(srcToken);
      if (!tokenDetails || !tokenDetails.address) {
        setTxPending(false);
        notifyError("Invalid source token selected");
        return;
      }
      const result = await hasValidAllowance(connectedAccount, tokenDetails.address, inputValue);
      setTxPending(false);
      if (result) {
        performSwap();
      }
      else {
        handleInsufficientAllowance();
      }
    }
  }


  async function handleIncreaseAllowance() {
    setTxPending(true);

    const tokenDetails = getTokenDetails(srcToken);
    if (!tokenDetails || !tokenDetails.address) {
      setTxPending(false);
      notifyError("Invalid source token selected");
      return;
    }

    await increaseAllowance(tokenDetails.address, inputValue);

    setTxPending(false);
    setSwapBtnText(SWAP);
  }


  function handleReverseExchange(e) {
    isReversed.current = true;

    setInputValue(outputValue);
    setOutputValue(inputValue);

    setSrcToken(destToken);
    setDestToken(srcToken);
  }

  function getSwapBtnClassName() {
    let className = "p-4 w-full my-2 rounded-xl";
    className += swapBtnText === ENTER_AMOUNT || swapBtnText === CONNECT_WALLET ? " text-gray-900 text-lg font-bold font-mono bg-white pointer-events-none" : " font-mono bg-white font-bold text-lg text-gray-900";
    className += swapBtnText === INCREASE_ALLOWANCE ? " bg-yellow-600 text-mono text-lg font-bold text-white" : "";
    return className;
  }



  async function populateOutputValue() {
    if (destToken === DEFAULT_VALUE || srcToken === DEFAULT_VALUE || !inputValue) return;

    try {
      const srcTokenDetails = getTokenDetails(srcToken);
      const destTokenDetails = getTokenDetails(destToken);

      if (!srcTokenDetails || !destTokenDetails) {
        throw new Error("Invalid token configuration");
      }

      const srcAdd = srcTokenDetails.address;
      const destAdd = destTokenDetails.address;
      const inputAmt = ethers.utils.parseUnits(inputValue.toString(), srcTokenDetails.decimals);
      const outValue = await getOutputBalance(srcAdd, destAdd, inputAmt);
      const outValueInEth = ethers.utils.formatUnits(outValue, destTokenDetails.decimals);
      setOutputValue(outValueInEth);
    } catch (e) {
      setOutputValue("0");
    }
  }

  async function populateInputValue() {
    if (destToken === DEFAULT_VALUE || srcToken === DEFAULT_VALUE || !outputValue) return;

    try {
      const srcTokenDetails = getTokenDetails(srcToken);
      const destTokenDetails = getTokenDetails(destToken);

      if (!srcTokenDetails || !destTokenDetails) {
        throw new Error("Invalid token configuration");
      }

      const srcAdd = srcTokenDetails.address;
      const destAdd = destTokenDetails.address;

      // Convert outputValue to a precise BigNumber
      const outputAmt = ethers.utils.parseUnits(outputValue.toString(), destTokenDetails.decimals);

      // Get the input value from the contract
      const inValue = await getOutputBalance(destAdd, srcAdd, outputAmt);

      // Convert the input value to human-readable format
      const inValueInEth = ethers.utils.formatUnits(inValue, srcTokenDetails.decimals);

      // Set the input value
      setInputValue(inValueInEth);
    } catch (e) {
      console.error(e.message);
      setInputValue("0");
    }
  }



  async function performSwap() {
    setTxPending(true);

    try {
      let receipt;

      if (srcToken === WAN && destToken !== WAN) {
        const destTokenDetails = getTokenDetails(destToken);
        if (!destTokenDetails) {
          throw new Error("Invalid destination token configuration.");
        }
        const destTokenAddress = destTokenDetails.address;

        receipt = await swapWanToToken(destTokenAddress, inputValue);
        console.log("Receipt:", receipt);
      } else if (srcToken !== WAN && destToken === WAN) {
        alert("Cannot swap token to WAN");
        return;
      } else {
        const srcTokenDetails = getTokenDetails(srcToken);
        const destTokenDetails = getTokenDetails(destToken);

        if (!srcTokenDetails || !destTokenDetails) {
          throw new Error("Invalid token configuration.");
        }

        const srcTokenAddress = srcTokenDetails.address;
        const destTokenAddress = destTokenDetails.address;

        // Use ethers to convert inputValue to a precise BigNumber
        const inputAmt = ethers.utils.parseUnits(inputValue.toString(), srcTokenDetails.decimals);

        // Perform the swap between two tokens
        receipt = await swapTokenToToken(srcTokenAddress, destTokenAddress, inputAmt);
      }

      setTxPending(false);

      // Check receipt and notify success or error
      if (receipt && !receipt.hasOwnProperty("transactionHash")) {
        notifyError(receipt);
      } else {
        notifySuccess();
      }
    } catch (error) {
      setTxPending(false);
      console.error("Swap failed:", error.message);
      notifyError(parseErrorMsg(error));
    }
  }

  function handleInsufficientAllowance() {
    notifyError("Insufficient Allowance, Click Increase Allowance to continue");
    setSwapBtnText(INCREASE_ALLOWANCE);
  }
};

export default SwapComponent;
