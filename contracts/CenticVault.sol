// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/ICenticVault.sol";

contract CenticVault is ICenticVault, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    string public constant VERSION = "1.0";
    address public sponsor;
    address public tokenPayout;
    uint256 public totalPayout;
    address public manager;
    uint256 public deadline;
    uint256 public deadlineClaim;

    bool fauceted = false;
    bool vaultClosed = false;
    uint256 balance;
    address[] public members;

    mapping(address => Offer) public offers;

    modifier onlyManager() {
        if (manager != msg.sender) revert OnlyManager();
        _;
    }

    modifier onlySponsor() {
        if (sponsor != msg.sender) revert OnlySponsor();
        _;
    }

    function initialize(
        address _sponsor,
        address _tokenPayout,
        uint256 _totalPayout,
        address _manager
    ) public initializer {
        __ReentrancyGuard_init();
        sponsor = _sponsor;
        tokenPayout = _tokenPayout;
        totalPayout = _totalPayout;
        manager = _manager;
    }

    function deposit() public payable {
        require(fauceted == false, "Vault already fauceted");
        if (tokenPayout != address(0)) {
            IERC20(tokenPayout).safeTransferFrom(
                msg.sender,
                address(this),
                totalPayout
            );
        } else {
            require(msg.value == totalPayout, "Invalid amount");
        }
        fauceted = true;
        balance = totalPayout;
    }

    function updateOffer(
        address _sponsor,
        address _tokenPayout,
        uint256 _totalPayout,
        address _manager,
        uint256 _deadline
    ) public onlyManager {
        sponsor = _sponsor;
        tokenPayout = _tokenPayout;
        totalPayout = _totalPayout;
        manager = _manager;
        deadline = _deadline;
    }

    function addOffer(Offer calldata _offer) public onlyManager {
        require(
            offers[_offer.member].status == Status.Deactivate,
            "Duplicated offer"
        );

        _addMember(_offer.member);
        _updateOffer(_offer);
    }

    function updateStatus(address _member, Status _status) public onlyManager {
        Offer storage offer = offers[_member];
        offer.status = _status;
        emit UpdateOffer(offer);
    }

    function claim() public nonReentrant {
        require(
            offers[msg.sender].status == Status.Claimable,
            "Invalid status"
        );
        offers[msg.sender].status = Status.Claimed;
        if (tokenPayout != address(0)) {
            IERC20(tokenPayout).safeTransfer(msg.sender, totalPayout);
        } else {
            payable(msg.sender).transfer(totalPayout);
        }
    }

    function closeVault() public onlyManager nonReentrant {
        require(block.timestamp > deadline, "Invalid deadline");
        require(vaultClosed == false, "Vault already closed");
        uint256 amountClaimNeed = 0;
        for (uint256 i = 0; i < members.length; i++) {
            if (offers[members[i]].status == Status.Claimable) {
                amountClaimNeed += offers[members[i]].amountPayout;
            }
        }

        if (tokenPayout != address(0)) {
            IERC20(tokenPayout).safeTransfer(
                sponsor,
                balance - amountClaimNeed
            );
        } else {
            payable(manager).transfer(amountClaimNeed);
        }

        vaultClosed = true;
    }

    //region Internal functions

    function _updateOffer(Offer calldata _offer) internal {
        Offer storage offer = offers[_offer.member];
        offer.description = _offer.description;
        offer.tokenPayout = _offer.tokenPayout;
        offer.amountPayout = _offer.amountPayout;
        offer.deadline = _offer.deadline;
        offer.status = _offer.status;
        emit UpdateOffer(offer);
    }

    function _addMember(address _member) internal {
        members.push(_member);
        emit AddMember(_member);
    }
}
