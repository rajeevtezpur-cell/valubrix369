import { getActiveListingsForBuyer } from "../services/listingService";
export interface MockListing {
  id: string;
  title: string;
  propertyType: "flat" | "villa" | "plot";
  price: number;
  carpetArea: number;
  builtUpArea?: number;
  superBuiltUpArea?: number;
  bhk?: number;
  floor?: number;
  floorNumber?: number;
  totalFloors?: number;
  floorCategory?: string;
  location: string;
  city: string;
  facing?: string | null;
  coveredParking?: number;
  openParking?: number;
  balconies?: number;
  badges: string[];
  images: string[];
  builderName?: string | null;
  builder?: string | null;
  project?: string | null;
  projectName?: string | null;
  legalStatus?: string | null;
  landUse?: string | null;
  buildingAge?: string | null;
  plotArea?: number;
  amenities?: string[];
  description?: string;
  // Seller pricing
  sellerPrice?: number;
  // Listing type — 'sale' or 'rent' (defaults to 'sale' for legacy listings)
  listingType?: "sale" | "rent";
  // Rent-specific fields (populated when listingType === 'rent')
  rent?: number; // monthly rent in rupees
  deposit?: number; // security deposit in rupees
  leaseDuration?: string; // e.g. "11 months", "1 year", "2 years"
  furnishedStatus?: "furnished" | "semi-furnished" | "unfurnished";
  // AI Valuation — computed ONCE at listing time, never recomputed in buyer portal
  aiLower?: number;
  aiUpper?: number;
  aiMedian?: number;
  // AI Intelligence fields
  dealScore?: number; // 0–100
  dealClassification?: string; // "Strong Buy" | "Good Deal" | "Fair Price" | "Overpriced"
  investmentScore?: number; // 0–100
  aiRecommendation?: string; // "Strong Buy" | "Buy" | "Hold" | "Avoid"
  sellerId?: string;
  status?: string;
}

export const MOCK_LISTINGS: MockListing[] = [
  // ─── For Sale ─────────────────────────────────────────────────────────────
  {
    id: "1",
    title: "3 BHK Luxury Apartment in Indiranagar",
    propertyType: "flat",
    listingType: "sale",
    price: 14500000,
    carpetArea: 1450,
    builtUpArea: 1720,
    bhk: 3,
    floor: 8,
    totalFloors: 14,
    location: "Indiranagar",
    city: "Bangalore",
    facing: "North East",
    coveredParking: 2,
    balconies: 3,
    badges: ["High Value Asset", "Golden Verified"],
    builderName: "Prestige",
    legalStatus: "A Khata",
    amenities: [
      "Clubhouse",
      "Swimming Pool",
      "Gym",
      "Power Backup",
      "24/7 Security",
    ],
    description:
      "Premium 3 BHK apartment in the heart of Indiranagar with modern amenities.",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    ],
    dealScore: 72,
    dealClassification: "Good Deal",
    investmentScore: 84,
    aiRecommendation: "Buy",
  },
  {
    id: "2",
    title: "2 BHK Apartment in Koramangala",
    propertyType: "flat",
    listingType: "sale",
    price: 9200000,
    carpetArea: 1080,
    builtUpArea: 1280,
    bhk: 2,
    floor: 4,
    totalFloors: 10,
    location: "Koramangala",
    city: "Bangalore",
    facing: "East",
    coveredParking: 1,
    balconies: 2,
    badges: ["High Liquidity"],
    legalStatus: "A Khata",
    amenities: ["Gym", "Parking", "Power Backup"],
    description: "Well-connected 2 BHK in prime Koramangala location.",
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    ],
    dealScore: 55,
    dealClassification: "Fair Price",
    investmentScore: 78,
    aiRecommendation: "Hold",
  },
  {
    id: "3",
    title: "4 BHK Villa in Whitefield",
    propertyType: "villa",
    listingType: "sale",
    price: 28000000,
    carpetArea: 3200,
    builtUpArea: 3800,
    bhk: 4,
    floor: 1,
    totalFloors: 2,
    location: "Whitefield",
    city: "Bangalore",
    facing: "North East",
    coveredParking: 3,
    balconies: 4,
    badges: ["High Value Asset", "Golden Verified"],
    builderName: "Sobha",
    legalStatus: "A Khata",
    amenities: ["Clubhouse", "Infinity Pool", "Gym", "Garden", "24/7 Security"],
    description: "Luxurious 4 BHK villa in a gated community by Sobha.",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    ],
    dealScore: 81,
    dealClassification: "Strong Buy",
    investmentScore: 91,
    aiRecommendation: "Strong Buy",
  },
  {
    id: "4",
    title: "3 BHK Apartment in Hebbal",
    propertyType: "flat",
    listingType: "sale",
    price: 8500000,
    carpetArea: 1250,
    builtUpArea: 1480,
    bhk: 3,
    floor: 6,
    totalFloors: 12,
    location: "Hebbal",
    city: "Bangalore",
    facing: "West",
    coveredParking: 1,
    balconies: 2,
    badges: ["High Liquidity"],
    legalStatus: "A Khata",
    amenities: ["Gym", "Parking", "Power Backup", "Clubhouse"],
    description: "Spacious 3 BHK with lake views in upcoming Hebbal zone.",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800",
    ],
    dealScore: 68,
    dealClassification: "Good Deal",
    investmentScore: 82,
    aiRecommendation: "Buy",
  },
  {
    id: "5",
    title: "2 BHK Flat in Baner",
    propertyType: "flat",
    listingType: "sale",
    price: 7800000,
    carpetArea: 980,
    builtUpArea: 1150,
    bhk: 2,
    floor: 3,
    totalFloors: 8,
    location: "Baner",
    city: "Pune",
    facing: "East",
    coveredParking: 1,
    balconies: 1,
    badges: ["Golden Verified"],
    legalStatus: "MAHARERA Registered",
    amenities: ["Gym", "Parking", "24/7 Security"],
    description: "Modern 2 BHK flat in IT hub Baner, Pune.",
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
      "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800",
    ],
    dealScore: 42,
    dealClassification: "Fair Price",
    investmentScore: 70,
    aiRecommendation: "Hold",
  },
  {
    id: "6",
    title: "3 BHK Premium in Koregaon Park",
    propertyType: "flat",
    listingType: "sale",
    price: 18500000,
    carpetArea: 1800,
    builtUpArea: 2100,
    bhk: 3,
    floor: 10,
    totalFloors: 18,
    location: "Koregaon Park",
    city: "Pune",
    facing: "North East",
    coveredParking: 2,
    balconies: 3,
    badges: ["High Value Asset", "Golden Verified"],
    builderName: "Panchshil",
    legalStatus: "MAHARERA Registered",
    amenities: [
      "Clubhouse",
      "Infinity Pool",
      "Gym",
      "Concierge",
      "24/7 Security",
    ],
    description: "Ultra-premium 3 BHK in Koregaon Park by Panchshil Realty.",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800",
    ],
    dealScore: 31,
    dealClassification: "Overpriced",
    investmentScore: 62,
    aiRecommendation: "Avoid",
  },
  {
    id: "7",
    title: "Residential Plot in Dwarka",
    propertyType: "plot",
    listingType: "sale",
    price: 9500000,
    carpetArea: 0,
    location: "Dwarka",
    city: "Delhi",
    badges: ["Golden Verified"],
    legalStatus: "Freehold",
    landUse: "Residential",
    plotArea: 500,
    description: "Prime freehold residential plot in Sector 12, Dwarka.",
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
    ],
    dealScore: 61,
    dealClassification: "Good Deal",
    investmentScore: 75,
    aiRecommendation: "Buy",
  },
  {
    id: "8",
    title: "NA Plot in South Delhi",
    propertyType: "plot",
    listingType: "sale",
    price: 22000000,
    carpetArea: 0,
    location: "South Delhi",
    city: "Delhi",
    badges: ["High Value Asset", "Golden Verified"],
    legalStatus: "Freehold",
    landUse: "Residential",
    plotArea: 800,
    description: "Premium NA converted plot in South Delhi with road frontage.",
    images: [
      "https://images.unsplash.com/photo-1448630360428-65456885c650?w=800",
    ],
    dealScore: 36,
    dealClassification: "Overpriced",
    investmentScore: 65,
    aiRecommendation: "Hold",
  },

  // ─── For Rent ─────────────────────────────────────────────────────────────
  {
    id: "r1",
    title: "2 BHK Furnished Apartment in Koramangala",
    propertyType: "flat",
    listingType: "rent",
    price: 32000, // monthly rent as price for filter compatibility
    rent: 32000,
    deposit: 96000,
    leaseDuration: "11 months",
    furnishedStatus: "furnished",
    carpetArea: 1050,
    builtUpArea: 1220,
    bhk: 2,
    floor: 5,
    totalFloors: 10,
    location: "Koramangala",
    city: "Bangalore",
    facing: "East",
    coveredParking: 1,
    balconies: 2,
    badges: ["High Yield", "Furnished"],
    builderName: "Brigade",
    legalStatus: "A Khata",
    amenities: [
      "Gym",
      "Swimming Pool",
      "Power Backup",
      "24/7 Security",
      "Clubhouse",
    ],
    description:
      "Beautifully furnished 2 BHK in the heart of Koramangala. Walking distance to top restaurants and cafes. Ideal for working professionals.",
    images: [
      "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    ],
    dealScore: 74,
    dealClassification: "Good Deal",
    investmentScore: 80,
    aiRecommendation: "Buy",
  },
  {
    id: "r2",
    title: "3 BHK Semi-Furnished in HSR Layout",
    propertyType: "flat",
    listingType: "rent",
    price: 45000,
    rent: 45000,
    deposit: 135000,
    leaseDuration: "1 year",
    furnishedStatus: "semi-furnished",
    carpetArea: 1380,
    builtUpArea: 1600,
    bhk: 3,
    floor: 8,
    totalFloors: 16,
    location: "HSR Layout",
    city: "Bangalore",
    facing: "North",
    coveredParking: 2,
    balconies: 3,
    badges: ["Family Preferred", "Metro Nearby"],
    builderName: "Prestige",
    legalStatus: "A Khata",
    amenities: ["Gym", "Parking", "Power Backup", "CCTV", "Intercom", "Garden"],
    description:
      "Spacious 3 BHK with modular kitchen and wardrobes in all rooms. Quiet residential area, close to Agara Lake and HSR BDA Complex.",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    ],
    dealScore: 68,
    dealClassification: "Good Deal",
    investmentScore: 77,
    aiRecommendation: "Buy",
  },
  {
    id: "r3",
    title: "1 BHK Studio in Whitefield",
    propertyType: "flat",
    listingType: "rent",
    price: 18000,
    rent: 18000,
    deposit: 54000,
    leaseDuration: "11 months",
    furnishedStatus: "furnished",
    carpetArea: 620,
    builtUpArea: 720,
    bhk: 1,
    floor: 3,
    totalFloors: 8,
    location: "Whitefield",
    city: "Bangalore",
    facing: "South",
    coveredParking: 1,
    balconies: 1,
    badges: ["Best Value", "Tech Park Proximity"],
    legalStatus: "A Khata",
    amenities: ["Gym", "Power Backup", "24/7 Security", "EV Charging"],
    description:
      "Compact and well-appointed 1 BHK near ITPL. Perfect for IT professionals working in Whitefield tech parks. 5 min drive to Prestige Shantiniketan mall.",
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800",
    ],
    dealScore: 62,
    dealClassification: "Fair Price",
    investmentScore: 72,
    aiRecommendation: "Hold",
  },
];

export function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

/**
 * Returns ALL listings — both mock data and seller-created localStorage listings.
 * Mock listings are included as a baseline; localStorage listings are merged on top.
 */
export function getAllListings(): MockListing[] {
  const localListings = (() => {
    try {
      const userListings = getActiveListingsForBuyer();
      return userListings.map((ul: any) => {
        console.log(
          "[ValuBrix DEBUG] Buyer portal reading listing:",
          ul.id,
          "aiLower:",
          ul.aiLower,
          "aiUpper:",
          ul.aiUpper,
          "aiMedian:",
          ul.aiMedian,
          "facing:",
          ul.facing,
          "floor:",
          ul.floorNumber ?? ul.floor,
          "source: localStorage",
        );
        return {
          id: ul.id,
          title: ul.title,
          propertyType: (ul.propertyType?.toLowerCase() === "villa" ||
          ul.type?.toLowerCase() === "villa"
            ? "villa"
            : ul.propertyType?.toLowerCase() === "plot" ||
                ul.type?.toLowerCase() === "plot"
              ? "plot"
              : "flat") as "flat" | "villa" | "plot",
          price: ul.priceRaw || ul.sellerPrice || ul.rent || 0,
          sellerPrice: ul.sellerPrice || ul.priceRaw || 0,
          location: ul.locality || ul.location || ul.city || "",
          city: ul.city || ul.locality?.split(",").pop()?.trim() || "",
          bhk: ul.bhk,
          badges: ul.badges || ["New Listing"],
          images:
            Array.isArray(ul.images) && ul.images.length > 0 ? ul.images : [],
          dealScore: 60,
          dealClassification: "Fair Price" as const,
          investmentScore: 65,
          aiRecommendation: "Buy" as const,
          amenities: Array.isArray(ul.amenities) ? ul.amenities : [],
          carpetArea: ul.carpetArea
            ? Number(ul.carpetArea) || 0
            : ul.area
              ? Number.parseInt(String(ul.area)) || 0
              : 0,
          superBuiltUpArea: ul.superBuiltUpArea || ul.builtUpArea || undefined,
          builtUpArea: ul.builtUpArea || ul.superBuiltUpArea || undefined,
          builderName: ul.builderName || ul.builder || undefined,
          builder: ul.builder || ul.builderName || undefined,
          project: ul.project || ul.projectName || undefined,
          projectName: ul.projectName || ul.project || undefined,
          floor:
            ul.floorNumber !== undefined && ul.floorNumber !== null
              ? Number(ul.floorNumber)
              : ul.floor !== undefined
                ? Number(ul.floor)
                : undefined,
          floorNumber:
            ul.floorNumber !== undefined && ul.floorNumber !== null
              ? Number(ul.floorNumber)
              : undefined,
          totalFloors:
            ul.totalFloors !== undefined && ul.totalFloors !== null
              ? Number(ul.totalFloors)
              : undefined,
          floorCategory: ul.floorCategory || undefined,
          facing: ul.facing || undefined,
          coveredParking:
            ul.coveredParking !== undefined
              ? Number(ul.coveredParking)
              : undefined,
          openParking:
            ul.openParking !== undefined ? Number(ul.openParking) : undefined,
          balconies:
            ul.balconies !== undefined ? Number(ul.balconies) : undefined,
          legalStatus: ul.legalStatus || undefined,
          buildingAge: ul.buildingAge || undefined,
          listingType: ul.listingType || "sale",
          rent: ul.rent ? Number(ul.rent) : undefined,
          deposit: ul.deposit ? Number(ul.deposit) : undefined,
          leaseDuration: ul.leaseDuration || undefined,
          furnishedStatus: ul.furnishedStatus || undefined,
          aiLower: ul.aiLower || undefined,
          aiUpper: ul.aiUpper || undefined,
          aiMedian: ul.aiMedian || undefined,
          sellerId: ul.sellerId,
          status: ul.status,
        };
      });
    } catch {
      return [];
    }
  })();

  // Merge: localStorage listings first (user-created), then mock listings
  // Deduplicate by id to prevent double-showing if IDs overlap
  const localIds = new Set(localListings.map((l) => l.id));
  const mockOnly = MOCK_LISTINGS.filter((m) => !localIds.has(m.id));
  return [...localListings, ...mockOnly];
}
