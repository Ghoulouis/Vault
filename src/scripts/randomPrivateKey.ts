import { ethers } from "ethers";

function generateRandomPrivateKey(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.privateKey;
}

const privateKey = generateRandomPrivateKey();
console.log(`Generated Private Key: ${privateKey}`);
