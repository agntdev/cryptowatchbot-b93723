import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";
import { fetchPrices, fetchSinglePrice, resolveCoinId } from "../lib/prices.js";

registerMainMenuItem({ label: "💰 Price", data: "price:show", order: 5 });

const composer = new Composer<Ctx>();

function formatPrice(price: number, currency: string): string {
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(6)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

composer.command("price", async (ctx) => {
  const text = ctx.message?.text;
  if (!text) return;
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await ctx.reply("Usage: /price BTC — or tap the button to see your watchlist prices.", {
      reply_markup: inlineKeyboard([
        [inlineButton("💰 Watchlist prices", "price:watchlist")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const ticker = parts[1].toUpperCase();
  const coinId = resolveCoinId(ticker);
  if (!coinId) {
    await ctx.reply(`Couldn't find "${ticker}". Check the symbol and try again.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const price = await fetchSinglePrice(coinId);
  if (!price) {
    await ctx.reply("Couldn't fetch the price right now. Please try again in a moment.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  await ctx.reply(
    `💰 ${price.ticker}: ${formatPrice(price.price, price.currency)} (${formatChange(price.change24h)} 24h)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", `price:single:${coinId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("price:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const store = getStore();
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
    (p) => `• ${p.ticker}: ${formatPrice(p.price, p.currency)} (${formatChange(p.change24h)} 24h)`,
  );
  await ctx.reply("📊 Watchlist prices:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "price:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("price:watchlist", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const store = getStore();
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
    (p) => `• ${p.ticker}: ${formatPrice(p.price, p.currency)} (${formatChange(p.change24h)} 24h)`,
  );
  await ctx.reply("📊 Watchlist prices:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "price:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery(/^price:single:(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const coinId = match[1];
  await ctx.answerCallbackQuery();
  const price = await fetchSinglePrice(coinId);
  if (!price) {
    await ctx.reply("Couldn't fetch the price. Try again later.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  await ctx.reply(
    `💰 ${price.ticker}: ${formatPrice(price.price, price.currency)} (${formatChange(price.change24h)} 24h)`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", `price:single:${coinId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
