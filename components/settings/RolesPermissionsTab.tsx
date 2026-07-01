"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { apiJson } from "@/lib/authClient";

type Permission = { id: string; key: string; description: string | null };

type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  description: string | null;
  permissions: { permission: Permission }[];
};

const ACTION_LABELS: Record<string, string> = {
  read: "Read",
  write: "Edit",
  create: "Create",
  update: "Update",
  delete: "Delete",
  publish: "Publish",
};

const ACTION_ORDER = ["read", "create", "write", "update", "delete", "publish"];

function actionLabel(key: string) {
  const action = key.split(":")[1] ?? key;
  return ACTION_LABELS[action] ?? action;
}

function moduleLabel(resource: string) {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

function groupByResource(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const resource = permission.key.split(":")[0];
    const list = groups.get(resource) ?? [];
    list.push(permission);
    groups.set(resource, list);
  }
  return Array.from(groups.entries())
    .map(([resource, perms]) => {
      const sorted = [...perms].sort((a, b) => {
        const aAction = a.key.split(":")[1] ?? "";
        const bAction = b.key.split(":")[1] ?? "";
        return ACTION_ORDER.indexOf(aAction) - ACTION_ORDER.indexOf(bAction);
      });
      return [resource, sorted] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

export function RolesPermissionsTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const [rolesRes, permissionsRes] = await Promise.all([
      apiJson<Role[]>("/api/roles"),
      apiJson<Permission[]>("/api/roles/permissions"),
    ]);

    if (rolesRes.ok) setRoles(rolesRes.data);
    else setError(rolesRes.message);

    if (permissionsRes.ok) setPermissions(permissionsRes.data);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setPermissionKeys([]);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setPermissionKeys(role.permissions.map((p) => p.permission.key));
    setFormError(null);
    setModalOpen(true);
  }

  function togglePermission(key: string) {
    setPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleModule(keys: string[], allChecked: boolean) {
    setPermissionKeys((prev) => {
      if (allChecked) return prev.filter((k) => !keys.includes(k));
      return [...new Set([...prev, ...keys])];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (permissionKeys.length === 0) {
      setFormError("Select at least one permission");
      return;
    }

    setSubmitting(true);

    let result;
    if (editing) {
      // System roles: skip the rename call — only update permissions.
      if (!editing.isSystem) {
        const renameResult = await apiJson<Role>(`/api/roles/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, description: description || undefined }),
        });
        if (!renameResult.ok) {
          setSubmitting(false);
          setFormError(renameResult.message);
          return;
        }
      }
      result = await apiJson<Role>(`/api/roles/${editing.id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissionKeys }),
      });
    } else {
      result = await apiJson<Role>("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined, permissionKeys }),
      });
    }

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await loadAll();
  }

  async function handleDelete(role: Role) {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    const result = await apiJson(`/api/roles/${role.id}`, { method: "DELETE" });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    await loadAll();
  }

  const permissionGroups = useMemo(() => groupByResource(permissions), [permissions]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">Roles & Permissions</h2>
          <p className="text-sm text-text-secondary mt-1">
            System roles (Student, Mentor, Cohort Manager, Admin) are fixed. Create custom roles with their own
            permission set.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 whitespace-nowrap">
          <Plus size={16} />
          New Role
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}
      {error && <p className="mt-6 text-sm text-error">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {roles.map((role) => (
          <div key={role.id} className="border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{role.name}</p>
                  <Badge variant={role.isSystem ? "neutral" : "accent"}>{role.isSystem ? "System" : "Custom"}</Badge>
                </div>
                {role.description && <p className="text-sm text-text-secondary mt-0.5">{role.description}</p>}
              </div>
              {/* Admin is immutable. Mentor/Cohort Manager: can edit permissions but not name/delete.
                  Custom roles: full edit + delete. */}
              {role.name !== "Admin" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(role)}
                    aria-label="Edit role"
                    className="text-text-muted hover:text-accent rounded-md p-1.5"
                    title={role.isSystem ? "Edit permissions" : "Edit role"}
                  >
                    <Pencil size={16} />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role)}
                      aria-label="Delete role"
                      className="text-text-muted hover:text-error rounded-md p-1.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <Badge key={p.permission.id} variant="info">
                  {moduleLabel(p.permission.key.split(":")[0])} · {actionLabel(p.permission.key)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.isSystem ? `Edit Permissions — ${editing.name}` : editing ? "Edit Role" : "New Role"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {editing?.isSystem ? (
            <p className="text-xs text-text-muted bg-surface-secondary rounded-md px-3 py-2">
              <strong>{editing.name}</strong> is a system role — only its permissions can be changed, not its name. Changes apply to all users holding this role immediately.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary" htmlFor="role-name">
                  Name
                </label>
                <input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary" htmlFor="role-description">
                  Description
                </label>
                <input
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary">Permissions</label>
            <p className="text-xs text-text-muted mt-0.5">Grouped by module — check the actions this role can perform.</p>
            <div className="mt-2 flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {permissionGroups.map(([resource, perms]) => {
                const keys = perms.map((p) => p.key);
                const allChecked = keys.every((k) => permissionKeys.includes(k));
                const someChecked = keys.some((k) => permissionKeys.includes(k));
                return (
                  <div key={resource} className="border border-border-light rounded-lg p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = !allChecked && someChecked;
                        }}
                        onChange={() => toggleModule(keys, allChecked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      {moduleLabel(resource)}
                    </label>
                    <div className="mt-2 ml-6 flex flex-wrap gap-x-5 gap-y-1.5">
                      {perms.map((permission) => (
                        <label key={permission.id} className="flex items-center gap-1.5 text-sm text-text-secondary">
                          <input
                            type="checkbox"
                            checked={permissionKeys.includes(permission.key)}
                            onChange={() => togglePermission(permission.key)}
                            className="w-4 h-4 rounded border-border"
                          />
                          {actionLabel(permission.key)}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create role"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
