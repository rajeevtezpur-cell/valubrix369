import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import BankerPendingScreen from "./BankerPendingScreen";

interface PortalGuardProps {
  children: React.ReactNode;
  portal: "buyer" | "seller" | "banker";
}

export function PortalGuard({ children, portal }: PortalGuardProps) {
  const { user, openLoginModal } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = !!user;

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate and openLoginModal are stable
  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: "/" });
      openLoginModal(portal);
    }
  }, [isLoggedIn, portal]);

  if (!isLoggedIn) return null;

  // Banker pending check
  if (portal === "banker") {
    const role = user.role;
    const status = user.bankOfficerStatus;
    const isBanker = role === "banker" || role === "bankOfficer";
    if (isBanker && status !== "approved") {
      return <BankerPendingScreen />;
    }
  }

  return <>{children}</>;
}
