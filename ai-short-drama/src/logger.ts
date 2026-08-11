const startTime = Date.now();

function elapsed(): string {
  return `+${((Date.now() - startTime) / 1000).toFixed(1)}s`;
}

export const logger = {
  step(message: string): void {
    console.log(`\n\x1b[36m▶ ${message}\x1b[0m \x1b[90m(${elapsed()})\x1b[0m`);
  },
  info(message: string): void {
    console.log(`  ${message}`);
  },
  success(message: string): void {
    console.log(`\x1b[32m✔ ${message}\x1b[0m`);
  },
  warn(message: string): void {
    console.warn(`\x1b[33m⚠ ${message}\x1b[0m`);
  },
  error(message: string): void {
    console.error(`\x1b[31m✖ ${message}\x1b[0m`);
  },
};
