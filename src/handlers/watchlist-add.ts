import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore, type WatchlistItem } from "../lib/store.js";
import { resolveCoinId, getDisplayName } from "../lib/prices.js";

const composer = new Composer<Ctx>();

const COMMON_COINS = [
  { text: "BTC", data: "watchlist:quickadd:BTC" },
  { text: "ETH", data: "watchlist:quickadd:ETH" },
  { text: "TON", data: "watchlist:quickadd:TON" },
  { text: "SOL", data: "watchlist:quickadd:SOL" },
  { text: "BNB", data: "watchlist:quickadd:BNB" },
  { text: "XRP", data: "watchlist:quickadd:XRP" },
];

composer.callbackQuery("watchlist:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_ticker";
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < COMMON_COINS.length; i += 3) {
    rows.push(
      COMMON_COINS.slice(i, i + 3).map((c) => inlineButton(c.text, c.data)),
    );
  }
  await ctx.reply(
    "Type a ticker symbol (e.g. BTC, ETH, DOGE) or tap a common coin below:",
    {
      reply_markup: inlineKeyboard([
        ...rows,
        [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
      ]),
    },
  );
});

composer.callbackQuery(/^watchlist:quickadd:(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const ticker = match[1].toUpperCase();
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  await addTicker(ctx, userId, ticker);
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_ticker") return next();
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return next();
  const ticker = text.toUpperCase();
  const userId = ctx.from?.id;
  if (!userId) return next();
  await addTicker(ctx, userId, ticker);
});

async function addTicker(ctx: Ctx, userId: number, ticker: string) {
  const coinId = resolveCoinId(ticker);
  if (!coinId) {
    await ctx.reply(
      `Couldn't find "${ticker}". Check the symbol and try again — common ones are BTC, ETH, TON, SOL.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
        ]),
      },
    );
    return;
  }
  const store = getStore();
  const items = store.getWatchlist(userId);
  if (items.some((i) => i.coinId === coinId)) {
    await ctx.reply(`${getDisplayName(ticker)} (${ticker}) is already on your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
      ]),
    });
    return;
  }
  const newItem: WatchlistItem = {
    coinId,
    ticker,
    displayName: getDisplayName(ticker),
    enabled: true,
  };
  items.push(newItem);
  store.setWatchlist(userId, items);
  await ctx.reply(`✅ Added ${newItem.displayName} (${ticker}) to your watchlist.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("🔔 Set alert", `alert:configure:${coinId}`)],
      [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
    ]),
  });
}

export default composer;
