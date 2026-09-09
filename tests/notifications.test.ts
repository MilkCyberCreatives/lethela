import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Notification model is defined in both Prisma schemas with owner-scoped indexes", () => {
  for (const schema of ["prisma/schema.prisma", "prisma/schema.postgresql.prisma"]) {
    const text = source(schema);
    assert.match(text, /model Notification \{/, `${schema} defines Notification`);
    assert.match(text, /readAt\s+DateTime\?/, `${schema} Notification has a nullable readAt`);
    assert.match(text, /@@index\(\[userId, readAt\]\)/, `${schema} indexes userId+readAt`);
    assert.match(text, /@@index\(\[userId, createdAt\]\)/, `${schema} indexes userId+createdAt`);
    assert.match(text, /onDelete: Cascade/, `${schema} cascades on user delete`);
    assert.match(
      text,
      /notifications\s+Notification\[\]/,
      `${schema} User has notifications relation`,
    );
  }
});

test("notifications lib scopes every read and write to the owning user", () => {
  const lib = source("src/lib/notifications.ts");
  // list and unread count are always filtered by userId
  assert.match(lib, /findMany\(\{\s*where: \{ userId \}/s);
  assert.match(lib, /count\(\{ where: \{ userId, readAt: null \} \}\)/);
  // mark-read never updates another user's rows
  assert.match(lib, /updateMany\(\{\s*where: \{ userId, readAt: null \}/s);
  assert.match(lib, /where: \{ id: opts\.id, userId, readAt: null \}/);
  // titles/bodies are length-capped before persistence
  assert.match(lib, /\.slice\(0, 200\)/);
  assert.match(lib, /\.slice\(0, 1000\)/);
});

test("notifications API requires a session for both read and write", () => {
  const route = source("src/app/api/notifications/route.ts");
  const guards = route.match(/if \(!session\?\.user\?\.id\) \{/g) ?? [];
  assert.ok(guards.length >= 2, "GET and POST both guard on session");
  assert.match(route, /listNotifications\(session\.user\.id\)/);
  assert.match(route, /markNotificationsRead\(session\.user\.id/);
  assert.match(route, /private, no-store/);
});

test("staff get a stored notification for new vendor and rider applications", () => {
  const vendor = source("src/lib/admin-notifications.ts");
  assert.match(vendor, /notifyStaff\(\{\s*type: "vendor-application"/s);
  const rider = source("src/lib/application-notifications.ts");
  assert.match(rider, /notifyStaff\(\{\s*type: "rider-application"/s);
});

test("admin header renders the notification bell instead of a bare shortcut button", () => {
  const page = source("src/app/admin/page.tsx");
  assert.match(page, /import NotificationBell from "@\/components\/dashboard\/NotificationBell"/);
  assert.match(page, /<NotificationBell\s+operationsCount=\{notificationCount\}/s);
  assert.match(page, /onOpenOperations=\{onNotifications\}/);
});

test("notification bell polls, closes on outside click, and marks read on open", () => {
  const bell = source("src/components/dashboard/NotificationBell.tsx");
  assert.match(bell, /fetch\("\/api\/notifications"/);
  assert.match(bell, /setInterval/);
  assert.match(bell, /addEventListener\("mousedown"/);
  assert.match(bell, /event\.key === "Escape"/);
  assert.match(bell, /aria-haspopup="true"/);
  assert.match(bell, /Mark all read/);
});
