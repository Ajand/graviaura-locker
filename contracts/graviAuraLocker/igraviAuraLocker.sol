// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title   AuraLocker
 * @author  Aj Maz
 * @notice  Interface for igraviAuraLocker
 *          There will be two version of this locker.
 *          One would be for the protocol owns tokens and one would be allow protocols to reward their users for staking their tokens.
 *          This interface focuses on the first one but the second one must also support this interface as well.
 *          This locker is highly inspired by CVX Locking contract
 *
 */
interface igraviAuraLocker {
    /*********** STRUCTS ***********/
    struct Deposits {
        uint256 amount;
        uint256 withdrawAmount;
        uint32 unlockTime;
    }
    struct Epoch {
        uint224 supply;
        uint32 date;
    }

    /*********** ADMIN ***********/
    function recoverERC20(address _tokenAddress, uint256 _tokenAmount) external;

    /*********** ACTIONS ***********/
    function lock(address _account, uint256 _amount) external;

    function checkpointEpoch() external;

    function withdraw() external;

    /*********** VIEWS ***********/
    function balanceOf(address _user)
        external
        view
        returns (uint256 userBalance);

    function withdrawableBalanceOf(address _user)
        external
        view
        returns (uint256 userBalance);

    function deposits(address _user)
        external
        view
        returns (Deposits[] memory userDeposits);

    function totalSupply() external view returns (uint256 supply);

    function totalSupplyAtEpoch(uint256 _epoch)
        external
        view
        returns (uint256 supply);

    function epochCount() external view returns (uint256 epochCount_);

    /*********** EVENTS ***********/
    event Recovered(address _token, uint256 _amount);
}
