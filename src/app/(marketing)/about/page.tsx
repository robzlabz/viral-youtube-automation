import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
};

const team = [
  { name: "Sarah Chen", role: "CEO & Co-founder", emoji: "👩‍💼" },
  { name: "Marcus Johnson", role: "CTO & Co-founder", emoji: "👨‍💻" },
  { name: "Emily Rodriguez", role: "Head of Product", emoji: "👩‍🎨" },
  { name: "David Kim", role: "Lead Engineer", emoji: "👨‍🔬" },
];

const stats = [
  { value: "50K+", label: "Active Users" },
  { value: "2M+", label: "Videos Uploaded" },
  { value: "10M+", label: "Hours Saved" },
  { value: "99.9%", label: "Uptime" },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              About YT Automation
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              We started in 2023 with a simple mission: help creators spend less time
              on busywork and more time making great content. Our platform handles the
              technical details so you can focus on what matters — your creative vision.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our Story
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              As YouTube creators ourselves, we know the pain of manual uploads,
              thumbnail creation, and scheduling. We spent countless hours on tasks
              that should have taken minutes.
            </p>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              YT Automation was born from that frustration. We built the tools we
              wished existed — powerful enough for professional creators, simple
              enough for beginners.
            </p>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Today, our platform is used by creators in 120+ countries, from
              solo YouTubers to major media companies. We&apos;re committed to
              making content automation accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Meet the Team
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A small team of creators and engineers passionate about helping you succeed.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
            {team.map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center"
              >
                <span className="text-5xl">{member.emoji}</span>
                <h3 className="mt-4 font-semibold text-foreground">{member.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-muted px-6 py-16 text-center sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to Join Us?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button size="lg" className="h-12 px-8 text-base">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
