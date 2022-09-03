import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as mod from "https://deno.land/std@0.104.0/io/util.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 3000;
Deno.env.set("LD_LIBRARY_PATH", ".");

app.use(
  oakCors({
    origin: "*",
  })
);

const router = new Router();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const STARTED = "STARTED";
const ALREADY_STARTED = "ALREADY_STARTED";
const STOPPED = "STOPPED";
const ALREADY_STOPPED = "ALREADY_STOPPED";
const PROGRESS = "PROGRESS";
const SUCCESS = "SUCCESS";
const FAILED = "FAILED";

let mcProcess = null; //: Process<any>|null;
let serverState = STOPPED;

interface ServerState {
  state: string;
}

router
  .get("/", async (ctx) => {
    await send(ctx, "index.html", {
      root: `${Deno.cwd()}/public`,
    });
  })
  .get("/start", (ctx) => {
    if (serverState === STOPPED) {
      serverState = PROGRESS;
      startServer();
      serverState = STARTED;
      ctx.response.body = { state: STARTED };
      return;
    }
    ctx.response.body = { state: ALREADY_STARTED };
  })
  .get("/stop", async (ctx) => {
    if (mcProcess !== null) {
      serverState = PROGRESS;
      await stopServer();
      serverState = STOPPED;
      ctx.response.body = { serverState: STOPPED };
      return;
    }
    ctx.response.body = { serverState: ALREADY_STOPPED };
  })
  .post("/command", async (ctx) => {
    if (mcProcess !== null && serverState !== STOPPED) {
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
    await mod.writeAll(writer, encoder.encode(`${line}\n`));
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
  if (mcProcess !== null) {
    try {
      await mcProcess.stdin.write(encoder.encode("stop\n"));
      await timer(3000);
    } catch {
      console.log("closing the server failed");
    }

    await mcProcess.stdin.close();
  } else {
    console.log("Server is not running!");
  }
};

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

app.listen({ port });

console.log(`Listening on: localhost:${port}`);
