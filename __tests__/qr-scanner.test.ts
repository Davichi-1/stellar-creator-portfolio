import { describe, it, expect } from 'vitest';
import { extractStellarAddress } from '@/mobile/src/components/QRScannerModal';

const VALID_ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxy';

describe('extractStellarAddress', () => {
  it('should extract a raw Stellar address', () => {
    expect(extractStellarAddress(VALID_ADDRESS)).toBe(VALID_ADDRESS);
  });

  it('should extract address from a URL with ?address= param', () => {
    const url = `https://stellar.expert/explorer?address=${VALID_ADDRESS}`;
    expect(extractStellarAddress(url)).toBe(VALID_ADDRESS);
  });

  it('should extract address from a URL with ?to= param', () => {
    const url = `https://subtrackr.app/send?to=${VALID_ADDRESS}`;
    expect(extractStellarAddress(url)).toBe(VALID_ADDRESS);
  });

  it('should extract address from a URL with ?recipient= param', () => {
    const url = `https://example.com/pay?recipient=${VALID_ADDRESS}`;
    expect(extractStellarAddress(url)).toBe(VALID_ADDRESS);
  });

  it('should extract address from URL pathname', () => {
    const url = `https://stellar.expert/account/${VALID_ADDRESS}`;
    expect(extractStellarAddress(url)).toBe(VALID_ADDRESS);
  });

  it('should extract address embedded in arbitrary text', () => {
    const text = `Send to ${VALID_ADDRESS} please`;
    expect(extractStellarAddress(text)).toBe(VALID_ADDRESS);
  });

  it('should return null for invalid address', () => {
    expect(extractStellarAddress('GINVALID123')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(extractStellarAddress('')).toBeNull();
  });

  it('should return null for non-Stellar QR content', () => {
    expect(extractStellarAddress('https://example.com')).toBeNull();
    expect(extractStellarAddress('Hello World')).toBeNull();
    expect(extractStellarAddress('wifi:WPA:mywifi:password123')).toBeNull();
  });

  it('should handle whitespace around address', () => {
    expect(extractStellarAddress(`  ${VALID_ADDRESS}  `)).toBe(VALID_ADDRESS);
  });

  it('should extract address from a stellar: deeplink', () => {
    const deeplink = `stellar:pay?destination=${VALID_ADDRESS}`;
    expect(extractStellarAddress(deeplink)).toBe(VALID_ADDRESS);
  });
});
