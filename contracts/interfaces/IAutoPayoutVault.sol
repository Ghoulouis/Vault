// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAutoPayoutVault {
    enum OfferStatus {
        NOT_EXIST,
        OPEN,
        CLOSED
    }

    struct Offer {
        bytes32 id;
        address addr;
        address token;
        uint256 balance;
        OfferStatus status;
    }

    event OfferOpened(
        bytes32 indexed id,
        address indexed addr,
        address indexed token,
        uint256 amount
    );

    event OfferUpgraded(bytes32 indexed id, uint256 amount);

    event OfferAccepted(
        bytes32 indexed id,
        uint256 indexed particapantIndex,
        address indexed addr
    );

    event RewardUpdated(
        bytes32 indexed id,
        uint256 indexed particapantIndex,
        uint256 reward
    );

    event RewardClaimed(
        bytes32 indexed id,
        address indexed addr,
        uint256 reward
    );
}
