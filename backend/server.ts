import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 3000;

app.use(
  oakCors({
    origin: "*",
  })
);

const router = new Router();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let mcProcess;//: Process<any>|undefined;

Deno.env.set("LD_LIBRARY_PATH", ".")

router
  .get("/", async (ctx) => {
    await send(ctx, 'index.html', {
      root: `${Deno.cwd()}/public`,
    });
  })
  .get("/start", (ctx) => {
    startServer();
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


const startServer = async () => {
  mcProcess = Deno.run({
    cmd: ["./bedrock_server"],
    // cwd: "./backend",
    stdout: "piped",
    stdin: "piped",
    stderr: "piped",
  });

  Deno.copy(mcProcess.stdout, Deno.stdout);
  Deno.copy(mcProcess.stdout, Deno.stdout);
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

console.log(`API listening on: 'localhost:${port}'`);