import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BackButton from "./BackButton";

export default function AppShell() {
  return (
    <div className="flex h-full bg-[#0a0f1e]">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <TopBar />
        <div className="hidden lg:flex items-center h-14 px-6 bg-[#0d1424] border-b border-white/8">
          <BackButton />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
