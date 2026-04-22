module {

  /// Apartment sub-type — mandatory when propertyType = "apartment".
  /// #unknown is used as the backward-compatible default when the field is absent.
  public type ApartmentSubType = {
    #standalone;
    #gated;
    #township;
    #unknown;   // backward-compat default; treated as "gated" in inference
  };

  /// Extended valuation request with sub-type and builder fields.
  /// All new fields are optional so existing API callers continue to work.
  public type ValuationRequest = {
    locality        : Text;
    propertyType    : Text;   // "apartment" | "villa" | "plot" | "commercial"
    sqft            : Nat;
    age             : Nat;
    amenitiesCount  : Nat;
    // New optional fields
    apartmentSubType : ?ApartmentSubType;   // required when propertyType = "apartment"
    builderName      : ?Text;               // e.g. "Prestige", "Sobha", "Brigade"
  };

  /// Extended valuation result that includes builder multiplier for display.
  public type ValuationResult = {
    priceMin          : Nat;
    priceMax          : Nat;
    bestPrice         : Nat;
    confidence        : Nat;
    confidenceReason  : Text;
    localityFound     : Bool;
    // Layer breakdown percentages (0-100 each, sum = 100)
    comparablesContribution : Nat;
    locationContribution    : Nat;
    demandContribution      : Nat;
    infraContribution       : Nat;
    metroContribution       : Nat;
    comparablesUsed         : Nat;
    pricePerSqft            : Nat;
    // New: builder and sub-type multipliers exposed for display
    builderMultiplier    : Nat;   // × 1000 fixed-point  (1000 = 1.0×, 1100 = 1.1×)
    subTypeMultiplier    : Nat;   // × 1000 fixed-point
    subTypeApplied       : Text;  // "standalone" | "gated" | "township" | "none"
    builderApplied       : Text;  // builder name used, or "default" if not found
  };

};
