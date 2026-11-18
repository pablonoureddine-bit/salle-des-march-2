// Diffusion en direct vers les navigateurs (Server-Sent Events).
const clients = new Set();

export function streamHandler(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 10000\n\n");
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000); // garde la connexion ouverte derrière les proxys
  req.on("close", () => { clearInterval(ping); clients.delete(res); });
}

export function broadcast(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

export const liveClients = () => clients.size;
