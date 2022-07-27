// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {igraviAuraLocker} from "./igraviAuraLocker.sol";

/**
 * @title   AuraLocker
 * @author  Aj Maz
 * @notice  The core implementation of graviAuraLockerCore for the protocol owns tokens
 *          This locker is highly inspired by CVX Locking contract
 *          Effectively allows for rolling 16 week lockups of CVX, and provides balances available
 *          at each epoch (1 week). Also receives cvxCrv from `CvxStakingProxy` and redistributes
 *          to depositors.
 *
 */

abstract contract graviAuraLockerCore is
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    igraviAuraLocker
{
    /// TODO: Use these functions for initializing
    /// __ReentrancyGuard_init
    /// __Ownable_init
}
