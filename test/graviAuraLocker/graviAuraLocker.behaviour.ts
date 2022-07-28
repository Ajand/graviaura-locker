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
      const { lockerer, owner } = accounts;

      const transferAmount = 10000;

      await asset.mint(lockerer.address, transferAmount);
      await asset.connect(lockerer).transfer(locker.address, transferAmount);

      await expect(
        locker.connect(owner).recoverERC20(asset.address, transferAmount)
      ).to.be.revertedWith("Cannot withdraw staking token");
    });
  });
};
