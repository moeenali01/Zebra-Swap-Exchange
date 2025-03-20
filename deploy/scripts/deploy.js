const hre = require("hardhat");

async function main() {
    // Deploy ZebraLiquidityNFT contract
    const ZebraLiquidityNFT = await ethers.getContractFactory("ZebraLiquidityNFT");
    const liquidityNFT = await ZebraLiquidityNFT.deploy();
    console.log("ZebraLiquidityNFT deployed to:", liquidityNFT.address);

    // Deploy ZebraSwap contract
    const ZebraSwap = await ethers.getContractFactory("ZebraSwap");
    const zebraSwap = await ZebraSwap.deploy(liquidityNFT.address);
    console.log("ZebraSwap deployed to:", zebraSwap.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });