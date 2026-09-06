import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { toast } from "../../components/ui/Toast";
import { User, Phone, Mail, Lock, Shield } from "lucide-react";

interface ProfileForm {
  full_name: string;
  phone: string;
}

interface PasswordForm {
  password: string;
  confirm: string;
}

const roleColors = { passenger: "#f97316", driver: "#22c55e", admin: "#8b5cf6" };
const roleLabels = { passenger: "Passenger", driver: "Driver", admin: "Admin" };

export default function ProfilePage() {
  const { profile, fetchProfile, user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
    },
  });

  const pwForm = useForm<PasswordForm>();

  const saveProfile = async (data: ProfileForm) => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone })
      .eq("id", profile.id);
    if (error) toast.error("Failed to update profile");
    else {
      toast.success("Profile updated!");
      await fetchProfile(profile.id);
    }
    setSaving(false);
  };

  const changePassword = async (data: PasswordForm) => {
    if (data.password !== data.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password changed successfully!");
      pwForm.reset();
    }
    setChangingPw(false);
  };

  if (!profile) return null;

  const roleColor = roleColors[profile.role] ?? "#f97316";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Your Profile
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Manage your account details
      </p>

      {/* Avatar + role */}
      <Card className="p-6 mb-5 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
          style={{ backgroundColor: roleColor }}
        >
          {profile.full_name?.charAt(0) ?? profile.email.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#f0f4ff] text-lg truncate">
            {profile.full_name ?? "No name set"}
          </div>
          <div className="text-sm text-[#64748b] truncate mb-2">
            {profile.email}
          </div>
          <Badge
            variant={
              profile.role === "admin"
                ? "danger"
                : profile.role === "driver"
                  ? "success"
                  : "info"
            }
          >
            <Shield size={10} />
            {roleLabels[profile.role]}
          </Badge>
        </div>
        {profile.banned_at && (
          <Badge variant="danger">Banned</Badge>
        )}
      </Card>

      {/* Edit profile */}
      <Card className="p-5 mb-5">
        <h2 className="font-semibold text-[#f0f4ff] mb-4 text-sm flex items-center gap-2">
          <User size={15} className="text-[#f97316]" />
          Personal Information
        </h2>
        <form
          onSubmit={profileForm.handleSubmit(saveProfile)}
          className="flex flex-col gap-4"
        >
          <Input
            label="Full Name"
            placeholder="Jane Wanjiru"
            icon={<User size={15} />}
            {...profileForm.register("full_name")}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+254700000000"
            icon={<Phone size={15} />}
            {...profileForm.register("phone")}
          />
          <div>
            <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">
              Email (read-only)
            </label>
            <div className="flex items-center gap-2 bg-[#1a2235] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-[#64748b]">
              <Mail size={15} />
              {profile.email}
            </div>
          </div>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card className="p-5 mb-5">
        <h2 className="font-semibold text-[#f0f4ff] mb-4 text-sm flex items-center gap-2">
          <Lock size={15} className="text-[#f97316]" />
          Change Password
        </h2>
        <form
          onSubmit={pwForm.handleSubmit(changePassword)}
          className="flex flex-col gap-4"
        >
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={15} />}
            {...pwForm.register("password", { required: true, minLength: 6 })}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={15} />}
            {...pwForm.register("confirm", { required: true })}
          />
          <Button type="submit" loading={changingPw} variant="secondary">
            Update Password
          </Button>
        </form>
      </Card>

      {/* Account info */}
      <Card className="p-5">
        <h2 className="font-semibold text-[#f0f4ff] mb-4 text-sm">
          Account Details
        </h2>
        <div className="flex flex-col gap-2">
          {[
            { label: "User ID", value: profile.id.slice(0, 12) + "…" },
            {
              label: "Member since",
              value: new Date(profile.created_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            { label: "Account status", value: profile.banned_at ? "Banned" : "Active" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-xs text-[#64748b]">{row.label}</span>
              <span
                className={`text-sm font-medium ${row.value === "Banned" ? "text-red-400" : "text-[#f0f4ff]"}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
