import { HardhatUserConfig } from "hardhat/config";
import "hardhat-deploy";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import dotenv from "dotenv";
import "@typechain/hardhat";
dotenv.config();

const TEST_HDWALLET = {
    mnemonic: "test test test test test test test test test test test junk",
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 20,
    passphrase: "",
};
const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : TEST_HDWALLET;

const config: HardhatUserConfig = {
    paths: {
        artifacts: "artifacts",
        cache: "cache",
        deploy: "deploy",
        sources: "contracts",
        tests: "test",
    },
    solidity: {
        compilers: [
            {
                version: "0.8.24",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                        details: {
                            yul: false,
                        },
                    },
                    viaIR: true,
                    metadata: {
                        bytecodeHash: "none",
                    },
                },
            },
        ],
    },
    namedAccounts: {
        deployer: 0,
        alice: 1,
        bob: 2,
    },
    networks: {
        hardhat: {
            chainId: 31337,
            accounts: TEST_HDWALLET,
            tags: ["hardhat"],
            deploy: ["deploy/hardhat"],
            saveDeployments: true,
        },
    },
};

export default config;
