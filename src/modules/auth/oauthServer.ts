import http from "http";
import url from "url";

interface OAuthCallback {
  code?: string;
  error?: string;
  state?: string;
}

export function startCallbackServer(port: number): Promise<OAuthCallback> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const query = parsedUrl.query;

      const result: OAuthCallback = {
        code: query.code as string | undefined,
        error: query.error as string | undefined,
        state: query.state as string | undefined,
      };

      if (result.code || result.error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h1>Authentication ${result.error ? "Failed" : "Successful"}</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        server.close();
        resolve(result);
      } else {
        res.writeHead(400);
        res.end("Invalid request");
      }
    });

    server.listen(port);

    server.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        resolve({ error: `Port ${port} is already in use` });
      } else {
        resolve({ error: err.message });
      }
      server.close();
    });
  });
}

export function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    server.listen(startPort, () => {
      const port = (server.address() as { port: number })?.port;
      server.close(() => resolve(port || startPort));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        findAvailablePort(startPort + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
