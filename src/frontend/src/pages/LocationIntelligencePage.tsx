import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Building2,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AnalyzingOverlay from "../components/AnalyzingOverlay";
import GlobalMapComponent from "../components/GlobalMapComponent";
import LocalityDropdown from "../components/LocalityDropdown";
import { useAuth } from "../context/AuthContext";
import { getCoords } from "../data/localityCoords";
import {
  type AreaIntelligenceOutput,
  getAreaIntelligence,
} from "../engines/areaIntelligenceEngine";
import { formatMetroDisplay } from "../engines/metroEngine";
import { fmtMonthlyRent, fmtRentPerSqft } from "../utils/rentDisplay";
import { getLocalityRentMetrics } from "../utils/rentEngine";
import { reverseGeocode } from "../utils/reverseGeocode";

// fmtRent moved to rentDisplay.ts — use fmtMonthlyRent

// ─── Types ────────────────────────────────────────────────────────────────────
interface LocalityData {
  id: string;
  name: string;
  city: string;
  priceMin: number;
  priceMax: number;
  marketTag: string;
  tagColor: string;
  monthlyIndex: number;
  subLocalities: string[];
  growthCorridor?: string;
  growthRate?: string;
  amenityScore: "High" | "Medium" | "Low";
  metroNearby: boolean;
  infrastructure: string[];
  futurePotential: "High" | "Medium" | "Low";
  transactionDensity: "High" | "Medium" | "Low";
  lat?: number;
  lng?: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const CITIES = ["Bangalore", "Pune", "New Delhi"];

const PINCODE_MAP: Record<string, { city: string; locality: string }> = {
  "560038": { city: "Bangalore", locality: "indiranagar" },
  "560034": { city: "Bangalore", locality: "koramangala" },
  "560066": { city: "Bangalore", locality: "whitefield" },
  "560035": { city: "Bangalore", locality: "sarjapur" },
  "560024": { city: "Bangalore", locality: "hebbal" },
  "560064": { city: "Bangalore", locality: "yelahanka" },
  "560010": { city: "Bangalore", locality: "jalahalli" },
  "562110": { city: "Bangalore", locality: "devanahalli" },
  "562125": { city: "Bangalore", locality: "rajankunte" },
  "560100": { city: "Bangalore", locality: "electronic-city" },
};

const LOCALITIES_BY_CITY: Record<string, LocalityData[]> = {
  Bangalore: [
    {
      id: "indiranagar",
      name: "Indiranagar",
      city: "Bangalore",
      lat: 12.9784,
      lng: 77.6408,
      priceMin: 30000,
      priceMax: 45000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.8,
      subLocalities: [
        "100ft Road",
        "CMH Road",
        "HAL 2nd Stage",
        "HAL 3rd Stage",
      ],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: [
        "Metro Station",
        "CMH Road",
        "HAL Airport",
        "Tech Parks",
      ],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "12%",
    },
    {
      id: "koramangala",
      name: "Koramangala",
      city: "Bangalore",
      lat: 12.9352,
      lng: 77.6245,
      priceMin: 25000,
      priceMax: 38000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.8,
      subLocalities: ["1st Block", "5th Block", "6th Block", "7th Block"],
      amenityScore: "High",
      metroNearby: false,
      infrastructure: ["Ring Road", "Forum Mall", "IT Parks", "Hospitals"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "11%",
    },
    {
      id: "whitefield",
      name: "Whitefield",
      city: "Bangalore",
      lat: 12.9698,
      lng: 77.7499,
      priceMin: 12000,
      priceMax: 20000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["ITPL Road", "Varthur Road", "Hope Farm", "Kadugodi"],
      growthCorridor: "East Bangalore IT Corridor",
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["ITPL", "EPIP Zone", "Phoenix Marketcity"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "hebbal",
      name: "Hebbal",
      city: "Bangalore",
      lat: 13.035,
      lng: 77.597,
      priceMin: 14000,
      priceMax: 22000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.7,
      subLocalities: [
        "Hebbal Kempapura",
        "Lottegolla Halli",
        "Outer Ring Road",
      ],
      growthCorridor: "North Bangalore Corridor",
      growthRate: "10%",
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: [
        "Outer Ring Road",
        "Manyata Tech Park",
        "Hebbal Flyover",
      ],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "yelahanka",
      name: "Yelahanka",
      city: "Bangalore",
      lat: 13.1007,
      lng: 77.5963,
      priceMin: 8000,
      priceMax: 14000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.65,
      subLocalities: ["Yelahanka New Town", "Attur Layout", "Sahakar Nagar"],
      growthCorridor: "North Bangalore Aerospace Corridor",
      growthRate: "9.5%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["NH 44", "Air Force Station", "BIAL Road"],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "hsr-layout",
      name: "HSR Layout",
      city: "Bangalore",
      lat: 12.9116,
      lng: 77.6389,
      priceMin: 18000,
      priceMax: 30000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.75,
      subLocalities: ["Sector 1", "Sector 2", "Sector 7", "BDA Complex"],
      growthRate: "10%",
      amenityScore: "High",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "Arekere", "Agara Lake"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "sarjapur",
      name: "Sarjapur Road",
      city: "Bangalore",
      lat: 12.8606,
      lng: 77.7836,
      priceMin: 10000,
      priceMax: 18000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Marathahalli Junction", "Wipro Corporate", "Eco World"],
      growthCorridor: "South-East IT Corridor",
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Wipro", "Accenture", "Eco Space", "Outer Ring Road"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "rajankunte",
      name: "Rajankunte",
      city: "Bangalore",
      lat: 13.13,
      lng: 77.6,
      priceMin: 5000,
      priceMax: 9000,
      marketTag: "Emerging Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: [
        "Rajankunte Village",
        "Yelahanka Cross",
        "Doddaballapur Road",
      ],
      growthCorridor: "North Bangalore Growth Corridor",
      growthRate: "10.5%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["NH 44", "Doddaballapur Road", "KIADB Industrial Area"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "devanahalli",
      name: "Devanahalli",
      city: "Bangalore",
      lat: 13.25,
      lng: 77.71,
      priceMin: 4000,
      priceMax: 8000,
      marketTag: "Emerging Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Devanahalli Town", "BIAL Road", "Aerospace SEZ"],
      growthCorridor: "Airport Corridor",
      growthRate: "11%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["KIAL Airport", "Aerospace Park", "ITIR"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "electronic-city",
      name: "Electronic City",
      city: "Bangalore",
      lat: 12.8399,
      lng: 77.677,
      priceMin: 9000,
      priceMax: 15000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Phase 1", "Phase 2", "Neeladri Road", "Hebbagodi"],
      growthCorridor: "South IT Corridor",
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: [
        "Elevated Expressway",
        "Infosys Campus",
        "Wipro Phase 2",
      ],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "jalahalli",
      name: "Jalahalli",
      city: "Bangalore",
      lat: 13.0427,
      lng: 77.5472,
      priceMin: 7000,
      priceMax: 12000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Jalahalli Cross", "BEL Layout", "MSR Nagar"],
      growthRate: "8%",
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: ["BEL", "Metro Green Line", "Tumkur Road"],
      futurePotential: "Medium",
      transactionDensity: "Medium",
    },
    {
      id: "peenya",
      name: "Peenya",
      city: "Bangalore",
      lat: 13.028,
      lng: 77.515,
      priceMin: 5000,
      priceMax: 9000,
      marketTag: "Industrial Zone",
      tagColor: "blue",
      monthlyIndex: 0.5,
      subLocalities: ["Peenya Industrial Area", "Peenya 2nd Stage"],
      growthRate: "7%",
      amenityScore: "Low",
      metroNearby: true,
      infrastructure: ["Metro Green Line", "Tumkur Road", "KIADB"],
      futurePotential: "Medium",
      transactionDensity: "Medium",
    },
    {
      id: "hennur",
      name: "Hennur",
      city: "Bangalore",
      lat: 13.04,
      lng: 77.64,
      priceMin: 7500,
      priceMax: 14000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.65,
      subLocalities: ["Hennur Road", "Hennur Cross", "Kothanur"],
      growthRate: "11%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "Manyata Tech Park", "Hennur Lake"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "varthur",
      name: "Varthur",
      city: "Bangalore",
      lat: 12.94,
      lng: 77.75,
      priceMin: 7000,
      priceMax: 13000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Varthur Road", "Gunjur", "Thubarahalli"],
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Whitefield", "ITPL", "Outer Ring Road"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "marathahalli",
      name: "Marathahalli",
      city: "Bangalore",
      lat: 12.9547,
      lng: 77.7019,
      priceMin: 9000,
      priceMax: 16000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.65,
      subLocalities: ["Marathahalli Bridge", "Outer Ring Road", "Kundalahalli"],
      growthRate: "10%",
      amenityScore: "High",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "ITPL", "Phoenix Marketcity"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "bellandur",
      name: "Bellandur",
      city: "Bangalore",
      lat: 12.9352,
      lng: 77.6958,
      priceMin: 8500,
      priceMax: 15000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.65,
      subLocalities: [
        "Bellandur Lake Road",
        "Outer Ring Road",
        "Kadubeesanahalli",
      ],
      growthRate: "10%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "SEZ", "Bellandur Lake"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "kogilu",
      name: "Kogilu",
      city: "Bangalore",
      lat: 13.09,
      lng: 77.62,
      priceMin: 7000,
      priceMax: 13000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: ["Kogilu Main Road", "Kogilu Cross"],
      growthRate: "10%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Bellary Road", "Airport Road", "Manyata Tech Park"],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "kannur",
      name: "Kannur",
      city: "Bangalore",
      lat: 13.113,
      lng: 77.625,
      priceMin: 6000,
      priceMax: 11000,
      marketTag: "Airport Corridor",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Kannur Road", "Kannur Main Road"],
      growthRate: "9%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["Bellary Road", "BIAL Road", "Airport Corridor"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "sadahalli",
      name: "Sadahalli",
      city: "Bangalore",
      lat: 13.21,
      lng: 77.67,
      priceMin: 6500,
      priceMax: 12000,
      marketTag: "Airport Corridor",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Sadahalli Gate", "Airport Zone"],
      growthRate: "9%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["BIAL Road", "Kempegowda International Airport"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "shettigere",
      name: "Shettigere",
      city: "Bangalore",
      lat: 13.198,
      lng: 77.683,
      priceMin: 5500,
      priceMax: 11000,
      marketTag: "Airport Corridor",
      tagColor: "green",
      monthlyIndex: 0.5,
      subLocalities: ["Shettigere Road", "Airport Corridor"],
      growthRate: "8%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["BIAL Road", "STRR", "Kempegowda Airport"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "hessarghatta",
      name: "Hessarghatta",
      city: "Bangalore",
      lat: 13.19,
      lng: 77.48,
      priceMin: 3000,
      priceMax: 7000,
      marketTag: "Emerging Zone",
      tagColor: "green",
      monthlyIndex: 0.45,
      subLocalities: ["Hessarghatta Lake Road", "Hessarghatta Cross"],
      growthRate: "8%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["Tumkur Road", "STRR", "Hessarghatta Lake"],
      futurePotential: "Medium",
      transactionDensity: "Low",
    },
    {
      id: "marasandra",
      name: "Marasandra",
      city: "Bangalore",
      lat: 13.18,
      lng: 77.56,
      priceMin: 3500,
      priceMax: 7000,
      marketTag: "Emerging Zone",
      tagColor: "green",
      monthlyIndex: 0.4,
      subLocalities: ["Marasandra Road"],
      growthRate: "7%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["Doddaballapur Road", "STRR"],
      futurePotential: "Medium",
      transactionDensity: "Low",
    },
    {
      id: "bagalur",
      name: "Bagalur",
      city: "Bangalore",
      lat: 13.14,
      lng: 77.67,
      priceMin: 4000,
      priceMax: 8000,
      marketTag: "Airport Corridor",
      tagColor: "green",
      monthlyIndex: 0.45,
      subLocalities: ["Bagalur Main Road", "Bagalur KIADB"],
      growthRate: "8%",
      amenityScore: "Low",
      metroNearby: false,
      infrastructure: ["Bellary Road", "BIAL Road", "KIADB Aerospace Park"],
      futurePotential: "High",
      transactionDensity: "Low",
    },
    {
      id: "vidyaranyapura",
      name: "Vidyaranyapura",
      city: "Bangalore",
      lat: 13.08,
      lng: 77.56,
      priceMin: 6000,
      priceMax: 11000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Vidyaranyapura Main Road", "Sahakar Nagar"],
      growthRate: "8%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Tumkur Road", "BEL Road", "Sahakar Nagar"],
      futurePotential: "Medium",
      transactionDensity: "Medium",
    },
    {
      id: "thanisandra",
      name: "Thanisandra",
      city: "Bangalore",
      lat: 13.05,
      lng: 77.62,
      priceMin: 7000,
      priceMax: 13000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: ["Thanisandra Main Road", "Thanisandra Extension"],
      growthRate: "10%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Bellary Road", "Manyata Tech Park", "Hebbal ORR"],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "nagavara",
      name: "Nagavara",
      city: "Bangalore",
      lat: 13.048,
      lng: 77.62,
      priceMin: 9000,
      priceMax: 17000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.65,
      subLocalities: [
        "Nagavara Lake",
        "Manyata Tech Park",
        "Nagawara Junction",
      ],
      growthRate: "11%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "Manyata Tech Park", "Nagavara Lake"],
      futurePotential: "High",
      transactionDensity: "High",
    },
    {
      id: "jakkur",
      name: "Jakkur",
      city: "Bangalore",
      lat: 13.07,
      lng: 77.61,
      priceMin: 6000,
      priceMax: 11000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Jakkur Lake Road", "Jakkur Main Road"],
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Bellary Road", "Jakkur Flying School", "Yelahanka ORR"],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "horamavu",
      name: "Horamavu",
      city: "Bangalore",
      lat: 13.03,
      lng: 77.66,
      priceMin: 6500,
      priceMax: 11000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["Horamavu Agara", "Horamavu Main Road"],
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Outer Ring Road", "Hebbal", "Banaswadi"],
      futurePotential: "Medium",
      transactionDensity: "Medium",
    },
    {
      id: "kr-puram",
      name: "KR Puram",
      city: "Bangalore",
      lat: 13.0077,
      lng: 77.695,
      priceMin: 5500,
      priceMax: 10000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.55,
      subLocalities: ["KR Puram Bridge", "Old Madras Road", "Tin Factory"],
      growthRate: "8%",
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: [
        "Old Madras Road",
        "Metro Purple Line",
        "Outer Ring Road",
      ],
      futurePotential: "Medium",
      transactionDensity: "Medium",
    },
    {
      id: "electronic-city-phase-2",
      name: "Electronic City Phase 2",
      city: "Bangalore",
      lat: 12.83,
      lng: 77.68,
      priceMin: 5000,
      priceMax: 9000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.55,
      subLocalities: ["Electronic City Phase 2", "Neeladri Road"],
      growthRate: "8%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Hosur Road", "NICE Road", "Infosys Campus"],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
    {
      id: "bannerghatta-road",
      name: "Bannerghatta Road",
      city: "Bangalore",
      lat: 12.9,
      lng: 77.6,
      priceMin: 7500,
      priceMax: 14000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: ["JP Nagar 7th Phase", "Gottigere", "Arekere"],
      growthRate: "9%",
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: [
        "Bannerghatta National Park",
        "NICE Road",
        "Kanakapura Road",
      ],
      futurePotential: "High",
      transactionDensity: "Medium",
    },
  ],
  Mumbai: [
    {
      id: "bandra",
      name: "Bandra",
      city: "Mumbai",
      lat: 19.0596,
      lng: 72.8295,
      priceMin: 45000,
      priceMax: 75000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.8,
      subLocalities: ["Bandra West", "Bandra East", "Carter Road"],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: ["Western Railway", "Sea Link", "Metro Line 2"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "12%",
    },
    {
      id: "andheri",
      name: "Andheri",
      city: "Mumbai",
      lat: 19.1136,
      lng: 72.8697,
      priceMin: 22000,
      priceMax: 35000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Andheri West", "Andheri East", "MIDC"],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: ["Metro Line 1", "SEEPZ", "Andheri Railway"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "10%",
    },
    {
      id: "powai",
      name: "Powai",
      city: "Mumbai",
      lat: 19.1197,
      lng: 72.906,
      priceMin: 28000,
      priceMax: 42000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Hiranandani Gardens", "IIT Powai", "Chandivali"],
      amenityScore: "High",
      metroNearby: false,
      infrastructure: ["IIT Bombay", "Hiranandani Tech Park", "Powai Lake"],
      futurePotential: "High",
      transactionDensity: "Medium",
      growthRate: "9%",
    },
    {
      id: "thane",
      name: "Thane",
      city: "Mumbai",
      lat: 19.2183,
      lng: 72.9781,
      priceMin: 12000,
      priceMax: 22000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: ["Thane West", "Thane East", "Ghodbunder Road"],
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: [
        "Thane Railway",
        "Metro Line 4",
        "Eastern Express Highway",
      ],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "11%",
    },
  ],
  "New Delhi": [
    {
      id: "south-ex",
      name: "South Extension",
      city: "New Delhi",
      lat: 28.5706,
      lng: 77.2272,
      priceMin: 35000,
      priceMax: 60000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.8,
      subLocalities: ["South Ex Part 1", "South Ex Part 2"],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: ["Metro Pink Line", "Ring Road", "DLF Centre"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "11%",
    },
    {
      id: "dwarka",
      name: "Dwarka",
      city: "New Delhi",
      lat: 28.5921,
      lng: 77.0459,
      priceMin: 10000,
      priceMax: 18000,
      marketTag: "Growth Zone",
      tagColor: "green",
      monthlyIndex: 0.6,
      subLocalities: ["Sector 10", "Sector 12", "Sector 21"],
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: ["Metro Blue Line", "IGI Airport", "Dwarka Expressway"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "10%",
    },
    {
      id: "noida",
      name: "Noida",
      city: "New Delhi",
      lat: 28.5355,
      lng: 77.391,
      priceMin: 8000,
      priceMax: 16000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Sector 62", "Sector 18", "Sector 137"],
      amenityScore: "Medium",
      metroNearby: true,
      infrastructure: ["Metro Blue Line", "Noida Expressway", "IT Parks"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "9%",
    },
  ],
  Pune: [
    {
      id: "baner",
      name: "Baner",
      city: "Pune",
      lat: 18.5596,
      lng: 73.7882,
      priceMin: 10000,
      priceMax: 18000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Baner Road", "Sus Road", "Balewadi"],
      amenityScore: "High",
      metroNearby: false,
      infrastructure: ["Mumbai-Pune Expressway", "IT Parks", "Hospitals"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "11%",
    },
    {
      id: "hinjewadi",
      name: "Hinjewadi",
      city: "Pune",
      lat: 18.5912,
      lng: 73.7382,
      priceMin: 8000,
      priceMax: 15000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Phase 1", "Phase 2", "Phase 3", "Wakad"],
      amenityScore: "Medium",
      metroNearby: false,
      infrastructure: ["Rajiv Gandhi IT Park", "Infosys", "Wipro"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "10%",
    },
  ],
  Hyderabad: [
    {
      id: "hitech-city",
      name: "HITEC City",
      city: "Hyderabad",
      lat: 17.4474,
      lng: 78.3762,
      priceMin: 10000,
      priceMax: 20000,
      marketTag: "IT Corridor",
      tagColor: "blue",
      monthlyIndex: 0.6,
      subLocalities: ["Madhapur", "Kondapur", "Gachibowli"],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: ["Metro Blue Line", "Cyber Towers", "Microsoft Campus"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "12%",
    },
    {
      id: "jubilee-hills",
      name: "Jubilee Hills",
      city: "Hyderabad",
      lat: 17.4321,
      lng: 78.4115,
      priceMin: 25000,
      priceMax: 45000,
      marketTag: "Prime Zone",
      tagColor: "gold",
      monthlyIndex: 0.8,
      subLocalities: ["Road No 36", "Road No 45", "Film Nagar"],
      amenityScore: "High",
      metroNearby: true,
      infrastructure: ["Metro Yellow Line", "KBR Park", "Hospitals"],
      futurePotential: "High",
      transactionDensity: "High",
      growthRate: "11%",
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tagStyle(color: string) {
  if (color === "gold")
    return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  if (color === "blue")
    return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (color === "purple")
    return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
}

// Find all localities across all cities flattened for search
const ALL_LOCALITIES = Object.values(LOCALITIES_BY_CITY).flat();

function findLocalityByLatLng(lat: number, lng: number): LocalityData | null {
  let best: LocalityData | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const loc of ALL_LOCALITIES) {
    if (loc.lat === undefined || loc.lng === undefined) continue;
    const d = Math.sqrt((loc.lat - lat) ** 2 + (loc.lng - lng) ** 2);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best;
}

// ─── Engine-Driven Intelligence Panel (BUG FIX: uses exact lat/lng) ──────────
function EngineIntelPanel({
  intel,
  locationName,
}: {
  intel: AreaIntelligenceOutput;
  locationName: string;
}) {
  const classColor =
    intel.classification === "High Growth"
      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
      : intel.classification === "Emerging"
        ? "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
        : "text-red-400 bg-red-500/15 border-red-500/30";

  const scoreBar = (score: number, color: string) => (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${score}%`, transition: "width 0.6s ease" }}
      />
    </div>
  );

  return (
    <div className="space-y-4" data-ocid="location.engine_intel.panel">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-lg">{locationName}</h3>
            <p className="text-white/50 text-sm">
              ₹{intel.avgPricePerSqft.toLocaleString()} / sqft (area base)
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${classColor}`}
          >
            {intel.classification}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-400 font-medium">
            ↑ {intel.priceTrend1Y.toFixed(1)}% (1Y)
          </span>
          <span className="text-blue-400 font-medium">
            ↑ {intel.priceTrend3Y.toFixed(1)}% (3Y)
          </span>
          <span className="ml-auto text-white/40 text-xs">
            Confidence: {intel.confidence}%
          </span>
        </div>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Investment",
            score: intel.investmentScore,
            color: "bg-yellow-400",
          },
          {
            label: "Growth",
            score: intel.growthScore,
            color: "bg-emerald-400",
          },
          {
            label: "Livability",
            score: intel.livabilityScore,
            color: "bg-blue-400",
          },
          { label: "Demand", score: intel.demandScore, color: "bg-purple-400" },
        ].map(({ label, score, color }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/3 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-xs">{label}</span>
              <span className="text-white font-bold text-sm">{score}</span>
            </div>
            {scoreBar(score, color)}
          </div>
        ))}
      </div>

      {/* Nearest Metros */}
      {intel.nearestMetros.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
            Nearest Metros
          </p>
          <div className="space-y-1.5">
            {intel.nearestMetros.map((m) => (
              <div
                key={m.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-white/80 text-xs">{m.name}</span>
                <span className="text-yellow-400 text-xs font-medium">
                  {(m.osrmKm ?? 0).toFixed(1)} km •{" "}
                  {m.osrmDurationMins ?? m.travelMins ?? 0} mins
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tech Parks */}
      {intel.topTechParks.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
            Nearby Tech Parks
          </p>
          <div className="space-y-1.5">
            {intel.topTechParks.slice(0, 3).map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <span className="text-white/80 text-xs truncate max-w-[60%]">
                  {t.name}
                </span>
                <span className="text-blue-400 text-xs">
                  {t.osrmDurationMins ?? t.travelMins ?? 0} mins (
                  {(t.osrmKm ?? 0).toFixed(1)} km)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospitals + Schools row */}
      <div className="grid grid-cols-2 gap-3">
        {intel.topHospitals.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
              Hospitals
            </p>
            <div className="space-y-1">
              {intel.topHospitals.slice(0, 3).map((h) => (
                <div key={h.name} className="text-xs">
                  <span className="text-white/70 truncate block">{h.name}</span>
                  <span className="text-emerald-400">
                    {h.osrmDurationMins ?? h.travelMins ?? 0} mins
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {intel.topSchools.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">
              Schools
            </p>
            <div className="space-y-1">
              {intel.topSchools.slice(0, 3).map((s) => (
                <div key={s.name} className="text-xs">
                  <span className="text-white/70 truncate block">{s.name}</span>
                  <span className="text-blue-400">
                    {s.osrmDurationMins ?? s.travelMins ?? 0} mins
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Growth Driver */}
      {intel.growthDriver && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/5 p-3">
          <p className="text-yellow-400/70 text-xs uppercase tracking-widest mb-1">
            Growth Driver
          </p>
          <p className="text-white/80 text-sm">{intel.growthDriver}</p>
        </div>
      )}

      {/* Rental Intelligence */}
      <RentalIntelPanel locationName={locationName} />
    </div>
  );
}

function RentalIntelPanel({ locationName }: { locationName: string }) {
  const rentMetrics = getLocalityRentMetrics(locationName);
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
      data-ocid="location.rental_intel.panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <p className="text-white/50 text-xs uppercase tracking-widest flex-1">
          Rental Intelligence
        </p>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border ${
            rentMetrics.confidenceTier === "high"
              ? "text-emerald-400/70 bg-emerald-500/10 border-emerald-500/20"
              : rentMetrics.confidenceTier === "medium"
                ? "text-blue-400/70 bg-blue-500/10 border-blue-500/20"
                : "text-white/30 bg-white/5 border-white/10"
          }`}
        >
          {rentMetrics.confidenceTier === "high"
            ? "Market-based"
            : "AI Estimate"}
        </span>
      </div>

      {/* Avg Rent by BHK */}
      {Object.keys(rentMetrics.avgRentByBhk).length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[1, 2, 3].map((bhk) =>
            rentMetrics.avgRentByBhk[bhk] ? (
              <div key={bhk} className="text-center">
                <p className="text-white/30 text-[10px]">{bhk} BHK</p>
                <p className="text-white/80 text-xs font-medium">
                  {fmtMonthlyRent(rentMetrics.avgRentByBhk[bhk])}
                </p>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-white/30 text-xs mb-3">No BHK rent data yet</p>
      )}

      {/* Rent/sqft and Yield range */}
      <div className="flex items-center gap-4 text-xs mb-2">
        {rentMetrics.rentPerSqft > 0 &&
          (() => {
            const psfLabel = fmtRentPerSqft(rentMetrics.rentPerSqft);
            return psfLabel ? (
              <span className="text-white/50">{psfLabel}</span>
            ) : null;
          })()}
        {rentMetrics.yieldRange[0] > 0 && (
          <span className="text-white/50">
            Yield{" "}
            <span className="text-emerald-400">
              {rentMetrics.yieldRange[0].toFixed(1)}–
              {rentMetrics.yieldRange[1].toFixed(1)}%
            </span>
          </span>
        )}
      </div>

      {/* Rent Trend */}
      <div className="flex items-center gap-1.5 text-xs">
        {rentMetrics.trend === null ? (
          <span className="text-white/25">Insufficient rent data</span>
        ) : rentMetrics.trend === "up" ? (
          <span className="text-emerald-400">↑ {rentMetrics.trendLabel}</span>
        ) : rentMetrics.trend === "down" ? (
          <span className="text-red-400">↓ {rentMetrics.trendLabel}</span>
        ) : (
          <span className="text-white/40">→ {rentMetrics.trendLabel}</span>
        )}
      </div>
    </div>
  );
}

export default function LocationIntelligencePage() {
  const navigate = useNavigate();
  const { user, openLoginModal: openRoleSelect } = useAuth();
  const _searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Unified location state
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    source: "search" | "map";
    locality?: LocalityData;
  } | null>(null);

  // The originally searched location — used for "reset" button
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    lat: number;
    lng: number;
    locality?: LocalityData;
  } | null>(null);

  // Intelligence data driven by selectedLocation
  const [intelLocality, setIntelLocality] = useState<LocalityData | null>(null);
  const [_refreshKey, setRefreshKey] = useState(0);
  const [areaIntel, setAreaIntel] = useState<AreaIntelligenceOutput | null>(
    null,
  );
  const [geoKey, setGeoKey] = useState(0);

  // Analyzing overlay state — shown when location changes before results appear
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [intelReady, setIntelReady] = useState(false);

  // Dropdown close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When selectedLocation changes → show analyzing overlay, then load intel
  // biome-ignore lint/correctness/useExhaustiveDependencies: using primitive deps intentionally
  useEffect(() => {
    if (!selectedLocation) return;
    // Start overlay
    setShowAnalyzing(true);
    setIntelReady(false);
    const found = findLocalityByLatLng(
      selectedLocation.lat,
      selectedLocation.lng,
    );
    setIntelLocality(found);
    setRefreshKey((prev) => prev + 1);
    // BUG FIX: always use exact lat/lng for live engine computation
    const intel = getAreaIntelligence(
      selectedLocation.name,
      selectedLocation.lat,
      selectedLocation.lng,
    );
    setAreaIntel(intel);
    setGeoKey((prev) => prev + 1);
    // Signal data is ready for overlay
    setIntelReady(true);
  }, [selectedLocation?.lat, selectedLocation?.lng, selectedLocation?.name]);

  // Autocomplete: cities + localities
  const filteredCities =
    searchQuery.length >= 1
      ? CITIES.filter((c) =>
          c.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : CITIES;

  const filteredLocalities: (LocalityData & { parentCity: string })[] =
    searchQuery.length >= 2
      ? Object.entries(LOCALITIES_BY_CITY)
          .flatMap(([city, locs]) =>
            locs
              .filter((l) =>
                l.name.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((l) => ({ ...l, parentCity: city })),
          )
          .slice(0, 8)
      : [];

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    // Pincode detection
    if (/^\d{6}$/.test(val)) {
      const match = PINCODE_MAP[val];
      if (match) {
        const locs = LOCALITIES_BY_CITY[match.city] ?? [];
        const loc = locs.find((l) => l.id === match.locality);
        if (loc) {
          handleLocalitySelect(loc);
          return;
        }
      }
    }
    // Auto-select when LocalityDropdown fires onChange with exact locality name match
    // (LocalityDropdown has its own internal dropdown that calls onChange(name) on selection)
    const exactMatch = ALL_LOCALITIES.find(
      (l) => l.name.toLowerCase() === val.toLowerCase().trim(),
    );
    if (exactMatch) {
      handleLocalitySelect(exactMatch);
      return;
    }
    setShowDropdown(val.length > 0);
  };

  const handleLocalitySelect = (loc: LocalityData) => {
    const resolved = getCoords(loc.name);
    const lat = loc.lat ?? resolved?.lat ?? 12.9716;
    const lng = loc.lng ?? resolved?.lng ?? 77.5946;
    setSearchQuery(loc.name);
    setShowDropdown(false);
    const newLoc = {
      name: loc.name,
      lat,
      lng,
      source: "search" as const,
      locality: loc,
    };
    setSearchedLocation({ name: loc.name, lat, lng, locality: loc });
    setSelectedLocation(newLoc);
  };

  const handleCitySelect = (city: string) => {
    // Pick first locality of that city
    const locs = LOCALITIES_BY_CITY[city];
    if (locs && locs.length > 0) {
      handleLocalitySelect(locs[0]);
    } else {
      setSearchQuery(city);
      setShowDropdown(false);
    }
  };

  // Called when user drags the map pin
  const handleLocationChange = (lat: number, lng: number, name: string) => {
    const found = findLocalityByLatLng(lat, lng);
    setSelectedLocation({
      name: name || "Loading...",
      lat,
      lng,
      source: "map",
      locality: found ?? undefined,
    });
  };

  // Reset to originally searched location
  const handleResetToSearched = () => {
    if (!searchedLocation) return;
    setSelectedLocation({
      ...searchedLocation,
      source: "search",
    });
  };

  const mapCenter = selectedLocation
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
    : { lat: 12.9716, lng: 77.5946 };

  const mapCity = intelLocality?.city ?? "Bangalore";

  return (
    <>
      <AnalyzingOverlay
        module="area"
        isVisible={showAnalyzing}
        dataReady={intelReady}
        onComplete={() => setShowAnalyzing(false)}
      />
      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(135deg, #05091a 0%, #0a0f1e 50%, #091422 100%)",
        }}
      >
        <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.4s ease forwards; }
      `}</style>

        {/* Navbar */}
        <nav
          className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-xl"
          style={{ background: "rgba(5,9,26,0.85)" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              data-ocid="location_intel.back_button"
            >
              <ArrowLeft size={18} />
              <span className="text-sm hidden sm:block">Back</span>
            </button>
            <a
              href="/"
              className="flex items-center gap-2"
              data-ocid="location_intel.logo.link"
            >
              <img
                src="/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png"
                alt="ValuBrix"
                className="h-8 w-auto object-contain"
              />
            </a>
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-2 text-white/40 text-sm">
              <MapPin size={14} className="text-[#D4AF37]" />
              Geo Intelligence
            </div>
            {!user && (
              <button
                type="button"
                data-ocid="location_intel.login.button"
                onClick={() => openRoleSelect()}
                className="hidden sm:block px-4 py-1.5 text-sm font-semibold rounded-full border transition-all"
                style={{ color: "#C9A84C", borderColor: "#C9A84C" }}
              >
                Login
              </button>
            )}
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-300 text-sm font-medium mb-4">
              <Sparkles size={15} />
              Location Intelligence Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Geo Area Intelligence
            </h1>
            <p className="text-white/50">
              Search a location or drag the map pin to explore real estate
              intelligence
            </p>
          </div>

          {/* Search Bar */}
          <div ref={dropdownRef} className="relative max-w-2xl mx-auto mb-6">
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 border backdrop-blur-sm transition-all focus-within:border-yellow-500/60 focus-within:shadow-lg focus-within:shadow-yellow-500/10 bg-white/5 border-white/15">
              <Search size={20} className="text-yellow-400 shrink-0" />
              <LocalityDropdown
                value={searchQuery}
                onChange={(name) => {
                  handleSearchChange(name);
                }}
                placeholder="Search city or locality (e.g. Indiranagar, Mumbai)..."
                className="flex-1"
                data-ocid="location_intel.city.search_input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowDropdown(false);
                  }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  data-ocid="location_intel.search.close_button"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div
                className="absolute left-0 right-0 mt-2 z-50 rounded-xl overflow-hidden border border-white/10 bg-[#0d1526]/95 backdrop-blur-xl shadow-2xl"
                data-ocid="location_intel.city.dropdown_menu"
              >
                {filteredLocalities.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-yellow-400/50 uppercase tracking-widest border-b border-white/5">
                      Localities
                    </div>
                    {filteredLocalities.map((loc, i) => (
                      <button
                        type="button"
                        key={loc.id}
                        onClick={() => handleLocalitySelect(loc)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-yellow-500/8 transition-colors border-b border-white/5 last:border-0 text-left"
                        data-ocid={`location_intel.locality.dropdown_menu.item.${i + 1}`}
                      >
                        <MapPin
                          size={15}
                          className="text-yellow-400 shrink-0"
                        />
                        <span className="text-white font-medium">
                          {loc.name}
                        </span>
                        <span className="ml-auto text-xs text-yellow-400/40">
                          {loc.parentCity}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {filteredLocalities.length === 0 &&
                  filteredCities.length > 0 && (
                    <>
                      <div className="px-4 py-2 text-xs text-white/40 uppercase tracking-widest border-b border-white/5">
                        Cities
                      </div>
                      {filteredCities.map((city, i) => (
                        <button
                          type="button"
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors border-b border-white/5 last:border-0 text-left"
                          data-ocid={`location_intel.city.dropdown_menu.item.${i + 1}`}
                        >
                          <Building2 size={15} className="text-yellow-400/60" />
                          <span className="text-white font-medium">{city}</span>
                          <span className="ml-auto text-xs text-white/30">
                            {LOCALITIES_BY_CITY[city]?.length ?? 0} localities
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                {filteredLocalities.length === 0 &&
                  filteredCities.length === 0 && (
                    <div className="px-4 py-6 text-center text-white/40 text-sm">
                      No results found
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Map-first source banner */}
          {selectedLocation?.source === "map" && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-yellow-400 shrink-0" />
                  <span className="text-yellow-300 text-sm">
                    Showing results for selected map location:{" "}
                    <strong>{selectedLocation.name}</strong>
                  </span>
                </div>
                {searchedLocation && (
                  <button
                    type="button"
                    onClick={handleResetToSearched}
                    className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                    data-ocid="location_intel.reset.primary_button"
                  >
                    <RefreshCw size={11} />
                    Use searched location
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Map */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-white/50 text-xs uppercase tracking-widest">
                  Live Map
                </span>
                <span className="text-white/25 text-xs">
                  — drag the pin to explore
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 420,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <GlobalMapComponent
                  mode="area-intelligence"
                  city={mapCity}
                  center={[mapCenter.lat, mapCenter.lng]}
                  height="420px"
                  showLayerToggle={true}
                  onLocationSelect={(lat, lng, name) =>
                    handleLocationChange(lat, lng, name)
                  }
                />
              </div>
            </div>

            {/* Right: Intelligence Panels */}
            <div>
              {!selectedLocation ? (
                <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                    <MapPin size={28} className="text-yellow-400/60" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">
                    No location selected
                  </h3>
                  <p className="text-white/40 text-sm">
                    Search for a city or locality above, or drag the map pin to
                    any location to see AI-powered real estate intelligence.
                  </p>
                  {/* Quick locality buttons */}
                  <div className="mt-6">
                    <p className="text-white/30 text-xs mb-3">Quick explore:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(LOCALITIES_BY_CITY.Bangalore ?? [])
                        .slice(0, 5)
                        .map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleLocalitySelect(loc)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:border-yellow-400/40 hover:text-yellow-300 transition-all"
                            data-ocid="location_intel.quick_select.button"
                          >
                            {loc.name}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : areaIntel ? (
                <div className="slide-up">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-white/50 text-xs uppercase tracking-widest">
                      Intelligence Report
                    </span>
                    {selectedLocation.source === "map" && (
                      <span className="text-yellow-400/60 text-xs">
                        • Pin location
                      </span>
                    )}
                  </div>
                  <EngineIntelPanel
                    key={geoKey}
                    intel={areaIntel}
                    locationName={selectedLocation.name}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
                  <div className="text-white/40 text-sm">
                    No locality data found for this pin location.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Locality cards quick browse (shown when a city is selected but no locality) */}
          {selectedLocation && intelLocality && (
            <div className="mt-10">
              <div className="text-xs text-yellow-400/70 uppercase tracking-widest mb-4">
                More in {intelLocality.city}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(LOCALITIES_BY_CITY[intelLocality.city] ?? []).map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleLocalitySelect(loc)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      intelLocality.id === loc.id
                        ? "border-yellow-400/60 bg-yellow-500/8"
                        : "border-white/8 bg-white/3 hover:border-yellow-400/30"
                    }`}
                    data-ocid="location_intel.locality.card"
                  >
                    <p className="text-white font-medium text-sm truncate">
                      {loc.name}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      ₹{loc.priceMin.toLocaleString()} – ₹
                      {loc.priceMax.toLocaleString()}
                    </p>
                    <div
                      className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] border ${tagStyle(
                        loc.tagColor,
                      )}`}
                    >
                      {loc.marketTag}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6 text-white/20 text-xs">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="hover:text-white/40 transition-colors"
          >
            Built with ❤ using caffeine.ai
          </a>
        </footer>
      </div>
    </>
  );
}
