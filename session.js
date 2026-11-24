// In-memory demo sessions only. Restarting the server clears sessions.
// Replace with a persistent, secure session store and real authentication in production.
export const sessions = new Map();

export function getSession(req) {
  const id = req.header("x-demo-session");
  return id ? sessions.get(id) : undefined;
}
