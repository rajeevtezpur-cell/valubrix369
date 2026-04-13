import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";

export interface BankOfficer {
  id: string;
  name: string;
  orgId: string;
  designation: string;
  department: string;
  employeeId: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
  status: "active" | "suspended";
}

export interface AdminListing {
  id: string;
  property: string;
  location: string;
  type: string;
  price: string;
  status: "pending" | "approved" | "removed";
}

interface AdminContextType {
  bankOfficers: BankOfficer[];
  adminUsers: AdminUser[];
  adminListings: AdminListing[];
  totalBankReports: number;
  addBankOfficer: (officer: BankOfficer) => void;
  approveBankOfficer: (id: string) => void;
  rejectBankOfficer: (id: string) => void;
  suspendUser: (id: string) => void;
  deleteUser: (id: string) => void;
  approveListing: (id: string) => void;
  removeListing: (id: string) => void;
  incrementBankReports: () => void;
}

const SAMPLE_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Ravi Kumar",
    email: "ravi@gmail.com",
    city: "Bangalore",
    role: "seller",
    status: "active",
  },
  {
    id: "u2",
    name: "Priya Shah",
    email: "priya@gmail.com",
    city: "Pune",
    role: "user",
    status: "active",
  },
  {
    id: "u3",
    name: "Arjun Mehta",
    email: "arjun@gmail.com",
    city: "Delhi",
    role: "seller",
    status: "active",
  },
];

const SAMPLE_LISTINGS: AdminListing[] = [
  {
    id: "l1",
    property: "3BHK Flat - Whitefield",
    location: "Whitefield, Bangalore",
    type: "Flat",
    price: "\u20b91.2 Cr",
    status: "pending",
  },
  {
    id: "l2",
    property: "Villa - Koregaon Park",
    location: "Koregaon Park, Pune",
    type: "Villa",
    price: "\u20b93.5 Cr",
    status: "approved",
  },
  {
    id: "l3",
    property: "Plot - Sector 62",
    location: "Sector 62, Delhi",
    type: "Plot",
    price: "\u20b985L",
    status: "pending",
  },
];

const AdminContext = createContext<AdminContextType>({
  bankOfficers: [],
  adminUsers: [],
  adminListings: [],
  totalBankReports: 0,
  addBankOfficer: () => {},
  approveBankOfficer: () => {},
  rejectBankOfficer: () => {},
  suspendUser: () => {},
  deleteUser: () => {},
  approveListing: () => {},
  removeListing: () => {},
  incrementBankReports: () => {},
});

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [bankOfficers, setBankOfficers] = useState<BankOfficer[]>(() =>
    loadFromStorage("valubrix_bank_officers", []),
  );
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() =>
    loadFromStorage("valubrix_admin_users", SAMPLE_USERS),
  );
  const [adminListings, setAdminListings] = useState<AdminListing[]>(() =>
    loadFromStorage("valubrix_admin_listings", SAMPLE_LISTINGS),
  );
  const [totalBankReports, setTotalBankReports] = useState<number>(() =>
    loadFromStorage("valubrix_bank_report_count", 0),
  );

  const addBankOfficer = useCallback((officer: BankOfficer) => {
    setBankOfficers((prev) => {
      const existing = prev.findIndex((o) => o.id === officer.id);
      const next =
        existing >= 0
          ? prev.map((o) => (o.id === officer.id ? officer : o))
          : [...prev, officer];
      saveToStorage("valubrix_bank_officers", next);
      return next;
    });
  }, []);

  const approveBankOfficer = useCallback((id: string) => {
    setBankOfficers((prev) => {
      const next = prev.map((o) =>
        o.id === id ? { ...o, status: "approved" as const } : o,
      );
      saveToStorage("valubrix_bank_officers", next);
      try {
        const session = localStorage.getItem("valubrix_bank_officer");
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed.id === id) {
            localStorage.setItem(
              "valubrix_bank_officer",
              JSON.stringify({ ...parsed, status: "approved" }),
            );
          }
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const rejectBankOfficer = useCallback((id: string) => {
    setBankOfficers((prev) => {
      const next = prev.map((o) =>
        o.id === id ? { ...o, status: "rejected" as const } : o,
      );
      saveToStorage("valubrix_bank_officers", next);
      return next;
    });
  }, []);

  const suspendUser = useCallback((id: string) => {
    setAdminUsers((prev) => {
      const next = prev.map((u) =>
        u.id === id
          ? {
              ...u,
              status: (u.status === "suspended" ? "active" : "suspended") as
                | "active"
                | "suspended",
            }
          : u,
      );
      saveToStorage("valubrix_admin_users", next);
      return next;
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setAdminUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      saveToStorage("valubrix_admin_users", next);
      return next;
    });
  }, []);

  const approveListing = useCallback((id: string) => {
    setAdminListings((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, status: "approved" as const } : l,
      );
      saveToStorage("valubrix_admin_listings", next);
      return next;
    });
  }, []);

  const removeListing = useCallback((id: string) => {
    setAdminListings((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, status: "removed" as const } : l,
      );
      saveToStorage("valubrix_admin_listings", next);
      return next;
    });
  }, []);

  const incrementBankReports = useCallback(() => {
    setTotalBankReports((prev) => {
      const next = prev + 1;
      saveToStorage("valubrix_bank_report_count", next);
      return next;
    });
  }, []);

  return (
    <AdminContext.Provider
      value={{
        bankOfficers,
        adminUsers,
        adminListings,
        totalBankReports,
        addBankOfficer,
        approveBankOfficer,
        rejectBankOfficer,
        suspendUser,
        deleteUser,
        approveListing,
        removeListing,
        incrementBankReports,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
