// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {graviAuraLockerCore} from "./graviAuraLockerCore.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract graviAuraLocker is graviAuraLockerCore, Ownable {
    constructor(address _owner, address _lockingAsset) {
        lockingAsset = _lockingAsset;
        transferOwnership(_owner);
    }

    function owner()
        public
        view
        override(graviAuraLockerCore, Ownable)
        returns (address)
    {
        return super.owner();
    }
}
