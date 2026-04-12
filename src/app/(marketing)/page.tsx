import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Home",
};

const features = [
  {
    title: "Auto Upload",
    description: "Schedule and automate your YouTube video uploads with just a few clicks.",
    icon: "📤",
  },
  {
    title: "Thumbnail Generator",
    description: "AI-powered thumbnail generation that increases click-through rates.",
    icon: "🖼️",
  },
  {
    title: "SEO Optimization",
    description: "Automatic tag and description optimization for better discoverability.",
    icon: "🔍",
  },
  {
    title: "Analytics Dashboard",
    description: "Real-time insights into your channel performance and growth.",
    icon: "📊",
  },
  {
    title: "Multi-Platform",
    description: "Publish to YouTube, TikTok, and Instagram simultaneously.",
    icon: "🌐",
  },
  {
    title: "Team Collaboration",
    description: "Invite team members and manage permissions with ease.",
    icon: "👥",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Automate Your{" "}
              <span className="text-primary">YouTube Growth</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              The all-in-one platform to schedule, upload, and optimize your YouTube content.
              Save hours every week while growing your channel faster.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/product">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  See How It Works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need to Grow
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed specifically for YouTube creators who want to scale.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="mb-2 text-3xl">{feature.icon}</div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-20 shadow-xl sm:px-12 sm:py-24">
            <div className="absolute inset-0 -z-10 opacity-20">
              <svg className="h-full w-full" viewBox="0 0 1024 1024" aria-hidden="true">
                <circle cx="512" cy="512" r="512" fill="url(#gradient)" fillOpacity="0.7" />
                <defs>
                  <radialGradient id="gradient">
                    <stop stopColor="#fff" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to Automate Your Content?
              </h2>
              <p className="mt-6 text-lg leading-8 text-primary-foreground/90">
                Join thousands of creators who are saving 10+ hours every week with YT Automation.
              </p>
              <div className="mt-10">
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 text-base"
                  >
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
