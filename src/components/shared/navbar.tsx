import Link from "next/link";
import { Code2 } from "lucide-react";
import { NAV_LINKS, SITE } from "@/constants/site";

export function Navbar() {
  return (
    <header className="border-foreground/10 border-b">
      <nav
        className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6"
        aria-label="Principal"
      >
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Code2 className="size-5" aria-hidden />
          {SITE.name}
        </Link>
        <ul className="flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
