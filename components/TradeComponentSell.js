import React, { useEffect, useState, useRef } from "react";
import { ethers } from 'ethers';

import {
    hasValidAllowance,
    increaseAllowance,
    tradeTokenToWan,
    getOutputBalance
} from "../utils/context";

import { tokenConfig } from "../utils/saleToken";

import SwapField from "./SwapField";

import TransactionStatus from "./TransactionStatus";
import toast, { Toaster } from "react-hot-toast";
import { DEFAULT_VALUE, WAN } from "../utils/saleToken";





const TradeComponentSell = () => {


    const [connectedAccount, setConnectedAccount] = useState('');

    const [srcToken, setSrcToken] = useState(DEFAULT_VALUE);
    const [destToken, setDestToken] = useState(WAN);

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
    const TRADE = "trade";

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
            setSwapBtnText(TRADE);
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




    // console.log("connected account", connectedAccount);

    return (
        <div className="border-[1px]  border-gray-500 bg-black  shadow-lg w-[100%] p-2 px-3  rounded-xl">



            <div className="relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px]  border-transparent hover:border-zinc-600">
                {/* {srcTokenComp} */}
                <SwapField obj={{ id: "srcToken", value: inputValue, setValue: setInputValue, defaultValue: srcToken, ignoreValue: srcToken, setToken: setSrcToken }} ref={inputValueRef} />
            </div>
            <div className=" bg-[#212429] p-4 py-6 rounded-xl mt-2 border-[2px] border-transparent hover:border-zinc-600">
                {/* {destTokenComp} */}


                {isLoading ? (
                    <div className="flex justify-center items-center py-4">
                        <div className="text-center text-gray-600 font-mono text-xl font-semibold flex items-center space-x-2">
                            <span>Loading</span>
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse delay-200">.</span>
                            <span className="animate-pulse delay-400">.</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex  items-center rounded-xl text-md  text-white">
                        <input className="w-full bg-transparent outline-none font-mono text-white text-xl placeholder-gray-400"
                            type={'number'}
                            value={parseFloat(outputValue).toFixed(4) || "0.00"}
                            placeholder={"0.0"}
                            readOnly={true}
                        />
                        <span className="ml-4 text-white font-medium">WAN</span>
                    </div>
                )}
            </div>

            <button className={getSwapBtnClassName()} onClick={() => {

                if (swapBtnText === INCREASE_ALLOWANCE) handleIncreaseAllowance();
                else if (swapBtnText === TRADE) handleSwap();
            }}>
                {swapBtnText}
            </button>

            {txPending && <TransactionStatus />}

            <Toaster />
        </div>
    );


    async function handleSwap() {
        if (srcToken === WAN) {
            // console.log(srcToken, destToken, inputValue, outputValue);
            alert("Cannot sell WAN for WAN");
            return;
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
        setSwapBtnText(TRADE);
    }




    function getSwapBtnClassName() {
        let className = "p-4 w-full my-2 rounded-xl";
        className += swapBtnText === ENTER_AMOUNT || swapBtnText === CONNECT_WALLET ? " text-gray-900  font-bold font-mono text-sm bg-white pointer-events-none" : " font-mono text-sm bg-white font-bold  text-gray-900";
        className += swapBtnText === INCREASE_ALLOWANCE ? " bg-yellow-600 font-mono font-bold text-sm text-white" : "";
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
            // console.log("Output Value:", outValueInEth);
            setOutputValue(outValueInEth);
        } catch (e) {
            setOutputValue("0");
        }
    }




    async function performSwap() {
        setTxPending(true);

        try {
            let receipt;

            const srcTokenDetails = getTokenDetails(srcToken);
            const destTokenDetails = getTokenDetails(destToken);

            if (!srcTokenDetails || !destTokenDetails) {
                throw new Error("Invalid token configuration.");
            }

            if (srcToken === WAN) {
                alert("Cannot sell WAN for WAN");
                return;
            }

            const srcTokenAddress = srcTokenDetails.address;


            // Use ethers to convert inputValue to a precise BigNumber
            const inputAmt = ethers.utils.parseUnits(inputValue.toString(), srcTokenDetails.decimals);

            // Perform the swap between two tokens
            receipt = await tradeTokenToWan(srcTokenAddress, inputAmt);



            setTxPending(false);

            // Check receipt and notify success or error
            if (receipt && !receipt.hasOwnProperty("transactionHash")) {
                notifyError(receipt);
            } else {
                notifySuccess();
            }
        } catch (error) {
            setTxPending(false);
            console.error("Trade failed:", error.message);
            notifyError(parseErrorMsg(error));
        }
    }

    function handleInsufficientAllowance() {
        notifyError("Insufficient Allowance, Click Increase Allowance to continue");
        setSwapBtnText(INCREASE_ALLOWANCE);
    }
};

export default TradeComponentSell;
