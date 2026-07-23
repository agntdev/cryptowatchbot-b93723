import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";
import { fetchPrices } from "../lib/prices.js";
import { nowTimestamp } from "../lib/clock.js";

const composer = new Composer<Ctx>();

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown between alerts for the same rule

composer.callbackQuery("alert:check", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const store = getStore();
  const alerts = store.getAlerts(userId);
  if (alerts.length === 0) {
    await ctx.reply("No active alerts. Set one up from your watchlist.", {
      reply_markup: inlineKeyboard([
        [inlineButton("📋 Watchlist", "watchlist:manage")],
      ]),
    });
    return;
  }
  const items = store.getWatchlist(userId).filter((i) => i.enabled);
  if (items.length === 0) return;
  const prices = await fetchPrices(items.map((i) => i.coinId));
  if (prices.length === 0) {
    await ctx.reply("Couldn't check prices right now. Try again later.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const nowTs = nowTimestamp();
  let triggeredCount = 0;
  for (const alert of alerts) {
    if (nowTs - alert.lastFired < COOLDOWN_MS) continue;
    const item = items.find((i) => i.coinId === alert.id.split("_")[0]);
    const price = prices.find((p) => p.coinId === (item?.coinId ?? ""));
    if (!price || !item) continue;
    let triggered = false;
    if (alert.type === "price_above" && alert.parameters.threshold !== undefined) {
      triggered = price.price >= alert.parameters.threshold;
    } else if (alert.type === "price_below" && alert.parameters.threshold !== undefined) {
      triggered = price.price <= alert.parameters.threshold;
    } else if (alert.type === "percent_change" && alert.parameters.percent !== undefined) {
      triggered = Math.abs(price.change24h) >= alert.parameters.percent;
    }
    if (triggered) {
      alert.lastFired = nowTs;
      triggeredCount++;
      store.addAlertEvent({
        userId,
        ticker: item.ticker,
        ruleId: alert.id,
        oldPrice: 0,
        newPrice: price.price,
        percentChange: price.change24h,
        timestamp: nowTs,
      });
    }
  }
  store.setAlerts(userId, alerts);
  if (triggeredCount > 0) {
    await ctx.reply(`🔔 ${triggeredCount} alert(s) triggered!`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  } else {
    await ctx.reply("No alerts triggered right now. All rules are within thresholds.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }
});

export default composer;
