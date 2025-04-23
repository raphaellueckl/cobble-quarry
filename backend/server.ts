import { Application, Router } from "https://deno.land/x/oak@v16.0.0/mod.ts";
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
const MULTI_SERVER = "MULTI_SERVER";
const AUTO_SHUTDOWN = "AUTO_SHUTDOWN";
const DISABLE_AUTO_UPDATES = "DISABLE_AUTO_UPDATES";
const PORT = "PORT";
const DEBUG_MODE = "ENABLE_DEBUG_MODE";
const PREFERRED_LOG_SIZE = "PREFERRED_LOG_SIZE";
const MULTI_SERVER_TIMESTAMP_PATH = "/tmp/cobblequarry-multiserver.txt";
const INSTALLED_VERSION_PATH = "./server-version.txt";
const ZIP_FILE_PATH = "./bedrock-server.zip";
const EXTRACT_DIR = "../bedrock-server";
const MINECRAFT_SERVER_DIR = "./";
const COBBLE_EXECUTABLE = "/cobble";
const COBBLE_INTERNAL_FOLDER = "/cobblequarry";

const env_adminPW: string = Deno.env.get(ADMIN_PW) || "";
const env_modPW: string = Deno.env.get(MOD_PW) || "";
const env_shutdownOnIdle: boolean = Deno.env.has(AUTO_SHUTDOWN); // y
const env_updateWatcher: boolean = !Deno.env.has(DISABLE_AUTO_UPDATES); // y
const env_multi_server: string = Deno.env.get(MULTI_SERVER) || ""; // y
const env_preferred_log_size: number =
  Number(Deno.env.get(PREFERRED_LOG_SIZE)) || 10000;
const env_port: number = Number(Deno.env.get(PORT)) || 3000;
const env_debug_mode: boolean = Deno.env.has(DEBUG_MODE); // y
let env_backupPath: string = Deno.env.get(BACKUP_PATH) || ""; // /home/username/minecraft

// Fix lazy user input
if (env_backupPath && env_backupPath[env_backupPath.length - 1] !== "/") {
  env_backupPath += "/";
}

const app = new Application();
const router = new Router();
const encoder = new TextEncoder();

// The download URL for linux bedrock server. This regex should find it.
const DOWNLOAD_REGEX =
  /https:\/\/(.*)\/bin\-linux\/bedrock\-server\-(.*?)\.zip/;

const STARTED = "STARTED";
const STOPPED = "STOPPED";
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";
const DEBUG_MODE_LOG = ">DEBUG MODE LOG: ";
const DEBUG_MODE_LOG_ERROR = ">DEBUG MODE ERROR LOG: ";

const IDLE_SERVER_MINUTES_THRESHOLD = 30;
const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;
const FIVE_MINUTES = ONE_MINUTE * 5;
const ONE_HOUR = ONE_MINUTE * 60;
let serverIdleMinutes = 0;

let mcProcess: Deno.Process | null = null;
let serverState = STOPPED;
let playerCount = 0;
let backupOnNextOccasion = false;
let installedVersion: string | null = null;
let downloadUrl: string | null = null;

const logQueue: string[] = [];
const serverUpdateExclusionFiles = ["allowlist.json", "server.properties"];

const log = (content: string, isMCMessage = false) => {
  if (content.includes("http") && content.includes("://")) return;
  const msg = (isMCMessage ? "[Minecraft] " : "[Cobble]    ") + content;
  logQueue.unshift(msg);
  console.log(msg);
};

if (env_debug_mode)
  log(
    "DEBUG_MODE is enabled! To disable is, re-run without the flag set. This might cause unwanted log-spam!"
  );
log("Backup Path: " + env_backupPath);
log(
  `Automatic Minecraft server updates are ${
    env_updateWatcher
      ? "enabled"
      : "disabled. Restart with the environment variable 'DISABLE_AUTO_UPDATES=y', to enable it"
  }.`
);
log(
  env_shutdownOnIdle
    ? `Server (Computer) will shut down if no players for ${IDLE_SERVER_MINUTES_THRESHOLD} minutes. To avoid that, do not set '${AUTO_SHUTDOWN}'. If the minecraft server is "stopped" manually, the server (host computer) will not shut down by itself.`
    : `Server (Computer) is set to not automatically shutdown, if there are no players. Provide '${AUTO_SHUTDOWN}=yes' if you want that.`
);
log(
  env_multi_server
    ? "Server is running in 'MULTI_SERVER' mode. This is only needed if you run several Minecraft servers on this host computer."
    : "Server is NOT running in 'MULTI_SERVER' mode. This is okay if only one Minecraft server is running on this host computer."
);
if (!env_adminPW)
  log(
    `WARNING: No ADMIN password given. Provide the variable '${ADMIN_PW}' with a freely chosen password on startup of cobble-quarry, otherwise everyone with access to the website can destroy the server with unprotected admin access.`
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
      let command: string = await ctx.request.body.text();
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
      log("Initiating minecraft backup...");
      await startBackupProcedure();
    } else {
      log(`No '${BACKUP_PATH}' environment variable given or wrong password.`);
    }
  })
  .post("/update", async (ctx) => {
    if (isAuthenticatedAsMod(ctx)) {
      log("Initiating minecraft update...");
      await startServerUpdateProcedure(true);
    } else {
      log(`No '${BACKUP_PATH}' environment variable given or wrong password.`);
    }
  });

const startBackupProcedure = async () => {
  await stopAndBackupServer(
    20,
    "Starting minecraft backup. Restart in approximately one minute.",
    true
  );
  startServer();
};

const startServerUpdateProcedure = async (forceBackup = false) => {
  const version = await checkServerUpdateDue();
  if (version) {
    await stopAndBackupServer(
      20,
      "Starting server update. Restart within a few seconds.",
      forceBackup
    );
    await updateServer(version);
    await startServer();
  }
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

const doesFileExist = async (path: string) => {
  try {
    return (await Deno.stat(path)).isFile;
  } catch (_e) {
    return false;
  }
};

const writeMultiServerTimestamp = async () => {
  try {
    await Deno.writeTextFile(
      MULTI_SERVER_TIMESTAMP_PATH,
      new Date().toString()
    );
  } catch (_e) {
    log(
      `Failed to write mutli-server-timestamp file! Path: ${MULTI_SERVER_TIMESTAMP_PATH}`
    );
  }
};

const readMultiServerTimestamp = async () => {
  try {
    const timestampAsString = await Deno.readTextFile(
      MULTI_SERVER_TIMESTAMP_PATH
    );
    return new Date(timestampAsString);
  } catch (_e) {
    log(`Error - Could not read: ${MULTI_SERVER_TIMESTAMP_PATH}`);
    return new Date(0);
  }
};

const startServer = async () => {
  serverIdleMinutes = 0;
  try {
    if (env_multi_server) {
      await writeMultiServerTimestamp();
    }
    if (await doesFileExist("./bedrock_server")) {
      mcProcess = Deno.run({
        cmd: ["./bedrock_server"],
        stdout: "piped",
        stdin: "piped",
        stderr: "piped",
      });

      messageObserver(mcProcess.stdout, Deno.stdout);
      messageObserver(mcProcess.stderr, Deno.stderr);
    } else {
      log("Server does not yet exist. Initiating...");
    }
  } catch (_e) {
    log("Could not start server.");
  }
};

const backupServer = async (forceBackup = false) => {
  if (backupOnNextOccasion || forceBackup) {
    const backupPath = env_backupPath + new Date().toISOString();
    await stdCopy.copy(Deno.cwd(), backupPath);
    await Deno.remove(backupPath + COBBLE_EXECUTABLE);
    await Deno.remove(backupPath + COBBLE_INTERNAL_FOLDER, { recursive: true });
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

const getNewestServerVersion = async (): Promise<string | null> => {
  const urlToCrawlNewestVersionNumber =
    "https://www.minecraft.net/en-us/download/server/bedrock";

  let html = "";
  try {
    html = await (await fetch(urlToCrawlNewestVersionNumber)).text();
  } catch (e) {
    if (env_debug_mode) {
      errorDebug(
        "Fetching the newest minecraft server version failed. Probably offline endpoint?"
      );
      errorDebug(e);
      throw e;
    }
  }

  downloadUrl = html.match(DOWNLOAD_REGEX)?.[0] || null;
  if (env_debug_mode) {
    logDebug("Download URL is: " + downloadUrl);
    logDebug("Extracted version is: " + html.match(DOWNLOAD_REGEX)?.[2]);
  }

  return html.match(DOWNLOAD_REGEX)?.[2] || null;
};

const readInstalledVersion = async (): Promise<string | null> => {
  try {
    return await Deno.readTextFile(INSTALLED_VERSION_PATH);
  } catch (_e) {
    log(`Error - Could not read: ${INSTALLED_VERSION_PATH}`);
    return null;
  }
};

const setInstalledVersion = async (version: string): Promise<void> => {
  installedVersion = version;
  try {
    await Deno.writeTextFile(INSTALLED_VERSION_PATH, version);
  } catch (_e) {
    log(
      `Failed to write installed-version file! Path: ${INSTALLED_VERSION_PATH}`
    );
  }
};

const checkServerUpdateDue = async (): Promise<string | null> => {
  try {
    const newestAvailableVersion = await getNewestServerVersion();

    if (!installedVersion) {
      try {
        installedVersion = await readInstalledVersion();
        if (env_debug_mode)
          logDebug(
            "Installed version read from system is: " + installedVersion
          );
      } catch (e) {
        if (env_debug_mode) {
          errorDebug("Could not read installed version file!");
          errorDebug(e);
        }
        throw e;
      }
    }

    if (newestAvailableVersion === installedVersion && newestAvailableVersion) {
      log(
        `Update check: Already on the newest version! ${newestAvailableVersion}`
      );
      return null;
    }

    log(
      `UPDATE: Most recent available bedrock server version is: ${newestAvailableVersion}`
    );
    return newestAvailableVersion;
  } catch (_e) {
    log("Could not fetch newest minecraft server version!");
    return null;
  }
};

const updateServer = async (version: string) => {
  try {
    log("Downloading new update...");
    if (!downloadUrl) {
      log(
        "Download URL was not present. Probably there was a change on Mojangs side and this app therefore needs an update."
      );
      return null;
    }

    let bedrockZipDownload = null;
    try {
      bedrockZipDownload = await fetch(downloadUrl);
    } catch (e) {
      if (env_debug_mode) {
        errorDebug(
          "Coud not fetch update over the downloadUrl: " + downloadUrl
        );
        errorDebug(e);
      }
      throw e;
    }

    let bedrockZipFile = null;
    try {
      bedrockZipFile = await Deno.open(ZIP_FILE_PATH, {
        create: true,
        write: true,
      });
    } catch (e) {
      if (env_debug_mode) {
        errorDebug("Coud not open downloaded zip file.");
        errorDebug(e);
      }
      throw e;
    }

    try {
      await bedrockZipDownload.body?.pipeTo(bedrockZipFile.writable);
      // bedrockZipFile.close();

      log("Unpacking zip file...");
      await ensureDir(EXTRACT_DIR);
      await decompress(ZIP_FILE_PATH, EXTRACT_DIR);
      log("Removing downloaded zip file...");
      await Deno.remove(ZIP_FILE_PATH);
    } catch (e) {
      if (env_debug_mode) {
        errorDebug("reading the zip and writing it somewhere failed.");
        errorDebug(e);
      }
      throw e;
    }

    // No installed version == Fresh install without excludes
    if (installedVersion) {
      // Remove files from downloaded server, that should not be taken over.
      log("Excluding files that should not be overriden...");
      log(`Files: ${serverUpdateExclusionFiles}`);
      const filesToExcludeFromMerge = serverUpdateExclusionFiles;
      for (const fileName of filesToExcludeFromMerge) {
        const filePath = join(EXTRACT_DIR, fileName);
        try {
          await Deno.remove(filePath);
        } catch (e) {
          if (env_debug_mode) {
            errorDebug("Removing the excluded files failed.");
            errorDebug(e);
          }
          throw e;
        }
      }
    }

    log("Updating server...");
    try {
      await mergeDirectoriesAndOverwriteExisting(
        EXTRACT_DIR,
        MINECRAFT_SERVER_DIR
      );
      Deno.remove(EXTRACT_DIR, { recursive: true });
    } catch (e) {
      if (env_debug_mode) {
        errorDebug("Merging the update with the current minecraft dir failed.");
        errorDebug(e);
      }
      throw e;
    }

    try {
      await setInstalledVersion(version);
    } catch (e) {
      errorDebug("Failed to write installed version" + version);
      errorDebug(e);
      throw e;
    }

    log("Server update completed!");
  } catch {
    log("Updating server failed!");
  }
};

const stopAndBackupServer = async (
  waitTime?: number,
  msg?: string,
  forceBackup = false
) => {
  try {
    if (waitTime) {
      if (msg) await mcProcess?.stdin?.write(encoder.encode(msg));
      for (let i = waitTime; i > 0; i--) {
        log(`Server stop in ${i}`);
        await mcProcess?.stdin?.write(encoder.encode(`Server stop in ${i}\n`));
        await timer(1000);
      }
    }
    log("stop");
    await mcProcess?.stdin?.write(encoder.encode("stop\n"));
    await mcProcess?.stdin?.close();
    playerCount = 0;

    await backupServer(forceBackup);
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

const waitUntilMidnight = async () => {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() + 1);

  while (new Date().getTime() < midnight.getTime()) {
    await timer(5000);
  }
};

const shutdownOnIdleWatcher = async () => {
  while (true) {
    await timer(ONE_MINUTE);
    if (playerCount === 0 && serverState === STARTED) {
      if (++serverIdleMinutes >= IDLE_SERVER_MINUTES_THRESHOLD) {
        await stopAndBackupServer();
        if (env_multi_server) {
          try {
            const timestamp = await readMultiServerTimestamp();
            if (
              new Date().getTime() - timestamp.getTime() >
              IDLE_SERVER_MINUTES_THRESHOLD * 60 * 1000
            ) {
              shutdownHost();
            }
          } catch (_e) {
            shutdownHost();
          }
        } else {
          shutdownHost();
        }
      }
    } else if (playerCount > 0 && serverState === STARTED) {
      serverIdleMinutes = 0;
      if (env_multi_server) {
        await writeMultiServerTimestamp();
      }
    } else {
      if (env_multi_server) {
        try {
          const timestamp = await readMultiServerTimestamp();
          if (
            new Date().getTime() - timestamp.getTime() >
            IDLE_SERVER_MINUTES_THRESHOLD * 60 * 1000 + TWO_MINUTES
          ) {
            setTimeout(shutdownHost, FIVE_MINUTES);
          }
        } catch (_e) {
          setTimeout(shutdownHost, FIVE_MINUTES);
        }
      } else {
        setTimeout(shutdownHost, FIVE_MINUTES);
      }
    }
  }
};

const serverUpdateWatcher = async () => {
  while (true) {
    await startServerUpdateProcedure();
    await timer(ONE_HOUR);
  }
};

const logPurgerWatcher = async () => {
  while (true) {
    logQueue.splice(0, env_preferred_log_size);
    await waitUntilMidnight();
  }
};

startServer();
logPurgerWatcher();
if (env_shutdownOnIdle) shutdownOnIdleWatcher();
if (env_updateWatcher) serverUpdateWatcher();

const logDebug = (text: string) => {
  const msg = DEBUG_MODE_LOG + text;
  logQueue.unshift(msg);
  console.log(msg);
};

const errorDebug = (text: string) => {
  const error = DEBUG_MODE_LOG_ERROR + text;
  logQueue.unshift(error);
  console.error(error);
};

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

app.listen({ port: env_port });

app.use(async (context, next) => {
  try {
    await context.send({
      root: `${Deno.cwd()}${COBBLE_INTERNAL_FOLDER}`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

log(
  `Listening on: ${
    Deno.networkInterfaces().find((ni) => ni.address.startsWith("192.168."))
      ?.address || "localhost"
  }:${env_port}`
);
