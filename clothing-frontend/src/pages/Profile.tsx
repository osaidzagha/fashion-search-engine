import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RootState } from "../store/store";
import { setCredentials, logout } from "../store/authSlice";
import PageTransition from "../components/PageTransition";
import ConfirmModal from "../components/ConfirmModal";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "general" | "security" | "preferences";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-1">
      {children}
    </p>
  );
}

function FieldInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent border-b border-borderLight dark:border-borderLight-dark py-2.5 font-sans text-[13px] tracking-wide text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted dark:placeholder:text-textMuted-dark focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
      />
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  destructive = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-8 py-3 font-sans text-[9px] tracking-widest uppercase border transition-all duration-300 ${
        loading || disabled
          ? "opacity-30 cursor-wait border-borderLight dark:border-borderLight-dark text-textMuted dark:text-textMuted-dark"
          : destructive
            ? "border-accentRed text-accentRed hover:bg-accentRed hover:text-white"
            : "border-textPrimary dark:border-textPrimary-dark text-textPrimary dark:text-textPrimary-dark hover:bg-textPrimary dark:hover:bg-textPrimary-dark hover:text-bgPrimary dark:hover:text-bgPrimary-dark"
      }`}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center border transition-colors duration-300 focus:outline-none ${
        enabled
          ? "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark"
          : "border-borderLight dark:border-borderLight-dark bg-transparent"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform transition-transform duration-300 ${
          enabled
            ? "translate-x-5 bg-bgPrimary dark:bg-bgPrimary-dark"
            : "translate-x-1 bg-textMuted dark:bg-textMuted-dark"
        }`}
      />
    </button>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="w-16 h-16 border border-borderLight dark:border-borderLight-dark flex items-center justify-center bg-bgPrimary dark:bg-bgPrimary-dark flex-shrink-0">
      <span className="font-heading font-light text-2xl leading-none text-textPrimary dark:text-textPrimary-dark">
        {initials || "?"}
      </span>
    </div>
  );
}

// ─── Inline error banner ──────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="font-sans text-[9px] tracking-widest uppercase text-accentRed border border-accentRed px-4 py-2.5">
      {message}
    </p>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo, token } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<Tab>("general");

  // ── General form state ──
  const [name, setName] = useState(userInfo?.name || "");
  const [email, setEmail] = useState(userInfo?.email || "");
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // ── Security form state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");

  // ── Preferences state ──
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [priceAlertEnabled, setPriceAlertEnabled] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  // ── Delete account state ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!userInfo) navigate("/login");
  }, [userInfo, navigate]);

  // Sync dark mode from DOM on mount
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  // ── Helpers ──
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── General submit ──
  const handleGeneralSave = async () => {
    setGeneralError("");
    if (!name.trim() || !email.trim()) {
      setGeneralError("Name and email are required.");
      return;
    }
    setGeneralLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGeneralError(json.message || "Update failed.");
        return;
      }
      // Sync Redux + localStorage so Navbar stays in sync
      dispatch(
        setCredentials({
          user: json.user,
          token: token!,
        }),
      );
      toast.success("Profile updated.");
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setGeneralLoading(false);
    }
  };

  // ── Password submit ──
  const handlePasswordSave = async () => {
    setSecurityError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setSecurityError("New password must be at least 8 characters.");
      return;
    }
    setSecurityLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/password`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSecurityError(json.message || "Password update failed.");
        return;
      }
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setSecurityError("Network error. Please try again.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Dark mode toggle (local, no API) ──
  const handleDarkModeToggle = (val: boolean) => {
    const html = document.documentElement;
    if (val) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDarkMode(val);
  };

  // ── Price alert toggle (API) ──
  const handleAlertToggle = async (val: boolean) => {
    setPriceAlertEnabled(val);
    setPrefLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/preferences`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ priceAlertEnabled: val }),
      });
      if (!res.ok) {
        setPriceAlertEnabled(!val); // rollback
        toast.error("Failed to save preference.");
      } else {
        toast.success(val ? "Price alerts enabled." : "Price alerts disabled.");
      }
    } catch {
      setPriceAlertEnabled(!val);
      toast.error("Network error.");
    } finally {
      setPrefLoading(false);
    }
  };

  // ── Delete account ──
  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("Password is required to confirm deletion.");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/account`, {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify({ password: deletePassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.message || "Deletion failed.");
        setDeleteLoading(false);
        return;
      }
      dispatch(logout());
      toast("Account deleted.", { icon: "🗑️" });
      navigate("/");
    } catch {
      setDeleteError("Network error. Please try again.");
      setDeleteLoading(false);
    }
  };

  if (!userInfo) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
        {/* ── Page header ── */}
        <div className="border-b border-borderLight dark:border-borderLight-dark px-6 md:px-12 py-10 md:py-14">
          <div className="max-w-4xl mx-auto flex items-end gap-6">
            <Avatar name={userInfo.name} />
            <div>
              <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-1">
                Member Account
              </p>
              <h1 className="font-heading font-light text-3xl md:text-4xl leading-none text-textPrimary dark:text-textPrimary-dark">
                {userInfo.name}
              </h1>
              <p className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark mt-1.5">
                {userInfo.email}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16">
            {/* ── Sidebar tabs ── */}
            <nav className="flex flex-row md:flex-col gap-1 md:gap-0.5 w-full md:w-[160px] flex-shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase border transition-all duration-200 ${
                    activeTab === tab.id
                      ? "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark"
                      : "border-transparent text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* ── Tab content ── */}
            <div className="flex-1 min-w-0">
              {/* ══ GENERAL ══ */}
              {activeTab === "general" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-6">
                      Account Details
                    </p>
                    <div className="flex flex-col gap-6">
                      <FieldInput
                        label="Full Name"
                        value={name}
                        onChange={setName}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                      <FieldInput
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="your@email.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {generalError && <ErrorBanner message={generalError} />}

                  <div>
                    <ActionButton
                      onClick={handleGeneralSave}
                      loading={generalLoading}
                    >
                      Save Changes
                    </ActionButton>
                  </div>

                  {/* ── Danger Zone ── */}
                  <div className="pt-8 mt-4 border-t border-borderLight dark:border-borderLight-dark flex flex-col gap-4">
                    <div>
                      <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-accentRed mb-1">
                        Danger Zone
                      </p>
                      <p className="font-sans text-[11px] tracking-wide text-textMuted dark:text-textMuted-dark">
                        Permanently delete your account and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
                    <div>
                      <ActionButton
                        onClick={() => {
                          setDeleteError("");
                          setDeletePassword("");
                          setDeleteModalOpen(true);
                        }}
                        destructive
                      >
                        Delete Account
                      </ActionButton>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ SECURITY ══ */}
              {activeTab === "security" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <p className="font-sans text-[8px] tracking-[0.2em] uppercase text-textMuted dark:text-textMuted-dark mb-6">
                      Change Password
                    </p>
                    <div className="flex flex-col gap-6">
                      <FieldInput
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <FieldInput
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                      <FieldInput
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {securityError && <ErrorBanner message={securityError} />}

                  <div>
                    <ActionButton
                      onClick={handlePasswordSave}
                      loading={securityLoading}
                    >
                      Update Password
                    </ActionButton>
                  </div>
                </div>
              )}

              {/* ══ PREFERENCES ══ */}
              {activeTab === "preferences" && (
                <div className="flex flex-col gap-0 border border-borderLight dark:border-borderLight-dark divide-y divide-borderLight dark:divide-borderLight-dark">
                  {/* Dark mode */}
                  <div className="flex items-center justify-between px-5 py-5">
                    <div>
                      <p className="font-sans text-[11px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark">
                        Dark Mode
                      </p>
                      <p className="font-sans text-[9px] tracking-wide text-textMuted dark:text-textMuted-dark mt-0.5">
                        Switch between light and dark theme
                      </p>
                    </div>
                    <Toggle
                      enabled={isDarkMode}
                      onChange={handleDarkModeToggle}
                    />
                  </div>

                  {/* Price alerts */}
                  <div className="flex items-center justify-between px-5 py-5">
                    <div>
                      <p className="font-sans text-[11px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark">
                        Price Drop Alerts
                      </p>
                      <p className="font-sans text-[9px] tracking-wide text-textMuted dark:text-textMuted-dark mt-0.5">
                        Receive email notifications when watched items drop in
                        price
                      </p>
                    </div>
                    <Toggle
                      enabled={priceAlertEnabled}
                      onChange={prefLoading ? () => {} : handleAlertToggle}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete account modal ── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Account"
        message="This will permanently remove your account, watchlist, and all saved data. To confirm, enter your password below."
        confirmText="Delete Forever"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalOpen(false)}
      >
        {/* Password field injected into modal body */}
        <div className="flex flex-col gap-1.5 mt-4">
          <FieldInput
            label="Password"
            type="password"
            value={deletePassword}
            onChange={setDeletePassword}
            placeholder="Confirm your password"
            autoComplete="current-password"
          />
          {deleteError && <ErrorBanner message={deleteError} />}
        </div>
      </ConfirmModal>
    </PageTransition>
  );
}
