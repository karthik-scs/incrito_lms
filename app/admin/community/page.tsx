"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, UserPlus, UserMinus, Users, MessageSquare, ArrowUpRight } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { FileUploadField } from "@/components/ui/FileUploadField";
import { apiJson } from "@/lib/authClient";

type Author = { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: { name: string } };
type Community = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  createdBy: Author;
  _count: { members: number; posts: number };
};
type Member = { communityId: string; userId: string; addedAt: string; user: Author };
type UserOption = { id: string; firstName: string; lastName: string; role: { name: string } };

export default function AdminCommunityPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [membersOpen, setMembersOpen] = useState(false);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [commRes, usersRes] = await Promise.all([
      apiJson<Community[]>("/api/communities"),
      apiJson<UserOption[]>("/api/users"),
    ]);
    if (commRes.ok) setCommunities(commRes.data);
    if (usersRes.ok) setUsers(usersRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function loadMembers(community: Community) {
    setActiveCommunity(community);
    setMembersLoading(true);
    setMembersOpen(true);
    const res = await apiJson<Member[]>(`/api/communities/${community.id}/members`);
    if (res.ok) setMembers(res.data);
    setMembersLoading(false);
  }

  function openCreate() {
    setEditingCommunity(null);
    setName("");
    setDescription("");
    setCoverUrl(null);
    setFormError(null);
    setCreateOpen(true);
  }

  function openEdit(c: Community) {
    setEditingCommunity(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setCoverUrl(c.coverUrl);
    setFormError(null);
    setCreateOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const payload = { name, description: description || undefined, coverUrl: coverUrl || undefined };
    const res = editingCommunity
      ? await apiJson(`/api/communities/${editingCommunity.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await apiJson("/api/communities", { method: "POST", body: JSON.stringify(payload) });
    setSubmitting(false);
    if (!res.ok) { setFormError(res.message); return; }
    setCreateOpen(false);
    await load();
  }

  async function handleDelete(c: Community) {
    if (!window.confirm(`Delete community "${c.name}"? All posts will be removed too.`)) return;
    await apiJson(`/api/communities/${c.id}`, { method: "DELETE" });
    await load();
  }

  async function handleAddMember() {
    if (!activeCommunity || !addUserId) return;
    const res = await apiJson(`/api/communities/${activeCommunity.id}/members`, {
      method: "POST",
      body: JSON.stringify({ userId: addUserId }),
    });
    if (res.ok) {
      setAddUserId("");
      await loadMembers(activeCommunity);
      await load();
    } else {
      window.alert(res.message);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeCommunity) return;
    await apiJson(`/api/communities/${activeCommunity.id}/members/${userId}`, { method: "DELETE" });
    await loadMembers(activeCommunity);
    await load();
  }

  const memberIds = new Set(members.map((m) => m.userId));
  const nonMembers = users.filter((u) => !memberIds.has(u.id));
  const userOptions = nonMembers.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.role.name})` }));

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Community</h1>
          <p className="text-sm text-text-secondary mt-1">Manage premium communities. Members can discuss, share files, and voice notes.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New Community
        </Button>
      </div>

      {loading && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {communities.map((c) => (
          <div key={c.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
            {c.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.coverUrl} alt={c.name} className="w-full h-28 object-cover" />
            ) : (
              <div className="w-full h-28 bg-accent-light flex items-center justify-center">
                <MessageSquare size={28} className="text-accent" />
              </div>
            )}
            <div className="p-4">
              <h2 className="text-base font-semibold text-text-primary">{c.name}</h2>
              {c.description && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{c.description}</p>}
              <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1"><Users size={12} /> {c._count.members} members</span>
                <span className="flex items-center gap-1"><MessageSquare size={12} /> {c._count.posts} posts</span>
              </div>
              <Link
                href={`/community/${c.id}`}
                className="mt-3 flex items-center justify-center gap-1.5 bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:bg-accent-dark transition-colors"
              >
                Open Community <ArrowUpRight size={13} />
              </Link>
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" onClick={() => loadMembers(c)} className="flex-1 py-1.5 text-xs">
                  <Users size={13} /> Members
                </Button>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-text-muted hover:text-accent">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md text-text-muted hover:text-error">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && communities.length === 0 && (
          <p className="sm:col-span-2 lg:col-span-3 text-sm text-text-muted py-12 text-center bg-surface border border-border rounded-2xl">
            No communities yet. Create one to get started.
          </p>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editingCommunity ? "Edit Community" : "New Community"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="mt-1 w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none" />
          </div>
          <FileUploadField
            label="Cover image (optional)"
            endpoint="/api/uploads/community-cover"
            accept="image/png,image/jpeg,image/webp"
            value={coverUrl}
            onUploaded={(url) => setCoverUrl(url)}
          />
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editingCommunity ? "Save changes" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      {/* Members modal */}
      <Modal open={membersOpen} onClose={() => setMembersOpen(false)} title={`Members — ${activeCommunity?.name ?? ""}`} maxWidth="max-w-lg">
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Select value={addUserId} onChange={setAddUserId} options={userOptions} placeholder="Add a user…" />
          </div>
          <Button onClick={handleAddMember} disabled={!addUserId}>
            <UserPlus size={14} /> Add
          </Button>
        </div>

        {membersLoading && <p className="text-sm text-text-muted py-4 text-center">Loading…</p>}

        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 bg-surface-secondary rounded-lg px-3 py-2.5">
              <Avatar name={`${m.user.firstName} ${m.user.lastName}`} avatarUrl={m.user.avatarUrl} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{m.user.firstName} {m.user.lastName}</p>
                <p className="text-xs text-text-muted">{m.user.role.name}</p>
              </div>
              <button onClick={() => handleRemoveMember(m.userId)} className="p-1 rounded-md text-text-muted hover:text-error" aria-label="Remove member">
                <UserMinus size={14} />
              </button>
            </div>
          ))}
          {!membersLoading && members.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No members yet.</p>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
}
