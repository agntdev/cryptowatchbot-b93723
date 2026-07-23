import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../lib/store.js";

registerMainMenuItem({ label: "🌅 Morning summary", data: "summary:configure", order: 25 });

const composer = new Composer<Ctx>();

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, "0")}:00`,
  data: `summary:hour:${i}`,
}));

composer.callbackQuery("summary:configure", async (ctx) => {
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
  ctx.session.step = "awaiting_summary_time";
  await ctx.reply(
    `Current morning summary time: ${user.morningSummaryTime}:00\n\nWhat time should you receive your daily summary?`,
    { reply_markup: buildSummaryHourKeyboard() },
  );
});

composer.callbackQuery(/^summary:hour:(\d+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;
  const hour = match[1];
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery();
  const store = getStore();
  const user = store.getUser(userId);
  if (!user) return;
  user.morningSummaryTime = hour;
  store.setUser(user);
  ctx.session.step = undefined;
  await ctx.reply(`✅ Morning summary set for ${hour}:00`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

function buildSummaryHourKeyboard() {
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < HOUR_OPTIONS.length; i += 4) {
    rows.push(
      HOUR_OPTIONS.slice(i, i + 4).map((o) =>
        inlineButton(o.label, `summary:hour:${o.data.split(":").pop()}`),
      ),
    );
  }
  return inlineKeyboard(rows);
}

export default composer;
