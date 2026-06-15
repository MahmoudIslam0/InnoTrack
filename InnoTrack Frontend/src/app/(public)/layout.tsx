import { Sidebar } from "../_components/Sidebar";
import { TopNav } from "../_components/TopNav";
import { DashboardLayoutWrapper, MainContentArea } from "../_components/DashboardLayoutWrapper";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayoutWrapper>
      <Sidebar />
      <TopNav showNotifications />
      <MainContentArea>{children}</MainContentArea>
    </DashboardLayoutWrapper>
  );
}
