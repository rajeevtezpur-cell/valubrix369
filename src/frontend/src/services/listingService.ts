// Centralized listing service
// Since all data is localStorage (per-browser), seller listings are simply
// all non-deleted listings saved on this device.

export function getCanonicalSellerId(user: any): string {
  if (!user) return "";
  return (user.mobile || user.email || user.username || "").trim();
}

export function getAllUserListings(): any[] {
  try {
    return JSON.parse(localStorage.getItem("valubrix_user_listings") || "[]");
  } catch {
    return [];
  }
}

export function saveAllListings(listings: any[]): void {
  localStorage.setItem("valubrix_user_listings", JSON.stringify(listings));
  window.dispatchEvent(new CustomEvent("valubrix:listings-updated"));
}

// Returns ALL non-deleted listings (no ID filtering — localStorage is per-browser)
export function getSellerListings(_user?: any): any[] {
  const all = getAllUserListings();
  return all.filter((l: any) => {
    const s = (l.status || "").toLowerCase();
    return s !== "deleted";
  });
}

export function deleteListing(id: string): void {
  const all = getAllUserListings();
  const updated = all.map((l: any) =>
    String(l.id) === String(id) ? { ...l, status: "Deleted" } : l,
  );
  saveAllListings(updated);
}

export function updateListingStatus(id: string, status: string): void {
  const all = getAllUserListings();
  const updated = all.map((l: any) =>
    String(l.id) === String(id) ? { ...l, status } : l,
  );
  saveAllListings(updated);
}

export function incrementListingMetric(
  id: string | undefined,
  field: "views" | "leads_count" | "visit_count",
): void {
  if (!id) return;
  try {
    const all = getAllUserListings();
    const updated = all.map((l: any) =>
      String(l.id) === String(id)
        ? { ...l, [field]: (Number(l[field]) || 0) + 1 }
        : l,
    );
    saveAllListings(updated);
  } catch {}
}

/**
 * Returns active listings, optionally filtered by listingType.
 * Backwards compat: listings without listingType default to 'sale'.
 * Status is compared case-insensitively: "Active", "active", "ACTIVE" all pass.
 */
export function getActiveListingsForBuyer(
  listingType?: "sale" | "rent",
): any[] {
  try {
    const all = getAllUserListings();
    return all.filter((l: any) => {
      const s = (l.status || "").toLowerCase().trim();
      // Accept "active", "Active", "published", "live" — anything that means live
      const isActive = s === "active" || s === "published" || s === "live";
      if (!isActive) return false;
      if (listingType) {
        // Legacy listings without listingType default to 'sale'
        const lt = (l.listingType || "sale").toLowerCase().trim();
        return lt === listingType;
      }
      return true;
    });
  } catch {
    return [];
  }
}

export function getSellerLeads(_user?: any): any[] {
  try {
    return JSON.parse(localStorage.getItem("valubrix_leads") || "[]");
  } catch {
    return [];
  }
}

export function getSellerVisits(_user?: any): any[] {
  try {
    return JSON.parse(localStorage.getItem("valubrix_visit_requests") || "[]");
  } catch {
    return [];
  }
}
