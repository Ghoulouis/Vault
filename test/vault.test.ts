import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  SnapshotRestorer,
  takeSnapshot,
} from "@nomicfoundation/hardhat-network-helpers";
import { hexlify, parseUnits, ZeroAddress } from "ethers";
import hre, { ethers } from "hardhat";
import { CenticVault, CenticVaultFactory, USDT } from "../typechain-types";
import { expect } from "chai";

describe("factory test", () => {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, get, execute, read } = deployments;
  let deployer: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let alice: any;
  let snapshot: SnapshotRestorer;

  let factory: CenticVaultFactory;
  let vault: CenticVault;
  let usdt: USDT;
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
    factory = (await ethers.getContractAt(
      "CenticVaultFactory",
      factoryAddress
    )) as CenticVaultFactory;
    usdt = (await ethers.getContractAt(
      "USDT",
      (
        await get("USDT")
      ).address
    )) as USDT;

    vault = (await ethers.getContractAt(
      "CenticVault",
      (
        await get("TestVault")
      ).address
    )) as CenticVault;

    await usdt.connect(deployer).mint(deployer.address, parseUnits("2000", 6));
  });

  it("should deploy vault", async () => {
    const sponsor = await vault.sponsor();
    expect(sponsor).to.be.eq(deployer.address);
    const token = await vault.tokenPayout();
    expect(token).to.be.eq(await usdt.getAddress());
    const amount = await vault.totalPayout();
    expect(amount).to.be.eq(parseUnits("1000", 6));
  });

  it("should deposit", async () => {
    await usdt
      .connect(deployer)
      .approve(await vault.getAddress(), parseUnits("1000", 6));
    await vault.connect(deployer).deposit();
    const balance = await usdt.balanceOf(vault.getAddress());
    expect(balance).to.be.eq(parseUnits("1000", 6));
    const fauceted = await vault.fauceted();
    expect(fauceted).to.be.eq(true);
  });

  it("should revert when double deposit ", async () => {
    await usdt
      .connect(deployer)
      .approve(await vault.getAddress(), parseUnits("1000", 6));
    await vault.connect(deployer).deposit();
    await expect(vault.connect(deployer).deposit()).to.be.revertedWith(
      "Vault already fauceted"
    );
  });

  describe("withdraw", () => {
    let description: string;
    let member;
    let amount;
    beforeEach(async () => {
      description = "100 posts on Twwiter";
      member = await alice.getAddress();
      amount = parseUnits("100", 6);

      await vault.connect(deployer).addOffer({
        description,
        username: member,
        amountPayout: amount,
        status: 1,
      });
    });

    it("can add kol task", async () => {
      const members = await vault.totalMembers();
      expect(members).to.be.eq(1);

      const memberCrawl = await vault.members(0);
      expect(memberCrawl).to.be.eq(await alice.getAddress());
      const offerCrawl = await vault.offers(memberCrawl);
      console.log(offerCrawl);
      expect(offerCrawl.description).to.be.eq(description);
      expect(offerCrawl.username).to.be.eq(memberCrawl);
    });
  });
});
