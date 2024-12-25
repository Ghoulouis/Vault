// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IAutoPayoutVault.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract AutoPayoutVault is
    IAutoPayoutVault,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public immutable MANAGER_ROLE = keccak256("MANAGER_ROLE");

    address public verifier;

    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => bool) public signatureUsed;

    function initialize(address _verifier) public initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        verifier = _verifier;
    }

    function openOffer(
        bytes32 _id,
        address _token,
        uint256 _amount
    ) public payable {
        Offer storage offer = offers[_id];
        require(
            offer.status == OfferStatus.NOT_EXIST,
            "AP01: offer already exists"
        );
        _tranferIn(_token, _amount);
        offer.id = _id;
        offer.addr = msg.sender;
        offer.token = _token;
        offer.balance = _amount;
        offer.status = OfferStatus.OPEN;
        emit OfferOpened(_id, msg.sender, _token, _amount);
    }

    function claimReward(
        bytes calldata data,
        bytes calldata signature
    ) public nonReentrant {
        (bytes32 id, address addr, uint256 amount) = abi.decode(
            data,
            (bytes32, address, uint256)
        );
        require(
            verifyEthMessage(verifier, data, signature),
            "AP08: invalid signature"
        );
        require(msg.sender == addr, "AP06: not owner reward");
        bytes32 signatureHash = keccak256(signature);
        require(!signatureUsed[signatureHash], "AP09: signature already used");
        signatureUsed[keccak256(signature)] = true;

        Offer storage offer = offers[id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");

        offer.balance -= amount;
        _tranferOut(offer.token, addr, amount);

        emit RewardClaimed(id, addr, amount);
    }

    function upgradeOffer(bytes32 _id, uint256 _extraPayout) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");
        _tranferIn(offer.token, _extraPayout);
        offer.balance += _extraPayout;
        emit OfferUpgraded(_id, _extraPayout);
    }

    function closeOffer(bytes32 _id) public nonReentrant {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP07: offer is not open");
        require(offer.addr == msg.sender, "AP10: not owner");
        offer.status = OfferStatus.CLOSED;
        _tranferOut(offer.token, msg.sender, offer.balance);
        offer.balance = 0;
        emit OfferClosed(_id, offer.balance);
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

    function verifyEthMessage(
        address signer,
        bytes calldata data,
        bytes calldata signature
    ) public pure returns (bool) {
        bytes32 messageHash = keccak256(data);
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address recoveredSigner = ECDSA.recover(
            ethSignedMessageHash,
            signature
        );
        return recoveredSigner == signer;
    }

    function changeVerifier(address _verifier) public {
        require(
            hasRole(MANAGER_ROLE, msg.sender),
            "AP04: must have manager role"
        );
        verifier = _verifier;
    }
}
