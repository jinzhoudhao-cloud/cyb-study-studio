import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const studyProgress = sqliteTable("study_progress", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  epoch: text("epoch").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(), value: text("value").notNull(),
});
export const guestSessions = sqliteTable("guest_sessions", {
  tokenHash: text("token_hash").primaryKey(), nickname: text("nickname").notNull(),
  visible: integer("visible").notNull().default(0),
  lastSeen: integer("last_seen").notNull(), expiresAt: integer("expires_at").notNull(),
});
export const requestLimits = sqliteTable("request_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
});
