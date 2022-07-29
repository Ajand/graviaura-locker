// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {igraviAuraLocker} from "./igraviAuraLocker.sol";
import {AuraMath, AuraMath32, AuraMath112, AuraMath224} from "./dependencies/AuraMath.sol";

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

import "hardhat/console.sol";

abstract contract graviAuraLockerCore is
    ReentrancyGuardUpgradeable,
    igraviAuraLocker
{
    /*********** LIBRARY ***********/
    using AuraMath for uint256;
    using AuraMath224 for uint224;
    using AuraMath112 for uint112;
    using AuraMath32 for uint32;
    using SafeERC20 for IERC20;

    /*********** STATES ***********/
    address lockingAsset;

    // Epoch Duration
    uint256 public constant EPOCH_DURATION = 86400 * 7;
    uint256 public constant LOCK_DURATION = EPOCH_DURATION * 16;

    Epoch[] public epochs;
    uint256 public lockedSupply;

    mapping(address => Deposit[]) public userDeposits;

    /// TODO: Use these functions for initializing
    /// __ReentrancyGuard_init
    /// __Ownable_init

    function init() internal {
        uint256 currentEpoch = block.timestamp.div(EPOCH_DURATION).mul(
            EPOCH_DURATION
        );
        epochs.push(Epoch({supply: 0, date: uint32(currentEpoch)}));
    }

    /*********** DEPENDENCIES ***********/
    function owner() public view virtual returns (address) {
        return address(0);
    }

    /*********** ADMIN ***********/
    function recoverERC20(address _tokenAddress, uint256 _tokenAmount)
        public
        virtual
    {
        require(
            _tokenAddress != address(lockingAsset),
            "Cannot withdraw staking token"
        );
        IERC20(_tokenAddress).safeTransfer(owner(), _tokenAmount);
        emit Recovered(_tokenAddress, _tokenAmount);
    }

    /*********** ACTIONS ***********/
    function lock(address _account, uint256 _amount) public virtual {
        IERC20(lockingAsset).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        _checkpointEpoch();
        lockedSupply = lockedSupply.add(_amount);
        uint256 currentEpoch = block.timestamp.div(EPOCH_DURATION).mul(
            EPOCH_DURATION
        );
        uint256 unlockTime = currentEpoch.add(LOCK_DURATION);

        userDeposits[_account].push(
            Deposit({
                amount: _amount,
                withdrawAmount: 0,
                unlockTime: uint32(unlockTime)
            })
        );

        Epoch storage e = epochs[epochs.length - 1];
        e.supply = e.supply.add(_amount);

        emit Locked(_account, _amount, epochs.length - 1);
    }

    function checkpointEpoch() external virtual {
        _checkpointEpoch();
    }

    function _checkpointEpoch() internal virtual {
        uint256 nextEpoch = block
            .timestamp
            .div(EPOCH_DURATION)
            .mul(EPOCH_DURATION)
            .add(EPOCH_DURATION);
        uint256 epochindex = epochs.length;
        if (epochs[epochindex - 1].date < nextEpoch) {
            //fill any epoch gaps
            while (epochs[epochs.length - 1].date != nextEpoch) {
                uint256 nextEpochDate = uint256(epochs[epochs.length - 1].date)
                    .add(EPOCH_DURATION);
                epochs.push(Epoch({supply: 0, date: uint32(nextEpochDate)}));
            }
        }
    }

    function withdraw() public {}

    /*********** VIEWS ***********/
    function balanceOf(address _user)
        public
        view
        returns (uint256 userBalance)
    {}

    function withdrawableBalanceOf(address _user)
        public
        view
        returns (uint256 userBalance)
    {}

    function deposits(address _user)
        public
        view
        returns (Deposit[] memory userDeposits_)
    {
        userDeposits_ = userDeposits[_user];
    }

    function totalSupply() external view returns (uint256 supply) {}

    function totalSupplyAtEpoch(uint256 _epoch)
        public
        view
        returns (uint256 supply)
    {}

    function epochCount() public view returns (uint256 epochCount_) {
        return epochs.length;
    }
}
