import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, Phone, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

type Mode = "login" | "register";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const handleLogin = async (formData: LoginForm) => {
    setLoading(true);
    setError("");
    setSuccess("");
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      setError(error.message);
    } else if (authData.user) {
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  const handleRegister = async (data: RegisterForm) => {
    if (data.password !== data.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, phone: data.phone },
      },
    });
    if (error) {
      setError(error.message);
    } else if (signupData.session) {
      navigate("/", { replace: true });
    } else {
      setSuccess("Account created. Check your email to confirm your account, then sign in.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hero */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=900&h=1200&fit=crop&auto=format"
          alt="Nairobi streets"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e]/90 via-[#0a0f1e]/60 to-transparent" />
        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Safiri
            </span>
          </div>
          <div className="mb-12">
            <h1
              className="text-5xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Travel Kenya
              <br />
              <span className="text-[#f97316]">your way.</span>
            </h1>
            <p className="text-[#94a3b8] text-lg max-w-sm">
              Book matatus, buses, taxis and bodabodas across Nairobi and
              beyond. Pay with M-Pesa. Travel with confidence.
            </p>
          </div>
          <div className="flex gap-6">
            {["50K+", "200+", "4.8★"].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-[#f97316]">{stat}</div>
                <div className="text-xs text-[#64748b]">
                  {["Passengers", "Routes", "Rating"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8 lg:p-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Safiri
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-[#64748b] text-sm mb-6">
            {mode === "login"
              ? "Sign in to continue your journey"
              : "Join thousands of Kenyan travellers"}
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-[#1a2235] border border-white/10 rounded-xl py-2.5 text-sm font-medium hover:bg-[#243152] transition-colors mb-4"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-[#64748b]">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-sm text-green-400 mb-4">
              {success}
            </div>
          )}

          {mode === "login" ? (
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="flex flex-col gap-4"
            >
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail size={15} />}
                {...loginForm.register("email", { required: true })}
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<Lock size={15} />}
                  {...loginForm.register("password", { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="self-end text-xs text-[#64748b] hover:text-[#f97316] flex items-center gap-1"
                >
                  {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              <Button type="submit" loading={loading} size="lg">
                Sign In
              </Button>
            </form>
          ) : (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className="flex flex-col gap-4"
            >
              <Input
                label="Full Name"
                placeholder="Jane Wanjiru"
                icon={<User size={15} />}
                {...registerForm.register("full_name", { required: true })}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail size={15} />}
                {...registerForm.register("email", { required: true })}
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+254700000000"
                icon={<Phone size={15} />}
                {...registerForm.register("phone", { required: true })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={15} />}
                {...registerForm.register("password", { required: true })}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock size={15} />}
                {...registerForm.register("confirm_password", {
                  required: true,
                })}
              />
              <Button type="submit" loading={loading} size="lg">
                Create Account
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-[#64748b] mt-5">
            {mode === "login" ? "Don't have an account?" : "Already a member?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setSuccess("");
              }}
              className="text-[#f97316] font-medium hover:underline"
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
