import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import type { BigNumber } from "ethers";
import { ethers, network } from "hardhat";

export type GraviAuraLockerAccount = {
  owner: SignerWithAddress;
  locker: SignerWithAddress;
  erc20sender: SignerWithAddress;
};

export const getNamedAccounts = async (): Promise<GraviAuraLockerAccount> => {
  const [owner, locker, erc20sender] = await ethers.getSigners();
  return {
    owner,
    locker,
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
  //    locker
  //    lockingAsset
};

export const shouldBehaveLikeGovernance = (
  buildContext: () => Promise<GraviAuraLockerTestContext>
) => {};
