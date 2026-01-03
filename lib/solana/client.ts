import { createSolanaRpc, createSolanaRpcSubscriptions, type Address } from '@solana/kit';

// RPC endpoints
const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_WS = 'wss://api.devnet.solana.com';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const MAINNET_WS = 'wss://api.mainnet-beta.solana.com';

export type Network = 'devnet' | 'mainnet';

export function createClient(network: Network = 'devnet') {
  const rpcUrl = network === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
  const wsUrl = network === 'mainnet' ? MAINNET_WS : DEVNET_WS;

  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

  return {
    rpc,
    rpcSubscriptions,
    rpcUrl,
    wsUrl,

    async getBalance(address: Address): Promise<bigint> {
      const { value } = await rpc.getBalance(address).send();
      return value;
    },
  };
}

// Singleton client for the app
let _client: ReturnType<typeof createClient> | null = null;

export function getClient(network: Network = 'devnet') {
  if (!_client) {
    _client = createClient(network);
  }
  return _client;
}
