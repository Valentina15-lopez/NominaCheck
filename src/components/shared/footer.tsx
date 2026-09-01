import { SITE } from "@/constants/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-foreground/10 border-t">
      <div className="text-foreground/60 mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-sm">
        <p>
          © {year} {SITE.name}
        </p>
        <p>Construido con Next.js</p>
      </div>
    </footer>
  );
}
