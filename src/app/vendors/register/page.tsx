import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  ShieldCheck,
  Store,
  Truck,
  WalletCards,
} from "lucide-react";
import Footer from "@/components/Footer";
import MainHeader from "@/components/MainHeader";
import VendorSignupForm from "@/components/VendorSignupForm";
import { Button } from "@/components/ui/button";
import { getOrderWhatsAppPhone } from "@/lib/whatsapp-order";

export const metadata: Metadata = {
  title: "Become a Township Vendor | Sell on Lethela",
  description:
    "Become a township vendor on Lethela. Spaza shops, grocery sellers, kota businesses, restaurants and established food outlets can sell online in South Africa.",
  alternates: {
    canonical: "/vendors/register",
  },
};

const STEPS = [
  {
    title: "Create profile",
    text: "Start with only your full name, email address, store name and password.",
  },
  {
    title: "Complete dashboard checklist",
    text: "Add store type, township, address, trading hours, delivery radius, products, banking and documents.",
  },
  {
    title: "Submit for approval",
    text: "Lethela reviews complete profiles before stores appear publicly.",
  },
  {
    title: "Start selling",
    text: "Approved vendors can manage products, receive orders and serve customers nearby.",
  },
];

const CHECKLIST = [
  "First step only needs your full name, email, store name and password",
  "Dashboard checklist covers township, province, address and delivery radius",
  "Choose your store type: spaza, grocery, local food, restaurant or franchise",
  "Upload products or menu items when you are ready",
  "Banking and owner documents are completed before approval",
  "API-ready setup supports larger brands and future integrations",
];

const DASHBOARD_MODULES = [
  { title: "Orders", text: "Accept and update customer orders from your dashboard.", icon: Truck },
  { title: "Menu", text: "Add products, prices, stock status and menu sections.", icon: Store },
  { title: "Payouts", text: "Keep track of settlements and delivery fees.", icon: WalletCards },
  {
    title: "Documents",
    text: "Keep owner and business documents ready for review.",
    icon: FileCheck2,
  },
];

const READINESS = [
  { label: "Admin approval", value: "Required", icon: ShieldCheck },
  { label: "Profile setup", value: "Under 1 min", icon: Clock },
  { label: "Vendor account", value: "Included", icon: Store },
];

export default function VendorRegisterPage() {
  const whatsappHref = `https://wa.me/${getOrderWhatsAppPhone()}`;
  return (
    <main className="min-h-screen bg-lethela-secondary text-white">
      <MainHeader />

      <section className="border-b border-white/10 bg-[#080B27]">
        <div className="container grid gap-8 py-10 lg:grid-cols-[1.15fr,0.85fr] lg:py-14">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-lethela-primary">
              Vendor onboarding
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
              Sell to customers in your township.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
              Whether you run a spaza shop, kota business, grocery store, home kitchen, restaurant
              or established food outlet, Lethela helps you sell to customers in your township and
              manage orders online. We are starting in Klipfontein View before expanding to more
              townships across South Africa.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-lethela-primary text-white hover:opacity-90">
                <a href="#vendor-application">Start application</a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:border-lethela-primary hover:text-lethela-primary"
              >
                <Link href="/vendors/signin">Vendor sign in</Link>
              </Button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {READINESS.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
                  >
                    <Icon className="h-5 w-5 text-lethela-primary" />
                    <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/50">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-[#0C1132] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">
              Before you apply
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-white/76">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lethela-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-white/60">
              Need help preparing documents or onboarding? WhatsApp support:{" "}
              <a className="underline" href={whatsappHref} target="_blank" rel="noreferrer">
                +27 72 390 8919
              </a>
            </p>
            <p className="mt-2 text-xs text-white/60">
              Already have a vendor account?{" "}
              <Link className="underline" href="/vendors/signin">
                Sign in here
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#090D2C]">
        <div className="container py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">After approval</p>
              <h2 className="mt-2 text-2xl font-semibold">Manage your store from one place</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/62">
              Approved vendors can update products, manage orders, set trading hours and keep store
              information up to date.
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <article
                key={step.title}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs font-semibold text-lethela-primary">Step {index + 1}</p>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{step.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-semibold">Dashboard checklist after registration</h3>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Store type, province, municipality or city, township, section or area, store address
              or pin location, trading hours, delivery radius, products or menu, banking details,
              owner documents and Submit for approval.
            </p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {DASHBOARD_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <article
                  key={module.title}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                >
                  <Icon className="h-5 w-5 text-lethela-primary" />
                  <h3 className="mt-3 font-semibold">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/62">{module.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#080B27]">
        <div className="container py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                Vendor commercial terms
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Pricing details unlock after approval</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "Approved vendors can sign in to view the current pricing structure.",
              "Lethela confirms commercial terms before a store starts taking orders.",
              "Alcohol and regulated products require the correct vendor permissions before listing.",
            ].map((item) => (
              <article
                key={item}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <CheckCircle2 className="h-5 w-5 text-lethela-primary" />
                <p className="mt-3 text-sm leading-6 text-white/76">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="vendor-application" className="surface-section">
        <div className="container py-10">
          <VendorSignupForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
