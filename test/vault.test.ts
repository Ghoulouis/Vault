import { Address } from "./../typechain-types/@openzeppelin/contracts/utils/Address";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  SnapshotRestorer,
  takeSnapshot,
} from "@nomicfoundation/hardhat-network-helpers";
import { hexlify, parseUnits, ZeroAddress } from "ethers";
import hre, { ethers } from "hardhat";
import { AutoPayoutVault, USDT } from "../typechain-types";
import { expect } from "chai";

describe("factory test", () => {
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
    let minAmount = parseUnits("60", 6);
    beforeEach(async () => {
      await usdt.connect(alice).approve(await vault.getAddress(), amount);
      await vault
        .connect(alice)
        .openOffer(idOffer, await usdt.getAddress(), amount, minAmount);
    });

    it("should revert when douplicate id", async () => {
      await expect(
        vault
          .connect(alice)
          .openOffer(idOffer, await usdt.getAddress(), amount, minAmount)
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
          .openOffer(
            idOffer,
            await usdt.getAddress(),
            initialAmount,
            minAmount
          );
      });

      it("should allow upgrading offer with extra payout", async () => {
        await usdt
          .connect(alice)
          .approve(await vault.getAddress(), extraAmount);
        await vault.connect(alice).upgradeOffer(idOffer, extraAmount);

        const offer = await vault.offers(idOffer);
        expect(offer.totalPayout).to.equal(initialAmount + extraAmount);
        expect(offer.balance).to.equal(initialAmount + extraAmount);
      });

      it("should revert if upgrading a non-existent offer", async () => {
        const invalidOfferId = hexlify(ethers.randomBytes(32));
        await expect(
          vault.connect(alice).upgradeOffer(invalidOfferId, extraAmount)
        ).to.be.revertedWith("AP03: offer is not open");
      });
    });

    describe("accept Offer", () => {
      it("should allow participant to accept offer", async () => {
        await vault.connect(bob).acceptOffer(idOffer);
        const participant = await vault.particapants(idOffer, 0);
        expect(participant.addr).to.equal(bob.address);
        expect(participant.reward).to.equal(0);
      });

      it("should revert if offer is not open", async () => {
        const invalidOfferId = hexlify(ethers.randomBytes(32));
        await expect(
          vault.connect(bob).acceptOffer(invalidOfferId)
        ).to.be.revertedWith("AP03: offer is not open");
      });

      it("should revert if offer is already accepted", async () => {
        await vault.connect(bob).acceptOffer(idOffer);
        await expect(
          vault.connect(bob).acceptOffer(idOffer)
        ).to.be.revertedWith("AP04: already accepted");
      });

      it("should revert if offer is full", async () => {
        await vault.connect(bob).acceptOffer(idOffer);

        await expect(
          vault.connect(charlie).acceptOffer(idOffer)
        ).to.be.revertedWith("AP05: full particapants");
      });
    });

    describe("update Reward", () => {
      beforeEach(async () => {
        await vault.connect(bob).acceptOffer(idOffer);
      });

      it("should allow owner to update reward", async () => {
        await vault
          .connect(deployer)
          .AddRewardParticapants([idOffer], [0], [parseUnits("10", 6)]);
        const participant = await vault.particapants(idOffer, 0);
        expect(participant.reward).to.equal(parseUnits("10", 6));
      });

      it("should revert if offer is not open", async () => {
        const invalidOfferId = hexlify(ethers.randomBytes(32));
        await expect(
          vault
            .connect(deployer)
            .AddRewardParticapants([invalidOfferId], [0], [parseUnits("10", 6)])
        ).to.be.revertedWith("AP07: offer is not open");
      });

      it("should revert if participant is not accepted", async () => {
        await expect(
          vault
            .connect(deployer)
            .AddRewardParticapants([idOffer], [2], [parseUnits("10", 6)])
        ).to.be.revertedWith("AP08: not accepted status");
      });
    });
  });
});
