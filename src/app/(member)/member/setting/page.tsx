import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="mt-2 text-muted-foreground">Configure your account and preferences.</p>
    </div>
  );
}
