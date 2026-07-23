import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";
import { fetchPrices } from "../lib/prices.js";
import { now } from "../lib/clock.js";

// Morning summary handler — sends a daily price summary to users.
// This is triggered manually for now (in production, a cron job would trigger it).

const composer = new Composer<Ctx>();

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

function isQuietHours(user: { quietHoursStart: string; quietHoursEnd: string }): boolean {
  const currentHour = now().getHours();
  const start = parseInt(user.quietHoursStart, 10);
  const end = parseInt(user.quietHoursEnd, 10);
  if (start <= end) {
    return currentHour >= start && currentHour < end;
  }
  return currentHour >= start || currentHour < end;
}

composer.callbackQuery("summary:send", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const store = getStore();
  const user = store.getUser(userId);
  if (!user) {
    await ctx.reply("Set up your profile first by tapping /start.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  if (isQuietHours(user)) {
    await ctx.reply("It's quiet hours right now. Your summary will be sent after quiet hours end.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const items = store.getWatchlist(userId).filter((i) => i.enabled);
  if (items.length === 0) {
    await ctx.reply("No coins in your watchlist yet. Add some to track prices.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add ticker", "watchlist:add")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const prices = await fetchPrices(items.map((i) => i.coinId));
  if (prices.length === 0) {
    await ctx.reply("Couldn't fetch prices right now. Please try again later.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const lines = prices.map(
    (p) => `• ${p.ticker}: ${formatPrice(p.price)} (${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(2)}% 24h)`,
  );
  await ctx.reply("🌅 Morning summary:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "summary:send")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
