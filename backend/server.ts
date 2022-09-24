import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as conversion from "https://deno.land/std@0.152.0/streams/conversion.ts";
import * as stdCopy from "https://deno.land/std@0.149.0/fs/copy.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

Deno.env.set("LD_LIBRARY_PATH", ".");

const ADMIN_PW = "ADMIN_PW";
const MOD_PW = "MOD_PW";
const BACKUP_PATH = "BACKUP_PATH";
const AUTO_SHUTDOWN = "AUTO_SHUTDOWN";

const env_adminPW: string = Deno.env.get(ADMIN_PW) || "";
const env_modPW: string = Deno.env.get(MOD_PW) || "";
let env_backupPath: string = Deno.env.get(BACKUP_PATH) || ""; // /home/username/minecraft
let env_shutdownOnIdle: string = Deno.env.get(AUTO_SHUTDOWN) || ""; // y

// Fix lazy user input
if (env_backupPath && env_backupPath[env_backupPath.length - 1] !== "/") {
  env_backupPath += "/";
}

const app = new Application();
const port = 3000;
const router = new Router();
const encoder = new TextEncoder();

const STARTED = "STARTED";
const STOPPED = "STOPPED";
const PROGRESS = "PROGRESS";
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

const IDLE_SERVER_MINUTES_THRESHOLD = 30;
const ONE_MINUTE = 60 * 1000;
let serverIdleMinutes = 0;

let mcProcess: Deno.Process | null = null;
let serverState = PROGRESS;
let playerCount = 0;
let backupOnNextOccasion = false;

let logQueue: String[] = [];

const log = (content: string, isMCMessage = false) => {
  if (content.includes("http") && content.includes("://")) return;
  logQueue.push(isMCMessage ? "[Minecraft] " : "[Cobble]    " + content);
  console.log(isMCMessage ? "[Minecraft] " : "[Cobble]    " + content);
};

log("Backup Path: " + env_backupPath);
log(
  env_shutdownOnIdle
    ? `Server (Computer) will shut down if no players for ${IDLE_SERVER_MINUTES_THRESHOLD} minutes. To avoid that, do not set '${AUTO_SHUTDOWN}'. If the minecraft server is "stopped" manually, the server will not shut down by itself.`
    : `Server (Computer) is set to not automatically shutdown, if there are no players. Provide '${AUTO_SHUTDOWN}=yes' if you want that.`
);
if (!env_adminPW)
  log(
    `No ADMIN password given. Provide the variable '${ADMIN_PW}' with a freely chosen password on startup of cobble-quarry, otherwise everyone with access to the website can execute all actions.`
  );
if (!env_modPW)
  log(
    `No MOD password given. Provide the variable '${MOD_PW}' with a freely chosen password on startup of cobble-quarry, otherwise everyone with access to the website can execute some actions.`
  );

const isAuthenticatedAsAdmin = (ctx: any): boolean =>
  !env_adminPW || ctx.request.headers.get("pw") === env_adminPW;

const isAuthenticatedAsMod = (ctx: any): boolean =>
  !env_modPW ||
  ctx.request.headers.get("pw") === env_modPW ||
  isAuthenticatedAsAdmin(ctx);

router
  .get("/status", (ctx) => {
    ctx.response.body = { state: serverState };
  })
  .post("/start", (ctx) => {
    if (isAuthenticatedAsMod(ctx)) {
      if (serverState === STOPPED) {
        serverState = PROGRESS;
        startServer();
        ctx.response.body = { state: STARTED };
        return;
      }
      ctx.response.body = { state: "ALREADY_STARTED" };
    }
  })
  .post("/stop", async (ctx) => {
    if (isAuthenticatedAsMod(ctx) && mcProcess !== null) {
      serverState = PROGRESS;
      await stopServer(0);
      ctx.response.body = { serverState: STOPPED };
      return;
    }
    ctx.response.body = { state: "ALREADY_STOPPED" };
  })
  .post("/command", async (ctx) => {
    if (
      isAuthenticatedAsAdmin(ctx) &&
      mcProcess !== null &&
      !(serverState === STOPPED || serverState === PROGRESS)
    ) {
      let command = (await ctx.request.body().value).trim();
      command = command.startsWith("/") ? command.substring(1) : command;
      log(`Executing: ${command}`);
      await mcProcess?.stdin?.write(encoder.encode(command + "\n"));
      ctx.response.body = { state: SUCCESS };
      return;
    }
    ctx.response.body = { state: FAILED };
  })
  .post("/backup", async (ctx) => {
    if (isAuthenticatedAsMod(ctx) && env_backupPath) {
      await stopServer(20);
      startServer();
    } else {
      log(`No '${BACKUP_PATH}' environment variable given or wrong password.`);
    }
  })
  .get("/logs", async (ctx) => {
    ctx.response.body = logQueue;
  });

const messageObserver = async (
  reader: Deno.Reader | null,
  writer: Deno.Writer
) => {
  if (!reader) return;
  const encoder = new TextEncoder();
  for await (const line of readLines(reader)) {
    log(line, true);
    await conversion.writeAll(writer, encoder.encode(`${line}\n`));
    if (
      line.includes("======================================================")
    ) {
      serverState = STARTED;
    } else if (line.includes(" Player connected: ")) {
      ++playerCount;
      backupOnNextOccasion = true;
    } else if (line.includes(" Player disconnected: ")) {
      --playerCount;
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

const backupServer = async () => {
  if (backupOnNextOccasion) {
    await stdCopy.copy(Deno.cwd(), env_backupPath + new Date().toISOString());
    backupOnNextOccasion = false;
  } else {
    log("No backup was made due to no player having joined since last backup.");
  }
};

const stopServer = async (offset?: number) => {
  try {
    if (offset) {
      for (let i = offset; i > 0; i--) {
        log(`Server stop in ${i}`);
        await mcProcess?.stdin?.write(encoder.encode(`Server stop in ${i}\n`));
        await timer(1000);
      }
    }
    log("stop");
    await mcProcess?.stdin?.write(encoder.encode("stop\n"));
    await mcProcess?.stdin?.close();
    playerCount = 0;

    await backupServer();
  } catch {
    log("Closing or backupping the server failed!");
  }
};

const shutdownHost = () => {
  Deno.run({ cmd: ["sudo", "shutdown", "-h", "now"] }).status();
};

const timer = (delayInMillis: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayInMillis);
  });

const shutdownOnIdleWatcher = async () => {
  while (true) {
    await timer(ONE_MINUTE);
    if (env_shutdownOnIdle && playerCount === 0 && serverState === STARTED) {
      if (++serverIdleMinutes === IDLE_SERVER_MINUTES_THRESHOLD) {
        await stopServer();
        shutdownHost();
      }
    } else {
      serverIdleMinutes = 0;
    }
  }
};

startServer();
shutdownOnIdleWatcher();

app.use(async (ctx, next) => {
  log(`${ctx.request.method} ${ctx.request.url}`);
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

log(`Listening on: localhost:${port}`);
