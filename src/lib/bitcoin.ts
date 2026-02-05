import * as bitcoin from 'bitcoinjs-lib';
import * as secp256k1 from '@noble/secp256k1';
import { ECPairFactory } from 'ecpair';

// hex <-> Uint8Array helpers
const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string) =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

const ecc = {
  isPoint: (p: Uint8Array) => {
    try {
      secp256k1.Point.fromHex(p);
      return true;
    } catch {
      return false;
    }
  },
  isPrivate: (d: Uint8Array) => secp256k1.utils.isValidPrivateKey(d),
  pointFromScalar: (d: Uint8Array, compressed?: boolean) => {
    const point = secp256k1.Point.fromPrivateKey(d);
    return point.toRawBytes(Boolean(compressed));
  },
  pointAddScalar: (p: Uint8Array, tweak: Uint8Array, compressed?: boolean) => {
    const point = secp256k1.Point.fromHex(p);
    const tweakPoint = secp256k1.Point.fromPrivateKey(tweak);
    const result = point.add(tweakPoint);
    return result.toRawBytes(Boolean(compressed));
  },
  privateAdd: (d: Uint8Array, tweak: Uint8Array) => {
    const dBig = BigInt('0x' + bytesToHex(d));
    const tBig = BigInt('0x' + bytesToHex(tweak));
    const result = secp256k1.utils.mod(dBig + tBig);
    const hex = result.toString(16).padStart(64, '0');
    return hexToBytes(hex);
  },
  sign: (h: Uint8Array, d: Uint8Array) => secp256k1.sign(h, d),
  verify: (h: Uint8Array, Q: Uint8Array, signature: Uint8Array) => {
    try {
      return secp256k1.verify(signature, h, Q);
    } catch {
      return false;
    }
  },
};

// Ленивая инициализация ECPair (чтобы polyfill/Buffer не понадобились на этапе загрузки)
let _ECPair: ReturnType<typeof ECPairFactory> | null = null;
function getECPair() {
  if (!_ECPair) _ECPair = ECPairFactory(ecc);
  return _ECPair;
}

export interface BitcoinWallet {
  privateKey: string;
  address: string;
}

export function generateRandomWallet(): BitcoinWallet {
  const ECPair = getECPair();
  const keyPair = ECPair.makeRandom();
  const privateKey = keyPair.toWIF();

  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.bitcoin,
  });

  if (!address) throw new Error('Failed to generate address');

  return { privateKey, address };
}

export function generateMultipleWallets(count: number): BitcoinWallet[] {
  const wallets: BitcoinWallet[] = [];
  for (let i = 0; i < count; i++) wallets.push(generateRandomWallet());
  return wallets;
}