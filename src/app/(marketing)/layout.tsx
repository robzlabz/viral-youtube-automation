import { Navbar } from "@/components/Navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          © 2025 YT Automation. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
