import { randomBytes } from "crypto";
import { hexlify, keccak256, parseUnits } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get, execute, save } = deployments;
  const { deployer } = await getNamedAccounts();
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
          args: [],
        },
      },
    },
  });
};

deploy.tags = ["vault"];
export default deploy;
