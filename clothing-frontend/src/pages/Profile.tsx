import { useState, useEffect, useRef } from "react";
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

function EditableInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
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
        className={`w-full bg-transparent border-b py-3 font-sans text-[13px] tracking-wide text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted/50 dark:placeholder:text-textMuted-dark/50 focus:outline-none transition-colors duration-200 ${
          error
            ? "border-accentRed focus:border-accentRed"
            : "border-borderLight dark:border-borderLight-dark focus:border-textPrimary dark:focus:border-textPrimary-dark"
        }`}
      />
      {error && (
        <p className="mt-1.5 font-sans text-[9px] tracking-wide text-accentRed">
          {error}
        </p>
      )}
    </div>
  );
}

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

// BUG FIX #1: Changed `bottom-3` to `top-1/2 -translate-y-1/2` so the
// show/hide button is vertically centred and always clickable.
function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
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
          className={`w-full bg-transparent border-b py-3 pr-12 font-sans text-[13px] tracking-widest text-textPrimary dark:text-textPrimary-dark placeholder:text-textMuted/40 dark:placeholder:text-textMuted-dark/40 placeholder:tracking-normal focus:outline-none transition-colors duration-200 ${
            error
              ? "border-accentRed focus:border-accentRed"
              : "border-borderLight dark:border-borderLight-dark focus:border-textPrimary dark:focus:border-textPrimary-dark"
          }`}
        />
        {/* FIX: was `bottom-3`, now vertically centred */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute right-0 top-1/2 -translate-y-1/2 font-sans text-[8px] tracking-[0.15em] uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-150 px-1 py-1"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 font-sans text-[9px] tracking-wide text-accentRed">
          {error}
        </p>
      )}
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
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center border transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-textPrimary dark:focus-visible:ring-textPrimary-dark ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${
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

function Avatar({
  name,
  joinedAt,
  onAvatarClick,
}: {
  name: string;
  joinedAt?: string;
  onAvatarClick?: () => void;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="flex items-end gap-6">
      {/* Avatar with hover affordance for future upload */}
      <button
        type="button"
        onClick={onAvatarClick}
        title="Change avatar (coming soon)"
        className="w-16 h-16 border border-borderLight dark:border-borderLight-dark flex items-center justify-center flex-shrink-0 group relative overflow-hidden transition-colors duration-200 hover:border-textPrimary dark:hover:border-textPrimary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-textPrimary dark:focus-visible:ring-textPrimary-dark"
      >
        <span className="font-heading font-light text-2xl leading-none text-textPrimary dark:text-textPrimary-dark group-hover:opacity-0 transition-opacity duration-200">
          {initials || "?"}
        </span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-textMuted dark:text-textMuted-dark"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
      </button>

      <div className="min-w-0">
        <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark mb-1.5">
          Member Account
        </p>
        <h1 className="font-heading font-light text-3xl md:text-4xl leading-none text-textPrimary dark:text-textPrimary-dark truncate">
          {name}
        </h1>
        {joinedAt && (
          <p className="font-sans text-[9px] tracking-widest text-textMuted dark:text-textMuted-dark mt-1.5">
            Member since {joinedAt}
          </p>
        )}
      </div>
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

/** Subtle unsaved-changes dot indicator next to tab label */
function DirtyDot() {
  return (
    <span className="inline-block w-1 h-1 rounded-full bg-accentRed ml-1.5 mb-0.5 align-middle" />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { userInfo, token } = useSelector((state: RootState) => state.auth);

  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "general",
  );

  // BUG FIX #5: Sync activeTab when URL query param changes (e.g. deep-links)
  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as Tab);
    }
  }, [tabParam]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // ── General ──
  const [name, setName] = useState(userInfo?.name || "");
  const [nameError, setNameError] = useState("");
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const isGeneralDirty = name.trim() !== (userInfo?.name || "").trim();

  // ── Security ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const isSecurityDirty = !!(currentPassword || newPassword || confirmPassword);

  // ── Preferences ──
  // BUG FIX #2: Initialise priceAlertEnabled from userInfo if available,
  // falling back to true only if the server hasn't provided a value yet.
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [priceAlertEnabled, setPriceAlertEnabled] = useState<boolean>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userInfo as any)?.priceAlertEnabled ?? true,
  );
  const [prefLoading, setPrefLoading] = useState(false);

  // ── Delete account ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Avatar upload input ref (wired up for future use)
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userInfo) navigate("/login");
  }, [userInfo, navigate]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  // Keep name field in sync if userInfo updates externally (e.g. after save)
  useEffect(() => {
    if (userInfo?.name) setName(userInfo.name);
  }, [userInfo?.name]);

  // BUG FIX #2 (cont.): re-sync priceAlertEnabled if userInfo updates
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (userInfo as any)?.priceAlertEnabled;
    if (typeof val === "boolean") setPriceAlertEnabled(val);
  }, [userInfo]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ── Inline name validation ──
  const handleNameChange = (v: string) => {
    setName(v);
    if (!v.trim()) {
      setNameError("Name cannot be empty.");
    } else if (v.trim().length < 2) {
      setNameError("Name must be at least 2 characters.");
    } else {
      setNameError("");
    }
  };

  // ── General save ──
  const handleGeneralSave = async () => {
    setGeneralError("");
    if (!name.trim() || nameError) {
      setNameError(nameError || "Name cannot be empty.");
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

  // ── Inline password validation ──
  const validatePasswords = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current = "Required.";
    if (!newPassword) {
      errors.new = "Required.";
    } else if (newPassword.length < 8) {
      errors.new = "Must be at least 8 characters.";
    } else if (currentPassword === newPassword) {
      errors.new = "Must differ from your current password.";
    }
    if (!confirmPassword) {
      errors.confirm = "Required.";
    } else if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match.";
    }
    setPwErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Password save ──
  const handlePasswordSave = async () => {
    setSecurityError("");
    if (!validatePasswords()) return;
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
      setPwErrors({});
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
    const previous = priceAlertEnabled;
    setPriceAlertEnabled(val);
    setPrefLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/preferences`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ priceAlertEnabled: val }),
      });
      if (!res.ok) {
        setPriceAlertEnabled(previous);
        toast.error("Failed to save preference.");
      } else {
        toast.success(val ? "Price alerts enabled." : "Price alerts disabled.");
      }
    } catch {
      setPriceAlertEnabled(previous);
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

  // Format join date from userInfo if available
  const joinedAt = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (userInfo as any)?.createdAt;
    if (!raw) return undefined;
    try {
      return new Date(raw).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return undefined;
    }
  })();

  if (!userInfo) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-bgPrimary dark:bg-bgPrimary-dark">
        {/* ── Page header ── */}
        <div className="border-b border-borderLight dark:border-borderLight-dark px-6 md:px-12 py-10 md:py-14">
          <div className="max-w-4xl mx-auto">
            {/* Hidden input for future avatar upload */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() =>
                toast("Avatar upload coming soon.", { icon: "🖼️" })
              }
            />
            <Avatar
              name={userInfo.name}
              joinedAt={joinedAt}
              onAvatarClick={() => avatarInputRef.current?.click()}
            />
            <p className="font-sans text-[10px] tracking-widest text-textMuted dark:text-textMuted-dark mt-3">
              {userInfo.email}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-14">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16">
            {/* ── Sidebar tabs ── */}
            <nav
              className="flex flex-row md:flex-col gap-1 md:gap-0.5 w-full md:w-[160px] flex-shrink-0"
              aria-label="Profile sections"
            >
              {TABS.map((tab) => {
                const isDirty =
                  (tab.id === "general" && isGeneralDirty) ||
                  (tab.id === "security" && isSecurityDirty);
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 font-sans text-[9px] tracking-widest uppercase border transition-all duration-200 ${
                      activeTab === tab.id
                        ? "border-textPrimary dark:border-textPrimary-dark bg-textPrimary dark:bg-textPrimary-dark text-bgPrimary dark:text-bgPrimary-dark"
                        : "border-transparent text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark"
                    }`}
                  >
                    {tab.label}
                    {isDirty && activeTab !== tab.id && <DirtyDot />}
                  </button>
                );
              })}
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
                      onChange={handleNameChange}
                      placeholder="Your full name"
                      autoComplete="name"
                      error={nameError}
                    />
                    <ReadOnlyField
                      label="Email Address"
                      value={userInfo.email}
                      note="Cannot be changed"
                    />
                  </div>

                  {generalError && <ErrorBanner message={generalError} />}

                  <div className="flex items-center gap-4">
                    <ActionButton
                      onClick={handleGeneralSave}
                      loading={generalLoading}
                      disabled={!isGeneralDirty || !!nameError}
                    >
                      Save Changes
                    </ActionButton>
                    {isGeneralDirty && !generalLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setName(userInfo.name);
                          setNameError("");
                          setGeneralError("");
                        }}
                        className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-150"
                      >
                        Discard
                      </button>
                    )}
                  </div>

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
                  {/* Google users have no password — show a helpful message */}
                  {(userInfo as any)?.authProvider === "google" ? (
                    <div className="flex flex-col gap-4 border border-borderLight dark:border-borderLight-dark px-5 py-6">
                      <div className="flex items-center gap-3">
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <p className="font-sans text-[11px] tracking-widest uppercase text-textPrimary dark:text-textPrimary-dark">
                          Signed in with Google
                        </p>
                      </div>
                      <p className="font-sans text-[11px] tracking-wide leading-relaxed text-textMuted dark:text-textMuted-dark">
                        Your account uses Google sign-in and doesn't have a
                        separate password. Your sign-in is managed by Google.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-sans text-[8px] tracking-[0.22em] uppercase text-textMuted dark:text-textMuted-dark mb-7">
                          Change Password
                        </p>
                        <div className="flex flex-col gap-7">
                          <PasswordInput
                            label="Current Password"
                            value={currentPassword}
                            onChange={(v) => {
                              setCurrentPassword(v);
                              if (pwErrors.current)
                                setPwErrors((e) => ({ ...e, current: "" }));
                            }}
                            autoComplete="current-password"
                            error={pwErrors.current}
                          />
                          <div className="h-px w-8 bg-borderLight dark:bg-borderLight-dark" />
                          <PasswordInput
                            label="New Password"
                            value={newPassword}
                            onChange={(v) => {
                              setNewPassword(v);
                              if (pwErrors.new)
                                setPwErrors((e) => ({ ...e, new: "" }));
                            }}
                            placeholder="Min. 8 characters"
                            autoComplete="new-password"
                            error={pwErrors.new}
                          />
                          <PasswordInput
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChange={(v) => {
                              setConfirmPassword(v);
                              if (pwErrors.confirm)
                                setPwErrors((e) => ({ ...e, confirm: "" }));
                            }}
                            autoComplete="new-password"
                            error={pwErrors.confirm}
                          />
                        </div>
                      </div>

                      {securityError && <ErrorBanner message={securityError} />}

                      <div className="flex items-center gap-4">
                        <ActionButton
                          onClick={handlePasswordSave}
                          loading={securityLoading}
                          disabled={!isSecurityDirty}
                        >
                          Update Password
                        </ActionButton>
                        {isSecurityDirty && !securityLoading && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                              setPwErrors({});
                              setSecurityError("");
                            }}
                            className="font-sans text-[9px] tracking-widest uppercase text-textMuted dark:text-textMuted-dark hover:text-textPrimary dark:hover:text-textPrimary-dark transition-colors duration-150"
                          >
                            Discard
                          </button>
                        )}
                      </div>

                      <p className="font-sans text-[9px] tracking-wide text-textMuted/60 dark:text-textMuted-dark/60 leading-relaxed">
                        Your registered email address cannot be changed. If you
                        need to update it, please contact support.
                      </p>
                    </>
                  )}
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
                    {/* BUG FIX #2 (cont.): `disabled` prop passed; no inline
                        arrow function swallowing the click — Toggle handles it */}
                    <Toggle
                      enabled={priceAlertEnabled}
                      onChange={handleAlertToggle}
                      disabled={prefLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete account modal ── */}
      {/* BUG FIX #3: onCancel now clears deletePassword + deleteError      */}
      {/* BUG FIX #4: loading prop passed so confirm button is disabled     */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Account"
        message="This will permanently remove your account, watchlist, and all saved data. To confirm, enter your password below."
        confirmText="Delete Forever"
        cancelText="Cancel"
        isDestructive
        loading={deleteLoading}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletePassword("");
          setDeleteError("");
        }}
      >
        <div className="flex flex-col gap-2 mt-4">
          <PasswordInput
            label="Password"
            value={deletePassword}
            onChange={(v) => {
              setDeletePassword(v);
              if (deleteError) setDeleteError("");
            }}
            autoComplete="current-password"
            error={deleteError}
          />
        </div>
      </ConfirmModal>
    </PageTransition>
  );
}
