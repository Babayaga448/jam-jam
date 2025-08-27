import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';

const CONTRACT_ADDRESS = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4';
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "player", "type": "address"},
      {"internalType": "uint256", "name": "scoreAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "transactionAmount", "type": "uint256"}
    ],
    "name": "updatePlayerData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { playerAddress, score, transactions } = JSON.parse(event.body);
    
    const gameWallet = privateKeyToAccount(process.env.GAME_PRIVATE_KEY);
    
    const walletClient = createWalletClient({
      account: gameWallet,
      chain: monadTestnet,
      transport: http()
    });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'updatePlayerData',
      args: [playerAddress, BigInt(score), BigInt(transactions)]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, hash })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}