// Safe Supabase wrapper: работа в режимe no-op если VITE_SUPABASE_* не заданы.
// Экспортирует: saveWallet, getWalletsWithBalance, getSupabaseClient и тип WalletRecord.

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

export interface WalletRecord {
  id: string;
  private_key?: string | null;
  address: string;
  balance: number;
  total_received?: number | null;
  total_sent?: number | null;
  created_at?: string | null;
}

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

export async function getWalletsWithBalance(): Promise<WalletRecord[]> {
  if (!supabase) {
    console.warn('getWalletsWithBalance skipped: Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('id, private_key, address, balance, total_received, total_sent, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('getWalletsWithBalance: query error', error);
      return [];
    }
    if (!data) return [];

    return data.map((r: any) => ({
      id: r.id,
      private_key: r.private_key ?? null,
      address: r.address,
      balance: r.balance ?? 0,
      total_received: r.total_received ?? 0,
      total_sent: r.total_sent ?? 0,
      created_at: r.created_at ?? null,
    }));
  } catch (err) {
    console.error('getWalletsWithBalance: unexpected error', err);
    return [];
  }
}

export function getSupabaseClient() {
  return supabase;
}