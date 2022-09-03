import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { readLines } from "https://deno.land/std@0.104.0/io/mod.ts";
import * as mod from "https://deno.land/std@0.104.0/io/util.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 3000;
Deno.env.set("LD_LIBRARY_PATH", ".")

app.use(
  oakCors({
    origin: "*",
  })
);

const router = new Router();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const STOPPED = 0;
const STARTED = 1;
const PROGRESS = 2;

let mcProcess;//: Process<any>|undefined;
let serverState = STOPPED;

router
  .get("/", async (ctx) => {
    await send(ctx, 'index.html', {
      root: `${Deno.cwd()}/public`,
    });
  })
  .get("/start", (ctx) => {
    if (serverState === STOPPED) {
      serverState = PROGRESS;
      startServer();
      serverState = STARTED;
    }
    ctx.response.body = 'Starting server...';
  })
  .get("/stop", (ctx) => {
    stopServer();
    ctx.response.body = 'Stopping server...';
  })
  .post("/command", async (ctx) => {
    if (mcProcess !== null) {
      const command = await ctx.request.body().value;
      console.log(`Executing: /${command}`);
      await mcProcess.stdin.write(encoder.encode(command + "\n"));
    }
  })

const messageObserver = async (
  reader: Deno.Reader,
  writer: Deno.Writer,
) => {
  const encoder = new TextEncoder();
  for await (const line of readLines(reader)) {
    await mod.writeAll(writer, encoder.encode(`${line}\n`));
  }
}

const startServer = async () => {
  mcProcess = Deno.run({
    cmd: ["./bedrock_server"],
    stdout: "piped",
    stdin: "piped",
    stderr: "piped",
  });

  messageObserver(mcProcess.stdout, Deno.stdout);
  messageObserver(mcProcess.stderr, Deno.stderr);
}

const stopServer = async () => {
  if (mcProcess !== null) {
    try {
      await mcProcess.stdin.write(encoder.encode("/stop"));
    } catch {
      console.log("closing the server failed");
    }

    await mcProcess.stdin.close();
    serverState = "Shut down minecraft."
  } else {
    console.log("Server is not running!")
  }
}

app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });

console.log(`Listening on: localhost:${port}`);