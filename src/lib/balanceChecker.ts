export interface AddressBalance {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkBalance(address: string, timeout = 8000): Promise<AddressBalance> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://blockchain.info/balance?active=${address}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        await delay(2000);
        throw new Error('Rate limited');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const addressData = data[address];

    if (!addressData) {
      return {
        address,
        balance: 0,
        totalReceived: 0,
        totalSent: 0,
      };
    }

    return {
      address,
      balance: addressData.final_balance / 100000000,
      totalReceived: addressData.total_received / 100000000,
      totalSent: addressData.total_sent / 100000000,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Timeout checking balance for ${address}`);
    } else {
      console.error(`Error checking balance for ${address}:`, error);
    }
    return {
      address,
      balance: 0,
      totalReceived: 0,
      totalSent: 0,
    };
  }
}

export async function checkMultipleBalances(
  addresses: string[],
  onProgress?: (current: number, total: number) => void
): Promise<AddressBalance[]> {
  const results: AddressBalance[] = [];
  const batchSize = 5;

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const batchPromises = batch.map(async (address) => {
      const balance = await checkBalance(address);
      if (onProgress) {
        onProgress(i + batch.indexOf(address) + 1, addresses.length);
      }
      return balance;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < addresses.length) {
      await delay(1000);
    }
  }

  return results;
}

export function filterNonZeroBalances(balances: AddressBalance[]): AddressBalance[] {
  return balances.filter((b) => b.balance > 0 || b.totalReceived > 0);
}
