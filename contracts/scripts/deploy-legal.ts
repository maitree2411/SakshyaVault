import { ethers } from "hardhat";

async function main() {
  console.log("=================================================");
  console.log("🏛️ Deploying LegalDocumentRegistry Smart Contract");
  console.log("=================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const LegalDocumentRegistry = await ethers.getContractFactory("LegalDocumentRegistry");
  const registry = await LegalDocumentRegistry.deploy(deployer.address);

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log("✅ LegalDocumentRegistry deployed successfully to:", address);
  console.log("Default Admin & Department Roles assigned to:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
