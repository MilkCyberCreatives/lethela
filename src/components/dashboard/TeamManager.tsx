"use client";

import { useEffect, useState } from "react";
import { RefreshCw, UserPlus, UsersRound } from "lucide-react";
import DashCard from "./DashCard";
import FormField from "./FormField";
import {
  EmptyState,
  Notice,
  Panel,
  StatusBadge,
  dashButton,
  dashField,
} from "@/components/dashboard/kit/ui";
import { cn } from "@/lib/utils";

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
        current.map((member) => (member.id === memberId ? { ...member, role: nextRole } : member)),
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
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to remove team member.",
      );
    }
  }

  const firstLoad = loading && members.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {firstLoad
            ? "Loading your team…"
            : members.length === 0
              ? "Your team"
              : `${members.length} ${members.length === 1 ? "person" : "people"} with access`}
        </p>
        <button type="button" onClick={load} disabled={loading} className={dashButton.secondary}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <DashCard title="Add a person">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_auto] lg:items-end">
          <FormField label="Email address">
            <input
              className={dashField.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          <FormField label="Name (optional)">
            <input
              className={dashField.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <FormField label="Role">
            <select
              className={dashField.input}
              value={role}
              onChange={(event) => setRole(event.target.value as "MANAGER" | "STAFF")}
            >
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
            </select>
          </FormField>
          <button
            type="button"
            onClick={addMember}
            disabled={saving || !email}
            className={cn(dashButton.primary, "min-h-11 self-end")}
          >
            <UserPlus aria-hidden="true" />
            {saving ? "Adding…" : "Add person"}
          </button>
        </div>
      </DashCard>

      <Panel title="People with access" padded={!firstLoad && members.length === 0}>
        {firstLoad ? (
          <div className="divide-y divide-slate-100" aria-hidden="true">
            {[0, 1].map((row) => (
              <div key={row} className="flex animate-pulse items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length > 0 ? (
          <ul
            className={cn(
              "divide-y divide-slate-100 transition-opacity",
              loading ? "opacity-60" : "",
            )}
          >
            {members.map((member) => {
              const displayName = member.name || (member.isOwner ? "Store owner" : "Team member");
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5"
                >
                  <div className="flex min-w-[12rem] flex-1 items-center gap-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold uppercase text-slate-600"
                      aria-hidden="true"
                    >
                      {(member.name || member.email).trim().charAt(0) || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{member.email}</p>
                      <p className="text-xs text-slate-500">
                        Joined{" "}
                        {new Date(member.joinedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2 pl-12 sm:w-auto sm:pl-0">
                    {member.isOwner ? (
                      <>
                        <StatusBadge tone="neutral">Owner</StatusBadge>
                        <span className="text-xs text-slate-500">Can&apos;t be removed</span>
                      </>
                    ) : (
                      <>
                        <select
                          className={cn(dashField.input, "min-h-10 w-auto flex-1 sm:flex-none")}
                          value={member.role}
                          aria-label={`Role for ${displayName}`}
                          onChange={(event) =>
                            void updateRole(member.id, event.target.value as "MANAGER" | "STAFF")
                          }
                        >
                          <option value="STAFF">Staff</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void removeMember(member.id)}
                          className={dashButton.danger}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={<UsersRound />}
            title="No one else yet"
            text="People you add show here."
          />
        )}
      </Panel>
    </div>
  );
}
