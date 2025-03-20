import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";


const Header = () => {
  // const { address } = useAccount();
  const [connectedAccount, setConnectedAccount] = useState('');

  const notifyConnectWallet = () => toast.error("Connect Wallet.", { duration: 2000 });

  useEffect(() => {
    // if (!connectedAccount) notifyConnectWallet();
  }, [connectedAccount]);

  // useEffect(() => {
  //   const getConnectedAccount = async () => {
  //     const provider = new ethers.providers.Web3Provider(window.ethereum);
  //     const accounts = await provider.send("eth_requestAccounts", []);
  //     setConnectedAccount(accounts[0]);
  //   };

  //   getConnectedAccount();
  // }, []);

  return (
    <header className="p-2  text-gray-100">
      <div className="container flex justify-between h-8 pt-5  mx-auto ">
        <div className="flex">
          <a

            href="/"
            aria-label="Back to homepage"
            className="flex items-center p-2 text-3xl pr-6 font-bold font-mono">
            <img src="./img/logo-footer.png" className="mt-2" alt="zebra" width={100} />
          </a>
          <ul className="items-stretch hidden lg:ml-72 space-x-3 lg:flex">
            <li className="flex">
              <a rel="noopener noreferrer" href="/swap" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent ">
                Swap
              </a>
            </li>
            <li className="flex">
              <a rel="noopener noreferrer" href="/exchange" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent  ">
                Exchange
              </a>
            </li>
            <li className="flex">
              <a rel="noopener noreferrer" href="#" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent  ">
                Staking
              </a>
            </li>
            <li className="flex">
              <a rel="noopener noreferrer" href="#" className="flex items-center px-4 font-mono -mb-1 dark:border-transparent">
                Application
              </a>
            </li>
            {/* <li className="flex">
              <a rel="noopener noreferrer" href="/tokens" className="flex font-mono items-center px-4 -mb-1 dark:border-transparent">

                Tokens Prices
              </a>
            </li> */}

          </ul>
        </div>
        <div className="items-center flex-shrink-0  z-111111 lg:flex">
          <w3m-button balance='hide' />
        </div>
        {/* <button className="p-4 lg:hidden">
          <Menu />
        </button> */}
      </div>
      <Toaster />
    </header>
  );
};

export default Header;
