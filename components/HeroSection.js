import React from "react";
import Image from "next/image";


// Convert the address to its checksum format


const HeroSection = () => {

  return (
    <section className=" relative text-gray-100 bg-white lg:bg-hero-pattern bg-cover bg-center" >
      <div className="hidden lg:block absolute inset-0  bg-white bg-opacity-95 z-0"></div>
      <div className="lg:ml-16 lg:p-0 p-5 mt-8 max-sm:ml-0 flex flex-col    h-auto lg:h-screen mx-auto sm:py-12 lg:py-12 lg:flex-row lg:justify-between">
        <div className="flex flex-col lg:mb-20 lg:pl-0 lg:z-10   justify-center text-center rounded-sm lg:max-w-md xl:max-w-lg lg:text-left">
          <h1 className="text-4xl text-gray-900 font-bold font-sans leadi lg:text-6xl">Join the Crypto World with</h1>
          <h3 className="text-[#53D6FF] font-serif font-bold  text-6xl lg:text-8xl lg:pt-0 pt-3 ">Zebra</h3>

          <p className="mt-6 mb-6 lg:mb-3 text-gray-500 font-bold text-lg font-mono sm:mb-12">Zebra makes it easy to get started, with a user friendly platform that's perfect for everyone. </p>
          <p className="hidden lg:block lg:mb-5 text-gray-500 font-bold  text-lg  font-mono " > Start today and start buying and selling over 200 cryptocurrencies!</p>
          <div className="flex flex-col space-y-4 sm:items-center sm:flex-row sm:space-y-0 sm:space-x-4 lg:justify-start">
            <a
              href="/swap"
              className="px-8 py-3 font-mono text-lg font-semibold  bg-black text-white shadow-md rounded-md">
              Get Started
            </a>
            {/* <a
              href="/swap"
              className="px-8 py-3 text-lg font-mono font-semibold border rounded border-gray-100">
              SWAP ERC20
            </a> */}
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-end w-full lg:pt-10 lg:z-0   lg:mt-[72px] h-auto sm:h-80 lg:h-96 xl:h-112 2xl:h-128">
          <Image
            src="/img/banner-img.png"
            alt="Hero Image"
            width={750}
            height={640}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
