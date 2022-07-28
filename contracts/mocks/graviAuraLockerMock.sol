// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {graviAuraLocker} from "../graviAuraLocker/graviAuraLocker.sol";

contract GraviAuraLockerMock is graviAuraLocker {
    constructor(address _owner, address _lockingAsset)
        graviAuraLocker(_owner, _lockingAsset)
    {}
}
