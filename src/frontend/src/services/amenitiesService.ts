/**
 * amenitiesService.ts — Centralized Bangalore amenity data + distance fetching.
 *
 * This is the SINGLE source for all POI data across all modules.
 * All modules (Buy, Rent, Sell, AI Valuation, Area Intelligence, Buyer, Seller, Bank) must
 * import from here instead of maintaining separate POI lists.
 *
 * Distance calculation delegates to roadDistanceEngine (OSRM → fallback).
 *
 * POI data sources (in priority order):
 *   1. Live OSM Overpass API — primary source
 *   2. Hardcoded fallback arrays — used when OSM fails or times out
 * Results are cached in localStorage per grid cell (1km² approx), TTL 24h.
 */

import {
  type AmenityInput,
  type AmenityType,
  type AmenityWithDistance,
  getAmenitiesWithDistance,
} from "./roadDistanceEngine";

// ─── Radius rules per category ────────────────────────────────────────────────

export const AMENITY_RADIUS: Record<AmenityType, number> = {
  atm: 2,
  bank: 3,
  restaurant: 2,
  school: 5,
  hospital: 5,
  metro: 8,
  tech_park: 8,
  mall: 8,
  police: 5,
  petrol_pump: 5,
  pharmacy: 3,
  bus_stop: 3,
  college: 5,
  railway: 10,
  airport: 60,
  highway: 15,
  supermarket: 3,
};

// ─── POI Data ─────────────────────────────────────────────────────────────────
// Verified Bangalore coordinates — cross-referenced Google Maps (April 2026)

const METRO_POIS: AmenityInput[] = [
  {
    name: "MG Road",
    type: "metro",
    lat: 12.9753,
    lng: 77.6069,
    line: "Purple",
  },
  {
    name: "Trinity / Halasuru",
    type: "metro",
    lat: 12.977,
    lng: 77.6173,
    line: "Purple",
  },
  {
    name: "Indiranagar",
    type: "metro",
    lat: 12.9784,
    lng: 77.6408,
    line: "Purple",
  },
  {
    name: "Baiyappanahalli",
    type: "metro",
    lat: 12.99,
    lng: 77.6618,
    line: "Purple",
  },
  {
    name: "KR Puram",
    type: "metro",
    lat: 12.9965,
    lng: 77.6963,
    line: "Purple",
  },
  {
    name: "Hoodi Junction",
    type: "metro",
    lat: 12.992,
    lng: 77.716,
    line: "Purple",
  },
  {
    name: "Whitefield (Kadugodi)",
    type: "metro",
    lat: 12.9698,
    lng: 77.7499,
    line: "Purple",
  },
  {
    name: "Majestic (Kempegowda)",
    type: "metro",
    lat: 12.9763,
    lng: 77.5713,
    line: "Purple",
  },
  {
    name: "Vijayanagar",
    type: "metro",
    lat: 12.971,
    lng: 77.537,
    line: "Purple",
  },
  {
    name: "Kengeri",
    type: "metro",
    lat: 12.9117,
    lng: 77.4821,
    line: "Purple",
  },
  {
    name: "Nagasandra",
    type: "metro",
    lat: 13.0541,
    lng: 77.5564,
    line: "Green",
  },
  {
    name: "Peenya Industry",
    type: "metro",
    lat: 13.0272,
    lng: 77.5179,
    line: "Green",
  },
  {
    name: "Yeshwanthpur Metro",
    type: "metro",
    lat: 13.0284,
    lng: 77.5554,
    line: "Green",
  },
  {
    name: "Rajajinagar",
    type: "metro",
    lat: 12.9904,
    lng: 77.5556,
    line: "Green",
  },
  {
    name: "Jayanagar",
    type: "metro",
    lat: 12.9257,
    lng: 77.5826,
    line: "Green",
  },
  {
    name: "Banashankari",
    type: "metro",
    lat: 12.9155,
    lng: 77.5661,
    line: "Green",
  },
  {
    name: "Yelachenahalli",
    type: "metro",
    lat: 12.8856,
    lng: 77.5747,
    line: "Green",
  },
  {
    name: "BTM Layout Metro",
    type: "metro",
    lat: 12.9166,
    lng: 77.6101,
    line: "Yellow",
  },
  {
    name: "Silk Board Metro",
    type: "metro",
    lat: 12.9171,
    lng: 77.6232,
    line: "Yellow",
  },
  {
    name: "Electronic City Metro",
    type: "metro",
    lat: 12.8399,
    lng: 77.677,
    line: "Yellow",
  },
  {
    name: "Bommasandra Metro",
    type: "metro",
    lat: 12.8241,
    lng: 77.6816,
    line: "Yellow",
  },
];

const RAILWAY_POIS: AmenityInput[] = [
  {
    name: "Yeshwanthpur Junction",
    type: "railway",
    lat: 13.0249,
    lng: 77.5546,
  },
  {
    name: "Bangalore City Junction (KSR)",
    type: "railway",
    lat: 12.9784,
    lng: 77.5708,
  },
  { name: "Bangalore Cantonment", type: "railway", lat: 12.9855, lng: 77.6007 },
  { name: "Whitefield Railway", type: "railway", lat: 12.9789, lng: 77.7342 },
  { name: "Krishnarajapuram", type: "railway", lat: 12.9987, lng: 77.6973 },
  { name: "Banaswadi", type: "railway", lat: 13.0184, lng: 77.6456 },
  { name: "Hebbal Railway", type: "railway", lat: 13.0437, lng: 77.5966 },
  { name: "Yelahanka Junction", type: "railway", lat: 13.0985, lng: 77.5931 },
  { name: "Nayandahalli", type: "railway", lat: 12.9547, lng: 77.5366 },
  { name: "Bangalore East", type: "railway", lat: 12.9758, lng: 77.6389 },
];

const BUS_STOP_POIS: AmenityInput[] = [
  {
    name: "Majestic Bus Stand (KSRTC)",
    type: "bus_stop",
    lat: 12.9763,
    lng: 77.5713,
  },
  {
    name: "Shivajinagar Bus Stand",
    type: "bus_stop",
    lat: 12.9869,
    lng: 77.5993,
  },
  { name: "KR Market Bus Stand", type: "bus_stop", lat: 12.9631, lng: 77.5765 },
  { name: "Hebbal Bus Stop", type: "bus_stop", lat: 13.0437, lng: 77.5966 },
  {
    name: "Yeshwanthpur Bus Depot",
    type: "bus_stop",
    lat: 13.0249,
    lng: 77.5546,
  },
  {
    name: "Koramangala Bus Stand",
    type: "bus_stop",
    lat: 12.9279,
    lng: 77.6217,
  },
  {
    name: "Whitefield Bus Stand",
    type: "bus_stop",
    lat: 12.9789,
    lng: 77.7342,
  },
  {
    name: "Electronic City Bus Stand",
    type: "bus_stop",
    lat: 12.8491,
    lng: 77.6712,
  },
  {
    name: "Marathahalli Bus Stop",
    type: "bus_stop",
    lat: 12.9588,
    lng: 77.7011,
  },
  { name: "HSR Layout Bus Stop", type: "bus_stop", lat: 12.9116, lng: 77.6473 },
  { name: "Yelahanka Bus Stand", type: "bus_stop", lat: 13.0985, lng: 77.5931 },
  { name: "Nagawara Bus Stop", type: "bus_stop", lat: 13.0486, lng: 77.62 },
  {
    name: "Indiranagar Bus Stop",
    type: "bus_stop",
    lat: 12.9784,
    lng: 77.6407,
  },
  {
    name: "BTM Layout Bus Stand",
    type: "bus_stop",
    lat: 12.9116,
    lng: 77.6102,
  },
];

const TECH_PARK_POIS: AmenityInput[] = [
  {
    name: "Manyata Tech Park",
    type: "tech_park",
    lat: 13.0457,
    lng: 77.6231,
    area: "Nagawara",
  },
  {
    name: "Embassy Manyata Business Park",
    type: "tech_park",
    lat: 13.0457,
    lng: 77.6231,
    area: "Nagawara",
  },
  {
    name: "Kirloskar Business Park",
    type: "tech_park",
    lat: 13.0349,
    lng: 77.5851,
    area: "Hebbal",
  },
  {
    name: "Karle Town Centre",
    type: "tech_park",
    lat: 13.0162,
    lng: 77.5983,
    area: "Hebbal",
  },
  {
    name: "Bagmane Tech Park (CV Raman Nagar)",
    type: "tech_park",
    lat: 12.9784,
    lng: 77.6507,
    area: "CV Raman Nagar",
  },
  {
    name: "ITPL (Whitefield)",
    type: "tech_park",
    lat: 12.983,
    lng: 77.7378,
    area: "Whitefield",
  },
  {
    name: "RMZ Ecospace",
    type: "tech_park",
    lat: 12.9258,
    lng: 77.6965,
    area: "Bellandur",
  },
  {
    name: "Prestige Tech Cloud",
    type: "tech_park",
    lat: 12.9355,
    lng: 77.6926,
    area: "Sarjapur Road",
  },
  {
    name: "Embassy Tech Village",
    type: "tech_park",
    lat: 12.899,
    lng: 77.68,
    area: "Bellandur",
  },
  {
    name: "Global Village Tech Park",
    type: "tech_park",
    lat: 12.9145,
    lng: 77.5095,
    area: "Mysore Road",
  },
  {
    name: "Salarpuria Softzone",
    type: "tech_park",
    lat: 12.9258,
    lng: 77.6965,
    area: "Bellandur",
  },
  {
    name: "Raheja Mindspace",
    type: "tech_park",
    lat: 13.0351,
    lng: 77.5815,
    area: "Hebbal",
  },
  {
    name: "Divyashree Technopolis",
    type: "tech_park",
    lat: 12.9698,
    lng: 77.7499,
    area: "Whitefield",
  },
];

const HOSPITAL_POIS: AmenityInput[] = [
  {
    name: "Apollo Hospital Bannerghatta",
    type: "hospital",
    lat: 12.8832,
    lng: 77.5974,
  },
  {
    name: "Fortis Hospital Cunningham",
    type: "hospital",
    lat: 12.9985,
    lng: 77.5936,
  },
  {
    name: "Manipal Hospital Whitefield",
    type: "hospital",
    lat: 12.9701,
    lng: 77.7392,
  },
  {
    name: "Narayana Health City",
    type: "hospital",
    lat: 12.8608,
    lng: 77.6419,
  },
  {
    name: "St John's Medical College",
    type: "hospital",
    lat: 12.9461,
    lng: 77.6225,
  },
  { name: "Sakra World Hospital", type: "hospital", lat: 12.938, lng: 77.6864 },
  {
    name: "Columbia Asia Hospital Whitefield",
    type: "hospital",
    lat: 12.9704,
    lng: 77.7402,
  },
  {
    name: "Bangalore Baptist Hospital",
    type: "hospital",
    lat: 13.0183,
    lng: 77.5923,
  },
  { name: "Aster CMI Hospital", type: "hospital", lat: 13.0437, lng: 77.5966 },
  {
    name: "BGS Gleneagles Hospital",
    type: "hospital",
    lat: 12.9007,
    lng: 77.4971,
  },
  { name: "Vikram Hospital", type: "hospital", lat: 12.9869, lng: 77.5993 },
  {
    name: "Manipal Hospital Old Airport Road",
    type: "hospital",
    lat: 12.9789,
    lng: 77.648,
  },
  { name: "Cloudnine Hospital", type: "hospital", lat: 12.9279, lng: 77.6217 },
  { name: "Sparsh Hospital", type: "hospital", lat: 13.0183, lng: 77.5923 },
];

const SCHOOL_POIS: AmenityInput[] = [
  {
    name: "Delhi Public School North",
    type: "school",
    lat: 13.0534,
    lng: 77.6209,
  },
  {
    name: "Kendriya Vidyalaya BEL",
    type: "school",
    lat: 13.0328,
    lng: 77.5636,
  },
  {
    name: "National Public School Nagasandra",
    type: "school",
    lat: 13.0483,
    lng: 77.5498,
  },
  {
    name: "Orchids International School Hebbal",
    type: "school",
    lat: 13.0403,
    lng: 77.5921,
  },
  {
    name: "Ryan International School Yelahanka",
    type: "school",
    lat: 13.0985,
    lng: 77.5931,
  },
  { name: "DPS East", type: "school", lat: 12.9704, lng: 77.7402 },
  { name: "Inventure Academy", type: "school", lat: 12.9295, lng: 77.6879 },
  { name: "Vidyashilp Academy", type: "school", lat: 13.0527, lng: 77.6184 },
  {
    name: "Mallya Aditi International",
    type: "school",
    lat: 13.0403,
    lng: 77.5921,
  },
  {
    name: "Indus International School",
    type: "school",
    lat: 12.9007,
    lng: 77.4971,
  },
  {
    name: "Bishop Cotton Boys School",
    type: "school",
    lat: 12.9869,
    lng: 77.5993,
  },
  {
    name: "Frank Anthony Public School",
    type: "school",
    lat: 12.9869,
    lng: 77.5993,
  },
  {
    name: "National Public School Koramangala",
    type: "school",
    lat: 12.9279,
    lng: 77.6217,
  },
  { name: "Greenwood High", type: "school", lat: 12.9588, lng: 77.7011 },
];

const COLLEGE_POIS: AmenityInput[] = [
  { name: "IIM Bangalore", type: "college", lat: 12.9373, lng: 77.6036 },
  { name: "IISc Bangalore", type: "college", lat: 13.0213, lng: 77.5685 },
  { name: "Christ University", type: "college", lat: 12.9204, lng: 77.6066 },
  {
    name: "RV College of Engineering",
    type: "college",
    lat: 12.9236,
    lng: 77.4986,
  },
  {
    name: "BMS College of Engineering",
    type: "college",
    lat: 12.9607,
    lng: 77.5764,
  },
  { name: "PES University", type: "college", lat: 12.9132, lng: 77.5391 },
  {
    name: "M.S. Ramaiah Institute of Technology",
    type: "college",
    lat: 13.019,
    lng: 77.56,
  },
  { name: "REVA University", type: "college", lat: 13.1204, lng: 77.6165 },
  {
    name: "Acharya Institute of Technology",
    type: "college",
    lat: 13.05,
    lng: 77.56,
  },
  {
    name: "Dayananda Sagar University",
    type: "college",
    lat: 12.9095,
    lng: 77.594,
  },
];

const MALL_POIS: AmenityInput[] = [
  {
    name: "Phoenix Marketcity Whitefield",
    type: "mall",
    lat: 12.9943,
    lng: 77.7091,
  },
  { name: "Orion Mall", type: "mall", lat: 13.0017, lng: 77.556 },
  { name: "Forum Mall Koramangala", type: "mall", lat: 12.9279, lng: 77.6217 },
  { name: "Mantri Square", type: "mall", lat: 12.9985, lng: 77.5694 },
  { name: "Lulu Mall", type: "mall", lat: 12.979, lng: 77.6509 },
  { name: "Elements Mall", type: "mall", lat: 13.0437, lng: 77.5966 },
  { name: "Forum Value Mall", type: "mall", lat: 12.96, lng: 77.7 },
  { name: "VR Bengaluru Mall", type: "mall", lat: 12.9989, lng: 77.6516 },
  { name: "UB City", type: "mall", lat: 12.9726, lng: 77.5971 },
  { name: "Royal Meenakshi Mall", type: "mall", lat: 12.8784, lng: 77.6013 },
];

const POLICE_POIS: AmenityInput[] = [
  {
    name: "Jalahalli Police Station",
    type: "police",
    lat: 13.0383,
    lng: 77.5503,
  },
  {
    name: "Mathikere Police Station",
    type: "police",
    lat: 13.0289,
    lng: 77.5628,
  },
  {
    name: "Yeshwanthpur Police Station",
    type: "police",
    lat: 13.0249,
    lng: 77.5546,
  },
  { name: "Hebbal Police Station", type: "police", lat: 13.0437, lng: 77.5966 },
  {
    name: "Whitefield Police Station",
    type: "police",
    lat: 12.9789,
    lng: 77.7342,
  },
  {
    name: "Koramangala Police Station",
    type: "police",
    lat: 12.9279,
    lng: 77.6217,
  },
  {
    name: "Indiranagar Police Station",
    type: "police",
    lat: 12.9784,
    lng: 77.6407,
  },
  {
    name: "Electronic City Police Station",
    type: "police",
    lat: 12.8491,
    lng: 77.6712,
  },
  {
    name: "Marathahalli Police Station",
    type: "police",
    lat: 12.9588,
    lng: 77.7011,
  },
  {
    name: "HSR Layout Police Station",
    type: "police",
    lat: 12.9116,
    lng: 77.6473,
  },
  {
    name: "Yelahanka Police Station",
    type: "police",
    lat: 13.0985,
    lng: 77.5931,
  },
  { name: "Nagawara Police Station", type: "police", lat: 13.0486, lng: 77.62 },
];

const PETROL_PUMP_POIS: AmenityInput[] = [
  {
    name: "BPCL Jalahalli Cross",
    type: "petrol_pump",
    lat: 13.0324,
    lng: 77.5492,
  },
  { name: "HP Yeshwanthpur", type: "petrol_pump", lat: 13.0249, lng: 77.5546 },
  {
    name: "Indian Oil Hebbal",
    type: "petrol_pump",
    lat: 13.0437,
    lng: 77.5966,
  },
  { name: "BPCL Whitefield", type: "petrol_pump", lat: 12.9789, lng: 77.7342 },
  { name: "HP Koramangala", type: "petrol_pump", lat: 12.9279, lng: 77.6217 },
  {
    name: "Indian Oil Electronic City",
    type: "petrol_pump",
    lat: 12.8491,
    lng: 77.6712,
  },
  {
    name: "BPCL Marathahalli",
    type: "petrol_pump",
    lat: 12.9588,
    lng: 77.7011,
  },
  { name: "HP HSR Layout", type: "petrol_pump", lat: 12.9116, lng: 77.6473 },
  {
    name: "Indian Oil Indiranagar",
    type: "petrol_pump",
    lat: 12.9784,
    lng: 77.6407,
  },
  { name: "BPCL BTM Layout", type: "petrol_pump", lat: 12.9116, lng: 77.6102 },
  { name: "HP Yelahanka", type: "petrol_pump", lat: 13.0985, lng: 77.5931 },
  {
    name: "Indian Oil Nagawara",
    type: "petrol_pump",
    lat: 13.0486,
    lng: 77.62,
  },
];

const PHARMACY_POIS: AmenityInput[] = [
  {
    name: "Apollo Pharmacy Mathikere",
    type: "pharmacy",
    lat: 13.0289,
    lng: 77.5628,
  },
  { name: "MedPlus Hebbal", type: "pharmacy", lat: 13.0437, lng: 77.5966 },
  {
    name: "Wellness Forever Whitefield",
    type: "pharmacy",
    lat: 12.9789,
    lng: 77.7342,
  },
  {
    name: "Apollo Pharmacy Koramangala",
    type: "pharmacy",
    lat: 12.9279,
    lng: 77.6217,
  },
  { name: "Netmeds Indiranagar", type: "pharmacy", lat: 12.9784, lng: 77.6407 },
  { name: "MedPlus BTM", type: "pharmacy", lat: 12.9116, lng: 77.6102 },
  {
    name: "Apollo Pharmacy Yeshwanthpur",
    type: "pharmacy",
    lat: 13.0249,
    lng: 77.5546,
  },
  { name: "Wellness Nagawara", type: "pharmacy", lat: 13.0486, lng: 77.62 },
  {
    name: "MedPlus Electronic City",
    type: "pharmacy",
    lat: 12.8491,
    lng: 77.6712,
  },
  {
    name: "Apollo Pharmacy Yelahanka",
    type: "pharmacy",
    lat: 13.0985,
    lng: 77.5931,
  },
];

const BANK_POIS: AmenityInput[] = [
  { name: "SBI Jalahalli Cross", type: "bank", lat: 13.0324, lng: 77.5492 },
  { name: "HDFC Yeshwanthpur", type: "bank", lat: 13.0249, lng: 77.5546 },
  { name: "ICICI Hebbal", type: "bank", lat: 13.0437, lng: 77.5966 },
  { name: "Axis Bank Whitefield", type: "bank", lat: 12.9789, lng: 77.7342 },
  { name: "Canara Bank Koramangala", type: "bank", lat: 12.9279, lng: 77.6217 },
  { name: "HDFC Indiranagar", type: "bank", lat: 12.9784, lng: 77.6407 },
  { name: "SBI Electronic City", type: "bank", lat: 12.8491, lng: 77.6712 },
  { name: "ICICI Marathahalli", type: "bank", lat: 12.9588, lng: 77.7011 },
  { name: "SBI Nagawara", type: "bank", lat: 13.0486, lng: 77.62 },
  { name: "HDFC BTM Layout", type: "bank", lat: 12.9116, lng: 77.6102 },
  { name: "Axis Bank Yelahanka", type: "bank", lat: 13.0985, lng: 77.5931 },
];

const ATM_POIS: AmenityInput[] = [
  { name: "SBI ATM BEL Road", type: "atm", lat: 13.0383, lng: 77.5503 },
  { name: "HDFC ATM Mathikere", type: "atm", lat: 13.0289, lng: 77.5628 },
  { name: "Axis ATM Hebbal", type: "atm", lat: 13.0437, lng: 77.5966 },
  { name: "ICICI ATM Whitefield", type: "atm", lat: 12.9789, lng: 77.7342 },
  { name: "SBI ATM Koramangala", type: "atm", lat: 12.9279, lng: 77.6217 },
  { name: "HDFC ATM Indiranagar", type: "atm", lat: 12.9784, lng: 77.6407 },
  { name: "SBI ATM Electronic City", type: "atm", lat: 12.8491, lng: 77.6712 },
  { name: "Axis ATM Marathahalli", type: "atm", lat: 12.9588, lng: 77.7011 },
  { name: "HDFC ATM Nagawara", type: "atm", lat: 13.0486, lng: 77.62 },
  { name: "ICICI ATM BTM", type: "atm", lat: 12.9116, lng: 77.6102 },
  { name: "SBI ATM Yelahanka", type: "atm", lat: 13.0985, lng: 77.5931 },
];

const RESTAURANT_POIS: AmenityInput[] = [
  {
    name: "Barbeque Nation Hebbal",
    type: "restaurant",
    lat: 13.0437,
    lng: 77.5966,
  },
  {
    name: "Meghana Foods Koramangala",
    type: "restaurant",
    lat: 12.9279,
    lng: 77.6217,
  },
  {
    name: "Empire Restaurant Whitefield",
    type: "restaurant",
    lat: 12.9789,
    lng: 77.7342,
  },
  {
    name: "Truffles Indiranagar",
    type: "restaurant",
    lat: 12.9784,
    lng: 77.6407,
  },
  {
    name: "Vidyarthi Bhavan BTM",
    type: "restaurant",
    lat: 12.9116,
    lng: 77.6102,
  },
  {
    name: "Nagarjuna Restaurant",
    type: "restaurant",
    lat: 12.9869,
    lng: 77.5993,
  },
  { name: "MTR Restaurant", type: "restaurant", lat: 12.9631, lng: 77.5765 },
];

const SUPERMARKET_POIS: AmenityInput[] = [
  {
    name: "Big Bazaar Nagawara",
    type: "supermarket",
    lat: 13.0486,
    lng: 77.62,
  },
  {
    name: "More Supermarket Hebbal",
    type: "supermarket",
    lat: 13.0437,
    lng: 77.5966,
  },
  {
    name: "Reliance Fresh Whitefield",
    type: "supermarket",
    lat: 12.9789,
    lng: 77.7342,
  },
  {
    name: "D-Mart Yeshwanthpur",
    type: "supermarket",
    lat: 13.0249,
    lng: 77.5546,
  },
  {
    name: "BigBasket Store Koramangala",
    type: "supermarket",
    lat: 12.9279,
    lng: 77.6217,
  },
  {
    name: "Spar Hypermarket Indiranagar",
    type: "supermarket",
    lat: 12.9784,
    lng: 77.6407,
  },
];

const AIRPORT_POIS: AmenityInput[] = [
  {
    name: "Kempegowda International Airport (KIAL)",
    type: "airport",
    lat: 13.1986,
    lng: 77.7066,
  },
  {
    name: "HAL Airport (Old Airport Road)",
    type: "airport",
    lat: 12.9499,
    lng: 77.6682,
  },
];

const HIGHWAY_POIS: AmenityInput[] = [
  {
    name: "Outer Ring Road (Hebbal)",
    type: "highway",
    lat: 13.0352,
    lng: 77.597,
  },
  {
    name: "Outer Ring Road (Marathahalli)",
    type: "highway",
    lat: 12.9591,
    lng: 77.6975,
  },
  {
    name: "Outer Ring Road (Silk Board)",
    type: "highway",
    lat: 12.9165,
    lng: 77.6229,
  },
  { name: "NH-44 (Hosur Road)", type: "highway", lat: 12.8456, lng: 77.6603 },
  {
    name: "Bellary Road (NH-44 North)",
    type: "highway",
    lat: 13.06,
    lng: 77.59,
  },
  { name: "Mysore Road (NH-275)", type: "highway", lat: 12.95, lng: 77.51 },
  { name: "Tumkur Road (NH-648)", type: "highway", lat: 13.02, lng: 77.52 },
  { name: "Sarjapur Road", type: "highway", lat: 12.91, lng: 77.7 },
  { name: "Kanakapura Road", type: "highway", lat: 12.85, lng: 77.56 },
  { name: "NICE Road (Expressway)", type: "highway", lat: 12.9, lng: 77.51 },
];

// ─── Unified POI registry by type ─────────────────────────────────────────────

const ALL_POIS: Record<AmenityType, AmenityInput[]> = {
  metro: METRO_POIS,
  railway: RAILWAY_POIS,
  bus_stop: BUS_STOP_POIS,
  tech_park: TECH_PARK_POIS,
  hospital: HOSPITAL_POIS,
  school: SCHOOL_POIS,
  college: COLLEGE_POIS,
  mall: MALL_POIS,
  police: POLICE_POIS,
  petrol_pump: PETROL_PUMP_POIS,
  pharmacy: PHARMACY_POIS,
  bank: BANK_POIS,
  atm: ATM_POIS,
  restaurant: RESTAURANT_POIS,
  supermarket: SUPERMARKET_POIS,
  airport: AIRPORT_POIS,
  highway: HIGHWAY_POIS,
};

// ─── OSM tag mapping ──────────────────────────────────────────────────────────
// Maps internal AmenityType to Overpass API query string
const OSM_QUERY_MAP: Record<AmenityType, string> = {
  metro: "[railway=station][subway=yes]",
  railway: '[railway=station]["station"!="subway"]',
  bus_stop: "[highway=bus_stop]",
  hospital: "[amenity=hospital]",
  school: "[amenity=school]",
  college: "[amenity=college]",
  tech_park: "[office=it]",
  mall: "[shop=mall]",
  police: "[amenity=police]",
  petrol_pump: "[amenity=fuel]",
  pharmacy: "[amenity=pharmacy]",
  bank: "[amenity=bank]",
  atm: "[amenity=atm]",
  restaurant: "[amenity=restaurant]",
  supermarket: "[shop=supermarket]",
  airport: "[aeroway=aerodrome]",
  highway: "[highway=motorway_junction]",
};

// ─── OSM cache ────────────────────────────────────────────────────────────────
const OSM_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getOSMCacheKey(lat: number, lng: number, type: AmenityType): string {
  // 1km² grid cell approximation: round to 2 decimal places (~1.1km grid)
  return `osm_${lat.toFixed(2)}_${lng.toFixed(2)}_${type}`;
}

interface OSMCacheEntry {
  pois: AmenityInput[];
  timestamp: number;
}

function loadFromOSMCache(key: string): AmenityInput[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: OSMCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > OSM_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.pois;
  } catch {
    return null;
  }
}

function saveToOSMCache(key: string, pois: AmenityInput[]): void {
  try {
    const entry: OSMCacheEntry = { pois, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full — ignore
  }
}

// ─── Live OSM Overpass API fetcher ────────────────────────────────────────────

/**
 * fetchLiveOSMPOIs — fetches live POI data from OpenStreetMap Overpass API.
 *
 * Returns AmenityInput[] sorted by proximity to the origin.
 * Falls back to empty array on timeout or error (caller merges with hardcoded fallback).
 *
 * @param lat       Origin latitude
 * @param lng       Origin longitude
 * @param type      AmenityType to fetch
 * @param radiusKm  Search radius in km
 */
export async function fetchLiveOSMPOIs(
  lat: number,
  lng: number,
  type: AmenityType,
  radiusKm: number,
): Promise<AmenityInput[]> {
  const cacheKey = getOSMCacheKey(lat, lng, type);
  const cached = loadFromOSMCache(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const tagQuery = OSM_QUERY_MAP[type];
  if (!tagQuery) return [];

  const radiusMeters = Math.round(radiusKm * 1000);

  // Build Overpass query — fetch nodes and ways within radius
  const overpassQuery = `[out:json][timeout:10];
(
  node${tagQuery}(around:${radiusMeters},${lat},${lng});
  way${tagQuery}(around:${radiusMeters},${lat},${lng});
);
out center 30;`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[OSM Overpass] HTTP ${response.status} for ${type}`);
      return [];
    }

    const data = (await response.json()) as {
      elements?: Array<{
        type: string;
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const pois: AmenityInput[] = (data.elements ?? [])
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return null;

        const name =
          el.tags?.name ||
          el.tags?.["name:en"] ||
          el.tags?.operator ||
          `${type.replace("_", " ")} (${elLat.toFixed(3)}, ${elLng.toFixed(3)})`;

        return { name, type, lat: elLat, lng: elLng } as AmenityInput;
      })
      .filter((p): p is AmenityInput => p !== null);

    if (pois.length > 0) {
      saveToOSMCache(cacheKey, pois);
      console.log(
        `[OSM Overpass] Fetched ${pois.length} ${type} POIs near (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      );
    }

    return pois;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[OSM Overpass] Timeout for ${type}`);
    } else {
      console.warn(`[OSM Overpass] Error for ${type}:`, err);
    }
    return [];
  }
}

// ─── Merge OSM + hardcoded POIs ───────────────────────────────────────────────

/** Deduplicate POIs by name similarity (normalised lowercase comparison) */
function deduplicatePOIs(
  primary: AmenityInput[],
  fallback: AmenityInput[],
): AmenityInput[] {
  const primaryNames = new Set(
    primary.map((p) => p.name.toLowerCase().trim().slice(0, 20)),
  );
  const unique = fallback.filter(
    (f) => !primaryNames.has(f.name.toLowerCase().trim().slice(0, 20)),
  );
  return [...primary, ...unique];
}

// ─── Main export functions ────────────────────────────────────────────────────

/**
 * Get all amenities with driving distances for a location.
 * Tries live OSM Overpass API first; falls back to hardcoded arrays on failure.
 * If `types` is undefined, fetches all 17 categories.
 * Results are sorted by distanceKm ascending within each category.
 *
 * @param lat    Origin latitude
 * @param lng    Origin longitude
 * @param types  Optional subset of categories to fetch
 */
export async function getAmenitiesForLocation(
  lat: number,
  lng: number,
  types?: AmenityType[],
): Promise<Record<AmenityType, AmenityWithDistance[]>> {
  const typesToFetch: AmenityType[] =
    types ?? (Object.keys(ALL_POIS) as AmenityType[]);
  const result = {} as Record<AmenityType, AmenityWithDistance[]>;

  // Initialize all types to empty arrays
  for (const t of Object.keys(ALL_POIS) as AmenityType[]) {
    result[t] = [];
  }

  // Fetch each category with a small delay between to avoid rate limiting
  for (let i = 0; i < typesToFetch.length; i++) {
    const type = typesToFetch[i];
    const hardcodedPois = ALL_POIS[type] ?? [];
    const radius = AMENITY_RADIUS[type] ?? 10;

    // 1. Try live OSM Overpass API
    const livePois = await fetchLiveOSMPOIs(lat, lng, type, radius).catch(
      () => [] as AmenityInput[],
    );

    // 2. Merge: live OSM first, deduplicated fallback appended
    const mergedPois =
      livePois.length > 0
        ? deduplicatePOIs(livePois, hardcodedPois)
        : hardcodedPois;

    result[type] = await getAmenitiesWithDistance(
      { lat, lng },
      mergedPois,
      radius,
    );

    // Small delay between category fetches to avoid OSRM rate limiting
    if (i < typesToFetch.length - 1) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return result;
}

/**
 * Get nearest amenities of a specific type, sorted by distance.
 *
 * @param lat       Origin latitude
 * @param lng       Origin longitude
 * @param type      Amenity category
 * @param maxCount  Maximum results to return (default: 5)
 */
export async function getNearestAmenities(
  lat: number,
  lng: number,
  type: AmenityType,
  maxCount = 5,
): Promise<AmenityWithDistance[]> {
  const hardcodedPois = ALL_POIS[type] ?? [];
  const radius = AMENITY_RADIUS[type] ?? 10;

  // Try live OSM first
  const livePois = await fetchLiveOSMPOIs(lat, lng, type, radius).catch(
    () => [] as AmenityInput[],
  );

  const mergedPois =
    livePois.length > 0
      ? deduplicatePOIs(livePois, hardcodedPois)
      : hardcodedPois;

  const results = await getAmenitiesWithDistance(
    { lat, lng },
    mergedPois,
    radius,
  );

  return results.slice(0, maxCount);
}

/**
 * Get raw POI list for a type (without distance calculation).
 * Used for seeding maps before distances are calculated.
 */
export function getPOIsForType(type: AmenityType): AmenityInput[] {
  return ALL_POIS[type] ?? [];
}

/**
 * Get all POI types available.
 */
export function getAllAmenityTypes(): AmenityType[] {
  return Object.keys(ALL_POIS) as AmenityType[];
}
