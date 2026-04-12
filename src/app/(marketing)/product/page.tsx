import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Product",
};

const steps = [
  {
    step: 1,
    title: "Connect Your Channel",
    description: "Link your YouTube channel with a few clicks. We support all YouTube account types.",
    image: "🔗",
  },
  {
    step: 2,
    title: "Upload Your Content",
    description: "Drag and drop your videos, add titles, descriptions, tags, and thumbnails.",
    image: "📤",
  },
  {
    step: 3,
    title: "Schedule & Automate",
    description: "Set your publishing schedule and let our AI optimize timing for maximum views.",
    image: "📅",
  },
  {
    step: 4,
    title: "Track & Grow",
    description: "Monitor performance with real-time analytics and get insights to improve.",
    image: "📊",
  },
];

const integrations = [
  { name: "YouTube", icon: "▶️", description: "Direct upload and scheduling" },
  { name: "TikTok", icon: "🎵", description: "Auto-repost short-form content" },
  { name: "Instagram", icon: "📸", description: "Reels and IGTV publishing" },
  { name: "Twitter/X", icon: "🐦", description: "Share clips and updates" },
  { name: "Discord", icon: "💬", description: "Notify your community" },
  { name: "Slack", icon: "💼", description: "Team notifications" },
];

export default function ProductPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              How YT Automation Works
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Four simple steps to automate your entire YouTube workflow.
              No more manual uploads or spreadsheet tracking.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center gap-8 lg:flex-row lg:gap-16"
              >
                <div className={`flex-1 ${item.step % 2 === 0 ? "lg:order-2" : ""}`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-lg text-muted-foreground">{item.description}</p>
                </div>
                <div className={`flex h-64 w-full max-w-md items-center justify-center rounded-2xl bg-muted text-6xl lg:h-80 ${item.step % 2 === 0 ? "lg:order-1" : ""}`}>
                  {item.image}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              One Platform, Many Integrations
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Connect with all your favorite tools and platforms
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
            {integrations.map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-md"
              >
                <span className="text-4xl">{item.icon}</span>
                <h3 className="mt-3 font-semibold text-foreground">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
