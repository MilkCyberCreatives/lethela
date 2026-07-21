import { redirect } from "next/navigation";

export default function VendorSignInPage() {
  redirect("/signin?callbackUrl=/vendors/dashboard");
}
