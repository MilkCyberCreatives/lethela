import { redirect } from "next/navigation";

// The store profile lives in the vendor dashboard's Profile tab, which has the dashboard
// navigation around it. Keep this address working for older links.
export default function VendorProfilePage() {
  redirect("/vendors/dashboard?tab=profile");
}
