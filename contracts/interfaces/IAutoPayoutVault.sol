// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAutoPayoutVault {
    enum OfferStatus {
        NOT_EXIST,
        OPEN,
        CLOSED
    }

    enum ParticapantStatus {
        ACCEPTED,
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
}
