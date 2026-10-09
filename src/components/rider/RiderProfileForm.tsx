"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Bike, Car, ChevronRight, Footprints, Send } from "lucide-react";
import FormField from "@/components/dashboard/FormField";
import {
  ChecklistItem,
  dashButton,
  dashField,
  Notice,
  Panel,
  StatusBadge,
} from "@/components/dashboard/kit/ui";
import { DEFAULT_PROVINCE, SA_PROVINCES } from "@/lib/provinces";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOCUMENT_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

type DeliveryMethod = "WALKING" | "BICYCLE" | "SCOOTER" | "MOTORCYCLE" | "CAR";

const METHODS: Array<{ value: DeliveryMethod; label: string; icon: ReactNode }> = [
  { value: "WALKING", label: "On foot", icon: <Footprints /> },
  { value: "BICYCLE", label: "Bicycle", icon: <Bike /> },
  { value: "SCOOTER", label: "Scooter", icon: <Bike /> },
  { value: "MOTORCYCLE", label: "Motorbike", icon: <Bike /> },
  { value: "CAR", label: "Car", icon: <Car /> },
];

type FormState = {
  fullName: string;
  phone: string;
  idNumberLast4: string;
  idDocumentUrl: string;
  profilePhotoUrl: string;
  vehicleType: DeliveryMethod | "";
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
  workingDays: string[];
  startTime: string;
  endTime: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
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

type TextKey = {
  [K in keyof FormState]: FormState[K] extends string ? K : never;
}[keyof FormState];

const INITIAL: FormState = {
  fullName: "",
  phone: "",
  idNumberLast4: "",
  idDocumentUrl: "",
  profilePhotoUrl: "",
  vehicleType: "",
  vehicleRegistration: "",
  vehicleMakeModel: "",
  licenseCode: "",
  licenceDocumentUrl: "",
  licenceExpiry: "",
  vehicleDocumentUrl: "",
  province: DEFAULT_PROVINCE,
  municipality: "",
  township: "",
  sectionArea: "",
  preferredZones: "",
  workingDays: [],
  startTime: "",
  endTime: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankBranchCode: "",
  bankAccountType: "",
  hasSmartphone: false,
  lawfulWorkDeclared: false,
  conductAccepted: false,
  liquorIdCheckAccepted: false,
};

type Readiness = {
  percent: number;
  canSubmit: boolean;
  missing: string[];
  later?: string[];
  checks: Array<{ key: string; label: string; complete: boolean; required?: boolean }>;
};

const STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  DRAFT: { label: "Not sent yet", tone: "neutral" },
  SUBMITTED: { label: "Waiting for approval", tone: "warning" },
  UNDER_REVIEW: { label: "Waiting for approval", tone: "warning" },
  CHANGES_REQUESTED: { label: "Changes needed", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Not approved", tone: "danger" },
  SUSPENDED: { label: "Paused by Lethela", tone: "danger" },
};

const CAN_SEND = ["DRAFT", "CHANGES_REQUESTED", "REJECTED"];

/** Copies saved values over the defaults, skipping empty ones so defaults such as the province stay. */
function formFromProfile(profile: Record<string, unknown>): FormState {
  const next: FormState = { ...INITIAL };
  for (const key of Object.keys(INITIAL) as Array<keyof FormState>) {
    const value = profile[key];
    if (value === null || value === undefined || value === "") continue;
    if (typeof INITIAL[key] === "boolean") {
      (next as Record<string, unknown>)[key] = Boolean(value);
    } else if (typeof INITIAL[key] === "string") {
      (next as Record<string, unknown>)[key] = String(value);
    }
  }
  // Older profiles can hold "Scooter" rather than "SCOOTER", and only a suburb and city.
  const savedMethod = String(profile.vehicleType ?? "").toUpperCase();
  next.vehicleType = METHODS.some((method) => method.value === savedMethod)
    ? (savedMethod as DeliveryMethod)
    : "";
  if (!next.township && typeof profile.suburb === "string") next.township = profile.suburb;
  if (!next.municipality && typeof profile.city === "string") next.municipality = profile.city;
  next.bankAccountNumber = "";
  next.preferredZones = Array.isArray(profile.preferredZones)
    ? profile.preferredZones.join(", ")
    : "";
  next.workingDays = Array.isArray(profile.workingDays)
    ? profile.workingDays.filter((day): day is string => typeof day === "string")
    : [];
  next.licenceExpiry = profile.licenceExpiry ? String(profile.licenceExpiry).slice(0, 10) : "";
  return next;
}

function LaterSection({
  title,
  description,
  done,
  children,
}: {
  title: string;
  description: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5">
        <ChevronRight
          className="dash-summary-chevron h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
        </span>
        {done ? (
          <StatusBadge tone="success">Added</StatusBadge>
        ) : (
          <StatusBadge tone="neutral" dot={false}>
            Optional
          </StatusBadge>
        )}
      </summary>
      <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 sm:p-5">
        {children}
      </div>
    </details>
  );
}

function UploadField({
  label,
  uploaded,
  accept,
  onFile,
}: {
  label: string;
  uploaded: boolean;
  accept: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="grid content-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
      <span className="flex items-center justify-between gap-2 font-medium text-slate-800">
        {label}
        {uploaded ? <StatusBadge tone="success">Uploaded</StatusBadge> : null}
      </span>
      <input
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function Agreement({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg px-1 py-1.5 text-sm text-slate-800">
      <input
        className="mt-0.5 h-4 w-4 shrink-0 accent-lethela-primary"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function RiderProfileForm() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("DRAFT");
  const [reviewReason, setReviewReason] = useState("");
  const [bankLast4, setBankLast4] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const requiresVehicle = ["SCOOTER", "MOTORCYCLE", "CAR"].includes(form.vehicleType);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/riders/profile", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || "Could not load rider profile.");
        setForm(formFromProfile(data.profile || {}));
        setStatus(data.profile?.status || "DRAFT");
        setReviewReason(data.profile?.reviewReason || "");
        setBankLast4(data.profile?.bankAccountLast4 || "");
        setReadiness(data.readiness);
      } catch (loadError) {
        setMessage({
          tone: "error",
          text: loadError instanceof Error ? loadError.message : "Could not load rider profile.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function upload(
    field: "idDocumentUrl" | "profilePhotoUrl" | "licenceDocumentUrl" | "vehicleDocumentUrl",
    file: File,
  ) {
    setMessage({ tone: "success", text: `Uploading ${file.name}…` });
    try {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("kind", field === "profilePhotoUrl" ? "profile" : "document");
      const response = await fetch("/api/upload", { method: "POST", body: payload });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Upload failed.");
      update(field, data.url || data.path);
      setMessage({ tone: "success", text: "Uploaded. Save your profile to keep it." });
    } catch (uploadError) {
      setMessage({
        tone: "error",
        text: uploadError instanceof Error ? uploadError.message : "Upload failed.",
      });
    }
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
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
          vehicleRegistration: requiresVehicle ? form.vehicleRegistration : "",
          vehicleMakeModel: requiresVehicle ? form.vehicleMakeModel : "",
          licenseCode: requiresVehicle ? form.licenseCode : "",
          licenceDocumentUrl: requiresVehicle ? form.licenceDocumentUrl : "",
          vehicleDocumentUrl: requiresVehicle ? form.vehicleDocumentUrl : "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const errors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.fieldErrors || {})) {
          if (Array.isArray(value) && value[0]) errors[key] = String(value[0]);
        }
        setFieldErrors(errors);
        throw new Error(data.error || "Could not save your profile.");
      }
      setReadiness(data.readiness);
      setStatus(data.profile.status);
      setReviewReason(data.profile.reviewReason || "");
      setBankLast4(data.profile.bankAccountLast4 || bankLast4);
      update("bankAccountNumber", "");
      setFieldErrors({});
      setMessage({ tone: "success", text: "Your profile is saved." });
      return data.readiness as Readiness;
    } catch (saveError) {
      setMessage({
        tone: "error",
        text: saveError instanceof Error ? saveError.message : "Could not save your profile.",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function sendForApproval() {
    const saved = await save();
    if (!saved) return;
    if (!saved.canSubmit) {
      setMessage({
        tone: "error",
        text: `Add these first: ${saved.missing.join(", ").toLowerCase()}.`,
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/riders/profile", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not send your profile.");
      setStatus(data.profile.status);
      setReviewReason("");
      setMessage({
        tone: "success",
        text: "Sent to Lethela. We will let you know as soon as you are approved.",
      });
    } catch (submitError) {
      setMessage({
        tone: "error",
        text: submitError instanceof Error ? submitError.message : "Could not send your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1].map((key) => (
          <div key={key} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded-lg bg-slate-100" />
              <div className="h-11 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const text = (key: TextKey, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      className={dashField.input}
      value={form[key]}
      aria-invalid={fieldErrors[key] ? true : undefined}
      onChange={(event) => update(key, event.target.value)}
      {...props}
    />
  );
  const statusInfo = STATUS[status] || STATUS.DRAFT;
  const canSend = CAN_SEND.includes(status);
  const requiredChecks = (readiness?.checks || []).filter((check) => check.required !== false);
  const agreementsDone =
    form.hasSmartphone &&
    form.lawfulWorkDeclared &&
    form.conductAccepted &&
    form.liquorIdCheckAccepted;

  return (
    <form className="space-y-4" onSubmit={(event) => void save(event)}>
      {reviewReason && status !== "APPROVED" ? (
        <Notice tone="warning" title="Message from Lethela">
          {reviewReason}
        </Notice>
      ) : null}

      <Panel
        title={canSend ? "Get approved to deliver" : statusInfo.label}
        description={
          canSend
            ? "Fill in the four steps below and send your profile. Everything else can wait."
            : status === "APPROVED"
              ? "You can go online from the deliveries page."
              : "Lethela is checking your profile. You can still update it."
        }
        action={<StatusBadge tone={statusInfo.tone}>{statusInfo.label}</StatusBadge>}
      >
        <div className="divide-y divide-slate-100">
          {requiredChecks.map((check) => (
            <ChecklistItem key={check.key} done={check.complete} label={check.label} />
          ))}
        </div>
      </Panel>

      <Panel title="1. Your name and phone number">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" required error={fieldErrors.fullName}>
            {text("fullName", { autoComplete: "name" })}
          </FormField>
          <FormField
            label="Phone or WhatsApp number"
            required
            error={fieldErrors.phone}
            hint="Lethela uses this number to reach you about deliveries."
          >
            {text("phone", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
          </FormField>
        </div>
      </Panel>

      <Panel title="2. How you deliver">
        <fieldset>
          <legend className="sr-only">How you deliver</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {METHODS.map((method) => {
              const selected = form.vehicleType === method.value;
              return (
                <label
                  key={method.value}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                    selected
                      ? "border-lethela-primary bg-lethela-primary/[0.06] text-lethela-primary"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicleType"
                    value={method.value}
                    checked={selected}
                    onChange={() => update("vehicleType", method.value)}
                    className="sr-only"
                  />
                  {method.icon}
                  {method.label}
                </label>
              );
            })}
          </div>
          {fieldErrors.vehicleType ? (
            <p className="mt-2 text-xs font-medium text-red-700">Choose how you deliver.</p>
          ) : null}
        </fieldset>
      </Panel>

      <Panel title="3. Area you deliver in">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Township or area" required error={fieldErrors.township}>
            {text("township", { placeholder: "For example Klipfontein View" })}
          </FormField>
          <FormField label="City or town" hint="Optional." error={fieldErrors.municipality}>
            {text("municipality", { placeholder: "For example Midrand" })}
          </FormField>
          <FormField label="Province" required error={fieldErrors.province}>
            <select
              className={dashField.input}
              value={form.province}
              onChange={(event) => update("province", event.target.value)}
            >
              {SA_PROVINCES.includes(form.province as (typeof SA_PROVINCES)[number]) ? null : (
                <option value={form.province}>{form.province}</option>
              )}
              {SA_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </Panel>

      <Panel title="4. Rider agreement">
        <div className="grid gap-1">
          <Agreement
            label="I have a smartphone and mobile data."
            checked={form.hasSmartphone}
            onChange={(value) => update("hasSmartphone", value)}
          />
          <Agreement
            label="I declare that I may lawfully work in South Africa."
            checked={form.lawfulWorkDeclared}
            onChange={(value) => update("lawfulWorkDeclared", value)}
          />
          <Agreement
            label="I accept the delivery conduct agreement."
            checked={form.conductAccepted}
            onChange={(value) => update("conductAccepted", value)}
          />
          <Agreement
            label="I will verify ID and refuse liquor handover when required."
            checked={form.liquorIdCheckAccepted}
            onChange={(value) => update("liquorIdCheckAccepted", value)}
          />
        </div>
        {!agreementsDone ? (
          <p className="mt-2 text-xs text-slate-500">Tick all four to send your profile.</p>
        ) : null}
      </Panel>

      <div className="space-y-3">
        <div className="px-1">
          <h2 className="text-[15px] font-semibold text-slate-900">Add later</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Not needed for approval. You can add them any time.
          </p>
        </div>

        <LaterSection
          title="ID, photo and emergency contact"
          description="Helps Lethela and customers know who is delivering."
          done={Boolean(
            form.idNumberLast4.length === 4 && form.idDocumentUrl && form.profilePhotoUrl,
          )}
        >
          <FormField label="Last 4 digits of your ID number" error={fieldErrors.idNumberLast4}>
            <input
              className={dashField.input}
              inputMode="numeric"
              value={form.idNumberLast4}
              onChange={(event) =>
                update("idNumberLast4", event.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />
          </FormField>
          <div className="hidden sm:block" />
          <UploadField
            label="ID document"
            uploaded={Boolean(form.idDocumentUrl)}
            accept={DOCUMENT_TYPES}
            onFile={(file) => void upload("idDocumentUrl", file)}
          />
          <UploadField
            label="Photo of you"
            uploaded={Boolean(form.profilePhotoUrl)}
            accept="image/jpeg,image/png,image/webp"
            onFile={(file) => void upload("profilePhotoUrl", file)}
          />
          <FormField label="Emergency contact name">{text("emergencyContactName")}</FormField>
          <FormField label="Emergency contact phone">
            {text("emergencyContactPhone", { type: "tel", inputMode: "tel" })}
          </FormField>
        </LaterSection>

        {requiresVehicle ? (
          <LaterSection
            title="Vehicle and licence"
            description="Your registration, licence and vehicle papers."
            done={Boolean(
              form.vehicleRegistration &&
                form.vehicleMakeModel &&
                form.licenseCode &&
                form.licenceDocumentUrl &&
                form.licenceExpiry &&
                form.vehicleDocumentUrl,
            )}
          >
            <FormField label="Registration number">{text("vehicleRegistration")}</FormField>
            <FormField label="Make and model">{text("vehicleMakeModel")}</FormField>
            <FormField label="Driver's licence code">{text("licenseCode")}</FormField>
            <FormField label="Licence expiry date">
              {text("licenceExpiry", { type: "date" })}
            </FormField>
            <UploadField
              label="Driver's licence"
              uploaded={Boolean(form.licenceDocumentUrl)}
              accept={DOCUMENT_TYPES}
              onFile={(file) => void upload("licenceDocumentUrl", file)}
            />
            <UploadField
              label="Vehicle papers"
              uploaded={Boolean(form.vehicleDocumentUrl)}
              accept={DOCUMENT_TYPES}
              onFile={(file) => void upload("vehicleDocumentUrl", file)}
            />
          </LaterSection>
        ) : null}

        <LaterSection
          title="When you can work"
          description="Days, times and the areas you prefer."
          done={Boolean(form.workingDays.length && form.startTime && form.endTime)}
        >
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Days</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const selected = form.workingDays.includes(day);
                return (
                  <label
                    key={day}
                    className={`flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                      selected
                        ? "border-lethela-primary bg-lethela-primary/[0.06] text-lethela-primary"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={(event) =>
                        update(
                          "workingDays",
                          event.target.checked
                            ? [...form.workingDays, day]
                            : form.workingDays.filter((item) => item !== day),
                        )
                      }
                    />
                    {day.slice(0, 3)}
                  </label>
                );
              })}
            </div>
          </div>
          <FormField label="From" error={fieldErrors.startTime}>
            {text("startTime", { type: "time" })}
          </FormField>
          <FormField label="Until" error={fieldErrors.endTime}>
            {text("endTime", { type: "time" })}
          </FormField>
          <FormField label="Section or extension">{text("sectionArea")}</FormField>
          <FormField label="Areas you prefer" hint="Separate with commas.">
            {text("preferredZones")}
          </FormField>
        </LaterSection>

        <LaterSection
          title="Bank account for payouts"
          description="Where Lethela pays your delivery fees and tips."
          done={Boolean(
            form.bankName && form.bankAccountName && (form.bankAccountNumber || bankLast4),
          )}
        >
          <FormField label="Account holder">
            {text("bankAccountName", { autoComplete: "off" })}
          </FormField>
          <FormField label="Bank">{text("bankName", { autoComplete: "off" })}</FormField>
          <FormField
            label="Account number"
            error={fieldErrors.bankAccountNumber}
            hint={
              bankLast4
                ? `Saved account ends in ${bankLast4}. Type a new number only to change it.`
                : undefined
            }
          >
            <input
              className={dashField.input}
              inputMode="numeric"
              autoComplete="off"
              placeholder={bankLast4 ? "Leave empty to keep it" : undefined}
              value={form.bankAccountNumber}
              onChange={(event) =>
                update("bankAccountNumber", event.target.value.replace(/\s/g, ""))
              }
            />
          </FormField>
          <FormField label="Branch code">
            {text("bankBranchCode", { inputMode: "numeric", autoComplete: "off" })}
          </FormField>
          <FormField label="Account type">
            <select
              className={dashField.input}
              value={form.bankAccountType}
              onChange={(event) => update("bankAccountType", event.target.value)}
            >
              <option value="">Choose account type</option>
              {["Savings", "Cheque", "Transmission"].includes(form.bankAccountType) ||
              !form.bankAccountType ? null : (
                <option value={form.bankAccountType}>{form.bankAccountType}</option>
              )}
              <option value="Savings">Savings</option>
              <option value="Cheque">Cheque or current</option>
              <option value="Transmission">Transmission</option>
            </select>
          </FormField>
        </LaterSection>
      </div>

      <div className="sticky bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`min-h-5 text-sm ${
              message?.tone === "error"
                ? "font-medium text-red-700"
                : message
                  ? "text-emerald-700"
                  : "text-slate-500"
            }`}
            role={message?.tone === "error" ? "alert" : "status"}
          >
            {message?.text ||
              (canSend
                ? readiness?.canSubmit
                  ? "Ready to send to Lethela."
                  : "Save as you go. Send when the four steps are done."
                : "Save after making changes.")}
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={`${dashButton.secondary} flex-1`}>
              {saving ? "Saving…" : "Save"}
            </button>
            {canSend ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void sendForApproval()}
                className={`${dashButton.primary} flex-1 whitespace-nowrap`}
              >
                <Send aria-hidden="true" />
                Send to Lethela
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
