import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (["/passenger", "/driver", "/admin"].includes(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    const home = location.pathname.startsWith("/admin")
      ? "/admin"
      : location.pathname.startsWith("/driver")
        ? "/driver"
        : "/passenger";
    navigate(home, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
      className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[#94a3b8] hover:text-[#f0f4ff] hover:bg-white/10 transition-colors"
    >
      <ArrowLeft size={18} />
    </button>
  );
}