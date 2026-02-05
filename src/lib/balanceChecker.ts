export interface AddressBalance {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Пример: blockstream.info (CORS-поведение нужно проверить в окружении)
export async function checkBalance(address: string, timeout = 8000): Promise<AddressBalance> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Используйте тот endpoint, который лучше работает в вашем окружении
    const res = await fetch(`https://blockstream.info/api/address/${address}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 429) {
        await delay(2000);
        throw new Error('Rate limited');
      }
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    // blockstream: баланс можно получить из chain_stats:
    const chain = data.chain_stats ?? {};
    const confirmed = (chain.funded_txo_sum ?? 0) - (chain.spent_txo_sum ?? 0);
    // blockstream возвращает суммы в сатоши
    const balance = confirmed / 100000000;
    const totalReceived = (chain.funded_txo_sum ?? 0) / 100000000;
    const totalSent = (chain.spent_txo_sum ?? 0) / 100000000;

    return { address, balance, totalReceived, totalSent };
  } finally {
    clearTimeout(timeoutId);
  }
}