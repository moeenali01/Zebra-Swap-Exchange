import React from "react";

import { Footer, HeroSection, Header, CoinTable, CoinsBlock } from "../components/index";


const Home = () => {
  return (
    <div className="bg-[#1A1A1A] ">
      <Header />
      <div className="lg:z-0">
        <HeroSection />
      </div>
      {/* CoinsBlock Section */}
      <div className=" lg:mt-[-88px] lg:z-40 shadow-md p-6 bg-white ">

        <CoinsBlock />

      </div>
      {/* CoinTable Section */}
      <div className="  shadow-md bg-white p-6">
        <h1 className="text-gray-900 font-mono text-lg font-bold lg:p-3">TOP COINS</h1>


        <CoinTable />

      </div>

      <Footer />
    </div>
  );
};

export default Home;
