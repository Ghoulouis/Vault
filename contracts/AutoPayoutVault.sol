// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/IAutoPayoutVault.sol";

contract AutoPayoutVault is
    IAutoPayoutVault,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public immutable MANAGER_ROLE = keccak256("MANAGER_ROLE");

    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => mapping(uint256 => Particapant)) public particapants;

    function initialize() public initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    function openOffer(
        bytes32 _id,
        address _tokenPayout,
        uint256 _totalPayout,
        uint256 _minPayout
    ) public {
        Offer storage offer = offers[_id];
        require(
            offer.status == OfferStatus.NOT_EXIST,
            "AP01: offer already exists"
        );
        _tranferIn(_tokenPayout, _totalPayout);
        offer.id = _id;
        offer.addr = msg.sender;
        offer.tokenPayout = _tokenPayout;
        offer.totalPayout = _totalPayout;
        offer.minPayout = _minPayout;
        offer.balance = _totalPayout;
        offer.particapantCounter = 0;
        offer.status = OfferStatus.OPEN;

        emit OfferOpened(
            _id,
            msg.sender,
            _tokenPayout,
            _totalPayout,
            _minPayout
        );
    }

    function upgradeOffer(bytes32 _id, uint256 _extraPayout) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");
        _tranferIn(offer.tokenPayout, _extraPayout);
        offer.totalPayout += _extraPayout;
        offer.balance += _extraPayout;

        emit OfferUpgraded(_id, _extraPayout);
    }

    function acceptOffer(bytes32 _id) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");
        for (uint256 i = 0; i < offer.particapantCounter; i++) {
            require(
                particapants[_id][i].addr != msg.sender,
                "AP04: already accepted"
            );
        }
        require(
            offer.totalPayout >=
                offer.minPayout * (offer.particapantCounter + 1),
            "AP05: full particapants"
        );
        particapants[_id][offer.particapantCounter] = Particapant({
            addr: msg.sender,
            reward: 0,
            status: ParticapantStatus.ACCEPTED
        });
        offer.particapantCounter++;

        emit OfferAccepted(_id, offer.particapantCounter - 1, msg.sender);
    }

    function AddRewardParticapants(
        bytes32[] calldata _id,
        uint256[] calldata _index,
        uint256[] calldata _reward
    ) public {
        require(hasRole(MANAGER_ROLE, msg.sender), "AP06: not manager");
        for (uint256 i = 0; i < _id.length; i++) {
            _addRewardParticapant(_id[i], _index[i], _reward[i]);
        }
    }

    function claimReward(bytes32 _id) public {
        Offer storage offer = offers[_id];
        for (uint256 i = 0; i < offer.particapantCounter; i++) {
            Particapant storage particapant = particapants[_id][i];
            if (particapant.addr == msg.sender) {
                require(
                    particapant.status == ParticapantStatus.ACCEPTED,
                    "AP11: not accepted status"
                );
                require(particapant.reward > 0, "AP12: reward is zero");
                _tranferOut(offer.tokenPayout, msg.sender, particapant.reward);
                particapant.status = ParticapantStatus.CLAIMED;

                emit RewardClaimed(_id, i, msg.sender, particapant.reward);
                return;
            }
        }
    }

    function closeOffer(bytes32 _id) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP07: offer is not open");
        require(offer.addr == msg.sender, "AP10: not owner");
        _tranferOut(offer.tokenPayout, msg.sender, offer.balance);
        offer.status = OfferStatus.CLOSED;
    }

    function _tranferIn(address token, uint256 amount) internal {
        if (token == address(0)) {
            require(msg.value == amount, "AP02: invalid amount");
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
    }

    function _tranferOut(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _addRewardParticapant(
        bytes32 _id,
        uint256 _index,
        uint256 _reward
    ) internal {
        Offer storage offer = offers[_id];

        require(offer.status == OfferStatus.OPEN, "AP07: offer is not open");
        require(
            particapants[_id][_index].status == ParticapantStatus.ACCEPTED,
            "AP08: not accepted status"
        );
        require(_reward <= offer.minPayout, "AP09: invalid reward");
        offer.balance = offer.balance - _reward;
        particapants[_id][_index].reward += _reward;

        emit RewardUpdated(_id, _index, _reward);
    }
}
