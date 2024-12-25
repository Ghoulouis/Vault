import { randomBytes } from "crypto";
import { hexlify, keccak256, parseUnits, Wallet } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, execute, save } = deployments;
  const { deployer } = await getNamedAccounts();

  const verifier = new Wallet(process.env.VERIFIER_KEY!);
  console.log("Verifier address:", verifier.address);
  await deploy("AutoPayoutVault", {
    contract: "AutoPayoutVault",
    from: deployer,
    args: [],
    log: true,
    proxy: {
      owner: deployer,
      execute: {
        init: {
          methodName: "initialize",
          args: [await verifier.getAddress()],
        },
      },
    },
  });
};

deploy.tags = ["vault"];
export default deploy;
