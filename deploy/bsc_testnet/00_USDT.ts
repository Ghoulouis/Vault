import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("USDT", {
    contract: "USDT",
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

deploy.tags = ["usdt"];
export default deploy;
