import React, { useEffect, useState, useRef } from "react";
import { ethers } from 'ethers';

import {
    tradeWanToToken,
    getOutputBalance,
} from "../utils/context";

import { tokenConfig } from "../utils/saleToken";

import SwapField from "./SwapField";

import TransactionStatus from "./TransactionStatus";
import toast, { Toaster } from "react-hot-toast";
import { DEFAULT_VALUE, WAN } from "../utils/saleToken";

// import { toEth, toWei } from "../utils/utils";
// import { useAccount } from "wagmi";




const TradeComponent = () => {


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

    const ENTER_AMOUNT = "Enter Amount";
    const CONNECT_WALLET = "Connect Wallet";
    const TRADE = "Trade";

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
                // console.log("Connected Accounts:", accounts); // Debug log
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
        <>
            <div className="border-[1px]  border-gray-500 bg-black  shadow-lg w-[100%] p-2 px-3  rounded-xl">

                <div className="relative bg-[#212429] p-4 py-6 rounded-xl mb-2 border-[2px] border-transparent hover:border-zinc-600 flex items-center justify-between">
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none font-mono text-white text-xl placeholder-gray-400"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter value"
                    />
                    <span className="ml-4 text-white font-medium">WAN</span>
                </div>

                <div className=" bg-[#212429] p-4 py-6 rounded-xl mt-2 border-[2px] border-transparent hover:border-zinc-600">
                    {/* {destTokenComp} */}
                    {isLoading && (
                        <div className="flex justify-center items-center py-4">
                            <div className="text-center  font-mono  text-white font-semibold flex items-center space-x-2">
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
                    if (swapBtnText === TRADE) handleSwap();
                }}>
                    {swapBtnText}
                </button>



                {txPending && <TransactionStatus />}

                <Toaster />
            </div>

        </>
    );


    async function handleSwap() {
        if (srcToken === WAN && destToken !== WAN) {
            performSwap();
        }

    }




    function getSwapBtnClassName() {
        let className = "p-4 w-full my-2 rounded-xl";
        className += swapBtnText === ENTER_AMOUNT || swapBtnText === CONNECT_WALLET ? " text-gray-900  font-bold font-mono text-sm bg-white pointer-events-none" : " font-mono text-sm bg-white font-bold  text-gray-900";
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

                receipt = await tradeWanToToken(destTokenAddress, inputValue);
                console.log("Receipt:", receipt);
            } else if (destToken === WAN) {
                alert("Cannot buy WAN from WAN");
                return;
            }

            setTxPending(false);

            // Check receipt and notify success or error
            if (!receipt || !receipt.transactionHash) {
                notifyError(receipt || "No receipt available");
            } else {
                notifySuccess();
            }

            window.location.reload();
        } catch (error) {
            setTxPending(false);
            console.error("trade failed:", error.message);
            notifyError(parseErrorMsg(error));
        }
    }


};

export default TradeComponent;
