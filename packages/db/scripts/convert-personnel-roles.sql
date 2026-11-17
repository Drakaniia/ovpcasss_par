-- Forward-only data conversion for deployments predating ADMIN/PERSONNEL.
-- Apply as a maintenance operation before deploying PIC report authoring.
-- No report, audit history, account status, membership, or reference is removed.
-- D1 batch execution must keep these two statements in one transaction.
INSERT INTO audit_events (
  id, actor_user_id, actor_role, action, entity_type, entity_id, comment, created_at
)
SELECT
  lower(hex(randomblob(16))), NULL, NULL, 'ROLE_ASSIGNED', 'user', id,
  json_object('before', json_object('role', role),
              'after', json_object('role', 'PERSONNEL'),
              'note', 'Legacy role converted to Personnel in charge'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM users
WHERE role IN ('SUBMITTER', 'REVIEWER', 'APPROVER', 'STAFF');

UPDATE users
SET role = 'PERSONNEL', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE role IN ('SUBMITTER', 'REVIEWER', 'APPROVER', 'STAFF');
