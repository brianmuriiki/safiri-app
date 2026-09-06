import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuthStore } from "./store/authStore";
import { ToastContainer } from "./components/ui/Toast";

// Auth
import AuthPage from "./features/auth/AuthPage";
import RolePicker from "./features/auth/RolePicker";
import LandingPage from "./features/auth/LandingPage";

// Layout
import AppShell from "./components/layout/AppShell";

// Passenger
import PassengerHome from "./features/passenger/PassengerHome";
import RoutesPage from "./features/passenger/RoutesPage";
import VehiclesPage from "./features/passenger/VehiclesPage";
import BookingPage from "./features/passenger/BookingPage";
import MyTripsPage from "./features/passenger/MyTripsPage";
import ComplaintsPage from "./features/passenger/ComplaintsPage";
import ActivitiesPage from "./features/passenger/ActivitiesPage";

// Driver
import DriverDashboard from "./features/driver/DriverDashboard";
import DriverSchedule from "./features/driver/DriverSchedule";
import DriverPassengers from "./features/driver/DriverPassengers";
import DriverComplaints from "./features/driver/DriverComplaints";
import DriverQRScanner from "./features/driver/DriverQRScanner";

// Admin
import AdminAnalytics from "./features/admin/AdminAnalytics";
import AdminUsers from "./features/admin/AdminUsers";
import AdminVehicles from "./features/admin/AdminVehicles";
import AdminRoutes from "./features/admin/AdminRoutes";
import AdminSchedules from "./features/admin/AdminSchedules";
import AdminComplaints from "./features/admin/AdminComplaints";
import AdminActivities from "./features/admin/AdminActivities";
import AdminBookings from "./features/admin/AdminBookings";

// Shared
import ProfilePage from "./features/profile/ProfilePage";
import NotFound from "./features/NotFound";

function AuthGuard() {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#f97316] flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white font-bold text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
                S
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#22c55e] rounded-full border-2 border-[#0a0f1e] animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-[#f0f4ff] font-semibold">Safiri</p>
            <p className="text-[#64748b] text-xs mt-0.5">Loading your journey…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/landing" replace />;
  if (!profile) return <Navigate to="/role" replace />;
  if (profile.banned_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#f0f4ff] mb-2">Account suspended</h1>
          <p className="text-[#94a3b8] mb-6">
            This account is currently suspended. Please contact support for help.
          </p>
          <button
            type="button"
            onClick={() => useAuthStore.getState().signOut()}
            className="px-5 py-2.5 rounded-xl bg-[#f97316] text-white font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

function RoleGuard({ allow }: { allow: string[] }) {
  const { profile } = useAuthStore();
  if (!profile || !allow.includes(profile.role))
    return <Navigate to="/" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { profile } = useAuthStore();
  if (profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (profile?.role === "driver") return <Navigate to="/driver" replace />;
  return <Navigate to="/passenger" replace />;
}

export default function App() {
  const { setUser, fetchProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      setUser(user);
      if (user) await fetchProfile(user.id);
      useAuthStore.setState({ loading: false, initialized: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        useAuthStore.setState({ loading: true });
        await fetchProfile(user.id);
      } else {
        useAuthStore.setState({ profile: null, loading: false });
      }
      useAuthStore.setState({ initialized: true });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/role" element={<RolePicker />} />

        {/* Protected */}
        <Route element={<AuthGuard />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Passenger */}
          <Route element={<RoleGuard allow={["passenger"]} />}>
            <Route element={<AppShell />}>
              <Route path="/passenger" element={<PassengerHome />} />
              <Route path="/passenger/routes" element={<RoutesPage />} />
              <Route path="/passenger/vehicles" element={<VehiclesPage />} />
              <Route path="/passenger/activities" element={<ActivitiesPage />} />
              <Route path="/passenger/book/:scheduleId" element={<BookingPage />} />
              <Route path="/passenger/bookings" element={<MyTripsPage />} />
              <Route path="/passenger/complaints" element={<ComplaintsPage />} />
            </Route>
          </Route>

          {/* Driver */}
          <Route element={<RoleGuard allow={["driver"]} />}>
            <Route element={<AppShell />}>
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/schedule" element={<DriverSchedule />} />
              <Route path="/driver/passengers" element={<DriverPassengers />} />
              <Route path="/driver/scan" element={<DriverQRScanner />} />
              <Route path="/driver/complaints" element={<DriverComplaints />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<RoleGuard allow={["admin"]} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminAnalytics />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/vehicles" element={<AdminVehicles />} />
              <Route path="/admin/routes" element={<AdminRoutes />} />
              <Route path="/admin/schedules" element={<AdminSchedules />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/complaints" element={<AdminComplaints />} />
              <Route path="/admin/activities" element={<AdminActivities />} />
            </Route>
          </Route>

          {/* Shared profile — available to all roles */}
          <Route element={<AppShell />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}
