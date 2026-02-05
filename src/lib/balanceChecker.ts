export interface AddressBalance {
  address: string;
  balance: number; // в BTC
  totalReceived: number; // в BTC
  totalSent: number; // в BTC
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // пример: если лимит — подождать и выбросить ошибку (вызовчик может повторить)
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
      balance: (addressData.final_balance ?? 0) / 100000000,
      totalReceived: (addressData.total_received ?? 0) / 100000000,
      totalSent: (addressData.total_sent ?? 0) / 100000000,
    };
  } finally {
    // Гарантированно очищаем таймер
    clearTimeout(timeoutId);
  }
}