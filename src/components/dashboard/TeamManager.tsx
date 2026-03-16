"use client";

import { useEffect, useState } from "react";
import DashCard from "./DashCard";

type TeamMember = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER" | "STAFF";
  joinedAt: string;
  isOwner: boolean;
};

export default function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"MANAGER" | "STAFF">("STAFF");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/team", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load team.");
      }
      setMembers(json.members || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addMember() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          role,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to add team member.");
      }
      setEmail("");
      setName("");
      setRole("STAFF");
      await load();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add team member.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(memberId: string, nextRole: "MANAGER" | "STAFF") {
    setError(null);
    try {
      const response = await fetch(`/api/vendors/team/${encodeURIComponent(memberId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to update role.");
      }
      setMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, role: nextRole } : member))
      );
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update role.");
    }
  }

  async function removeMember(memberId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/vendors/team/${encodeURIComponent(memberId)}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to remove team member.");
      }
      setMembers((current) => current.filter((member) => member.id !== memberId));
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove team member.");
    }
  }

  return (
    <div className="grid gap-4">
      <DashCard title="Team and Permissions">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/70">
            Add managers and staff so store operations are not dependent on one login.
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-lethela-primary hover:text-lethela-primary disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-red-200">{error}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,1fr,180px,120px]">
          <input
            className="rounded bg-white px-3 py-2 text-sm text-black"
            placeholder="Staff email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="rounded bg-white px-3 py-2 text-sm text-black"
            placeholder="Display name (optional)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select
            className="rounded bg-white px-3 py-2 text-sm text-black"
            value={role}
            onChange={(event) => setRole(event.target.value as "MANAGER" | "STAFF")}
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
          </select>
          <button
            type="button"
            onClick={addMember}
            disabled={saving || !email}
            className="rounded bg-lethela-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add member"}
          </button>
        </div>
      </DashCard>

      <DashCard title="Current Access">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-white/55">
              <tr>
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Joined</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-white/10">
                  <td colSpan={5} className="py-6 text-center text-white/60">
                    Loading team...
                  </td>
                </tr>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.id} className="border-t border-white/10">
                    <td className="py-3 pr-4 font-medium text-white/88">
                      {member.name || (member.isOwner ? "Store owner" : "Team member")}
                    </td>
                    <td className="py-3 pr-4 text-white/65">{member.email}</td>
                    <td className="py-3 pr-4">
                      {member.isOwner ? (
                        <span className="inline-flex rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                          OWNER
                        </span>
                      ) : (
                        <select
                          className="rounded bg-white px-3 py-2 text-xs text-black"
                          value={member.role}
                          onChange={(event) =>
                            void updateRole(member.id, event.target.value as "MANAGER" | "STAFF")
                          }
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="MANAGER">MANAGER</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-white/65">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      {member.isOwner ? (
                        <span className="text-xs text-white/50">Protected</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void removeMember(member.id)}
                          className="rounded border border-white/20 px-3 py-2 text-xs transition-colors hover:border-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-white/10">
                  <td colSpan={5} className="py-6 text-center text-white/60">
                    No extra team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashCard>
    </div>
  );
}
