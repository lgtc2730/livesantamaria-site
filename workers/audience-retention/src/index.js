const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function deleteExpiredEvents(db, now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
  const result = await db
    .prepare("DELETE FROM events WHERE created_at < ?")
    .bind(cutoff)
    .run();
  return Number(result.meta?.changes ?? 0);
}

export default {
  async scheduled(_controller, env, _ctx) {
    const started = Date.now();
    try {
      const deletedCount = await deleteExpiredEvents(
        env.LVSM_AUDIENCE,
        new Date()
      );
      console.log("[AudienceRetention]", {
        outcome: "ok",
        deletedCount,
        durationMs: Date.now() - started
      });
    } catch (_error) {
      console.error("[AudienceRetention]", {
        outcome: "error",
        deletedCount: 0,
        durationMs: Date.now() - started
      });
      throw new Error("audience retention failed");
    }
  }
};
