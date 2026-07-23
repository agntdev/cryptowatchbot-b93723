// Durable data store for the crypto tracker bot.
// In production this would use Redis via the toolkit's persistent storage.
// For the test harness, an in-memory Map is used (isolated per bot instance).
// Never use this for ephemeral session state — use ctx.session instead.

export interface UserProfile {
  userId: number;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  morningSummaryTime: string;
  cooldownMinutes: number;
}

export interface WatchlistItem {
  coinId: string;
  ticker: string;
  displayName: string;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  type: "price_above" | "price_below" | "percent_change";
  parameters: { threshold?: number; percent?: number };
  lastFired: number;
}

export interface AlertEvent {
  userId: number;
  ticker: string;
  ruleId: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
  timestamp: number;
}

class Store {
  users = new Map<number, UserProfile>();
  watchlists = new Map<number, WatchlistItem[]>();
  alerts = new Map<number, AlertRule[]>();
  alertEvents: AlertEvent[] = [];

  getUser(userId: number): UserProfile | undefined {
    return this.users.get(userId);
  }

  setUser(user: UserProfile): void {
    this.users.set(user.userId, user);
  }

  getWatchlist(userId: number): WatchlistItem[] {
    return this.watchlists.get(userId) ?? [];
  }

  setWatchlist(userId: number, items: WatchlistItem[]): void {
    this.watchlists.set(userId, items);
  }

  getAlerts(userId: number): AlertRule[] {
    return this.alerts.get(userId) ?? [];
  }

  setAlerts(userId: number, rules: AlertRule[]): void {
    this.alerts.set(userId, rules);
  }

  addAlertEvent(event: AlertEvent): void {
    this.alertEvents.push(event);
  }

  getUserCount(): number {
    return this.users.size;
  }

  getTopAlerts(limit: number): AlertEvent[] {
    const counts = new Map<string, number>();
    for (const e of this.alertEvents) {
      const key = `${e.ticker}:${e.ruleId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    return sorted.map(([key]) => {
      const event = this.alertEvents.find(
        (e) => `${e.ticker}:${e.ruleId}` === key,
      );
      return event!;
    });
  }
}

// Singleton store instance — reset per bot instance via createFreshStore().
let currentStore = new Store();

export function getStore(): Store {
  return currentStore;
}

export function createFreshStore(): Store {
  currentStore = new Store();
  return currentStore;
}
