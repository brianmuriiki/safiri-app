import { useState } from "react";
import { Menu, X, Bell } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Sidebar from "./Sidebar";
import BackButton from "./BackButton";

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuthStore();

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-[#0d1424]/95 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <BackButton />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            title="Open menu"
            className="p-2 rounded-xl hover:bg-white/10 text-[#94a3b8] transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#f97316] flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span
            className="text-base font-bold text-[#f0f4ff]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Safiri
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1a2235] flex items-center justify-center text-xs font-bold text-[#f97316]">
          {profile?.full_name?.charAt(0) ?? profile?.email?.charAt(0) ?? "U"}
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
