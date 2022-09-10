import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as conversion from "https://deno.land/std@0.152.0/streams/conversion.ts";
import * as stdCopy from "https://deno.land/std@0.149.0/fs/copy.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

Deno.env.set("LD_LIBRARY_PATH", ".");

let backupPath: string = Deno.env.get("BACKUP_PATH") || "";
console.log("Backup Path: ", backupPath);

const app = new Application();
const port = 3000;
const router = new Router();
const encoder = new TextEncoder();

const STARTED = "STARTED";
const STOPPED = "STOPPED";
const PROGRESS = "PROGRESS";
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

const ONE_MINUTE = 60 * 1000;
let serverIdleMinutes = 0;

let mcProcess: Deno.Process | null = null;
let serverState = PROGRESS;
let playerCount = 0;

router
  .get("/status", (ctx) => {
    ctx.response.body = { state: serverState };
  })
  .get("/start", (ctx) => {
    if (serverState === STOPPED) {
      serverState = PROGRESS;
      startServer();
      ctx.response.body = { state: STARTED };
      return;
    }
    ctx.response.body = { state: "ALREADY_STARTED" };
  })
  .get("/stop", async (ctx) => {
    if (mcProcess !== null) {
      serverState = PROGRESS;
      await stopServer(0);
      ctx.response.body = { serverState: STOPPED };
      return;
    }
    ctx.response.body = { state: "ALREADY_STOPPED" };
  })
  .post("/command", async (ctx) => {
    if (
      mcProcess !== null &&
      !(serverState === STOPPED || serverState === PROGRESS)
    ) {
      const command = await ctx.request.body().value;
      console.log(`Executing: /${command}`);
      await mcProcess?.stdin?.write(encoder.encode(command + "\n"));
      ctx.response.body = { state: SUCCESS };
      return;
    }
    ctx.response.body = { state: FAILED };
  })
  .post("/backup", async () => {
    if (backupPath) {
      await stopServer(20);
      await stdCopy.copy(Deno.cwd(), backupPath);
      startServer();
    } else {
      console.log('No "BACKUP_PATH" environment variable given.');
    }
  });

const messageObserver = async (
  reader: Deno.Reader | null,
  writer: Deno.Writer
) => {
  if (!reader) return;
  const encoder = new TextEncoder();
  for await (const line of readLines(reader)) {
    await conversion.writeAll(writer, encoder.encode(`${line}\n`));
    if (
      line.includes("======================================================")
    ) {
      serverState = STARTED;
    } else if (line.includes(" Player connected: ")) {
      ++playerCount;
    } else if (line.includes(" Player disconnected: ")) {
      if (--playerCount === 0) {
      }
    } else if (line.includes("Quit correctly")) {
      serverState = STOPPED;
    }
  }
};

const startServer = async () => {
  mcProcess = Deno.run({
    cmd: ["./bedrock_server"],
    stdout: "piped",
    stdin: "piped",
    stderr: "piped",
  });

  messageObserver(mcProcess.stdout, Deno.stdout);
  messageObserver(mcProcess.stderr, Deno.stderr);
};

const stopServer = async (offset?: number) => {
  try {
    if (offset) {
      for (let i = offset; i > 0; i--) {
        await mcProcess?.stdin?.write(encoder.encode(`Server stop in ${i}\n`));
        await timer(1000);
      }
    }
    await mcProcess?.stdin?.write(encoder.encode("stop\n"));
    await mcProcess?.stdin?.close();
  } catch {
    console.log("closing the server failed");
  }
};

const shutdownHost = () => {
  Deno.run({ cmd: ["sudo", "shutdown", "-h", "now"] }).status();
};

const timer = (delayInMillis: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayInMillis);
  });

const serverStopWatcher = async () => {
  while (true) {
    await timer(ONE_MINUTE);
    if (playerCount === 0) {
      if (++serverIdleMinutes === 30) {
        await stopServer();
        // shutdownHost();
      }
    } else {
      serverIdleMinutes = 0;
    }
  }
};

startServer();
serverStopWatcher();

app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(
  oakCors({
    origin: "*",
  })
);

app.listen({ port });

app.use(async (context, next) => {
  try {
    await context.send({
      root: `${Deno.cwd()}/cobblequarry`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

console.log(`Listening on: localhost:${port}`);
