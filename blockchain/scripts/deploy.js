const hre = require("hardhat");

async function main() {
  // Deploy CarbonToken
  const CarbonToken = await hre.ethers.getContractFactory("CarbonToken");
  const carbonToken = await CarbonToken.deploy();
  await carbonToken.deployed();
  console.log("CarbonToken deployed to:", carbonToken.address);

  // Deploy SupplyChain
  const SupplyChain = await hre.ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy();
  await supplyChain.deployed();
  console.log("SupplyChain deployed to:", supplyChain.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 