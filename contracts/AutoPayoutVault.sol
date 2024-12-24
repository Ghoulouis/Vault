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
    mapping(bytes32 => mapping(uint256 => Particapant))
        public particapantBalances;

    function initialize() public initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function openOffer(
        bytes32 _id,
        address _addr,
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
        offer.addr = _addr;
        offer.tokenPayout = _tokenPayout;
        offer.totalPayout = _totalPayout;
        offer.minPayout = _minPayout;
        offer.balance = _totalPayout;
        offer.particapantCounter = 0;
        offer.status = OfferStatus.OPEN;
    }

    function upgradeOffer(bytes32 _id, uint256 _extraPayout) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");
        _tranferIn(offer.tokenPayout, _extraPayout);
        offer.totalPayout += _extraPayout;
        offer.balance += _extraPayout;
    }

    function acceptOffer() public {}

    function closeOffer() public {}

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
}
