import { runReminderCycle } from "../lib/reminders/service";

const intervalMs = 10 * 60 * 1000;

async function tick() {
  const start = new Date();
  // eslint-disable-next-line no-console
  console.log(`[reminder-worker] cycle start ${start.toISOString()}`);
  await runReminderCycle(start);
  // eslint-disable-next-line no-console
  console.log(`[reminder-worker] cycle done ${new Date().toISOString()}`);
}

void tick();
setInterval(() => {
  void tick();
}, intervalMs);
