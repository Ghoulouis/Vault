import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get } = deployments;
    const { deployer } = await getNamedAccounts();

    const singleton = await get("CenticVaultSingleton");

    await deploy("CenticVaultFactory", {
        contract: "CenticVaultFactory",
        from: deployer,
        args: [],
        log: true,
        proxy: {
            owner: deployer,
            execute: {
                init: {
                    methodName: "initialize",
                    args: [singleton.address],
                },
            },
        },
    });
};

deploy.tags = ["factory"];
export default deploy;
