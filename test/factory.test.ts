import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { ZeroAddress } from "ethers";
import hre, { ethers } from "hardhat";
import { CenticVaultFactory } from "../typechain-types";
import { expect } from "chai";

describe("factory test", () => {
    const { deployments, getNamedAccounts, getChainId } = hre;
    const { deploy, get, execute, read } = deployments;
    let deployer: HardhatEthersSigner;
    let bob: HardhatEthersSigner;
    let alice: any;
    let snapshot: SnapshotRestorer;

    let factory: CenticVaultFactory;
    before(async () => {
        await deployments.fixture();
        snapshot = await takeSnapshot();
    });

    beforeEach(async () => {
        await snapshot.restore();
        deployer = await hre.ethers.provider.getSigner(0);
        alice = await hre.ethers.provider.getSigner(2);
        [deployer, bob, alice] = await ethers.getSigners();
        const factoryAddress = (await get("CenticVaultFactory")).address;
        factory = (await ethers.getContractAt("CenticVaultFactory", factoryAddress)) as CenticVaultFactory;
    });

    describe("change singletion vault", async () => {
        it("should change the vault by deployer", async () => {
            const newSingletonVault = ZeroAddress;
            await factory.connect(deployer).changeSingletonVault(newSingletonVault);
            const singletonVault = await factory.singletonVault();
            expect(singletonVault).to.be.equal(newSingletonVault);
        });

        it("should not change the vault by bob", async () => {
            const newSingletonVault = ZeroAddress;
            await expect(factory.connect(bob).changeSingletonVault(newSingletonVault)).to.be.revertedWith(
                "Caller is not an admin"
            );
        });
    });
});
