export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.road,
      addr.neighbourhood || addr.suburb || addr.quarter,
      addr.city_district,
      addr.city || addr.town || addr.village,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    if (data.display_name)
      return data.display_name.split(",").slice(0, 3).join(",").trim();
    return "Unknown location";
  } catch {
    return "Unknown location";
  }
}
