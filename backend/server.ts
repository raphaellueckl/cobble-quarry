import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as conversion from "https://deno.land/std@0.152.0/streams/conversion.ts";
import * as stdCopy from "https://deno.land/std@0.149.0/fs/copy.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { compress } from "https://deno.land/x/zip@v1.2.4/mod.ts";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
import { copy } from "https://deno.land/std/fs/copy.ts";
import { join } from "https://deno.land/std@0.114.0/path/mod.ts";
import { decompress } from "https://deno.land/x/zip@v1.2.5/decompress.ts";

Deno.env.set("LD_LIBRARY_PATH", ".");

const ADMIN_PW = "ADMIN_PW";
const MOD_PW = "MOD_PW";
const BACKUP_PATH = "BACKUP_PATH";
const AUTO_SHUTDOWN = "AUTO_SHUTDOWN";
const DISABLE_AUTO_UPDATES = "DISABLE_AUTO_UPDATES";
const ZIP_FILE_PATH = "./bedrock-server.zip";
const EXTRACT_DIR = "../bedrock-server";
const MINECRAFT_SERVER_DIR = "./";

const env_adminPW: string = Deno.env.get(ADMIN_PW) || "";
const env_modPW: string = Deno.env.get(MOD_PW) || "";
const env_shutdownOnIdle: string = Deno.env.get(AUTO_SHUTDOWN) || ""; // y
const env_updateWatcher: boolean = !Deno.env.has(DISABLE_AUTO_UPDATES); // y
let env_backupPath: string = Deno.env.get(BACKUP_PATH) || ""; // /home/username/minecraft

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
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

const IDLE_SERVER_MINUTES_THRESHOLD = 30;
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
let serverIdleMinutes = 0;

let mcProcess: Deno.Process | null = null;
let serverState = STOPPED;
let playerCount = 0;
let backupOnNextOccasion = false;

let logQueue: String[] = [];
const serverUpdateExclusionFiles = ["allowlist.json", "server.properties"];

const log = (content: string, isMCMessage = false) => {
  if (content.includes("http") && content.includes("://")) return;
  const msg = (isMCMessage ? "[Minecraft] " : "[Cobble]    ") + content;
  logQueue.push(msg);
  console.log(msg);
};

log("Backup Path: " + env_backupPath);
log(
  env_shutdownOnIdle
    ? `Server (Computer) will shut down if no players for ${IDLE_SERVER_MINUTES_THRESHOLD} minutes. To avoid that, do not set '${AUTO_SHUTDOWN}'. If the minecraft server is "stopped" manually, the server (host machine) will not shut down by itself.`
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
  .get("/status-and-logs", (ctx) => {
    ctx.response.body = { status: serverState, logs: logQueue };
  })
  .post("/start", (ctx) => {
    if (isAuthenticatedAsMod(ctx)) {
      if (serverState === STOPPED) {
        startServer();
        ctx.response.body = { state: STARTED };
        return;
      }
      ctx.response.body = { state: "ALREADY_STARTED" };
    }
  })
  .post("/stop", async (ctx) => {
    if (isAuthenticatedAsMod(ctx) && mcProcess !== null) {
      await stopAndBackupServer(0);
      ctx.response.body = { serverState: STOPPED };
      return;
    }
    ctx.response.body = { state: "ALREADY_STOPPED" };
  })
  .post("/command", async (ctx) => {
    if (
      isAuthenticatedAsAdmin(ctx) &&
      mcProcess !== null &&
      !(serverState === STOPPED)
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
      await startBackupProcedure();
    } else {
      log(`No '${BACKUP_PATH}' environment variable given or wrong password.`);
    }
  })
  .post("/update", async (ctx) => {
    if (isAuthenticatedAsMod(ctx)) {
      await startServerUpdateProcedure();
    } else {
      log(`No '${BACKUP_PATH}' environment variable given or wrong password.`);
    }
  });

const startBackupProcedure = async () => {
  await stopAndBackupServer(
    20,
    "Starting minecraft backup. Restart in approximately one minute."
  );
  startServer();
};

const startServerUpdateProcedure = async () => {
  await stopAndBackupServer(
    20,
    "Starting server update. Restart in approximately one minute."
  );
  await updateServer();
  startServer();
};

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
    const backupPath = env_backupPath + new Date().toISOString();
    await stdCopy.copy(Deno.cwd(), backupPath);
    await Deno.remove(backupPath + "/cobble");
    await Deno.remove(backupPath + "/cobblequarry", { recursive: true });
    await compress(backupPath, `${backupPath}.zip`);
    await Deno.remove(backupPath, { recursive: true });
    backupOnNextOccasion = false;
  } else {
    log("No backup was made due to no player having joined since last backup.");
  }
};

const mergeDirectoriesAndOverwriteExisting = async (
  source: string,
  target: string
) => {
  await ensureDir(target);

  for await (const entry of Deno.readDir(source)) {
    const sourcePath = `${source}/${entry.name}`;
    const targetPath = `${target}/${entry.name}`;

    if (entry.isDirectory) {
      await mergeDirectoriesAndOverwriteExisting(sourcePath, targetPath);
    } else {
      await copy(sourcePath, targetPath, { overwrite: true });
    }
  }
};

const updateServer = async () => {
  try {
    const urlToCrawlNewestVersionNumber =
      "https://www.minecraft.net/en-us/download/server/bedrock";

    const html = await (await fetch(urlToCrawlNewestVersionNumber)).text();

    const versionNumberRegex =
      /<a href="https:\/\/minecraft\.azureedge\.net\/bin\-linux\/bedrock\-server\-(.*?)\.zip"/;
    const version = html.match(versionNumberRegex)?.[1];

    if (version) {
      log(`New bedrock server version is: ${version}`);

      const bedrockZipDownloadUrl = `https://minecraft.azureedge.net/bin-linux/bedrock-server-${version}.zip`;

      log("Downloading new update...");
      const bedrockZipDownload = await fetch(bedrockZipDownloadUrl);
      const bedrockZipFile = await Deno.open(ZIP_FILE_PATH, {
        create: true,
        write: true,
      });
      await bedrockZipDownload.body?.pipeTo(bedrockZipFile.writable);
      // file.close();

      log("Unpacking zip file...");
      await ensureDir(EXTRACT_DIR);
      await decompress(ZIP_FILE_PATH, EXTRACT_DIR);
      log("Removing downloaded zip file...");
      await Deno.remove(ZIP_FILE_PATH);

      // Remove files from downloaded server, that should not be taken over.
      log("Excluding files that should not be overriden...");
      log(`Files: ${serverUpdateExclusionFiles}`);
      const filesToExcludeFromMerge = serverUpdateExclusionFiles;
      for (const fileName of filesToExcludeFromMerge) {
        const filePath = join(EXTRACT_DIR, fileName);
        await Deno.remove(filePath);
      }

      log("Updating server...");
      await mergeDirectoriesAndOverwriteExisting(
        EXTRACT_DIR,
        MINECRAFT_SERVER_DIR
      );
      Deno.remove(EXTRACT_DIR, { recursive: true });

      log("Server update completed!");
    } else {
      log("No version information found in crawled HTML.");
    }
  } catch {
    log("Updating server failed!");
  }
};

const stopAndBackupServer = async (offset?: number, msg?: string) => {
  try {
    if (offset) {
      if (msg) await mcProcess?.stdin?.write(encoder.encode(msg));
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
        await stopAndBackupServer();
        shutdownHost();
      }
    } else {
      serverIdleMinutes = 0;
    }
  }
};

const serverUpdateWatcher = async () => {
  while (true) {
    await timer(ONE_HOUR);
  }
};

startServer();
shutdownOnIdleWatcher();
if (env_updateWatcher) serverUpdateWatcher();

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
