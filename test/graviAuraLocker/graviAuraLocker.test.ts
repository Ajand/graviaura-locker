import { expect } from "chai";
import { ethers } from "hardhat";
import {
  getNamedAccounts,
  GraviAuraLockerTestContext,
  shouldBehaveLikeGovernance,
} from "./graviAuraLocker.behaviour";

import { deployProxy } from "../utils/fixtures";

describe("graviAuraLocker", () => {
  describe("when using  contract with constructor", () => {
    const buildTestContext = async (): Promise<GraviAuraLockerTestContext> => {
      const accounts = await getNamedAccounts();

      // TODO should deploy a contract for locking token - MOCK graviAura

      const deployParams = {
        owner: accounts.owner.address,
        lockingAsset: ethers.constants.AddressZero,
      };

      return {
        accounts,
        deployParams,
      };
    };

    describe("when testing deployed contract", () => {
      shouldBehaveLikeGovernance(buildTestContext);
    });
  });

  describe("when deploying the contract as proxy", () => {});
});
