import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
try {
  db.exec(`CREATE TABLE users (id TEXT, role TEXT, updated_at TEXT);
    CREATE TABLE audit_events (id TEXT, actor_user_id TEXT, actor_role TEXT,
      action TEXT, entity_type TEXT, entity_id TEXT, comment TEXT, created_at TEXT);`);
  for (const role of ['ADMIN', 'PERSONNEL', 'SUBMITTER', 'REVIEWER', 'APPROVER', 'STAFF']) {
    db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(role, role, 'original');
  }
  const sql = readFileSync(new URL('./convert-personnel-roles.sql', import.meta.url), 'utf8');
  db.exec('BEGIN');
  db.exec(sql);
  db.exec('COMMIT');
  assert.equal(db.prepare("SELECT role FROM users WHERE id = 'ADMIN'").get().role, 'ADMIN');
  assert.equal(db.prepare("SELECT count(*) AS n FROM users WHERE role = 'PERSONNEL'").get().n, 5);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, 4);
  const event = db.prepare("SELECT comment FROM audit_events WHERE entity_id = 'REVIEWER'").get();
  assert.deepEqual(JSON.parse(event.comment).before, { role: 'REVIEWER' });
  assert.deepEqual(JSON.parse(event.comment).after, { role: 'PERSONNEL' });
  db.exec(sql);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audit_events').get().n, 4);
  console.log(
    'PASS: legacy role conversion preserves ADMIN and records idempotent before/after history',
  );
} finally {
  db.close();
}
