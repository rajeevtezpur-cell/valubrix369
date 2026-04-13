import { Link } from "@tanstack/react-router";
import { Home, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import ListingCard from "../components/ListingCard";
import SellerLayout from "../components/SellerLayout";
import { useAuth } from "../context/AuthContext";
import { deleteListing, getSellerListings } from "../services/listingService";

function loadUserListings(user: any): any[] {
  try {
    return getSellerListings(user);
  } catch {
    return [];
  }
}

export default function SellerListingsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"All" | "Active" | "Draft" | "Sold">(
    "All",
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [listings, setListings] = useState(() => loadUserListings(user));

  // Refresh on mount, on user change, on focus, and on listing updates
  useEffect(() => {
    const refresh = () => setListings(loadUserListings(user));
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("valubrix:listings-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("valubrix:listings-updated", refresh);
    };
  }, [user]);

  const filtered =
    filter === "All" ? listings : listings.filter((l) => l.status === filter);

  const handleDelete = (id: string) => {
    setListings((prev) => prev.filter((l) => String(l.id) !== String(id)));
    deleteListing(id);
    setDeleteId(null);
  };

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              My <span className="text-[#D4AF37]">Listings</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {listings.length} total properties
            </p>
          </div>
          <Link
            to="/seller/list-property"
            data-ocid="seller.listings.create.primary_button"
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={16} /> New Listing
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["All", "Active", "Draft", "Sold"] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-ocid="seller.listings.filter.tab"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        <div className="grid gap-4">
          <AnimatePresence>
            {filtered.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.06 }}
              >
                <ListingCard
                  listing={listing}
                  showActions="seller"
                  index={i}
                  onView={() => {}}
                  onEdit={() => {}}
                  onDelete={() => setDeleteId(String(listing.id))}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div
              className="text-center py-16 text-white/30"
              data-ocid="seller.listings.empty_state"
            >
              <Home size={40} className="mx-auto mb-3 opacity-30" />
              <p>
                {listings.length === 0
                  ? "You have no listings yet. Create your first listing!"
                  : "No listings in this category"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-ocid="seller.listings.delete.dialog"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <h3 className="text-white font-bold text-lg mb-2">
                Delete Listing?
              </h3>
              <p className="text-white/50 text-sm mb-6">
                This action cannot be undone. The listing will be permanently
                removed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="seller.listings.delete.confirm_button"
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all"
                >
                  Delete
                </button>
                <button
                  type="button"
                  data-ocid="seller.listings.delete.cancel_button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
