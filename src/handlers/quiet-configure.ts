import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";

registerMainMenuItem({ label: "🌙 Quiet hours", data: "quiet:configure", order: 30 });

const composer = new Composer<Ctx>();

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, "0")}:00`,
  data: `quiet:hour:${i}`,
}));

composer.callbackQuery("quiet:configure", async (ctx) => {
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
  ctx.session.quietConfig = {};
  ctx.session.step = "awaiting_quiet_start";
  await ctx.reply(
    `Current quiet hours: ${user.quietHoursStart}:00 – ${user.quietHoursEnd}:00\n\nWhen should alerts stop? Pick a start hour:`,
    { reply_markup: buildHourKeyboard("quiet:hour:") },
  );
});

composer.callbackQuery(/^quiet:hour:(\d+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const hour = match[1];
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const user = store.getUser(userId);
  if (!user) return;

  if (ctx.session.step === "awaiting_quiet_start") {
    ctx.session.quietConfig = { start: hour };
    ctx.session.step = "awaiting_quiet_end";
    await ctx.reply(`Alerts will stop at ${hour}:00. When should they resume? Pick an end hour:`, {
      reply_markup: buildHourKeyboard("quiet:hour:"),
    });
  } else if (ctx.session.step === "awaiting_quiet_end") {
    const start = ctx.session.quietConfig?.start ?? "22";
    user.quietHoursStart = start;
    user.quietHoursEnd = hour;
    store.setUser(user);
    ctx.session.step = undefined;
    ctx.session.quietConfig = undefined;
    await ctx.reply(`✅ Quiet hours set: ${start}:00 – ${hour}:00`, {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }
});

function buildHourKeyboard(prefix: string) {
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < HOUR_OPTIONS.length; i += 4) {
    rows.push(
      HOUR_OPTIONS.slice(i, i + 4).map((o) =>
        inlineButton(o.label, `${prefix}${o.data.split(":").pop()}`),
      ),
    );
  }
  return inlineKeyboard(rows);
}

export default composer;
