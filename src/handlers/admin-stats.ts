import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";

const composer = new Composer<Ctx>();

const OWNER_ID = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : null;

composer.command("admin_stats", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  if (OWNER_ID !== null && userId !== OWNER_ID) {
    await ctx.reply("This command is for the bot owner only.", {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const store = getStore();
  const userCount = store.getUserCount();
  const topAlerts = store.getTopAlerts(10);
  const alertLines =
    topAlerts.length > 0
      ? topAlerts.map((a, i) => `${i + 1}. ${a.ticker} — triggered ${a.percentChange.toFixed(2)}%`).join("\n")
      : "No alerts triggered yet.";
  await ctx.reply(
    `📊 Admin dashboard\n\n` +
      `Users: ${userCount}\n\n` +
      `Top alerts:\n${alertLines}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "admin:refresh")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("admin:refresh", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  if (OWNER_ID !== null && userId !== OWNER_ID) {
    await ctx.answerCallbackQuery({ text: "Not authorized", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  const store = getStore();
  const userCount = store.getUserCount();
  const topAlerts = store.getTopAlerts(10);
  const alertLines =
    topAlerts.length > 0
      ? topAlerts.map((a, i) => `${i + 1}. ${a.ticker} — triggered ${a.percentChange.toFixed(2)}%`).join("\n")
      : "No alerts triggered yet.";
  await ctx.editMessageText(
    `📊 Admin dashboard\n\n` +
      `Users: ${userCount}\n\n` +
      `Top alerts:\n${alertLines}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "admin:refresh")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
