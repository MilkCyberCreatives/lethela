// Local stand-in for Resend/Twilio: records every captured outbound request as one JSON line.
import http from "node:http";
import fs from "node:fs";
const port = Number(process.env.E2E_CATCHER_PORT || 3199);
const file = process.env.E2E_CATCHER_LOG || "e2e-outbound.jsonl";
http
  .createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (req.method === "POST" && req.url === "/capture") {
        fs.appendFileSync(file, data.replace(/\n/g, " ") + "\n");
      } else if (req.method === "POST" && req.url === "/guard-loaded") {
        fs.appendFileSync(file, JSON.stringify({ service: "guard-loaded", pid: data }) + "\n");
      } else if (req.method === "GET" && req.url === "/log") {
        res.setHeader("content-type", "application/x-ndjson");
        return res.end(fs.existsSync(file) ? fs.readFileSync(file) : "");
      } else if (req.method === "DELETE" && req.url === "/log") {
        fs.writeFileSync(file, "");
      }
      res.end("ok");
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`catcher on ${port} -> ${file}`));
