import { Sidebar } from "@/app/_components/Sidebar";
import { TopNav } from "@/app/_components/TopNav";
import { DashboardLayoutWrapper, MainContentArea } from "@/app/_components/DashboardLayoutWrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayoutWrapper>
      <Sidebar variant="admin" />
      <TopNav
        title="Admin Dashboard"
        profileName="System Administrator"
        profileSubtitle="InnoTrack Root"
        initials="AD"
        profileHref="/admin/dashboard"
        showNotifications={false}
        variant="admin"
      />
      <MainContentArea>{children}</MainContentArea>
    </DashboardLayoutWrapper>
  );
}
