import React from "react";

import { Footer, Header, Exchange } from "../components/index";
import CoinContextProvider from "../context/coinContext";



const exchange = () => {
  return (
    <div className="bg-[#1a1a1a]">
      <Header />
      <CoinContextProvider>
        <Exchange />
      </CoinContextProvider>
      <Footer />
    </div>

  );
};

export default exchange;

