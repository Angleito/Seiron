import { ethers } from "ethers";

// Sei Network configuration
const SEI_RPC_URL = process.env.SEI_RPC_URL || "https://evm-rpc.sei-apis.com";
const SEI_CHAIN_ID = 1328;

let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;

export async function getProvider(): Promise<ethers.JsonRpcProvider> {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(SEI_RPC_URL);
  }
  return provider;
}

export async function getSigner(): Promise<ethers.Wallet> {
  if (!signer) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable not set");
    }
    
    const provider = await getProvider();
    signer = new ethers.Wallet(privateKey, provider);
  }
  return signer;
}

export async function getChainId(): Promise<number> {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export async function validateNetwork(): Promise<boolean> {
  const chainId = await getChainId();
  return chainId === SEI_CHAIN_ID;
}

export async function getBalance(address: string): Promise<bigint> {
  const provider = await getProvider();
  return provider.getBalance(address);
}

export async function estimateGas(
  to: string,
  data: string,
  value: bigint = BigInt(0)
): Promise<bigint> {
  const provider = await getProvider();
  const signer = await getSigner();
  
  try {
    const estimate = await provider.estimateGas({
      from: await signer.getAddress(),
      to,
      data,
      value
    });
    
    // Add 20% buffer for safety
    return (estimate * BigInt(120)) / BigInt(100);
  } catch (error) {
    // Fallback to reasonable default
    return BigInt(500000);
  }
}

export async function waitForTransaction(
  txHash: string,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<ethers.TransactionReceipt | null> {
  const provider = await getProvider();
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.confirmations >= confirmations) {
        return receipt;
      }
    } catch (error) {
      // Transaction might not be found yet
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Transaction timeout: ${txHash}`);
}