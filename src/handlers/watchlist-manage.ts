import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";

registerMainMenuItem({ label: "📋 Watchlist", data: "watchlist:manage", order: 10 });

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:manage", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const store = getStore();
  const items = store.getWatchlist(userId);
  if (items.length === 0) {
    await ctx.reply("Your watchlist is empty. Tap a button below to add a coin.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add ticker", "watchlist:add")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const rows = items.map((item) => [
    inlineButton(
      `${item.enabled ? "🟢" : "🔴"} ${item.displayName} (${item.ticker})`,
      `watchlist:detail:${item.coinId}`,
    ),
  ]);
  rows.push([inlineButton("➕ Add ticker", "watchlist:add")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Your watchlist:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^watchlist:detail:(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const coinId = match[1];
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const items = store.getWatchlist(userId);
  const item = items.find((i) => i.coinId === coinId);
  if (!item) {
    await ctx.reply("Coin not found in your watchlist.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to watchlist", "watchlist:manage")]]),
    });
    return;
  }
  const rows = [
    [inlineButton(item.enabled ? "🔴 Disable" : "🟢 Enable", `watchlist:toggle:${coinId}`)],
    [inlineButton("🗑 Remove", `watchlist:remove:${coinId}`)],
    [inlineButton("🔔 Set alert", `alert:configure:${coinId}`)],
    [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
  ];
  await ctx.reply(`${item.displayName} (${item.ticker})`, {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^watchlist:toggle:(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const coinId = match[1];
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const items = store.getWatchlist(userId);
  const item = items.find((i) => i.coinId === coinId);
  if (item) {
    item.enabled = !item.enabled;
    store.setWatchlist(userId, items);
    await ctx.reply(
      `${item.displayName} (${item.ticker}) is now ${item.enabled ? "enabled" : "disabled"}.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
        ]),
      },
    );
  }
});

composer.callbackQuery(/^watchlist:remove:(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const coinId = match[1];
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const items = store.getWatchlist(userId);
  const idx = items.findIndex((i) => i.coinId === coinId);
  if (idx >= 0) {
    const removed = items.splice(idx, 1)[0];
    store.setWatchlist(userId, items);
    await ctx.reply(`Removed ${removed.displayName} (${removed.ticker}) from your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
      ]),
    });
  }
});

export default composer;
