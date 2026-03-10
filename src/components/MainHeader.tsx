"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import CartButton from "@/components/CartButton";
import CartDrawer from "@/components/CartDrawer";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

export default function MainHeader() {
  return (
    <header className="sticky top-0 z-50 surface-header">
      <div className="container flex h-20 items-center justify-between text-sm text-black">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/lethelalogo.svg"
            alt="Lethela - Siyashesha"
            width={170}
            height={40}
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="hover:underline hover:text-lethela-primary font-medium">
            Home
          </Link>
          <Link href="/vendors/register" className="hover:underline hover:text-lethela-primary font-medium">
            Become a Vendor
          </Link>
          <Link href="/rider" className="hover:underline hover:text-lethela-primary font-medium">
            Rider
          </Link>
          <Link href="/about" className="hover:underline hover:text-lethela-primary font-medium">
            About
          </Link>
          <CartButton />
          <Link href="/signin">
            <Button className="bg-lethela-primary text-white hover:opacity-90">
              Sign In
            </Button>
          </Link>
        </nav>

        <div className="md:hidden flex items-center gap-3">
          <CartButton />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-black/20 text-black hover:bg-black/5"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="bg-lethela-secondary text-white w-[260px] pt-12"
            >
              <nav className="flex flex-col gap-4 text-lg">
                <Link href="/" className="hover:underline">
                  Home
                </Link>
                <Link href="/vendors/register" className="hover:underline">
                  Become a Vendor
                </Link>
                <Link href="/rider" className="hover:underline">
                  Rider
                </Link>
                <Link href="/about" className="hover:underline">
                  About
                </Link>

                <Link href="/signin">
                  <Button className="mt-4 w-full bg-lethela-primary hover:opacity-90">
                    Sign In
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
