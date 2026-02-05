// Безопасный supabase-wrapper: не бросает при отсутствии env, экспортирует saveWallet как noop,
// инициализирует реальный клиент только если переменные окружения заданы.
// Также экспортируем getWalletsWithBalance, getSupabaseClient.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env as any).VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase: client initialized');
  } catch (err) {
    console.error('Supabase: failed to create client', err);
    supabase = null;
  }
} else {
  console.warn('Supabase: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — saveWallet and getWalletsWithBalance will be no-ops.');
}

export interface WalletRow {
  private_key?: string;
  address: string;
  balance?: number;
  total_received?: number;
  total_sent?: number;
  created_at?: string;
}

// Сохраняет найденный кошелек (noop, если нет клиента)
export async function saveWallet(privateKey: string, address: string, balance: number) {
  if (!supabase) {
    console.warn('saveWallet skipped: Supabase not configured', { address, balance });
    return;
  }

  try {
    const { error } = await supabase.from('wallets').insert([
      {
        private_key: privateKey,
        address,
        balance,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error('saveWallet: insert error', error);
    } else {
      console.log('saveWallet: saved', address);
    }
  } catch (err) {
    console.error('saveWallet: unexpected error', err);
  }
}

// Возвращает массив кошельков с ненулевым балансом (или пустой массив, если Supabase не настроен)
export async function getWalletsWithBalance(): Promise<Array<{ address: string; balance: number; totalReceived?: number; totalSent?: number }>> {
  if (!supabase) {
    console.warn('getWalletsWithBalance skipped: Supabase not configured');
    return [];
  }

  try {
    // Пример: таблица 'wallets' с колонками address, balance, total_received, total_sent
    const { data, error } = await supabase
      .from<WalletRow>('wallets')
      .select('address, balance, total_received, total_sent')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('getWalletsWithBalance: query error', error);
      return [];
    }

    if (!data) return [];

    return data.map((r) => ({
      address: r.address,
      balance: (r.balance ?? 0),
      totalReceived: (r.total_received ?? 0),
      totalSent: (r.total_sent ?? 0),
    }));
  } catch (err) {
    console.error('getWalletsWithBalance: unexpected error', err);
    return [];
  }
}

// Экспорт клиента для отладки/расширений
export function getSupabaseClient() {
  return supabase;
}