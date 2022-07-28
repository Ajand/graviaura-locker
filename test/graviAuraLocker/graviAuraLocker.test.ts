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

      const GraviAuraMock = await ethers.getContractFactory("GraviAuraMock");

      const graviAuraMock = await GraviAuraMock.deploy();
      const randomAsset = await GraviAuraMock.deploy();

      const GraviAuraLockerMock = await ethers.getContractFactory(
        "GraviAuraLockerMock"
      );

      const graviAuraLockerMock = await GraviAuraLockerMock.connect(
        accounts.owner
      ).deploy(accounts.owner.address, graviAuraMock.address);

      const deployParams = {
        owner: accounts.owner.address,
        lockingAsset: ethers.constants.AddressZero,
      };

      return {
        accounts,
        deployParams,
        asset: graviAuraMock,
        locker: graviAuraLockerMock,
        randomAsset,
      };
    };

    describe("when testing deployed contract", () => {
      shouldBehaveLikeGovernance(buildTestContext);
    });
  });

  describe("when deploying the contract as proxy", () => {});
});
