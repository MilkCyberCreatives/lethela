"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Copy, Sparkles } from "lucide-react";
import { dashButton, dashField, Panel } from "@/components/dashboard/kit/ui";
import type { BriefAccount } from "@/lib/daily-brief";

type Result = { text: string; provider: string } | { error: string } | null;

async function runTask(body: Record<string, unknown>): Promise<Result> {
  try {
    const res = await fetch("/api/admin/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { error: data.error || "That did not work. Try again." };
    return { text: String(data.text || ""), provider: String(data.provider || "none") };
  } catch {
    return { error: "No connection. Try again." };
  }
}

function ResultBox({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  if ("error" in result) {
    return <p className="mt-3 text-sm text-red-700">{result.error}</p>;
  }
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="whitespace-pre-wrap text-sm text-slate-800">{result.text}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {result.provider === "none"
            ? "Plain template (AI off)"
            : "Written by AI. Check before you use it."}
        </span>
        <button
          type="button"
          className={dashButton.quiet}
          onClick={() => {
            void navigator.clipboard?.writeText(result.text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Tool({
  title,
  description,
  onRun,
  button,
  children,
}: {
  title: string;
  description: string;
  onRun: () => Promise<Result>;
  button: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(await onRun());
    setBusy(false);
  }

  return (
    <Panel title={title} description={description}>
      <form onSubmit={submit} className="grid gap-3">
        {children}
        <div>
          <button type="submit" className={dashButton.primary} disabled={busy}>
            <Sparkles aria-hidden="true" /> {busy ? "Working…" : button}
          </button>
        </div>
      </form>
      <ResultBox result={result} />
    </Panel>
  );
}

export default function AdminAiDesk({
  accounts,
  aiOn,
}: {
  accounts: BriefAccount[];
  aiOn: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [accountKey, setAccountKey] = useState(
    accounts[0] ? `${accounts[0].audience}:${accounts[0].id}` : "",
  );
  const [productName, setProductName] = useState("");
  const [storeType, setStoreType] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<"customers" | "stores" | "riders">("customers");
  const account = accounts.find((item) => `${item.audience}:${item.id}` === accountKey);

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {aiOn ? (
        <Tool
          title="Morning note"
          description="A short AI note on what matters most today, from the numbers above."
          button="Write today's note"
          onRun={() => runTask({ task: "brief-note" })}
        />
      ) : null}

      <Tool
        title="Ask about Lethela"
        description="Ask about orders, stores, riders or requests. The answer uses only today's numbers."
        button="Ask"
        onRun={() => runTask({ task: "ask", question })}
      >
        <label className="grid gap-1">
          <span className={dashField.label}>Your question</span>
          <textarea
            className={dashField.input}
            rows={3}
            maxLength={600}
            required
            minLength={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which stores are closest to taking orders?"
          />
        </label>
      </Tool>

      <Tool
        title="Reminder for an unfinished account"
        description="Drafts a WhatsApp message telling a store or rider what is still missing. Copy it and send it yourself."
        button="Draft message"
        onRun={() =>
          account
            ? runTask({
                task: "account-message",
                audience: account.audience,
                name: account.name,
                missing: account.missing,
              })
            : Promise.resolve({ error: "No unfinished stores or riders right now." })
        }
      >
        {accounts.length ? (
          <label className="grid gap-1">
            <span className={dashField.label}>Store or rider</span>
            <select
              className={dashField.input}
              value={accountKey}
              onChange={(event) => setAccountKey(event.target.value)}
            >
              {accounts.map((item) => (
                <option key={`${item.audience}:${item.id}`} value={`${item.audience}:${item.id}`}>
                  {item.audience === "vendor" ? "Store" : "Rider"}: {item.name} (missing{" "}
                  {item.missing.length}, {item.daysSinceSignup} days)
                </option>
              ))}
            </select>
            {account ? (
              <span className={dashField.hint}>
                Missing: {account.missing.join(", ")}
                {account.hasPhone ? "" : ". No phone number yet."}
              </span>
            ) : null}
          </label>
        ) : (
          <p className="text-sm text-slate-500">Every store and rider profile is complete.</p>
        )}
      </Tool>

      <Tool
        title="Menu item description"
        description="Writes a short description for a store's menu item. Paste it into the store's menu."
        button="Write description"
        onRun={() =>
          runTask({
            task: "product-description",
            name: productName,
            storeType,
            notes: productNotes,
          })
        }
      >
        <label className="grid gap-1">
          <span className={dashField.label}>Item name</span>
          <input
            className={dashField.input}
            required
            minLength={2}
            maxLength={120}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Full house kota"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={dashField.label}>Type of store</span>
            <input
              className={dashField.input}
              maxLength={60}
              value={storeType}
              onChange={(event) => setStoreType(event.target.value)}
              placeholder="Kota shop"
            />
          </label>
          <label className="grid gap-1">
            <span className={dashField.label}>What is in it (optional)</span>
            <input
              className={dashField.input}
              maxLength={300}
              value={productNotes}
              onChange={(event) => setProductNotes(event.target.value)}
              placeholder="Chips, polony, cheese, egg"
            />
          </label>
        </div>
      </Tool>

      <Tool
        title="Facebook caption"
        description="Drafts a short post caption with the right link. No prices, and Lethela is always open."
        button="Draft caption"
        onRun={() => runTask({ task: "social-caption", topic, audience })}
      >
        <label className="grid gap-1">
          <span className={dashField.label}>What the post is about</span>
          <input
            className={dashField.input}
            required
            minLength={3}
            maxLength={300}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Friday kota specials from local stores"
          />
        </label>
        <label className="grid gap-1">
          <span className={dashField.label}>For</span>
          <select
            className={dashField.input}
            value={audience}
            onChange={(event) => setAudience(event.target.value as typeof audience)}
          >
            <option value="customers">Customers</option>
            <option value="stores">Stores</option>
            <option value="riders">Riders</option>
          </select>
        </label>
      </Tool>
    </div>
  );
}
