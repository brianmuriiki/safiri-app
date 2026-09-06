import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import Button from "../../components/ui/Button";

export default function RolePicker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const updateRole = useAuthStore((s) => s.updateRole);

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    const updated = await updateRole("passenger");
    setLoading(false);
    if (updated) navigate("/", { replace: true });
    else setError("We could not save your role. Please try again.");
  };

  useEffect(() => {
    void handleConfirm();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0a0f1e]">
      <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center mb-6">
        <span className="text-white font-bold text-lg">S</span>
      </div>
      <h1
        className="text-3xl font-bold mb-2 text-center"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        How will you use Safiri?
      </h1>
      <p className="text-[#64748b] mb-10 text-center max-w-sm">
        New accounts are created as passenger accounts. Driver and admin
        accounts are added manually.
      </p>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      <Button size="lg" onClick={handleConfirm} loading={loading}>
        Continue as Passenger
      </Button>
    </div>
  );
}
