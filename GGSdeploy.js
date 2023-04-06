const { ethers, upgrades } = require("hardhat");
let BINANCE_ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
const EGAddress = "0x6607c2A98a3BC2420327833FF2Eb72309aF89047";
const GGAddress = "0x6c1f2eab3888DFE954EF39F44a510f40E688C19B"
if ((process.env.NETWORK == "bsc_main")) {
    BINANCE_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
}

async function main() {
    const ggStakingFactory = await ethers.getContractFactory("GGStaking");
    console.log("Deploying GatorGangStaking...");
    const ggStaking = await ggStakingFactory.deploy(GGAddress, EGAddress);
    console.log("GatorGangStaking:", ggStaking.address);
}


main();
