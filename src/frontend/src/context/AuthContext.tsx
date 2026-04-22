import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthUser {
  username: string;
  fullName: string;
  city: string;
  role:
    | "guest"
    | "user"
    | "buyer"
    | "seller"
    | "bankOfficer"
    | "banker"
    | "admin"
    | "tester";
  mobile?: string;
  email?: string;
  auth_provider?: "otp" | "email" | string;
  bankOfficerStatus?: "pending" | "approved" | "rejected";
  /** Premium subscription status — additive field, defaults to "free" */
  subscription_status?: "free" | "premium";
}

interface AuthContextType {
  user: AuthUser | null;
  login: (userData: AuthUser) => void;
  logout: () => void;
  intendedPortal: "buyer" | "seller" | "banker" | null;
  showLoginModal: boolean;
  showRoleSelect: boolean;
  openLoginModal: (portal?: "buyer" | "seller" | "banker") => void;
  closeLoginModal: () => void;
  openRoleSelect: () => void;
  closeRoleSelect: () => void;
  setUserRole: (role: "buyer" | "seller" | "banker") => void;
  selectedRole: "buyer" | "seller" | "banker" | null;
  setSelectedRole: (role: "buyer" | "seller" | "banker" | null) => void;
  /** True if user is premium, admin, or tester */
  isPremium: boolean;
  /** Re-fetches subscription status from backend and updates local state */
  refreshSubscriptionStatus: () => Promise<void>;
  /** Directly mark user as premium (called after payment verification) */
  markUserPremium: () => void;
  /** Update bankOfficerStatus in AuthContext (called after admin approves/rejects) */
  updateBankerStatus: (status: "pending" | "approved" | "rejected") => void;
  /** Re-check banker approval status from backend */
  refreshBankerStatus: () => Promise<
    "pending" | "approved" | "rejected" | null
  >;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  intendedPortal: null,
  showLoginModal: false,
  showRoleSelect: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  openRoleSelect: () => {},
  closeRoleSelect: () => {},
  setUserRole: () => {},
  selectedRole: null,
  setSelectedRole: () => {},
  isPremium: false,
  refreshSubscriptionStatus: async () => {},
  markUserPremium: () => {},
  updateBankerStatus: () => {},
  refreshBankerStatus: async () => null,
});

function deriveIsPremium(user: AuthUser | null): boolean {
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.role === "tester" ||
    user.subscription_status === "premium" ||
    // Also check persistent premium flag in localStorage (survives across sessions)
    localStorage.getItem(
      `valubrix_premium_${user.username || user.mobile || user.email}`,
    ) === "1"
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("valubrix_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [intendedPortal, setIntendedPortal] = useState<
    "buyer" | "seller" | "banker" | null
  >(null);
  const [selectedRole, setSelectedRole] = useState<
    "buyer" | "seller" | "banker" | null
  >(null);

  // Derive isPremium reactively from user state
  const isPremium = deriveIsPremium(user);

  // On mount: if user is logged in, check for persisted premium flag
  useEffect(() => {
    if (!user) return;
    const key = user.username || user.mobile || user.email;
    if (key && localStorage.getItem(`valubrix_premium_${key}`) === "1") {
      if (user.subscription_status !== "premium") {
        const updated: AuthUser = { ...user, subscription_status: "premium" };
        setUser(updated);
        localStorage.setItem("valubrix_user", JSON.stringify(updated));
      }
    }
    // Only re-run when user identity fields change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = useCallback((userData: AuthUser) => {
    // Restore premium flag from persistent storage on login
    const key = userData.mobile || userData.email || userData.username;
    let mergedUser = { ...userData };
    if (key && localStorage.getItem(`valubrix_premium_${key}`) === "1") {
      mergedUser = { ...mergedUser, subscription_status: "premium" };
    }
    // Check banker approval status from the bank_officers list
    if (mergedUser.role === "banker" || mergedUser.role === "bankOfficer") {
      try {
        const bankers = JSON.parse(
          localStorage.getItem("valubrix_bank_officers") || "[]",
        );
        const match = bankers.find(
          (b: { email?: string; mobile?: string; status: string }) =>
            (b.email && b.email === mergedUser.email) ||
            (b.mobile && b.mobile === mergedUser.mobile),
        );
        if (match) {
          mergedUser = {
            ...mergedUser,
            bankOfficerStatus: match.status as
              | "pending"
              | "approved"
              | "rejected",
          };
        }
      } catch {
        /* ignore */
      }
    }
    setUser(mergedUser);
    localStorage.setItem("valubrix_user", JSON.stringify(mergedUser));
    // Also save to user DB keyed by mobile/email
    if (key) {
      try {
        const db = JSON.parse(localStorage.getItem("valubrix_user_db") || "{}");
        db[key] = mergedUser;
        localStorage.setItem("valubrix_user_db", JSON.stringify(db));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("valubrix_user");
  }, []);

  /**
   * Re-fetches subscription status.
   * Tries actor backend first (when available), then falls back to localStorage.
   * Fully additive — no existing functionality removed.
   */
  const refreshSubscriptionStatus = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      // Try to call backend getUserSubscriptionStatus if it exists
      // The actor is obtained lazily to avoid circular dep — use dynamic import pattern
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalActor = (window as any).__valubrix_actor__;
      if (
        globalActor &&
        typeof globalActor.getUserSubscriptionStatus === "function"
      ) {
        const status: string = await globalActor.getUserSubscriptionStatus();
        const newStatus: "free" | "premium" =
          status === "premium" ? "premium" : "free";
        const updated: AuthUser = { ...user, subscription_status: newStatus };
        setUser(updated);
        localStorage.setItem("valubrix_user", JSON.stringify(updated));
        // Persist premium flag
        const key = user.mobile || user.email || user.username;
        if (key && newStatus === "premium") {
          localStorage.setItem(`valubrix_premium_${key}`, "1");
        }
        return;
      }
    } catch {
      /* backend call failed, fall through to localStorage */
    }
    // Fallback: check localStorage persistent premium flag
    const key = user.mobile || user.email || user.username;
    if (key && localStorage.getItem(`valubrix_premium_${key}`) === "1") {
      const updated: AuthUser = { ...user, subscription_status: "premium" };
      setUser(updated);
      localStorage.setItem("valubrix_user", JSON.stringify(updated));
    }
  }, [user]);

  /**
   * Directly marks the current user as premium.
   * Called after successful payment verification.
   */
  const markUserPremium = useCallback(() => {
    if (!user) return;
    const updated: AuthUser = { ...user, subscription_status: "premium" };
    setUser(updated);
    localStorage.setItem("valubrix_user", JSON.stringify(updated));
    // Persist premium flag by user identity key
    const key = user.mobile || user.email || user.username;
    if (key) {
      localStorage.setItem(`valubrix_premium_${key}`, "1");
      // Also update user DB
      try {
        const db = JSON.parse(localStorage.getItem("valubrix_user_db") || "{}");
        db[key] = updated;
        localStorage.setItem("valubrix_user_db", JSON.stringify(db));
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  /**
   * Updates the banker approval status in AuthContext + localStorage.
   * Called after admin approves or rejects a banker application.
   */
  const updateBankerStatus = useCallback(
    (status: "pending" | "approved" | "rejected") => {
      if (!user) return;
      const updated: AuthUser = { ...user, bankOfficerStatus: status };
      setUser(updated);
      localStorage.setItem("valubrix_user", JSON.stringify(updated));
      const key = updated.mobile || updated.email || updated.username;
      if (key) {
        try {
          const db = JSON.parse(
            localStorage.getItem("valubrix_user_db") || "{}",
          );
          db[key] = updated;
          localStorage.setItem("valubrix_user_db", JSON.stringify(db));
        } catch {
          /* ignore */
        }
      }
      // Also update valubrix_bank_officers list
      try {
        const bankers = JSON.parse(
          localStorage.getItem("valubrix_bank_officers") || "[]",
        );
        const idx = bankers.findIndex(
          (b: { email?: string; mobile?: string }) =>
            (b.email && b.email === user.email) ||
            (b.mobile && b.mobile === user.mobile),
        );
        if (idx !== -1) bankers[idx].status = status;
        localStorage.setItem("valubrix_bank_officers", JSON.stringify(bankers));
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  /**
   * Re-checks banker approval status from backend (getMyBankerStatus).
   * Returns the resolved status or null if no backend available.
   */
  const refreshBankerStatus = useCallback(async (): Promise<
    "pending" | "approved" | "rejected" | null
  > => {
    if (!user) return null;
    if (user.role !== "banker" && user.role !== "bankOfficer") return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalActor = (window as any).__valubrix_actor__;
      if (globalActor && typeof globalActor.getMyBankerStatus === "function") {
        const raw: string = await globalActor.getMyBankerStatus();
        const status: "pending" | "approved" | "rejected" =
          raw === "approved"
            ? "approved"
            : raw === "rejected"
              ? "rejected"
              : "pending";
        updateBankerStatus(status);
        return status;
      }
    } catch {
      /* backend unavailable — fall through */
    }
    // Fallback: read from localStorage
    try {
      const bankers = JSON.parse(
        localStorage.getItem("valubrix_bank_officers") || "[]",
      );
      const match = bankers.find(
        (b: { email?: string; mobile?: string; status: string }) =>
          (b.email && b.email === user.email) ||
          (b.mobile && b.mobile === user.mobile),
      );
      if (match) {
        const s = match.status as "pending" | "approved" | "rejected";
        updateBankerStatus(s);
        return s;
      }
    } catch {
      /* ignore */
    }
    return user.bankOfficerStatus ?? "pending";
  }, [user, updateBankerStatus]);

  const openLoginModal = useCallback(
    (portal?: "buyer" | "seller" | "banker") => {
      if (portal === undefined) {
        setShowRoleSelect(true);
      } else {
        setIntendedPortal(portal);
        setShowLoginModal(true);
      }
    },
    [],
  );

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const openRoleSelect = useCallback(() => {
    setShowRoleSelect(true);
  }, []);

  const closeRoleSelect = useCallback(() => {
    setShowRoleSelect(false);
    setIntendedPortal(null);
  }, []);

  const setUserRole = useCallback((role: "buyer" | "seller" | "banker") => {
    setUser((prev) => {
      if (!prev) return prev;
      // Do NOT overwrite bankOfficerStatus when switching roles mid-session.
      // bankOfficerStatus is managed exclusively by the admin approval flow (set at signup).
      const updated: AuthUser = {
        ...prev,
        role,
      };
      localStorage.setItem("valubrix_user", JSON.stringify(updated));
      const key = updated.mobile || updated.email || updated.username;
      if (key) {
        try {
          const db = JSON.parse(
            localStorage.getItem("valubrix_user_db") || "{}",
          );
          db[key] = updated;
          localStorage.setItem("valubrix_user_db", JSON.stringify(db));
        } catch {
          /* ignore */
        }
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        intendedPortal,
        showLoginModal,
        showRoleSelect,
        openLoginModal,
        closeLoginModal,
        openRoleSelect,
        closeRoleSelect,
        setUserRole,
        selectedRole,
        setSelectedRole,
        isPremium,
        refreshSubscriptionStatus,
        markUserPremium,
        updateBankerStatus,
        refreshBankerStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
