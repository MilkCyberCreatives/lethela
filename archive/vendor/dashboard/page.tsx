// src/app/vendor/dashboard/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";

export default function VendorDashboard() {
  const email = cookies().get("vendor_email")?.value || "vendor@lethela.co.za";
  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">Vendor dashboard</h1>
      <p className="text-white/70 mt-1">Signed in as <span className="text-white">{email}</span></p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/vendor/products" className="card-glass rounded-xl p-5 hover:bg-white/10">
          <h2 className="font-semibold">Products</h2>
          <p className="text-sm text-white/70 mt-1">Add or edit your menu items (incl. alcohol).</p>
        </Link>
        <Link href="/vendor/orders" className="card-glass rounded-xl p-5 hover:bg-white/10">
          <h2 className="font-semibold">Orders</h2>
          <p className="text-sm text-white/70 mt-1">Incoming orders, statuses & history.</p>
        </Link>
        <form action="/api/vendor/logout" method="post" className="card-glass rounded-xl p-5">
          <h2 className="font-semibold">Sign out</h2>
          <button className="mt-3 underline text-sm">Log out</button>
        </form>
      </div>
    </main>
  );
}
