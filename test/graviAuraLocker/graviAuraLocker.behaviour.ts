import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import type { BigNumber } from "ethers";
import { ethers, network } from "hardhat";

import { GraviAuraLockerMock } from "../../typechain-types/contracts/mocks/GraviAuraLockerMock";
import { GraviAuraMock } from "../../typechain-types/contracts/mocks/GraviAuraMock";

export type GraviAuraLockerAccount = {
  owner: SignerWithAddress;
  lockerer: SignerWithAddress;
  erc20sender: SignerWithAddress;
};

export const getNamedAccounts = async (): Promise<GraviAuraLockerAccount> => {
  const [owner, lockerer, erc20sender] = await ethers.getSigners();
  return {
    owner,
    lockerer,
    erc20sender,
  };
};

export type GraviAuraLockerDeployParams = {
  owner: string;
  lockingAsset: string;
};

export type GraviAuraLockerTestContext = {
  accounts: GraviAuraLockerAccount;
  deployParams: GraviAuraLockerDeployParams;
  asset: GraviAuraMock;
  randomAsset: GraviAuraMock;
  locker: GraviAuraLockerMock;
};

// TODO: Must add more test coverage for withdraw

export const shouldBehaveLikeGovernance = (
  buildContext: () => Promise<GraviAuraLockerTestContext>
) => {
  let context: GraviAuraLockerTestContext;
  beforeEach(async () => {
    context = await buildContext();
  });

  describe("Recovering ERC20 Asset", () => {
    it("should be able to recover wrong erc20s that are sent to it", async () => {
      const { accounts, randomAsset, locker } = context;
      const { erc20sender, owner } = accounts;

      const transferAmount = 10000;

      await randomAsset.mint(erc20sender.address, transferAmount);
      await randomAsset
        .connect(erc20sender)
        .transfer(locker.address, transferAmount);

      const tx = await locker
        .connect(owner)
        .recoverERC20(randomAsset.address, transferAmount);

      await expect(tx)
        .to.emit(randomAsset, "Transfer")
        .withArgs(locker.address, owner.address, transferAmount);
    });

    it("should not be able to recover the locking asset", async () => {
      const { accounts, asset, locker } = context;
      const { erc20sender, owner } = accounts;

      const transferAmount = 10000;

      await asset.mint(erc20sender.address, transferAmount);
      await asset.connect(erc20sender).transfer(locker.address, transferAmount);

      await expect(
        locker.connect(owner).recoverERC20(asset.address, transferAmount)
      ).to.be.revertedWith("Cannot withdraw staking token");
    });
  });

  describe("Locking asset", () => {
    it("must be able to lock asset and transfer the amount", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer, owner } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);

      await asset.connect(lockerer).approve(locker.address, lockAmount);

      const tx = await locker
        .connect(lockerer)
        .lock(lockerer.address, lockAmount);

      await expect(tx)
        .to.emit(asset, "Transfer")
        .withArgs(lockerer.address, locker.address, lockAmount);
    });

    it("lock must change the locked supply", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      expect(await locker.lockedSupply()).to.be.equal(lockAmount);
    });

    it("lock must add proper deposit object", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      const lockerDeposits = await locker.deposits(lockerer.address);

      const nearUnlockTime =
        Math.floor(Number(new Date()) / 1000) + 86400 * 7 * 16;

      expect(lockerDeposits.length).to.be.equal(1);
      expect(lockerDeposits[0].amount).to.be.equal(lockAmount);
      expect(lockerDeposits[0].withdrawAmount).to.be.equal(0);
      expect(lockerDeposits[0].unlockTime - nearUnlockTime).to.be.lessThan(
        86400 * 7
      );
    });

    it("lock must handle epoch checkpoint and supply", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      expect(await locker.epochCount()).to.be.equal(2);

      const currentEpoch = await locker.epochs(1);

      const nearDate = Math.floor(Number(new Date()) / 1000);

      expect(currentEpoch.supply).to.be.equal(lockAmount);
      expect(currentEpoch.date - nearDate).to.be.lessThan(86400 * 7);
    });

    it("must emit a Lock event", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer, owner } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);

      await asset.connect(lockerer).approve(locker.address, lockAmount);

      const tx = await locker
        .connect(lockerer)
        .lock(lockerer.address, lockAmount);

      await expect(tx)
        .to.emit(locker, "Locked")
        .withArgs(lockerer.address, lockAmount, 1);
    });
  });

  describe("Supply views function", () => {
    beforeEach(async () => {
      context = await buildContext();
    });

    it("Must be able to get proper supply at each Epoch", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      const lockAmount2 = 40000;

      await asset.mint(lockerer.address, lockAmount2);
      await asset.connect(lockerer).approve(locker.address, lockAmount2);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount2);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      const lockAmount3 = 50000;

      await asset.mint(lockerer.address, lockAmount3);
      await asset.connect(lockerer).approve(locker.address, lockAmount3);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount3);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.epochCount()).to.be.equal(4);
      expect(await locker.totalSupplyAtEpoch(0)).to.be.equal(0);
      expect(await locker.totalSupplyAtEpoch(1)).to.be.equal(lockAmount);
      expect(await locker.totalSupplyAtEpoch(2)).to.be.equal(
        lockAmount + lockAmount2
      );
      expect(await locker.totalSupplyAtEpoch(3)).to.be.equal(
        lockAmount + lockAmount2 + lockAmount3
      );
    });

    it("Must be able to get proper total supply at each moment", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      expect(await locker.totalSupply()).to.be.equal(0);

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.totalSupply()).to.be.equal(lockAmount);

      const lockAmount2 = 40000;

      await asset.mint(lockerer.address, lockAmount2);
      await asset.connect(lockerer).approve(locker.address, lockAmount2);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount2);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.totalSupply()).to.be.equal(lockAmount2 + lockAmount);

      const lockAmount3 = 50000;

      await asset.mint(lockerer.address, lockAmount3);
      await asset.connect(lockerer).approve(locker.address, lockAmount3);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount3);

      expect(await locker.totalSupply()).to.be.equal(
        lockAmount2 + lockAmount + lockAmount3
      );

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.totalSupply()).to.be.equal(
        lockAmount2 + lockAmount + lockAmount3
      );
    });
  });

  describe("Balance related function", () => {
    it("must show the proper balance for a user after lock", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      expect(await locker.totalSupply()).to.be.equal(0);

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.balanceOf(lockerer.address)).to.be.equal(lockAmount);

      const lockAmount2 = 40000;

      await asset.mint(lockerer.address, lockAmount2);
      await asset.connect(lockerer).approve(locker.address, lockAmount2);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount2);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.balanceOf(lockerer.address)).to.be.equal(
        lockAmount2 + lockAmount
      );

      const lockAmount3 = 50000;

      await asset.mint(lockerer.address, lockAmount3);
      await asset.connect(lockerer).approve(locker.address, lockAmount3);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount3);

      expect(await locker.totalSupply()).to.be.equal(
        lockAmount2 + lockAmount + lockAmount3
      );

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.balanceOf(lockerer.address)).to.be.equal(
        lockAmount2 + lockAmount + lockAmount3
      );
    });

    it("must show the proper withdrawable balance", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      expect(await locker.totalSupply()).to.be.equal(0);

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        0
      );

      const lockAmount2 = 40000;

      await asset.mint(lockerer.address, lockAmount2);
      await asset.connect(lockerer).approve(locker.address, lockAmount2);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount2);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        0
      );

      const lockAmount3 = 50000;

      await asset.mint(lockerer.address, lockAmount3);
      await asset.connect(lockerer).approve(locker.address, lockAmount3);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount3);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        0
      );

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 13]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        lockAmount
      );

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        lockAmount + lockAmount2
      );

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
        lockAmount + lockAmount2 + lockAmount3
      );
    });
  });

  describe("Withdraw ", () => {
    it("must not be able to withdraw if not have enought withdrawable balance", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      expect(await locker.totalSupply()).to.be.equal(0);

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        locker.connect(lockerer).withdraw(lockAmount)
      ).to.be.revertedWith("not enough balance.");
    });

    it("must be able to withdraw if have enought withdrawable balance", async () => {
      const { accounts, asset, locker } = context;
      const { lockerer } = accounts;

      expect(await locker.totalSupply()).to.be.equal(0);

      const lockAmount = 10000;

      await asset.mint(lockerer.address, lockAmount);
      await asset.connect(lockerer).approve(locker.address, lockAmount);
      await locker.connect(lockerer).lock(lockerer.address, lockAmount);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 * 16]);
      await ethers.provider.send("evm_mine", []);

      const tx = await locker.connect(lockerer).withdraw(lockAmount);

      await expect(tx)
        .to.emit(locker, "Withdrawn")
        .withArgs(lockerer.address, lockAmount, 17);

      //expect(await locker.withdrawableBalanceOf(lockerer.address)).to.be.equal(
      //  0
      //);
      //
      expect(await locker.balanceOf(lockerer.address)).to.be.equal(0);

      //expect(await locker.totalSupply()).to.be.equal(0);
    });
  });
};
