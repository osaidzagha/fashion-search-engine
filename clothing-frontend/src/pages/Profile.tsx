import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { RootState } from "../store/store";
import { setCredentials, logout } from "../store/authSlice";
import PageTransition from "../components/PageTransition";
import ConfirmModal from "../components/ConfirmModal";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "general" | "security" | "preferences";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
];

// ─── Atoms ────────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5">
      {children}
    </p>
  );
}

/** Editable input — name only */
function EditableInput({
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
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent border-b border-borderLight dark:border-borderLight-dark py-3 font-sans text-[13px] tracking-wide text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted/50 dark:placeholder:text-textMuted-dark/50 focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
      />
    </div>
  );
}

/** Read-only display field — email */
function ReadOnlyField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center justify-between border-b border-borderLight/60 dark:border-borderLight-dark/60 py-3">
        <span className="font-sans text-[13px] tracking-wide text-textPrimary dark:text-textPrimary-dark">
          {value}
        </span>
        {note && (
          <span className="font-sans text-[8px] tracking-[0.15em] uppercase text-textMuted/60 dark:text-textMuted-dark/60 ml-4 flex-shrink-0">
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

/** Sharp password input for security tab */
function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative group">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "••••••••"}
          autoComplete={autoComplete}
          className="w-full bg-transparent border-b border-borderLight dark:border-borderLight-dark py-3 pr-10 font-sans text-[13px] tracking-widest text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted/40 dark:placeholder:text-textMuted-dark/40 placeholder:tracking-normal focus:outline-none focus:border-textPrimary dark:focus:border-textPrimary-dark transition-colors duration-200"
        />
        {/* show/hide toggle */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute right-0 bottom-3 font-sans text-[8px] tracking-[0.15em] uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-150"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
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

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="w-16 h-16 border border-borderLight dark:border-borderLight-dark flex items-center justify-center flex-shrink-0">
      <span className="font-heading font-light text-2xl leading-none text-textPrimary dark:text-textPrimary-dark">
        {initials || "?"}
      </span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="font-sans text-[9px] tracking-widest uppercase text-accentRed border border-accentRed px-4 py-2.5">
      {message}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { userInfo, token } = useSelector((state: RootState) => state.auth);

  // Honour ?tab= query param (e.g. from any future deep-link)
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && ["general", "security", "preferences"].includes(tabParam)
      ? tabParam
      : "general",
  );

  // ── General ──
  const [name, setName] = useState(userInfo?.name || "");
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  // ── Security ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");

  // ── Preferences ──
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [priceAlertEnabled, setPriceAlertEnabled] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  // ── Delete account ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!userInfo) navigate("/login");
  }, [userInfo, navigate]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── General save (name only) ──
  const handleGeneralSave = async () => {
    setGeneralError("");
    if (!name.trim()) {
      setGeneralError("Name cannot be empty.");
      return;
    }
    setGeneralLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGeneralError(json.message || "Update failed.");
        return;
      }
      dispatch(setCredentials({ user: json.user, token: token! }));
      toast.success("Profile updated.");
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setGeneralLoading(false);
    }
  };

  // ── Password save ──
  const handlePasswordSave = async () => {
    setSecurityError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("All fields are required.");
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
    if (currentPassword === newPassword) {
      setSecurityError("New password must differ from your current password.");
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

  const handleDarkModeToggle = (val: boolean) => {
    const html = document.documentElement;
    val ? html.classList.add("dark") : html.classList.remove("dark");
    localStorage.setItem("theme", val ? "dark" : "light");
    setIsDarkMode(val);
  };

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
        setPriceAlertEnabled(!val);
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
            <div className="min-w-0">
              <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5">
                Member Account
              </p>
              <h1 className="font-heading font-light text-3xl md:text-4xl leading-none text-textPrimary dark:text-textPrimary-dark truncate">
                {userInfo.name}
              </h1>
              <p className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark mt-2">
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
                  <div className="flex flex-col gap-7">
                    <EditableInput
                      label="Full Name"
                      value={name}
                      onChange={setName}
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                    {/* Email is locked — changing it is a security concern */}
                    <ReadOnlyField
                      label="Email Address"
                      value={userInfo.email}
                      note="Cannot be changed"
                    />
                  </div>

                  {generalError && <ErrorBanner message={generalError} />}

                  <ActionButton
                    onClick={handleGeneralSave}
                    loading={generalLoading}
                  >
                    Save Changes
                  </ActionButton>

                  {/* ── Danger Zone ── */}
                  <div className="pt-8 mt-2 border-t border-borderLight dark:border-borderLight-dark flex flex-col gap-4">
                    <div>
                      <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-accentRed mb-2">
                        Danger Zone
                      </p>
                      <p className="font-sans text-[11px] tracking-wide leading-relaxed text-textMuted dark:text-textMuted-dark">
                        Permanently delete your account and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
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
              )}

              {/* ══ SECURITY ══ */}
              {activeTab === "security" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark mb-7">
                      Change Password
                    </p>
                    <div className="flex flex-col gap-7">
                      <PasswordInput
                        label="Current Password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        autoComplete="current-password"
                      />
                      {/* Visual separator before new password group */}
                      <div className="h-px w-8 bg-borderLight dark:bg-borderLight-dark" />
                      <PasswordInput
                        label="New Password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                      <PasswordInput
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {securityError && <ErrorBanner message={securityError} />}

                  <ActionButton
                    onClick={handlePasswordSave}
                    loading={securityLoading}
                  >
                    Update Password
                  </ActionButton>

                  {/* Note about email not being changeable here */}
                  <p className="font-sans text-[9px] tracking-wide text-textMuted/60 dark:text-textMuted-dark/60 leading-relaxed">
                    Your registered email address cannot be changed. If you need
                    to update it, please contact support.
                  </p>
                </div>
              )}

              {/* ══ PREFERENCES ══ */}
              {activeTab === "preferences" && (
                <div className="flex flex-col gap-0 border border-borderLight dark:border-borderLight-dark divide-y divide-borderLight dark:divide-borderLight-dark">
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

                  <div className="flex items-center justify-between px-5 py-5">
                    <div>
                      <p className="font-sans text-[11px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark">
                        Price Drop Alerts
                      </p>
                      <p className="font-sans text-[9px] tracking-wide text-textMuted dark:text-textMuted-dark mt-0.5">
                        Email notifications when watched items drop in price
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
        <div className="flex flex-col gap-2 mt-4">
          <PasswordInput
            label="Password"
            value={deletePassword}
            onChange={setDeletePassword}
            autoComplete="current-password"
          />
          {deleteError && <ErrorBanner message={deleteError} />}
        </div>
      </ConfirmModal>
    </PageTransition>
  );
}
