import { MemberSidebar } from "@/components/MemberSidebar";
import { MemberHeader } from "@/components/MemberHeader";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <MemberSidebar />
      <div className="flex flex-1 flex-col">
        <MemberHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
