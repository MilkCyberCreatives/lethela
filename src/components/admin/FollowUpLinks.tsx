import { Mail, MessageSquare } from "lucide-react";
import { dashButton } from "@/components/dashboard/kit/ui";
import { followUpLinks, type FollowUpKind } from "@/lib/follow-up";

// Opens the admin's own WhatsApp or email app with a reminder listing what is still missing.
export default function FollowUpLinks({
  kind,
  name,
  phone,
  email,
  missing,
}: {
  kind: FollowUpKind;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  missing: string[];
}) {
  const links = followUpLinks({ kind, name, phone, email, missing });
  if (!links.whatsapp && !links.email) return null;

  return (
    <div className="mx-4 mt-2 flex flex-wrap items-center gap-2 sm:mx-5">
      <span className="text-xs text-slate-500">Remind them yourself:</span>
      {links.whatsapp ? (
        <a className={dashButton.secondary} href={links.whatsapp} target="_blank" rel="noreferrer">
          <MessageSquare aria-hidden="true" />
          WhatsApp reminder
        </a>
      ) : null}
      {links.email ? (
        <a className={dashButton.quiet} href={links.email}>
          <Mail aria-hidden="true" />
          Email reminder
        </a>
      ) : null}
    </div>
  );
}
