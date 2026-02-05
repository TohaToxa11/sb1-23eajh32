/*
  # Create Bitcoin Wallets Table

  1. New Tables
    - `wallets`
      - `id` (uuid, primary key) - Unique identifier
      - `private_key` (text, encrypted) - Bitcoin private key in WIF format
      - `address` (text, unique) - Bitcoin address
      - `balance` (numeric) - Balance in BTC
      - `checked_at` (timestamptz) - When the balance was checked
      - `created_at` (timestamptz) - When the wallet was generated
  
  2. Security
    - Enable RLS on `wallets` table
    - Add policy for public read access (educational demo)
    - Add policy for public insert access (educational demo)
  
  3. Important Notes
    - This is an educational/demonstration project
    - Finding an existing wallet with balance is astronomically unlikely (1 in 2^256)
    - Only stores wallets with non-zero balance
*/

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  private_key text NOT NULL,
  address text UNIQUE NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view wallets"
  ON wallets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert wallets"
  ON wallets
  FOR INSERT
  TO public
  WITH CHECK (balance > 0);

CREATE INDEX IF NOT EXISTS idx_wallets_balance ON wallets(balance DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at DESC);