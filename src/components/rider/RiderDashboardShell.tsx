import type { ReactNode } from "react";
import { LayoutDashboard, LifeBuoy, UserRoundCog } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/kit/DashboardShell";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { PageHeader } from "@/components/dashboard/kit/ui";

type RiderView = "overview" | "profile";

const navigation: DashboardNavItem[] = [
  {
    id: "overview",
    href: "/rider/dashboard",
    label: "Deliveries",
    icon: <LayoutDashboard />,
  },
  {
    id: "profile",
    href: "/rider/dashboard/profile",
    label: "My profile",
    shortLabel: "Profile",
    icon: <UserRoundCog />,
  },
  {
    id: "support",
    href: "/contact",
    label: "Help",
    icon: <LifeBuoy />,
  },
];

export default function RiderDashboardShell({
  activeView,
  riderName,
  riderEmail,
  title,
  description,
  children,
}: {
  activeView: RiderView;
  riderName: string;
  riderEmail?: string | null;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <DashboardShell
      area="Rider"
      workspaceName={riderName}
      workspaceDetail={riderEmail || undefined}
      homeHref="/rider/dashboard"
      nav={navigation}
      activeId={activeView}
      phoneTabs={["overview", "profile", "support"]}
      actions={<NotificationBell />}
    >
      <PageHeader title={title} description={description} />
      {children}
    </DashboardShell>
  );
}
