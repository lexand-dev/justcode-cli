import { spawn, type ChildProcess } from "node:child_process";
import { OutputBuffer } from "./output-buffer";

export type RunCommandOptions = {
  command: string;
  /** Absolute directory to run in; the caller resolves it through the workspace. */
  cwd: string;
  timeoutMs: number;
  /** Characters of output kept; longer output keeps its first third and last two thirds. */
  maxOutputChars: number;
  abortSignal?: AbortSignal;
};

export type CommandResult = {
  /** `null` when the command was killed by a signal (for example after a timeout). */
  exitCode: number | null;
  /** stdout and stderr interleaved in the order they were written, without ANSI escapes. */
  output: string;
  truncated: boolean;
  timedOut: boolean;
};

const SHELL = Bun.which("bash") ?? "/bin/sh";

// Commands run without a terminal: there is no one to answer a prompt or page through output.
const NON_INTERACTIVE_ENV = {
  TERM: "dumb",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
  PAGER: "cat",
  GIT_PAGER: "cat",
  GIT_EDITOR: "true",
  GIT_TERMINAL_PROMPT: "0"
};

/** Time between SIGTERM and SIGKILL when a command is stopped. */
const KILL_GRACE_MS = 3000;
/** How long to wait for the output pipes to close once the shell itself has exited. */
const DRAIN_MS = 500;

// Each command runs in its own process group so a timeout or interrupt can stop everything it
// started (`npm test` → node → workers), not only the shell. Windows has no process groups.
const USE_PROCESS_GROUPS = process.platform !== "win32";
const runningGroups = new Set<number>();
let exitHookInstalled = false;

function killTree(child: ChildProcess, signal: NodeJS.Signals) {
  if (child.pid === undefined) return;
  try {
    if (USE_PROCESS_GROUPS) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    // Already gone.
  }
}

/** Commands must not outlive the CLI: kill every group still running when it exits. */
function trackGroup(pid: number) {
  if (!exitHookInstalled) {
    exitHookInstalled = true;
    process.on("exit", () => {
      for (const group of runningGroups) {
        try {
          process.kill(-group, "SIGKILL");
        } catch {
          // Already gone.
        }
      }
    });
  }
  runningGroups.add(pid);
}

/**
 * Runs `command` with bash (or `sh`) and resolves with its exit code and output. A non-zero
 * exit code resolves normally; the promise rejects only if the shell cannot start or the
 * command is aborted.
 */
export function runCommand(options: RunCommandOptions): Promise<CommandResult> {
  const { abortSignal } = options;
  if (abortSignal?.aborted) return Promise.reject(new Error("The command was interrupted."));

  return new Promise((resolve, reject) => {
    const child = spawn(SHELL, ["-c", options.command], {
      cwd: options.cwd,
      env: { ...process.env, ...NON_INTERACTIVE_ENV },
      // stdin is closed: an inherited stdin would steal the TUI's keyboard input.
      stdio: ["ignore", "pipe", "pipe"],
      detached: USE_PROCESS_GROUPS
    });
    if (USE_PROCESS_GROUPS && child.pid !== undefined) trackGroup(child.pid);

    const headChars = Math.floor(options.maxOutputChars / 3);
    const output = new OutputBuffer(headChars, options.maxOutputChars - headChars);
    for (const stream of [child.stdout, child.stderr]) {
      stream?.setEncoding("utf8");
      stream?.on("data", (chunk: string) => output.append(chunk));
    }

    let timedOut = false;
    let aborted = false;
    let exitCode: number | null = null;
    let settled = false;
    let killTimer: Timer | undefined;
    let drainTimer: Timer | undefined;

    const stop = () => {
      killTree(child, "SIGTERM");
      killTimer ??= setTimeout(() => killTree(child, "SIGKILL"), KILL_GRACE_MS);
    };
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs);
    const onAbort = () => {
      aborted = true;
      stop();
    };
    abortSignal?.addEventListener("abort", onAbort, { once: true });

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      clearTimeout(killTimer);
      clearTimeout(drainTimer);
      abortSignal?.removeEventListener("abort", onAbort);
      if (child.pid !== undefined) runningGroups.delete(child.pid);
      child.stdout?.destroy();
      child.stderr?.destroy();

      if (error) reject(error);
      else if (aborted) reject(new Error("The command was interrupted."));
      else resolve({ exitCode, output: Bun.stripANSI(output.toString()), truncated: output.truncated, timedOut });
    };

    child.once("error", (error) => settle(new Error(`Could not run the command: ${error.message}`)));
    child.once("exit", (code) => {
      exitCode = code;
      // Background processes the command started (`server &`) would keep the pipes open
      // forever: stop what is left of the group, and stop waiting for output shortly after.
      killTree(child, "SIGKILL");
      drainTimer = setTimeout(() => settle(), DRAIN_MS);
    });
    child.once("close", () => settle());
  });
}
