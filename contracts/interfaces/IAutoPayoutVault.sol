// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAutoPayoutVault {
    enum OfferStatus {
        NOT_EXIST,
        OPEN,
        CLOSED
    }

    enum ParticapantStatus {
        NOT_EXIST,
        ACCEPTED,
        CLAIMED,
        REJECTED
    }

    struct Particapant {
        address addr;
        uint256 reward;
        ParticapantStatus status;
    }

    struct Offer {
        bytes32 id;
        address addr;
        address tokenPayout;
        uint256 totalPayout;
        uint256 minPayout;
        uint256 balance;
        uint256 particapantCounter;
        OfferStatus status;
    }

    event OfferOpened(
        bytes32 indexed id,
        address indexed addr,
        address indexed tokenPayout,
        uint256 totalPayout,
        uint256 minPayout
    );

    event OfferUpgraded(bytes32 indexed id, uint256 extraPayout);

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
        uint256 indexed particapantIndex,
        address indexed addr,
        uint256 reward
    );
}
