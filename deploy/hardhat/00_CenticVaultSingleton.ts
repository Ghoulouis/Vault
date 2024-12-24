import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy("CenticVaultSingleton", {
        contract: "CenticVault",
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });
};

deploy.tags = ["singleton"];
export default deploy;