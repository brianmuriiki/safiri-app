import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Map,
  Bus,
  Ticket,
  MessageSquare,
  LogOut,
  User,
  Shield,
  BarChart3,
  Users,
  Route,
  Settings,
  Activity,
  ScanLine,
  Calendar,
  Bell,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface SidebarProps {
  onNavigate?: () => void;
}

const passengerNav: NavItem[] = [
  { to: "/passenger", icon: <Home size={18} />, label: "Home" },
  { to: "/passenger/routes", icon: <Map size={18} />, label: "Routes" },
  { to: "/passenger/vehicles", icon: <Bus size={18} />, label: "Vehicles" },
  { to: "/passenger/activities", icon: <Activity size={18} />, label: "Activities" },
  { to: "/passenger/bookings", icon: <Ticket size={18} />, label: "My Trips" },
  { to: "/passenger/complaints", icon: <MessageSquare size={18} />, label: "Complaints" },
  { to: "/passenger/notifications", icon: <Bell size={18} />, label: "Notifications" },
  { to: "/profile", icon: <User size={18} />, label: "Profile" },
];

const driverNav: NavItem[] = [
  { to: "/driver", icon: <Home size={18} />, label: "Dashboard" },
  { to: "/driver/schedule", icon: <Calendar size={18} />, label: "Schedule" },
  { to: "/driver/passengers", icon: <Users size={18} />, label: "Passengers" },
  { to: "/driver/scan", icon: <ScanLine size={18} />, label: "Scan Ticket" },
  { to: "/driver/complaints", icon: <MessageSquare size={18} />, label: "Complaints" },
  { to: "/driver/notifications", icon: <Bell size={18} />, label: "Notifications" },
  { to: "/profile", icon: <User size={18} />, label: "Profile" },
];

const adminNav: NavItem[] = [
  { to: "/admin", icon: <BarChart3 size={18} />, label: "Analytics" },
  { to: "/admin/users", icon: <Users size={18} />, label: "Users" },
  { to: "/admin/vehicles", icon: <Bus size={18} />, label: "Vehicles" },
  { to: "/admin/routes", icon: <Route size={18} />, label: "Routes" },
  { to: "/admin/schedules", icon: <Settings size={18} />, label: "Schedules" },
  { to: "/admin/bookings", icon: <Ticket size={18} />, label: "Bookings" },
  { to: "/admin/complaints", icon: <MessageSquare size={18} />, label: "Complaints" },
  { to: "/admin/activities", icon: <Activity size={18} />, label: "Activities" },
  { to: "/admin/notifications", icon: <Bell size={18} />, label: "Notifications" },
  { to: "/profile", icon: <User size={18} />, label: "Profile" },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const nav =
    profile?.role === "admin"
      ? adminNav
      : profile?.role === "driver"
        ? driverNav
        : passengerNav;

  const roleColors = { passenger: "#f97316", driver: "#22c55e", admin: "#8b5cf6" };
  const roleIcons = {
    passenger: <User size={14} />,
    driver: <Bus size={14} />,
    admin: <Shield size={14} />,
  };
  const roleLabels = { passenger: "Passenger", driver: "Driver", admin: "Admin" };

  const accentColor = roleColors[profile?.role ?? "passenger"];

  return (
    <aside className="w-60 h-full flex flex-col bg-[#0d1424] border-r border-white/8">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: accentColor }}
        >
          S
        </div>
        <span
          className="text-lg font-bold text-[#f0f4ff]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Safiri
        </span>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3 border-b border-white/8">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ color: accentColor, backgroundColor: `${accentColor}20` }}
        >
          {roleIcons[profile?.role ?? "passenger"]}
          {roleLabels[profile?.role ?? "passenger"]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end={["passenger", "/driver", "/admin"].some(
              (p) => item.to === `/${p}` || item.to === "/profile"
            )}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-[#f0f4ff]"
                  : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/5"
              }`
            }
            style={({ isActive }) => (isActive ? { color: accentColor } : {})}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {profile?.full_name?.charAt(0) ?? profile?.email?.charAt(0) ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#f0f4ff] truncate">
              {profile?.full_name ?? "Traveller"}
            </div>
            <div className="text-xs text-[#64748b] truncate">{profile?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="w-full flex items-center gap-2 text-xs text-[#64748b] hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
