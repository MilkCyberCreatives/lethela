import type { Metadata } from "next";
import MainHeader from "@/components/MainHeader";
import Footer from "@/components/Footer";
import VendorSignInForm from "@/components/auth/VendorSignInForm";

export const metadata: Metadata = {
  title: "Vendor Sign In",
  description: "Sign in to manage your Lethela store, orders, products, operating hours, and specials.",
  alternates: {
    canonical: "/vendors/signin",
  },
};

export default function VendorSignInPage() {
  return (
    <>
      <MainHeader />
      <VendorSignInForm />
      <Footer />
    </>
  );
}
