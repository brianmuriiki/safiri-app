import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";
import { Map } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const home =
    profile?.role === "admin"
      ? "/admin"
      : profile?.role === "driver"
        ? "/driver"
        : "/passenger";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <Map size={72} className="mb-6 text-[#f97316]" />
      <h1
        className="text-5xl font-bold text-[#f0f4ff] mb-3"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        404
      </h1>
      <p className="text-xl text-[#64748b] mb-2">Wrong route!</p>
      <p className="text-sm text-[#64748b] max-w-xs mb-8">
        This road doesn't lead anywhere. Let's get you back on track.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Go Back
        </Button>
        <Button onClick={() => navigate(profile ? home : "/auth")}>
          Go Home
        </Button>
      </div>
    </div>
  );
}
