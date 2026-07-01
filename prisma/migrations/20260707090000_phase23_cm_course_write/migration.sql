-- Phase 23: Grant course:write to the Cohort Manager system role so they can create/edit
-- modules and lessons on courses assigned to their cohorts. (idempotent)

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM   "Role" r, "Permission" p
WHERE  r.name = 'Cohort Manager'
AND    p.key  = 'course:write'
ON CONFLICT DO NOTHING;
