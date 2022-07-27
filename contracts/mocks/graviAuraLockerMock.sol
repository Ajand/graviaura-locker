// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {graviAuraLockerCore} from "../graviAuraLocker/graviAuraLockerCore.sol";

contract graviAuraLockerMock is graviAuraLockerCore {
    constructor(address _owner, address _lockingAsset) {}
}
