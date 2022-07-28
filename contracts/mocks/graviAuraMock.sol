// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GraviAuraMock is ERC20 {
    constructor() ERC20("GraviAuraMock", "GAM") {}

    function mint(address _receiver, uint256 _amount) public {
        _mint(_receiver, _amount);
    }
}
