import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/valuation", label: "Valuation" },
  { to: "/search", label: "Search" },
  { to: "/seller/list-property", label: "List Property" },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Building2 className="w-6 h-6 gold-text logo-glow" />
          <span className="font-display font-bold text-xl gold-text tracking-tight">
            ValuBrix
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-ocid={`nav.${link.label.toLowerCase().replace(/ /g, "_")}.link`}
            >
              {link.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1"
              >
                Portals <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border"
            >
              <DropdownMenuItem asChild>
                <Link to="/buyer" className="cursor-pointer">
                  Buyer Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/seller" className="cursor-pointer">
                  Seller Portal
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/bank" className="cursor-pointer">
                  Bank Portal
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">
                    {user?.fullName || user?.username || "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border"
              >
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/seller/listings" className="cursor-pointer">
                    My Listings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                className="btn-gold gap-2"
                data-ocid="nav.login.button"
              >
                <LogIn className="w-4 h-4" /> Login / Signup
              </Button>
            </Link>
          )}
        </div>

        <button
          type="button"
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          data-ocid="nav.mobile_menu.toggle"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden nav-glass px-4 pb-4 border-t border-border/30">
          <div className="flex flex-col gap-3 pt-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/buyer"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-muted-foreground py-1"
            >
              Buyer Portal
            </Link>
            <Link
              to="/seller"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-muted-foreground py-1"
            >
              Seller Portal
            </Link>
            <Link
              to="/bank"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-muted-foreground py-1"
            >
              Bank Portal
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="text-sm text-destructive py-2 text-left"
              >
                Logout
              </button>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}>
                <Button size="sm" className="btn-gold w-full mt-2">
                  Login / Signup
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
