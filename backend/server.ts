import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as conversion from "https://deno.land/std@0.152.0/streams/conversion.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const app = new Application();
const port = 3000;
Deno.env.set("LD_LIBRARY_PATH", ".");
const router = new Router();
const encoder = new TextEncoder();

const STARTED = "STARTED";
const STOPPED = "STOPPED";
const PROGRESS = "PROGRESS";
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

let mcProcess = null; //: Process<any>|null;
let serverState = STOPPED;
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
      await stopServer();
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
      await mcProcess.stdin.write(encoder.encode(command + "\n"));
      ctx.response.body = { state: SUCCESS };
      return;
    }
    ctx.response.body = { state: FAILED };
  });

const messageObserver = async (reader: Deno.Reader, writer: Deno.Writer) => {
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

const stopServer = async () => {
  try {
    await mcProcess.stdin.write(encoder.encode("stop\n"));
  } catch {
    console.log("closing the server failed");
  }
  await mcProcess.stdin.close();
};

// Potentially unused
const timer = (delay) =>
  new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

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
      root: `${Deno.cwd()}/../frontend/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

console.log(`Listening on: localhost:${port}`);
