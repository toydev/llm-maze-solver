import prettyMs from 'pretty-ms';

const BAR_WIDTH = 20;

function formatTime(ms: number): string {
  return prettyMs(ms, { colonNotation: true, secondsDecimalDigits: 0 }).padStart(5, '0');
}

export class ProgressReporter {
  private readonly total: number;
  private readonly startTime: number;
  private readonly intervalId: ReturnType<typeof setInterval>;
  private completed = 0;
  private correct = 0;
  private estimate: number | null = null;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
    this.intervalId = setInterval(() => this.render(), 1000);
    this.render();
  }

  record(success: boolean): void {
    this.completed++;
    if (success) this.correct++;

    // Update estimate based on completed tasks only
    const elapsed = Date.now() - this.startTime;
    const avgTime = elapsed / this.completed;
    this.estimate = avgTime * this.total;

    this.render();
  }

  finish(): void {
    clearInterval(this.intervalId);
    this.render();
    process.stdout.write('\n');
  }

  private render(): void {
    const elapsed = Date.now() - this.startTime;
    const progress = this.completed / this.total;
    const filledWidth = Math.floor(progress * BAR_WIDTH);
    const bar = '='.repeat(filledWidth) + (filledWidth < BAR_WIDTH ? '>' : '') + ' '.repeat(Math.max(0, BAR_WIDTH - filledWidth - 1));

    let etaInfo = 'ETA: --:--';

    if (this.estimate !== null) {
      const remaining = this.estimate - elapsed;

      if (remaining >= 0) {
        etaInfo = `ETA: ${formatTime(this.estimate)} (Left: ${formatTime(remaining)})`;
      } else {
        etaInfo = `ETA: ${formatTime(this.estimate)} (+${formatTime(-remaining)})`;
      }
    }

    const incorrect = this.completed - this.correct;
    process.stdout.write(`\r\x1b[K[${bar}] ${this.completed}/${this.total} OK:${this.correct} NG:${incorrect} | ${formatTime(elapsed)} ${etaInfo}`);
  }
}
