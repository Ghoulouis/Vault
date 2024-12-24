import { randomBytes } from "crypto";
import { hexlify, keccak256, parseUnits } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, get, execute, save } = deployments;
    const { deployer } = await getNamedAccounts();
    const nameVault = "TestVault";
    const usdt = await get("USDT");
    try {
        const receipt = await execute(
            "CenticVaultFactory",
            { from: deployer, log: true },
            "deploy",
            deployer,
            usdt.address,
            parseUnits("1000", 6),
            deployer,
            hexlify(randomBytes(32))
        );

        const vaultAddress = receipt.events?.find((log) => log.event === "ProxyCreation")?.args.proxy;
        await save(nameVault, {
            address: vaultAddress,
            abi: (await get("CenticVaultSingleton")).abi,
        });
    } catch (e) {
        console.log("CenticVaultFactory deployment failed:", e);
    }
};

deploy.tags = ["test"];
export default deploy;
