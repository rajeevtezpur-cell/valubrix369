import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type LocationState = {
  name: string;
  lat: number;
  lng: number;
  city?: string;
  source?: "search" | "map";
};

type LocationContextType = {
  location: LocationState | null;
  updateLocation: (loc: LocationState) => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
};

const LocationContext = createContext<LocationContextType | null>(null);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [searchInput, setSearchInput] = useState("");

  const updateLocation = (loc: LocationState) => {
    setLocation(loc);
    setSearchInput(loc.name);
  };

  return (
    <LocationContext.Provider
      value={{ location, updateLocation, searchInput, setSearchInput }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
};
