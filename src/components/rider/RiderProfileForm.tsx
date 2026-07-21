"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type FormState = {
  fullName: string;
  phone: string;
  idNumberLast4: string;
  idDocumentUrl: string;
  profilePhotoUrl: string;
  vehicleType: "WALKING" | "BICYCLE" | "SCOOTER" | "MOTORCYCLE" | "CAR";
  vehicleRegistration: string;
  vehicleMakeModel: string;
  licenseCode: string;
  licenceDocumentUrl: string;
  licenceExpiry: string;
  vehicleDocumentUrl: string;
  province: string;
  municipality: string;
  township: string;
  sectionArea: string;
  preferredZones: string;
  availableNow: boolean;
  workingDays: string[];
  startTime: string;
  endTime: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankAccountType: string;
  hasSmartphone: boolean;
  lawfulWorkDeclared: boolean;
  conductAccepted: boolean;
  liquorIdCheckAccepted: boolean;
};

const INITIAL: FormState = {
  fullName: "",
  phone: "",
  idNumberLast4: "",
  idDocumentUrl: "",
  profilePhotoUrl: "",
  vehicleType: "WALKING",
  vehicleRegistration: "",
  vehicleMakeModel: "",
  licenseCode: "",
  licenceDocumentUrl: "",
  licenceExpiry: "",
  vehicleDocumentUrl: "",
  province: "Gauteng",
  municipality: "",
  township: "",
  sectionArea: "",
  preferredZones: "",
  availableNow: false,
  workingDays: [],
  startTime: "08:00",
  endTime: "17:00",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankBranchCode: "",
  bankAccountType: "Savings",
  hasSmartphone: false,
  lawfulWorkDeclared: false,
  conductAccepted: false,
  liquorIdCheckAccepted: false,
};

type Readiness = {
  percent: number;
  canSubmit: boolean;
  missing: string[];
  checks: Array<{ key: string; label: string; complete: boolean }>;
};

export default function RiderProfileForm() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("DRAFT");
  const [reviewReason, setReviewReason] = useState("");
  const [bankLast4, setBankLast4] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requiresVehicle = useMemo(
    () => ["SCOOTER", "MOTORCYCLE", "CAR"].includes(form.vehicleType),
    [form.vehicleType],
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/riders/profile", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || "Could not load rider profile.");
        const profile = data.profile;
        setForm((current) => ({
          ...current,
          ...profile,
          bankAccountNumber: "",
          preferredZones: Array.isArray(profile.preferredZones)
            ? profile.preferredZones.join(", ")
            : "",
          workingDays: Array.isArray(profile.workingDays) ? profile.workingDays : [],
          licenceExpiry: profile.licenceExpiry ? String(profile.licenceExpiry).slice(0, 10) : "",
        }));
        setStatus(profile.status || "DRAFT");
        setReviewReason(profile.reviewReason || "");
        setBankLast4(profile.bankAccountLast4 || "");
        setReadiness(data.readiness);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load rider profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(
    field: keyof Pick<
      FormState,
      "idDocumentUrl" | "profilePhotoUrl" | "licenceDocumentUrl" | "vehicleDocumentUrl"
    >,
    file: File,
  ) {
    setMessage(`Uploading ${file.name}...`);
    const payload = new FormData();
    payload.set("file", file);
    payload.set("kind", field === "profilePhotoUrl" ? "profile" : "document");
    const response = await fetch("/api/upload", { method: "POST", body: payload });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed.");
    update(field, data.url || data.path);
    setMessage("Secure upload complete. Save your profile to keep it.");
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/riders/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          preferredZones: form.preferredZones
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          licenceExpiry: form.licenceExpiry
            ? new Date(`${form.licenceExpiry}T00:00:00.000Z`).toISOString()
            : null,
          vehicleRegistration: requiresVehicle ? form.vehicleRegistration : null,
          vehicleMakeModel: requiresVehicle ? form.vehicleMakeModel : null,
          licenseCode: requiresVehicle ? form.licenseCode : null,
          licenceDocumentUrl: requiresVehicle ? form.licenceDocumentUrl : null,
          vehicleDocumentUrl: requiresVehicle ? form.vehicleDocumentUrl : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save rider profile.");
      setReadiness(data.readiness);
      setStatus(data.profile.status);
      setBankLast4(data.profile.bankAccountLast4 || bankLast4);
      update("bankAccountNumber", "");
      setMessage("Rider profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save rider profile.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForApproval() {
    await save();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/riders/profile", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Could not submit rider profile.");
      setStatus(data.profile.status);
      setMessage(data.message);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not submit rider profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        Loading rider profile...
      </div>
    );

  return (
    <form className="space-y-5" onSubmit={save}>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-white/55">Profile setup</p>
          <h1 className="mt-1 text-2xl font-semibold">Rider profile</h1>
          <p className="mt-2 text-sm text-white/65">
            Status: {status.replaceAll("_", " ")} · {readiness?.percent || 0}% complete
          </p>
        </div>
        <Button asChild variant="outline" className="border-white/20 text-white">
          <Link href="/rider/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      {reviewReason ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50"
        >
          <strong>Changes requested:</strong> {reviewReason}
        </div>
      ) : null}
      {readiness?.missing?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Still required: {readiness.missing.join(", ")}
        </div>
      ) : null}

      <Section title="1. Personal details">
        <InputField
          label="Full name"
          value={form.fullName}
          onChange={(value) => update("fullName", value)}
        />
        <InputField
          label="Mobile number"
          value={form.phone}
          onChange={(value) => update("phone", value)}
          type="tel"
        />
        <InputField
          label="Identity number (last 4 digits only)"
          value={form.idNumberLast4}
          onChange={(value) => update("idNumberLast4", value.replace(/\D/g, "").slice(0, 4))}
        />
        <UploadField
          label="ID document"
          value={form.idDocumentUrl}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onFile={(file) => upload("idDocumentUrl", file)}
        />
        <UploadField
          label="Profile photo"
          value={form.profilePhotoUrl}
          accept="image/jpeg,image/png,image/webp"
          onFile={(file) => upload("profilePhotoUrl", file)}
        />
      </Section>

      <Section title="2. Delivery method">
        <label className="grid gap-1.5 text-sm">
          <span>Delivery method</span>
          <select
            className="h-10 rounded-md border border-white/20 bg-[#080B27] px-3"
            value={form.vehicleType}
            onChange={(event) =>
              update("vehicleType", event.target.value as FormState["vehicleType"])
            }
          >
            <option value="WALKING">Walking</option>
            <option value="BICYCLE">Bicycle</option>
            <option value="SCOOTER">Scooter</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="CAR">Car</option>
          </select>
        </label>
      </Section>

      {requiresVehicle ? (
        <Section title="3. Vehicle details">
          <InputField
            label="Registration number"
            value={form.vehicleRegistration}
            onChange={(value) => update("vehicleRegistration", value)}
          />
          <InputField
            label="Vehicle make and model"
            value={form.vehicleMakeModel}
            onChange={(value) => update("vehicleMakeModel", value)}
          />
          <InputField
            label="Driver's licence code"
            value={form.licenseCode}
            onChange={(value) => update("licenseCode", value)}
          />
          <InputField
            label="Licence expiry"
            type="date"
            value={form.licenceExpiry}
            onChange={(value) => update("licenceExpiry", value)}
          />
          <UploadField
            label="Driver's licence"
            value={form.licenceDocumentUrl}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onFile={(file) => upload("licenceDocumentUrl", file)}
          />
          <UploadField
            label="Vehicle documentation"
            value={form.vehicleDocumentUrl}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onFile={(file) => upload("vehicleDocumentUrl", file)}
          />
        </Section>
      ) : null}

      <Section title="4. Service area">
        <InputField
          label="Province"
          value={form.province}
          onChange={(value) => update("province", value)}
        />
        <InputField
          label="Municipality or city"
          value={form.municipality}
          onChange={(value) => update("municipality", value)}
        />
        <InputField
          label="Township"
          value={form.township}
          onChange={(value) => update("township", value)}
        />
        <InputField
          label="Section or area"
          value={form.sectionArea}
          onChange={(value) => update("sectionArea", value)}
        />
        <InputField
          label="Preferred delivery zones (comma separated)"
          value={form.preferredZones}
          onChange={(value) => update("preferredZones", value)}
        />
      </Section>

      <Section title="5. Availability">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.availableNow}
            onChange={(event) => update("availableNow", event.target.checked)}
          />{" "}
          Available now
        </label>
        <div className="sm:col-span-2">
          <span className="text-sm">Working days</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day}
                className="flex items-center gap-2 rounded border border-white/15 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.workingDays.includes(day)}
                  onChange={(event) =>
                    update(
                      "workingDays",
                      event.target.checked
                        ? [...form.workingDays, day]
                        : form.workingDays.filter((item) => item !== day),
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
        </div>
        <InputField
          label="Start time"
          type="time"
          value={form.startTime}
          onChange={(value) => update("startTime", value)}
        />
        <InputField
          label="End time"
          type="time"
          value={form.endTime}
          onChange={(value) => update("endTime", value)}
        />
      </Section>

      <Section title="6. Banking and payouts">
        <InputField
          label="Account holder"
          value={form.bankAccountName}
          onChange={(value) => update("bankAccountName", value)}
        />
        <InputField
          label="Bank"
          value={form.bankName}
          onChange={(value) => update("bankName", value)}
        />
        <InputField
          label={bankLast4 ? `New account number (current ends ${bankLast4})` : "Account number"}
          value={form.bankAccountNumber}
          onChange={(value) => update("bankAccountNumber", value.replace(/\s/g, ""))}
        />
        <InputField
          label="Branch code"
          value={form.bankBranchCode}
          onChange={(value) => update("bankBranchCode", value)}
        />
        <InputField
          label="Account type"
          value={form.bankAccountType}
          onChange={(value) => update("bankAccountType", value)}
        />
      </Section>

      <Section title="7. Safety and declarations">
        <Check
          label="I have a smartphone and mobile data"
          checked={form.hasSmartphone}
          onChange={(value) => update("hasSmartphone", value)}
        />
        <Check
          label="I declare that I may lawfully work in South Africa"
          checked={form.lawfulWorkDeclared}
          onChange={(value) => update("lawfulWorkDeclared", value)}
        />
        <Check
          label="I accept the delivery conduct agreement"
          checked={form.conductAccepted}
          onChange={(value) => update("conductAccepted", value)}
        />
        <Check
          label="I will verify ID and refuse liquor handover when required"
          checked={form.liquorIdCheckAccepted}
          onChange={(value) => update("liquorIdCheckAccepted", value)}
        />
      </Section>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100"
        >
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 rounded-xl border border-white/10 bg-[#080B27] p-4">
        <Button type="submit" className="bg-white text-black" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
        <Button
          type="button"
          className="bg-lethela-primary text-white"
          disabled={
            saving ||
            !readiness?.canSubmit ||
            !["DRAFT", "CHANGES_REQUESTED", "REJECTED"].includes(status)
          }
          onClick={() => void submitForApproval()}
        >
          Submit for approval
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span>{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-white/20 bg-[#080B27] text-white"
      />
    </label>
  );
}
function UploadField({
  label,
  value,
  accept,
  onFile,
}: {
  label: string;
  value: string;
  accept: string;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        className="rounded border border-white/20 p-2"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      <span className="text-xs text-white/50">
        {value ? "Uploaded securely" : "Required before submission"}
      </span>
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        className="mt-1"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
