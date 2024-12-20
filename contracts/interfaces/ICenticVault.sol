// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICenticVault {
    enum Status {
        Deactivate,
        Active,
        Claimable,
        Claimed,
        Cancelled,
        Expired
    }

    struct Offer {
        string description;
        address member;
        address tokenPayout;
        uint256 amountPayout;
        uint256 deadline;
        Status status;
    }

    // Only manager can make this call
    error OnlyManager();
    // Only sponsor can make this call
    error OnlySponsor();

    error DuplicatedOffer();

    event AddMember(address indexed member);

    event UpdateOffer(Offer indexed offer);
}
