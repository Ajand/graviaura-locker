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

// TODO since we this contract have no delegation of votes nor rewards
// The epoch system makes no sense
// need to get rid of it.

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

    function withdraw(uint256 _amount) public virtual {
        require(
            withdrawableBalanceOf(msg.sender) >= _amount,
            "not enough balance."
        );
        _checkpointEpoch();
        uint256 amountCounter = _amount;
        Deposit[] storage targetDeposits = userDeposits[msg.sender];
        for (uint256 i = 0; i < targetDeposits.length; i++) {
            uint256 depoistBalance = targetDeposits[i].amount -
                targetDeposits[i].withdrawAmount;
            if (
                depoistBalance == 0 ||
                targetDeposits[i].unlockTime > block.timestamp ||
                amountCounter == 0
            ) {
                break;
            }
            if (amountCounter > depoistBalance) {
                amountCounter = amountCounter - depoistBalance;
                targetDeposits[i].withdrawAmount = targetDeposits[i].amount;
            } else {
                targetDeposits[i].withdrawAmount =
                    targetDeposits[i].withdrawAmount +
                    amountCounter;
                amountCounter = 0;
            }
        }

        lockedSupply = lockedSupply.sub(_amount);

        IERC20(lockingAsset).safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount, epochs.length - 1);
    }

    /*********** VIEWS ***********/
    function balanceOf(address _user)
        public
        view
        virtual
        returns (uint256 userBalance)
    {
        Deposit[] memory targetDeposits = userDeposits[_user];
        for (uint256 i = 0; i < targetDeposits.length; i++) {
            userBalance =
                userBalance +
                targetDeposits[i].amount -
                targetDeposits[i].withdrawAmount;
        }
        return userBalance;
    }

    function withdrawableBalanceOf(address _user)
        public
        view
        virtual
        returns (uint256 userBalance)
    {
        Deposit[] memory targetDeposits = userDeposits[_user];
        for (uint256 i = 0; i < targetDeposits.length; i++) {
            if (uint256(targetDeposits[i].unlockTime) <= block.timestamp)
                userBalance =
                    userBalance +
                    targetDeposits[i].amount -
                    targetDeposits[i].withdrawAmount;
        }
        return userBalance;
    }

    function deposits(address _user)
        public
        view
        virtual
        returns (Deposit[] memory userDeposits_)
    {
        userDeposits_ = userDeposits[_user];
    }

    function totalSupply() external view virtual returns (uint256 supply) {
        return lockedSupply;
    }

    function totalSupplyAtEpoch(uint256 _epoch)
        public
        view
        virtual
        returns (uint256 supply)
    {
        uint256 epochStart = uint256(epochs[0].date).add(
            uint256(_epoch).mul(EPOCH_DURATION)
        );
        uint256 cutoffEpoch = epochStart.sub(LOCK_DURATION);

        require(epochStart < block.timestamp, "Epoch is in the future");

        //traverse inversely to make more current queries more gas efficient
        for (uint i = _epoch + 1; i > 0; i--) {
            Epoch memory e = epochs[i - 1];
            if (uint256(e.date) <= cutoffEpoch) {
                break;
            }
            supply = supply.add(e.supply);
        }
    }

    // Get an epoch index based on timestamp
    function findEpochId(uint256 _time)
        public
        view
        virtual
        returns (uint256 epoch)
    {
        return _time.sub(epochs[0].date).div(EPOCH_DURATION);
    }

    function epochCount() public view virtual returns (uint256 epochCount_) {
        return epochs.length;
    }
}
