// CoinGecko price service — fetches real cryptocurrency prices.
// Uses the free CoinGecko API (no key required, rate-limited).
// Handles ticker-to-ID mapping, batch price fetching, and error cases.

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const TICKER_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  TON: "the-open-network",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  SHIB: "shiba-inu",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  FIL: "filecoin",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
};

export interface PriceData {
  coinId: string;
  ticker: string;
  price: number;
  change24h: number;
  currency: string;
}

/** Resolve a user-provided ticker symbol to a CoinGecko coin ID. */
export function resolveCoinId(ticker: string): string | null {
  const upper = ticker.toUpperCase();
  if (TICKER_TO_ID[upper]) return TICKER_TO_ID[upper];
  // Try case-insensitive match in the map
  for (const [sym, id] of Object.entries(TICKER_TO_ID)) {
    if (sym.toUpperCase() === upper) return id;
  }
  return null;
}

/** Get display name for a known ticker. */
export function getDisplayName(ticker: string): string {
  const names: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    TON: "Toncoin",
    SOL: "Solana",
    BNB: "BNB",
    XRP: "XRP",
    ADA: "Cardano",
    DOGE: "Dogecoin",
    DOT: "Polkadot",
    AVAX: "Avalanche",
    SHIB: "Shiba Inu",
    MATIC: "Polygon",
    LINK: "Chainlink",
    UNI: "Uniswap",
    ATOM: "Cosmos",
    LTC: "Litecoin",
    BCH: "Bitcoin Cash",
    FIL: "Filecoin",
    NEAR: "NEAR Protocol",
    APT: "Aptos",
    ARB: "Arbitrum",
    OP: "Optimism",
  };
  const upper = ticker.toUpperCase();
  return names[upper] ?? ticker.toUpperCase();
}

/** Fetch current prices for a list of coin IDs. */
export async function fetchPrices(
  coinIds: string[],
  currency = "usd",
): Promise<PriceData[]> {
  if (coinIds.length === 0) return [];
  const ids = coinIds.join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${currency}&include_24hr_change=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as Record<
      string,
      { [key: string]: number }
    >;
    const results: PriceData[] = [];
    for (const coinId of coinIds) {
      const prices = data[coinId];
      if (prices && typeof prices[currency] === "number") {
        const ticker = Object.entries(TICKER_TO_ID).find(
          ([, id]) => id === coinId,
        )?.[0];
        results.push({
          coinId,
          ticker: ticker ?? coinId.toUpperCase(),
          price: prices[currency],
          change24h: prices[`${currency}_24h_change`] ?? 0,
          currency: currency.toUpperCase(),
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

/** Fetch price for a single coin. */
export async function fetchSinglePrice(
  coinId: string,
  currency = "usd",
): Promise<PriceData | null> {
  const results = await fetchPrices([coinId], currency);
  return results[0] ?? null;
}
