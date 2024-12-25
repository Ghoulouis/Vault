import { Address } from "./../typechain-types/@openzeppelin/contracts/utils/Address";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  SnapshotRestorer,
  takeSnapshot,
} from "@nomicfoundation/hardhat-network-helpers";
import {
  AbiCoder,
  getBytes,
  hexlify,
  id,
  keccak256,
  parseUnits,
  Wallet,
  ZeroAddress,
} from "ethers";
import hre, { ethers } from "hardhat";
import { AutoPayoutVault, USDT } from "../typechain-types";
import { expect } from "chai";

describe("Vault test", () => {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const { deploy, get, execute, read } = deployments;
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;
  let snapshot: SnapshotRestorer;

  let vault: AutoPayoutVault;
  let usdt: USDT;
  before(async () => {
    await deployments.fixture();
    snapshot = await takeSnapshot();
  });

  beforeEach(async () => {
    await snapshot.restore();
    deployer = await hre.ethers.provider.getSigner(0);
    alice = await hre.ethers.provider.getSigner(2);
    [deployer, bob, alice, charlie] = await ethers.getSigners();
    usdt = (await ethers.getContractAt(
      "USDT",
      (
        await get("USDT")
      ).address
    )) as USDT;

    vault = (await ethers.getContractAt(
      "AutoPayoutVault",
      (
        await get("AutoPayoutVault")
      ).address
    )) as AutoPayoutVault;

    await usdt.connect(deployer).mint(deployer.address, parseUnits("2000", 6));
    await usdt.connect(alice).mint(alice.address, parseUnits("2000", 6));
  });

  describe("open Offer", () => {
    let idOffer = hexlify(ethers.randomBytes(32));
    let amount = parseUnits("100", 6);
    beforeEach(async () => {
      await usdt.connect(alice).approve(await vault.getAddress(), amount);
      await vault
        .connect(alice)
        .openOffer(idOffer, await usdt.getAddress(), amount);
    });

    it("should revert when douplicate id", async () => {
      await expect(
        vault.connect(alice).openOffer(idOffer, await usdt.getAddress(), amount)
      ).to.be.revertedWith("AP01: offer already exists");
    });
    describe("upgrade Offer", () => {
      let idOffer = hexlify(ethers.randomBytes(32));
      let initialAmount = parseUnits("100", 6);
      let extraAmount = parseUnits("50", 6);
      let minAmount = parseUnits("10", 6);

      beforeEach(async () => {
        await usdt
          .connect(alice)
          .approve(await vault.getAddress(), initialAmount);
        await vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), initialAmount);
      });

      it("should allow upgrading offer with extra payout", async () => {
        await usdt
          .connect(alice)
          .approve(await vault.getAddress(), extraAmount);
        await expect(
          vault.connect(alice).upgradeOffer(idOffer, extraAmount)
        ).to.emit(vault, "OfferUpgraded");
        const offer = await vault.offers(idOffer);
        expect(offer.balance).to.equal(initialAmount + extraAmount);
      });

      it("should revert if upgrading a non-existent offer", async () => {
        const invalidOfferId = hexlify(ethers.randomBytes(32));
        await expect(
          vault.connect(alice).upgradeOffer(invalidOfferId, extraAmount)
        ).to.be.revertedWith("AP03: offer is not open");
      });
    });

    describe("claim reward", () => {
      let idOffer = hexlify(ethers.randomBytes(32));

      beforeEach(async () => {});
      it("should allow claim reward ERC20", async () => {
        let amount = parseUnits("100", 6);
        await usdt.connect(alice).approve(await vault.getAddress(), amount);
        await vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), amount);

        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);
        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));
        await expect(vault.connect(bob).claimReward(data, signature)).to.emit(
          vault,
          "RewardClaimed"
        );
        const offer = await vault.offers(idOffer);
        expect(offer.balance).to.equal(amount - reward);
      });

      it("should allow claim reward Native token", async () => {
        let amount = parseUnits("100", 18);
        await vault
          .connect(alice)
          .openOffer(idOffer, ZeroAddress, amount, { value: amount });
        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);
        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));
        await expect(
          vault.connect(bob).claimReward(data, signature)
        ).to.be.changeEtherBalance(bob, reward);
        const offer = await vault.offers(idOffer);
        expect(offer.balance).to.equal(amount - reward);
      });

      it("should revert if claim reward with invalid signature", async () => {
        let amount = parseUnits("100", 6);
        await usdt.connect(alice).approve(await vault.getAddress(), amount);
        await vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), amount);

        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);

        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));

        await expect(vault.connect(bob).claimReward(data, signature + "00")).to
          .be.reverted;
      });

      it("should revert if claim reward with duplicate unidata", async () => {
        let amount = parseUnits("100", 6);
        await usdt.connect(alice).approve(await vault.getAddress(), amount);
        await vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), amount);

        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);
        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));
        await vault.connect(bob).claimReward(data, signature);

        const data2 = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, charlie.address, reward, unidata]
        );
        const dataHash2 = ethers.keccak256(data2);
        const signature2 = await verifier.signMessage(getBytes(dataHash2));
        await expect(vault.connect(charlie).claimReward(data2, signature2)).to
          .be.reverted;
      });
    });

    describe("close offer", () => {
      let idOffer = hexlify(ethers.randomBytes(32));

      it("close offer native token", async () => {
        let amount = parseUnits("100", 18);
        await vault.connect(alice).openOffer(idOffer, ZeroAddress, amount, {
          value: amount,
        });

        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);

        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));
        await expect(vault.connect(bob).claimReward(data, signature)).to.emit(
          vault,
          "RewardClaimed"
        );

        await expect(vault.connect(alice).closeOffer(idOffer)).to.emit(
          vault,
          "OfferClosed"
        );
      });

      it("close offer ERC-20 token", async () => {
        let amount = parseUnits("100", 6);
        await usdt.connect(alice).approve(await vault.getAddress(), amount);
        await vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), amount);

        const verifier = new Wallet(process.env.VERIFIER_KEY!);
        const receiver = bob.address;
        const reward = parseUnits("10", 6);
        const unidata = keccak256("0x1234");
        const data = AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "address", "uint256", "bytes32"],
          [idOffer, receiver, reward, unidata]
        );
        const dataHash = ethers.keccak256(data);
        const signature = await verifier.signMessage(getBytes(dataHash));
        await expect(vault.connect(bob).claimReward(data, signature)).to.emit(
          vault,
          "RewardClaimed"
        );

        await expect(vault.connect(alice).closeOffer(idOffer)).to.emit(
          vault,
          "OfferClosed"
        );
      });
    });
  });
});
