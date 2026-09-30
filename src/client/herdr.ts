/**
 * Thin wrapper around the `herdr` CLI for plugin commands.
 *
 * Herdr commands print JSON responses for deterministic automation. We use
 * HERDR_BIN_PATH when available (portable across Unix sockets and Windows
 * named pipes), falling back to `herdr` on PATH.
 */
export class Herdr {
  private readonly bin: string;

  constructor(bin: string = process.env.HERDR_BIN_PATH ?? "herdr") {
    this.bin = bin;
  }

  /** Run a command and return raw stdout text. Empty stdout is allowed. */
  async run(args: readonly string[]): Promise<string> {
    return this.#exec(args);
  }

  /** Run a command and parse stdout as JSON. */
  async json<T>(args: readonly string[]): Promise<T> {
    const out = await this.#exec(args);
    const trimmed = out.trim();
    if (!trimmed) return undefined as T;
    return JSON.parse(trimmed) as T;
  }

  async #exec(args: readonly string[]): Promise<string> {
    const proc = Bun.spawn([this.bin, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (code !== 0) {
      throw new Error(`herdr ${args.join(" ")} exited ${code}: ${err.trim()}`);
    }

    return out;
  }
}
