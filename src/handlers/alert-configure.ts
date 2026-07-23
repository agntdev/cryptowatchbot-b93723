import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore, type AlertRule } from "../lib/store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery(/^alert:configure:(.+)$/, async (ctx) => {
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
    await ctx.reply("Coin not found. Add it to your watchlist first.", {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add ticker", "watchlist:add")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  ctx.session.alertConfig = { coinId, type: undefined };
  ctx.session.step = "awaiting_alert_type";
  await ctx.reply(`Set alert for ${item.displayName} (${item.ticker}). What type of alert?`, {
    reply_markup: inlineKeyboard([
      [inlineButton("📈 Price above", `alert:settype:${coinId}:price_above`)],
      [inlineButton("📉 Price below", `alert:settype:${coinId}:price_below`)],
      [inlineButton("📊 % Change", `alert:settype:${coinId}:percent_change`)],
      [inlineButton("Cancel", "menu:main")],
    ]),
  });
});

composer.callbackQuery(/^alert:settype:(.+):(.+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const [, coinId, alertType] = match;
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const items = store.getWatchlist(userId);
  const item = items.find((i) => i.coinId === coinId);
  if (!item) return;
  ctx.session.alertConfig = { coinId, type: alertType as AlertRule["type"] };
  if (alertType === "percent_change") {
    ctx.session.step = "awaiting_alert_percent";
    await ctx.reply(`What percentage change should trigger the alert? (e.g. 5 for 5%)`, {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "menu:main")]]),
    });
  } else {
    ctx.session.step = "awaiting_alert_threshold";
    await ctx.reply(`What price should trigger the alert? (e.g. 50000 for $50,000)`, {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "menu:main")]]),
    });
  }
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  const config = ctx.session.alertConfig;
  if (!config || !step) return next();
  if (step !== "awaiting_alert_threshold" && step !== "awaiting_alert_percent") return next();
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return next();
  const userId = ctx.from?.id;
  if (!userId) return next();
  const value = parseFloat(text);
  if (isNaN(value) || value <= 0) {
    await ctx.reply("Please enter a valid positive number.", {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "menu:main")]]),
    });
    return;
  }
  const store = getStore();
  const items = store.getWatchlist(userId);
  const item = items.find((i) => i.coinId === config.coinId);
  if (!item) return next();
  const existingAlerts = store.getAlerts(userId);
  const newRule: AlertRule = {
    id: `alert_${Date.now()}`,
    type: config.type as AlertRule["type"],
    parameters:
      config.type === "percent_change"
        ? { percent: value }
        : { threshold: value },
    lastFired: 0,
  };
  existingAlerts.push(newRule);
  store.setAlerts(userId, existingAlerts);
  ctx.session.step = undefined;
  ctx.session.alertConfig = undefined;
  const typeLabel =
    config.type === "price_above"
      ? `above $${value.toLocaleString()}`
      : config.type === "price_below"
        ? `below $${value.toLocaleString()}`
        : `by ${value}%`;
  await ctx.reply(`✅ Alert set: ${item.ticker} ${typeLabel}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to watchlist", "watchlist:manage")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
