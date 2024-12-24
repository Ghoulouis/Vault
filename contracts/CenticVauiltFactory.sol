// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./Proxy.sol";

interface IVault {
    function initialize(
        address _sponsor,
        address _tokenPayout,
        uint256 _totalPayout,
        address _manager
    ) external;
}

contract CenticVaultFactory is AccessControlUpgradeable {
    event ProxyCreation(address indexed proxy, address singleton);

    address public singletonVault;

    function initialize(address _singletonVault) public initializer {
        __AccessControl_init();
        singletonVault = _singletonVault;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function changeSingletonVault(address _singletonVault) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not an admin"
        );
        singletonVault = _singletonVault;
    }

    function getAddress(
        bytes memory _initializer,
        bytes32 _salt
    ) external view returns (address account) {
        bytes memory code = abi.encodePacked(
            type(Proxy).creationCode,
            uint256(uint160(singletonVault))
        );
        bytes32 salt = keccak256(
            abi.encodePacked(keccak256(_initializer), _salt)
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(code))
        );
        account = address(uint160(uint256(hash)));
    }

    function deploy(
        address _sponsor,
        address _tokenPayout,
        uint256 _totalPayout,
        address _manager,
        bytes32 _salt
    ) external returns (address proxy) {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not an admin"
        );

        bytes memory deploymentData = abi.encodePacked(
            type(Proxy).creationCode,
            uint256(uint160(singletonVault))
        );

        assembly {
            proxy := create2(
                0x0,
                add(0x20, deploymentData),
                mload(deploymentData),
                _salt
            )
        }
        require(address(proxy) != address(0), "Create call failed");

        bytes memory initializer = _getInitializer(
            _sponsor,
            _tokenPayout,
            _totalPayout,
            _manager
        );

        if (initializer.length > 0) {
            assembly {
                if eq(
                    call(
                        gas(),
                        proxy,
                        0,
                        add(initializer, 0x20),
                        mload(initializer),
                        0,
                        0
                    ),
                    0
                ) {
                    revert(0, 0)
                }
            }
        }

        emit ProxyCreation(proxy, singletonVault);
    }

    function _getInitializer(
        address _sponsor,
        address _tokenPayout,
        uint256 _totalPayout,
        address _manager
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                IVault.initialize,
                (_sponsor, _tokenPayout, _totalPayout, _manager)
            );
    }
}
