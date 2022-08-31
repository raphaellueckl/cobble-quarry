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

let p;//: Process<any>|undefined;

Deno.env.set("LD_LIBRARY_PATH", ".")

router
  .get("/", async (ctx) => {
    await send(ctx, 'index.html', {
      root: `${Deno.cwd()}/public`,
    });
  })
  .get("/start", (ctx) => {
    startServer();
    ctx.response.body = 'Starting up...';
  })
  .get("/server/stop", (ctx) => {
    // stopServer();
    ctx.response.body = 'Shutting down...';
  })
  .post("/server/command", async (ctx) => {
    // await p.stdin.write(encoder.encode(values.command + "\n"));
  })


const startServer = async () => {
  p = Deno.run({
    cmd: ["./bedrock_server"],
    // cwd: "./backend",
    stdout: "piped",
    stdin: "piped",
    stderr: "piped",
  });

  Deno.copy(p.stdout, Deno.stdout);
  Deno.copy(p.stdout, Deno.stdout);
}

// const stopServer = async () => {
//   if (p !== null) {
//     try {
//       await p.stdin.write(encoder.encode("/stop"));
//     } catch {
//       console.log("closing the server failed");
//     }

//     await p.stdin.close();
//     serverState = "Shut down minecraft."
//   }
// }

app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url}`);
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });

console.log(`API listening on: 'localhost:${port}'`);