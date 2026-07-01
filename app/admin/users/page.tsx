"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { apiJson } from "@/lib/authClient";

type Role = { id: string; name: string };
type UserStatus = "ACTIVE" | "SUSPENDED" | "INVITED";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  mobileNumber: string | null;
  status: UserStatus;
  createdAt: string;
  role: Role;
};

const STATUS_VARIANT = {
  ACTIVE: "success",
  SUSPENDED: "error",
  INVITED: "neutral",
} as const;

const ROLE_VARIANT: Record<string, "accent" | "info" | "success" | "neutral" | "warning"> = {
  Admin: "neutral",
  Mentor: "accent",
  Student: "info",
  "Cohort Manager": "success",
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INVITED", label: "Invited" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // --- Create modal ---
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // --- Edit modal ---
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const [usersRes, rolesRes] = await Promise.all([apiJson<User[]>("/api/users"), apiJson<Role[]>("/api/roles")]);

    if (usersRes.ok) setUsers(usersRes.data);
    else setError(usersRes.message);

    if (rolesRes.ok) setRoles(rolesRes.data);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRoleId("");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!roleId) {
      setFormError("Select a role for this user");
      return;
    }

    setSubmitting(true);
    const result = await apiJson<User>("/api/users", {
      method: "POST",
      body: JSON.stringify({ firstName, lastName, email, password, roleId }),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setModalOpen(false);
    await loadAll();
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditEmail(user.email);
    setEditMobile(user.mobileNumber ?? "");
    setEditRoleId(user.role.id);
    setEditStatus(user.status);
    setEditPassword("");
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditSubmitting(true);

    const payload: Record<string, string> = {
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      roleId: editRoleId,
      status: editStatus,
    };
    if (editMobile.trim()) payload.mobileNumber = editMobile.trim();
    if (editPassword.trim()) payload.password = editPassword.trim();

    const result = await apiJson<User>(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setEditSubmitting(false);

    if (!result.ok) {
      setEditError(result.message);
      return;
    }
    setEditOpen(false);
    await loadAll();
  }

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);
  const roleFilterOptions = useMemo(() => roles.map((r) => ({ value: r.name, label: r.name })), [roles]);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) => (!roleFilter || u.role.name === roleFilter) && (!statusFilter || u.status === statusFilter)
      ),
    [users, roleFilter, statusFilter]
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Users</h1>
          <p className="text-sm text-text-secondary mt-1">
            Create students, mentors and cohort managers, then assign them to cohorts.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New User
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="w-44">
          <Select value={roleFilter} onChange={setRoleFilter} options={roleFilterOptions} placeholder="All Roles" />
        </div>
        <div className="w-44">
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Statuses" />
        </div>
        {(roleFilter || statusFilter) && (
          <button
            onClick={() => { setRoleFilter(""); setStatusFilter(""); }}
            className="text-xs text-text-secondary hover:text-accent font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 bg-surface border border-border rounded-2xl">
        <DataTable
          rows={filteredUsers}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          emptyMessage="No users match these filters."
          columns={[
            {
              header: "User",
              cell: (row) => (
                <div className="flex items-center gap-3">
                  <Avatar name={`${row.firstName} ${row.lastName}`} avatarUrl={row.avatarUrl} size={32} />
                  <div>
                    <p className="font-medium">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="text-text-muted text-xs">{row.email}</p>
                  </div>
                </div>
              ),
            },
            {
              header: "Role",
              cell: (row) => <Badge variant={ROLE_VARIANT[row.role.name] ?? "neutral"}>{row.role.name}</Badge>,
            },
            { header: "Status", cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
            {
              header: "Joined",
              cell: (row) => <span className="text-text-secondary">{new Date(row.createdAt).toLocaleDateString()}</span>,
            },
            {
              header: "",
              className: "text-right",
              cell: (row) => (
                <div className="flex items-center justify-end">
                  <button onClick={() => openEdit(row)} aria-label="Edit user" className="text-text-muted hover:text-accent rounded-md p-1.5">
                    <Pencil size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New User">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="user-first-name">
                First name
              </label>
              <input
                id="user-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="user-last-name">
                Last name
              </label>
              <input
                id="user-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="user-email">
              Email
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="user-password">
              Temporary password
            </label>
            <input
              id="user-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 chars, upper/lower/number/symbol"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Role</label>
            <div className="mt-1">
              <Select value={roleId} onChange={setRoleId} options={roleOptions} placeholder="Select role" />
            </div>
          </div>
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">First name</label>
              <input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Last name</label>
              <input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
                className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Mobile number (optional)</label>
            <input
              value={editMobile}
              onChange={(e) => setEditMobile(e.target.value)}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Role</label>
              <div className="mt-1">
                <Select value={editRoleId} onChange={(v) => setEditRoleId(v)} options={roleOptions} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Status</label>
              <div className="mt-1">
                <Select value={editStatus} onChange={(v) => setEditStatus(v as UserStatus)} options={STATUS_OPTIONS} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Reset password (optional)</label>
            <input
              type="text"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            />
          </div>
          {editError && <p className="text-sm text-error">{editError}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
