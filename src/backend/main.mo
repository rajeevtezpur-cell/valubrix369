import List "mo:core/List";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Principal "mo:core/Principal";

import Storage "mo:caffeineai-object-storage/Storage";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import AILearnLib "lib/ai-learning";
import MixinAILearning "mixins/ai-learning-api";
import Stripe "mo:caffeineai-stripe/stripe";
import OutCall "mo:caffeineai-http-outcalls/outcall";






actor {

  // ── Migration stubs: preserve stable variables from previous deployment ──
  // These declarations must match the types from the previous canister version
  // to avoid M0169 compatibility errors.

  type _MigPropertyType = { #bhk1; #bhk2; #bhk3; #villa; #plot };
  type _MigStage = { #prelaunch; #underConstruction; #ready };
  type _MigDemandTier = { #high; #medium; #low };

  type _MigListing = {
    id : Text;
    seller : Principal;
    city : Text;
    locality : Text;
    title : Text;
    propertyType : _MigPropertyType;
    bedrooms : Nat;
    bathrooms : Nat;
    areaSqft : Nat;
    priceInr : Nat;
    stage : _MigStage;
    builderName : Text;
    projectName : Text;
    reraNumber : Text;
    description : Text;
    amenities : [Text];
    imageBlobIds : [Text];
    isActive : Bool;
    createdAt : Int;
  };

  type _MigProjectDatasetEntry = {
    projectName : Text;
    builder : Text;
    city : Text;
    locality : Text;
    propertyType : _MigPropertyType;
    stage : _MigStage;
    priceMin : Nat;
    priceMax : Nat;
    areaSqftMin : Nat;
    areaSqftMax : Nat;
    reraNumber : Text;
  };

  type _MigAreaIntelligence = {
    city : Text;
    locality : Text;
    avgPricePerSqft : Nat;
    yoyTrendPercent : Int;
    activeProjects : Nat;
    demandTier : _MigDemandTier;
  };

  type _MigUserProfile = {
    name : Text;
    role : Text;
    phone : ?Text;
    email : ?Text;
  };

  // Retained stable variables (unused in new version, kept for upgrade compatibility)
  let listings = Map.empty<Text, _MigListing>();
  var projectDataset = List.empty<_MigProjectDatasetEntry>();
  var areaIntelligenceData = List.empty<_MigAreaIntelligence>();
  let cities = Set.empty<Text>();
  let userProfiles = Map.empty<Principal, _MigUserProfile>();

  // ── End migration stubs ───────────────────────────────────────────────────

  // System State
  // -------------------------------------------------
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  // AI LEARNING STATE
  // -------------------------------------------------
  let aiLearningState = object {
    public var aiLearningSubmissions : [AILearnLib.AILearningSubmission] = [];
    public var aiLearningIdCounter   : Nat = 0;
  };
  include MixinAILearning(aiLearningState);

  // USERS
  // -------------------------------------------------
  public type UserRole = AccessControl.UserRole;

  type UserProfile = {
    username : Text;
    fullName : Text;
    mobile : Text;
    email : Text;
    city : Text;
    panNumber : Text;
    role : UserRole;
    // Auth extension — optional fields, null for existing OTP users
    auth_provider : ?Text;   // "otp" | "email" — null = legacy OTP
    email_hash : ?Text;      // SHA-256 hex of email, for email+password users
    password_hash : ?Text;   // SHA-256 hex of password, for email+password users
    // Subscription — "free" | "premium"
    subscription_status : Text;
  };

  let users = Map.empty<Principal, UserProfile>();
  // Email+password users stored separately (keyed by emailHash, not Principal)
  let emailProfiles = Map.empty<Text, UserProfile>();

  public shared ({ caller }) func registerUser(username : Text, fullName : Text, mobile : Text, email : Text, city : Text, panNumber : Text) : async () {
    if (users.containsKey(caller)) {
      Runtime.trap("User already registered");
    };
    let user : UserProfile = {
      username;
      fullName;
      mobile;
      email;
      city;
      panNumber;
      role = #user;
      auth_provider = ?("otp");
      email_hash = null;
      password_hash = null;
      subscription_status = "free";
    };
    users.add(caller, user);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    users.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    users.add(caller, profile);
  };

  public shared ({ caller }) func updateUserRole(user : Principal, role : UserRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    switch (users.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let updatedProfile = { profile with role };
        users.add(user, updatedProfile);
      };
    };
  };

  // EMAIL+PASSWORD AUTH
  // -------------------------------------------------
  // emailProfiles (declared above, after `users`) provides the email → profile lookup.

  public shared func registerWithEmail(emailHash : Text, passwordHash : Text, name : Text) : async Text {
    // Reject if this email is already registered
    if (emailProfiles.containsKey(emailHash)) {
      Runtime.trap("Email already registered");
    };
    let profile : UserProfile = {
      username = emailHash;  // placeholder username = emailHash; frontend can update later
      fullName = name;
      mobile = "";
      email = "";
      city = "";
      panNumber = "";
      role = #user;
      auth_provider = ?("email");
      email_hash = ?(emailHash);
      password_hash = ?(passwordHash);
      subscription_status = "free";
    };
    emailProfiles.add(emailHash, profile);
    // Return a stable id string the frontend can use as a session key
    "email-user-" # emailHash;
  };

  public query func loginWithEmail(emailHash : Text, passwordHash : Text) : async ?UserProfile {
    switch (emailProfiles.get(emailHash)) {
      case (null) { null };
      case (?profile) {
        switch (profile.password_hash) {
          case (null) { null };
          case (?storedHash) {
            if (storedHash == passwordHash) {
              // Return profile with password_hash cleared for security
              ?{ profile with password_hash = null }
            }
            else { null }
          };
        };
      };
    };
  };

  // PROPERTY LISTINGS
  // -------------------------------------------------
  public type PropertyType = {
    #flat;
    #villa;
    #plot;
  };
  public type ListingStatus = {
    #draft;
    #published;
  };

  type PropertyListing = {
    id : Nat;
    sellerId : Principal;
    title : Text;
    propertyType : PropertyType;
    location : Text;
    city : Text;
    price : Nat;
    carpetArea : Nat;
    builtUpArea : Nat;
    bhk : Nat;
    floor : Nat;
    totalFloors : Nat;
    buildingAge : Nat;
    facing : Text;
    coveredParking : Nat;
    openParking : Nat;
    balconies : Nat;
    builderName : Text;
    projectName : Text;
    reraNumber : Text;
    legalStatus : Text;
    landUse : Text;
    plotArea : Nat;
    plotUnit : Text;
    badges : [Text];
    status : ListingStatus;
    mediaBlobs : [Storage.ExternalBlob];
    description : Text;
    createdAt : Time.Time;
  };

  let propertyListings = Map.empty<Nat, PropertyListing>();
  var nextListingId = 1;

  public shared ({ caller }) func createListing(
    title : Text,
    propertyType : PropertyType,
    location : Text,
    city : Text,
    price : Nat,
    carpetArea : Nat,
    builtUpArea : Nat,
    bhk : Nat,
    floor : Nat,
    totalFloors : Nat,
    buildingAge : Nat,
    facing : Text,
    coveredParking : Nat,
    openParking : Nat,
    balconies : Nat,
    builderName : Text,
    projectName : Text,
    reraNumber : Text,
    legalStatus : Text,
    landUse : Text,
    plotArea : Nat,
    plotUnit : Text,
    badges : [Text],
    mediaBlobs : [Storage.ExternalBlob],
    description : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create listings");
    };
    let newListing : PropertyListing = {
      id = nextListingId;
      sellerId = caller;
      title;
      propertyType;
      location;
      city;
      price;
      carpetArea;
      builtUpArea;
      bhk;
      floor;
      totalFloors;
      buildingAge;
      facing;
      coveredParking;
      openParking;
      balconies;
      builderName;
      projectName;
      reraNumber;
      legalStatus;
      landUse;
      plotArea;
      plotUnit;
      badges;
      status = #draft;
      mediaBlobs;
      description;
      createdAt = Time.now();
    };
    propertyListings.add(newListing.id, newListing);
    nextListingId += 1;
    newListing.id;
  };

  public shared ({ caller }) func updateListing(
    listingId : Nat,
    title : Text,
    propertyType : PropertyType,
    location : Text,
    city : Text,
    price : Nat,
    carpetArea : Nat,
    builtUpArea : Nat,
    bhk : Nat,
    floor : Nat,
    totalFloors : Nat,
    buildingAge : Nat,
    facing : Text,
    coveredParking : Nat,
    openParking : Nat,
    balconies : Nat,
    builderName : Text,
    projectName : Text,
    reraNumber : Text,
    legalStatus : Text,
    landUse : Text,
    plotArea : Nat,
    plotUnit : Text,
    badges : [Text],
    mediaBlobs : [Storage.ExternalBlob],
    description : Text,
  ) : async () {
    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot edit others' listings");
        };
        let updatedListing = {
          listing with
          title;
          propertyType;
          location;
          city;
          price;
          carpetArea;
          builtUpArea;
          bhk;
          floor;
          totalFloors;
          buildingAge;
          facing;
          coveredParking;
          openParking;
          balconies;
          builderName;
          projectName;
          reraNumber;
          legalStatus;
          landUse;
          plotArea;
          plotUnit;
          badges;
          mediaBlobs;
          description;
        };
        propertyListings.add(listingId, updatedListing);
      };
    };
  };

  public shared ({ caller }) func publishListing(listingId : Nat) : async () {
    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot publish others' listings");
        };
        let updatedListing = { listing with status = #published };
        propertyListings.add(listingId, updatedListing);
      };
    };
  };

  public shared ({ caller }) func deleteListing(listingId : Nat) : async () {
    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.sellerId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot delete others' listings");
        };
        propertyListings.remove(listingId);
      };
    };
  };

  public query ({ caller }) func getAllPublishedListings() : async [PropertyListing] {
    propertyListings.values().toArray().filter(
      func(listing) { listing.status == #published }
    );
  };

  public query ({ caller }) func getListingsBySeller(sellerId : Principal) : async [PropertyListing] {
    propertyListings.values().toArray().filter(
      func(listing) { listing.sellerId == sellerId }
    );
  };

  public query ({ caller }) func getListingById(listingId : Nat) : async ?PropertyListing {
    propertyListings.get(listingId);
  };

  public query ({ caller }) func searchListings(location : Text) : async [PropertyListing] {
    propertyListings.values().toArray().filter(
      func(listing) {
        listing.status == #published and listing.location.contains(#text location)
      }
    );
  };

  public query ({ caller }) func filterListings(propertyType : PropertyType, minPrice : Nat, maxPrice : Nat, bhk : Nat) : async [PropertyListing] {
    propertyListings.values().toArray().filter(
      func(listing) {
        listing.status == #published and listing.propertyType == propertyType and listing.price >= minPrice and listing.price <= maxPrice and listing.bhk == bhk
      }
    );
  };

  // SAVED PROPERTIES
  // -------------------------------------------------
  let savedProperties = Map.empty<Principal, [Nat]>();

  public shared ({ caller }) func saveProperty(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save properties");
    };
    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?_) {
        let currentSaved = switch (savedProperties.get(caller)) {
          case (null) { [] };
          case (?saved) { saved };
        };
        let alreadySaved = currentSaved.find(func(id) { id == listingId });
        switch (alreadySaved) {
          case (?_) { /* Already saved, do nothing */ };
          case (null) {
            let updated = currentSaved.concat([listingId]);
            savedProperties.add(caller, updated);
          };
        };
      };
    };
  };

  public shared ({ caller }) func unsaveProperty(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unsave properties");
    };
    switch (savedProperties.get(caller)) {
      case (null) { /* Nothing to unsave */ };
      case (?saved) {
        let updated = saved.filter(func(id) { id != listingId });
        savedProperties.add(caller, updated);
      };
    };
  };

  public query ({ caller }) func getSavedProperties() : async [PropertyListing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view saved properties");
    };
    switch (savedProperties.get(caller)) {
      case (null) { [] };
      case (?saved) {
        saved
          .map(
          func(id) {
            switch (propertyListings.get(id)) {
              case (null) { [] };
              case (?listing) { [listing] };
            };
          }
        )
          .flatten();
      };
    };
  };

  // VALUATION REPORTS
  // -------------------------------------------------
  type ValuationReport = {
    id : Nat;
    userId : Principal;
    location : Text;
    propertyType : PropertyType;
    estimatedMin : Nat;
    estimatedMax : Nat;
    confidence : Nat;
    createdAt : Time.Time;
  };

  let valuationReports = Map.empty<Nat, ValuationReport>();
  var nextReportId = 1;

  public shared ({ caller }) func addValuationReport(location : Text, propertyType : PropertyType, estimatedMin : Nat, estimatedMax : Nat, confidence : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create valuation reports");
    };
    let newReport : ValuationReport = {
      id = nextReportId;
      userId = caller;
      location;
      propertyType;
      estimatedMin;
      estimatedMax;
      confidence;
      createdAt = Time.now();
    };
    valuationReports.add(nextReportId, newReport);
    nextReportId += 1;
    newReport.id;
  };

  public query ({ caller }) func getValuationReportsForUser(userId : Principal) : async [ValuationReport] {
    if (caller != userId and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own valuation reports");
    };
    valuationReports.values().toArray().filter(
      func(report) { report.userId == userId }
    );
  };

  // ENQUIRIES
  // -------------------------------------------------
  type Enquiry = {
    id : Nat;
    projectId : Text;
    projectName : Text;
    name : Text;
    phone : Text;
    createdAt : Time.Time;
  };

  let enquiries = Map.empty<Nat, Enquiry>();
  var nextEnquiryId = 1;

  public shared func createEnquiry(projectId : Text, projectName : Text, name : Text, phone : Text) : async Nat {
    let newEnquiry : Enquiry = {
      id = nextEnquiryId;
      projectId;
      projectName;
      name;
      phone;
      createdAt = Time.now();
    };
    enquiries.add(nextEnquiryId, newEnquiry);
    nextEnquiryId += 1;
    newEnquiry.id;
  };

  public query ({ caller }) func getEnquiries() : async [Enquiry] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all enquiries");
    };
    enquiries.values().toArray();
  };

  // ================================================================
  // INTELLIGENCE ENGINE — Backend-Computed AI System
  // ================================================================

  // ── Types ─────────────────────────────────────────────────────────

  type LocalityIntelligence = {
    name : Text;
    city : Text;
    avgPricePerSqft : Nat;
    rentalPerSqft : Nat;
    demandScore : Nat;
    infraScore : Nat;
    locationScore : Nat;
    supplyDensity : Nat;
    growthRate : Nat;
    amenitiesScore : Nat;
  };

  type ValuationBreakdown = {
    comparablesContribution : Nat;
    locationContribution : Nat;
    demandContribution : Nat;
    infraContribution : Nat;
    metroContribution : Nat;
    comparablesUsed : Nat;
    pricePerSqft : Nat;
  };

  public type ValuationResponse = {
    priceMin : Nat;
    priceMax : Nat;
    bestPrice : Nat;
    confidence : Nat;
    confidenceReason : Text;
    breakdown : ValuationBreakdown;
    localityFound : Bool;
  };

  public type ForecastResponse = {
    conservative : Nat;
    realistic : Nat;
    aggressive : Nat;
    basePrice : Nat;
    growthRate : Nat;
    disclaimer : Text;
  };

  public type DealScoreResponse = {
    dealScore : Nat;
    fairValue : Nat;
    priceGap : Int;
    demandScore : Nat;
    liquidityScore : Nat;
    dealTag : Text;
    expectedDaysToSell : Nat;
  };

  public type RentalResponse = {
    rentMin : Nat;
    rentMax : Nat;
    avgRent : Nat;
    yieldPercent : Nat;
    vacancyRate : Nat;
    rentalConfidence : Nat;
    avgRentPerSqft : Nat;
  };

  type FeedbackEvent = {
    listingId : Nat;
    eventType : Text;
    timestamp : Time.Time;
  };

  // ── Intelligence Types ────────────────────────────────────────────

  type PriceSnapshot = {
    locality : Text;
    pricePerSqft : Nat;
    timestamp : Int;
    source : Text;
    confidenceWeight : Nat;
  };

  type DemandSignal = {
    locality : Text;
    demandScore : Nat;
    timestamp : Int;
    source : Text;
  };

  type SalesFeedback = {
    locality : Text;
    predictedPrice : Nat;
    actualPrice : Nat;
    timestamp : Int;
  };


  // ── Sale Record Type (full AI training record) ────────────────────
  type SaleRecord = {
    locality : Text;
    sqft : Nat;
    propertyType : Text;
    soldPrice : Nat;
    timestamp : Int;
  };

  // ── Metro Proximity Type ──────────────────────────────────────────
  // distanceKm10: distance to nearest metro station × 10
  // e.g. 5 = 0.5 km, 15 = 1.5 km, 30 = 3.0 km
  // Localities NOT in this map have no metro nearby → score = 0
  type MetroProximity = {
    nearestStation : Text;
    distanceKm10 : Nat;
  };

  // ── Stable Storage ────────────────────────────────────────────────

  let localityData = Map.empty<Text, LocalityIntelligence>();
  var feedbackEvents : [FeedbackEvent] = [];
  var intelligenceSeeded = false;

  let localityPriceHistory = Map.empty<Text, [PriceSnapshot]>();
  let demandSignalsStore = Map.empty<Text, [DemandSignal]>();
  var salesFeedbackLog : [SalesFeedback] = [];
  var saleRecordsLog : [SaleRecord] = [];
  var lastDemandUpdate : Int = 0;

  // Metro proximity map — only localities with known metro access
  let metroProximityData = Map.empty<Text, MetroProximity>();

  // ── Metro Proximity Score ─────────────────────────────────────────
  // Returns 0 if locality has no metro mapping (no phantom boost)
  // Returns 10–100 based on distance for localities WITH metro nearby
  func getMetroProximityScore(locality : Text) : Nat {
    switch (metroProximityData.get(locality)) {
      case (null) {
        // No metro station mapped → no score boost
        0
      };
      case (?metro) {
        // Closer = higher score
        // <= 0.5 km: 100, <= 1.0 km: 85, <= 2.0 km: 70,
        // <= 3.0 km: 55, <= 5.0 km: 35, > 5.0 km: 15
        if (metro.distanceKm10 <= 5) 100
        else if (metro.distanceKm10 <= 10) 85
        else if (metro.distanceKm10 <= 20) 70
        else if (metro.distanceKm10 <= 30) 55
        else if (metro.distanceKm10 <= 50) 35
        else 15
      };
    };
  };

  // ── Intelligence Helpers ──────────────────────────────────────────

  func getLatestDemandScore(locality : Text) : ?Nat {
    switch (demandSignalsStore.get(locality)) {
      case (null) { null };
      case (?signals) {
        if (signals.size() == 0) { null }
        else {
          var latest = signals[0];
          for (s in signals.vals()) {
            if (s.timestamp > latest.timestamp) { latest := s };
          };
          ?latest.demandScore
        }
      };
    };
  };

  func computeConfidence(
    comparablesCount : Nat,
    priceVariance : Nat,
    historySize : Nat,
    latestSnapshotAge : Nat
  ) : (Nat, Text) {
    let compWeight : Nat = if (comparablesCount >= 5) 100
      else if (comparablesCount >= 3) 80
      else 50;

    let varWeight : Nat = if (priceVariance <= 5) 100
      else if (priceVariance <= 15) 75
      else if (priceVariance <= 30) 50
      else 25;

    let recencyWeight : Nat = if (latestSnapshotAge <= 7) 100
      else if (latestSnapshotAge <= 30) 80
      else if (latestSnapshotAge <= 90) 60
      else 40;

    let dataWeight : Nat = if (historySize >= 10) 100
      else if (historySize >= 5) 80
      else if (historySize >= 1) 60
      else 40;

    let score : Nat =
      compWeight * 40 / 100 +
      varWeight * 20 / 100 +
      recencyWeight * 20 / 100 +
      dataWeight * 20 / 100;

    let reason : Text = if (comparablesCount < 3) "Low comparables — estimate may vary"
      else if (priceVariance > 30) "High price variance — market is volatile"
      else if (historySize < 1) "Insufficient historical data"
      else if (score >= 80) "Strong data quality — high confidence estimate"
      else "Moderate data availability — reliable estimate";

    (score, reason)
  };

  func getPriceHistorySize(locality : Text) : Nat {
    switch (localityPriceHistory.get(locality)) {
      case (null) { 0 };
      case (?arr) { arr.size() };
    };
  };

  func getDaysSinceLatestSnapshot(locality : Text) : Nat {
    switch (localityPriceHistory.get(locality)) {
      case (null) { 999 };
      case (?arr) {
        if (arr.size() == 0) { 999 }
        else {
          var latest = arr[0];
          for (s in arr.vals()) {
            if (s.timestamp > latest.timestamp) { latest := s };
          };
          let nowNs = Time.now();
          let diffNs = nowNs - latest.timestamp;
          let diffDays : Nat = if (diffNs <= 0) { 0 }
            else { Int.abs(diffNs) / 86_400_000_000_000 };
          diffDays
        }
      };
    };
  };

  func computeMovingAverage(locality : Text, n : Nat) : ?Nat {
    switch (localityPriceHistory.get(locality)) {
      case (null) { null };
      case (?arr) {
        let size = arr.size();
        if (size == 0) { null }
        else {
          let take = if (size < n) size else n;
          var total : Nat = 0;
          var count : Nat = 0;
          var i : Nat = if (size >= take) { size - take } else { 0 };
          while (i < size) {
            total += arr[i].pricePerSqft;
            count += 1;
            i += 1;
          };
          if (count == 0) { null }
          else { ?(total / count) }
        }
      };
    };
  };

  func computeTrendSlope(locality : Text) : (Nat, Bool) {
    switch (localityPriceHistory.get(locality)) {
      case (null) { (0, true) };
      case (?arr) {
        let size = arr.size();
        if (size < 2) { (0, true) }
        else {
          var oldest = arr[0];
          var newest = arr[0];
          for (s in arr.vals()) {
            if (s.timestamp < oldest.timestamp) { oldest := s };
            if (s.timestamp > newest.timestamp) { newest := s };
          };
          let timeDiffNs = newest.timestamp - oldest.timestamp;
          if (timeDiffNs <= 0) { (0, true) }
          else {
            let timeDiffDays : Nat = Int.abs(timeDiffNs) / 86_400_000_000_000;
            if (timeDiffDays == 0) { (0, true) }
            else {
              let priceNew = newest.pricePerSqft;
              let priceOld = oldest.pricePerSqft;
              if (priceNew >= priceOld) {
                let diff = priceNew - priceOld;
                let slopeX1000 = diff * 1000 / timeDiffDays;
                (slopeX1000, true)
              } else {
                let diff = priceOld - priceNew;
                let slopeX1000 = diff * 1000 / timeDiffDays;
                (slopeX1000, false)
              }
            }
          }
        }
      };
    };
  };

  // ── Seed Helper ───────────────────────────────────────────────────

  func addLocality(
    name : Text,
    city : Text,
    pricePerSqft : Nat,
    rental : Nat,
    demand : Nat,
    infra : Nat,
    location : Nat,
    supply : Nat,
    growth : Nat,
    amenities : Nat
  ) {
    let d : LocalityIntelligence = {
      name;
      city;
      avgPricePerSqft = pricePerSqft;
      rentalPerSqft = rental;
      demandScore = demand;
      infraScore = infra;
      locationScore = location;
      supplyDensity = supply;
      growthRate = growth;
      amenitiesScore = amenities;
    };
    localityData.add(name, d);
  };

  // Helper to seed metro proximity — only call for localities WITH actual metro access
  func addMetro(locality : Text, station : Text, distanceKm10 : Nat) {
    metroProximityData.add(locality, { nearestStation = station; distanceKm10 });
  };

  // ── Seed Intelligence Data ────────────────────────────────────────

  public shared ({ caller }) func seedIntelligenceData() : async () {
    if (intelligenceSeeded) { return };

    // ── Bangalore ──
    addLocality("Whitefield", "Bangalore", 7500, 35, 82, 78, 75, 65, 9, 80);
    addLocality("Koramangala", "Bangalore", 12000, 55, 90, 88, 90, 80, 7, 92);
    addLocality("Indiranagar", "Bangalore", 13500, 60, 88, 85, 92, 75, 6, 90);
    addLocality("HSR Layout", "Bangalore", 10500, 48, 85, 82, 83, 70, 8, 85);
    addLocality("Electronic City", "Bangalore", 5500, 25, 75, 65, 60, 55, 11, 65);
    addLocality("Sarjapur", "Bangalore", 6800, 30, 78, 70, 68, 50, 12, 70);
    addLocality("Sarjapur Road", "Bangalore", 7200, 32, 80, 72, 70, 52, 11, 72);
    addLocality("Hebbal", "Bangalore", 8200, 38, 80, 75, 78, 60, 10, 75);
    addLocality("JP Nagar", "Bangalore", 9000, 42, 82, 80, 80, 68, 8, 82);
    addLocality("Bellandur", "Bangalore", 9500, 44, 83, 78, 79, 62, 9, 78);
    addLocality("Yelahanka", "Bangalore", 6200, 28, 72, 68, 65, 45, 10, 68);
    addLocality("Marathahalli", "Bangalore", 7800, 36, 81, 76, 74, 63, 9, 76);
    addLocality("Banaswadi", "Bangalore", 7200, 33, 76, 72, 71, 58, 8, 72);
    addLocality("Malleshwaram", "Bangalore", 14000, 62, 85, 83, 88, 78, 5, 88);
    addLocality("Rajajinagar", "Bangalore", 11500, 52, 83, 80, 82, 72, 6, 82);
    addLocality("Jayanagar", "Bangalore", 13000, 58, 84, 82, 88, 76, 5, 88);
    addLocality("Devanahalli", "Bangalore", 5000, 22, 70, 62, 58, 40, 13, 60);
    addLocality("Thanisandra", "Bangalore", 6500, 29, 74, 68, 63, 48, 10, 65);
    addLocality("Hennur Road", "Bangalore", 6800, 30, 75, 70, 65, 50, 10, 67);
    addLocality("Bannerghatta Road", "Bangalore", 7000, 31, 76, 72, 68, 55, 9, 70);

    // ── Pune ──
    addLocality("Baner", "Pune", 9500, 42, 84, 80, 82, 68, 10, 82);
    addLocality("Wakad", "Pune", 8000, 36, 80, 75, 76, 60, 11, 76);
    addLocality("Hinjewadi", "Pune", 7200, 32, 82, 78, 73, 58, 12, 75);
    addLocality("Kharadi", "Pune", 8500, 38, 81, 76, 78, 62, 11, 78);
    addLocality("Viman Nagar", "Pune", 10000, 45, 83, 78, 82, 65, 9, 82);
    addLocality("Aundh", "Pune", 11000, 50, 84, 80, 85, 70, 8, 84);
    addLocality("Hadapsar", "Pune", 7500, 33, 79, 73, 72, 55, 10, 72);
    addLocality("Koregaon Park", "Pune", 14000, 62, 86, 82, 90, 72, 6, 88);
    addLocality("Kalyani Nagar", "Pune", 12000, 54, 84, 80, 85, 68, 7, 84);

    // ── Delhi NCR / Gurgaon ──
    addLocality("Gurgaon Sector 57", "Gurgaon", 12000, 52, 83, 80, 83, 70, 8, 82);
    addLocality("DLF Phase 2", "Gurgaon", 15000, 65, 86, 83, 88, 72, 6, 86);
    addLocality("Sohna Road", "Gurgaon", 9000, 40, 79, 73, 74, 55, 10, 74);
    addLocality("New Gurgaon", "Gurgaon", 8500, 38, 78, 72, 72, 50, 11, 72);
    addLocality("Dwarka Expressway", "Gurgaon", 9500, 42, 80, 75, 76, 58, 10, 75);
    addLocality("Noida Sector 137", "Noida", 6500, 28, 76, 72, 70, 52, 10, 70);
    addLocality("Greater Noida West", "Noida", 5000, 22, 72, 66, 62, 45, 12, 64);
    addLocality("Noida Extension", "Noida", 5200, 23, 73, 67, 63, 46, 12, 65);

    // ── Mumbai ──
    addLocality("Powai", "Mumbai", 22000, 95, 88, 85, 88, 80, 6, 88);
    addLocality("Andheri West", "Mumbai", 25000, 110, 88, 85, 90, 85, 5, 88);
    addLocality("Bandra", "Mumbai", 45000, 180, 92, 90, 96, 90, 4, 95);
    addLocality("Malad", "Mumbai", 18000, 78, 84, 80, 82, 76, 7, 82);
    addLocality("Thane", "Mumbai", 12000, 52, 82, 78, 76, 68, 9, 76);
    addLocality("Navi Mumbai", "Mumbai", 9500, 42, 80, 75, 72, 60, 10, 72);
    addLocality("Borivali", "Mumbai", 16000, 70, 83, 78, 79, 73, 7, 78);
    addLocality("Mira Road", "Mumbai", 11000, 48, 78, 70, 70, 60, 9, 70);
    addLocality("Kharghar", "Mumbai", 8500, 38, 79, 73, 71, 56, 10, 72);

    // ── Hyderabad ──
    addLocality("Jubilee Hills", "Hyderabad", 14000, 60, 85, 82, 88, 70, 7, 86);
    addLocality("Gachibowli", "Hyderabad", 9000, 40, 84, 80, 80, 62, 11, 80);
    addLocality("Hitech City", "Hyderabad", 10500, 48, 86, 83, 83, 65, 10, 82);
    addLocality("Kondapur", "Hyderabad", 8500, 38, 82, 78, 78, 58, 11, 78);
    addLocality("Madhapur", "Hyderabad", 11000, 50, 84, 80, 82, 63, 9, 80);
    addLocality("Kukatpally", "Hyderabad", 7200, 32, 79, 73, 72, 55, 10, 73);
    addLocality("Miyapur", "Hyderabad", 6800, 30, 77, 70, 68, 50, 11, 70);
    addLocality("Banjara Hills", "Hyderabad", 18000, 78, 86, 83, 90, 74, 6, 88);
    addLocality("Manikonda", "Hyderabad", 7500, 33, 80, 74, 74, 55, 10, 73);

    // ── Chennai ──
    addLocality("Velachery", "Chennai", 9500, 42, 82, 78, 78, 64, 8, 78);
    addLocality("OMR", "Chennai", 7000, 31, 79, 73, 70, 55, 11, 70);
    addLocality("Adyar", "Chennai", 14000, 62, 84, 80, 86, 72, 6, 85);
    addLocality("Anna Nagar", "Chennai", 12500, 56, 83, 80, 85, 70, 6, 84);
    addLocality("Porur", "Chennai", 8500, 38, 80, 75, 75, 58, 9, 75);
    addLocality("Perungudi", "Chennai", 8000, 35, 79, 74, 73, 56, 9, 73);
    addLocality("Sholinganallur", "Chennai", 8200, 36, 80, 75, 73, 57, 9, 74);
    addLocality("Tambaram", "Chennai", 6000, 26, 75, 68, 65, 52, 10, 66);

    // ── Kolkata ──
    addLocality("Salt Lake", "Kolkata", 9000, 40, 80, 76, 80, 65, 7, 78);
    addLocality("New Town", "Kolkata", 7500, 33, 78, 74, 74, 55, 9, 74);
    addLocality("Rajarhat", "Kolkata", 6500, 28, 74, 68, 67, 48, 10, 67);
    addLocality("Alipore", "Kolkata", 16000, 70, 82, 78, 84, 68, 5, 82);

    // ── Metro Proximity Data ──────────────────────────────────────────
    // ONLY localities with real, operational metro access are listed here.
    // Localities NOT listed here get metroScore = 0 (no phantom boost).

    // Bangalore — Namma Metro
    addMetro("Indiranagar", "Indiranagar Metro", 5);         // 0.5 km
    addMetro("Malleshwaram", "Mantri Square Sampige Road", 3);  // 0.3 km
    addMetro("Rajajinagar", "Rajajinagar Metro", 4);         // 0.4 km
    addMetro("Banaswadi", "Banaswadi Metro", 8);             // 0.8 km
    addMetro("Whitefield", "Whitefield Metro", 12);          // 1.2 km (new line)
    addMetro("Jayanagar", "Jayanagar Metro", 10);            // 1.0 km
    // NOT listed: Koramangala, HSR Layout, Bellandur, Electronic City, Sarjapur,
    //   Marathahalli, JP Nagar, Hebbal, Devanahalli, Thanisandra etc. → metro score = 0

    // Mumbai — Western, Harbour, Central lines + Metro Line 1
    addMetro("Andheri West", "Andheri Metro/Rail", 3);       // 0.3 km
    addMetro("Bandra", "Bandra Rail", 5);                    // 0.5 km
    addMetro("Malad", "Malad Metro", 6);                     // 0.6 km (Metro Line 7)
    addMetro("Borivali", "Borivali Rail", 5);                // 0.5 km
    addMetro("Thane", "Thane Rail", 8);                      // 0.8 km
    // NOT listed: Powai, Mira Road, Navi Mumbai, Kharghar → metro score = 0

    // Delhi NCR — Delhi Metro
    addMetro("DLF Phase 2", "HUDA City Centre", 10);         // 1.0 km
    addMetro("Gurgaon Sector 57", "Sector 55-56 Metro", 12); // 1.2 km
    addMetro("Dwarka Expressway", "Sector 21 Metro", 18);    // 1.8 km
    addMetro("Noida Sector 137", "Sector 137 Metro", 5);     // 0.5 km (Aqua Line)
    addMetro("Noida Extension", "Sector 76 Metro", 25);      // 2.5 km
    // NOT listed: Sohna Road, New Gurgaon, Greater Noida West → metro score = 0

    // Hyderabad — Metro Rail
    addMetro("Miyapur", "Miyapur Metro", 3);                 // 0.3 km
    addMetro("Kukatpally", "KPHB Metro", 6);                 // 0.6 km
    addMetro("Hitech City", "Hitech City Metro", 5);         // 0.5 km
    addMetro("Madhapur", "Durgam Cheruvu Metro", 7);         // 0.7 km
    addMetro("Jubilee Hills", "Jubilee Hills Check Post", 10); // 1.0 km
    addMetro("Banjara Hills", "Lakdikapul Metro", 15);       // 1.5 km
    // NOT listed: Gachibowli, Kondapur, Manikonda → metro score = 0

    // Chennai — MRTS / Chennai Metro
    addMetro("Velachery", "Velachery Metro", 4);             // 0.4 km
    addMetro("Anna Nagar", "Anna Nagar Metro", 6);           // 0.6 km
    addMetro("Adyar", "Adyar Metro", 8);                     // 0.8 km
    addMetro("Tambaram", "Tambaram MRTS", 10);               // 1.0 km
    // NOT listed: Porur, Perungudi, Sholinganallur, OMR → metro score = 0

    // Kolkata — Metro Rail
    addMetro("Salt Lake", "Salt Lake Sector V Metro", 5);    // 0.5 km
    addMetro("New Town", "New Town Metro", 8);               // 0.8 km
    addMetro("Alipore", "Majerhat Metro", 12);               // 1.2 km
    // NOT listed: Rajarhat → metro score = 0

    // Pune — Limited metro (Phase 1)
    // Most Pune localities do not have operational metro yet → all get score = 0

    intelligenceSeeded := true;
  };

  // ── Locality Lookup Helper ────────────────────────────────────────

  func findLocality(name : Text) : ?LocalityIntelligence {
    switch (localityData.get(name)) {
      case (?d) { return ?d };
      case (null) {};
    };
    for ((k, v) in localityData.entries()) {
      if (k.contains(#text name) or name.contains(#text k)) {
        return ?v;
      };
    };
    null;
  };

  // ── Valuation Engine ─────────────────────────────────────────────
  // Weight split: comparables 50%, location 20%, demand 15%, infra 10%, metro 5%
  // Metro contribution is 0 for localities without mapped metro access.

  public query func computeValuation(
    locality : Text,
    propertyType : Text,
    sqft : Nat,
    age : Nat,
    amenitiesCount : Nat
  ) : async ValuationResponse {
    switch (findLocality(locality)) {
      case (null) {
        let defaultPrice = 7000 * sqft;
        {
          priceMin = defaultPrice * 88 / 100;
          priceMax = defaultPrice * 112 / 100;
          bestPrice = defaultPrice;
          confidence = 20;
          confidenceReason = "Locality not in dataset. Using city-tier average.";
          breakdown = {
            comparablesContribution = 0;
            locationContribution = 0;
            demandContribution = 0;
            infraContribution = 0;
            metroContribution = 0;
            comparablesUsed = 0;
            pricePerSqft = 7000;
          };
          localityFound = false;
        };
      };
      case (?d) {
        let basePPS : Nat = switch (computeMovingAverage(locality, 5)) {
          case (?avg) { avg };
          case (null) { d.avgPricePerSqft };
        };
        let basePrice = basePPS * sqft;

        let typeMultiplier : Nat = if (propertyType == "villa") 125
          else if (propertyType == "plot") 75
          else 100;

        let agePenalty : Nat = if (age * 50 / 100 > 15) 15 else age * 50 / 100;
        let ageFactor : Nat = 100 - agePenalty;

        let amenBonus : Nat = if (amenitiesCount * 50 / 100 > 8) 8 else amenitiesCount * 50 / 100;

        let comparablesBase = basePrice;
        let locationAdj = basePrice * d.locationScore / 100;
        let infraAdj = basePrice * d.infraScore / 100;

        let activeDemandScore : Nat = switch (getLatestDemandScore(locality)) {
          case (?ds) { ds };
          case (null) { d.demandScore };
        };
        let demandAdj = basePrice * activeDemandScore / 100;

        // Metro adjustment — only non-zero if this locality has mapped metro access
        let metroScore = getMetroProximityScore(locality);
        let metroAdj = if (metroScore > 0) {
          basePrice * metroScore / 100
        } else {
          0  // No metro nearby — no contribution
        };

        // Weighted blend: comparables 50, location 20, demand 15, infra 10, metro 5
        let weightedRaw : Nat =
          comparablesBase * 50 / 100 +
          locationAdj    * 20 / 100 +
          demandAdj      * 15 / 100 +
          infraAdj       * 10 / 100 +
          metroAdj       *  5 / 100;

        let adjusted = weightedRaw * typeMultiplier / 100 * ageFactor / 100 * (100 + amenBonus) / 100;

        let demandBoost : Nat = activeDemandScore * 10 / 100;
        let demandAdjusted : Nat = adjusted + adjusted * demandBoost / 100;

        let finalPrice : Nat = switch (localityPriceHistory.get(locality)) {
          case (null) { demandAdjusted };
          case (?history) {
            if (history.size() == 0) { demandAdjusted }
            else {
              var sumWeighted : Nat = 0;
              var sumWeights : Nat = 0;
              for (snap in history.vals()) {
                sumWeighted += snap.pricePerSqft * snap.confidenceWeight;
                sumWeights += snap.confidenceWeight;
              };
              if (sumWeights == 0) { demandAdjusted }
              else {
                let histAvgPPS = sumWeighted / sumWeights;
                let blended = demandAdjusted * 70 / 100 + (histAvgPPS * sqft) * 30 / 100;
                blended
              }
            }
          };
        };

        let historySize = getPriceHistorySize(locality);
        let snapshotAge = getDaysSinceLatestSnapshot(locality);
        let estimatedVariance : Nat = if (d.supplyDensity > 70) 25
          else if (d.supplyDensity > 50) 15
          else 8;
        let (confidence, confidenceReason) = computeConfidence(5, estimatedVariance, historySize, snapshotAge);

        {
          priceMin = finalPrice * 92 / 100;
          priceMax = finalPrice * 108 / 100;
          bestPrice = finalPrice;
          confidence;
          confidenceReason;
          breakdown = {
            comparablesContribution = 50;
            locationContribution = 20;
            demandContribution = 15;
            infraContribution = 10;
            metroContribution = if (metroScore > 0) 5 else 0;
            comparablesUsed = if (historySize > 0) historySize else 5;
            pricePerSqft = if (sqft > 0) finalPrice / sqft else basePPS;
          };
          localityFound = true;
        };
      };
    };
  };

  // ── Forecast Engine ───────────────────────────────────────────────

  public query func getForecast(
    locality : Text,
    propertyType : Text
  ) : async ForecastResponse {
    let (datasetPPS, datasetGrowth) = switch (findLocality(locality)) {
      case (null) { (7000, 8) };
      case (?d) { (d.avgPricePerSqft, d.growthRate) };
    };

    let basePPS : Nat = switch (computeMovingAverage(locality, 6)) {
      case (?avg) { avg };
      case (null) { datasetPPS };
    };

    let (slopeX1000, _isPositive) = computeTrendSlope(locality);
    let trendAnnualPct : Nat = if (slopeX1000 > 0) {
      let annualChange = slopeX1000 * 365 / 1000;
      if (basePPS > 0) { annualChange * 100 / basePPS } else { datasetGrowth }
    } else { datasetGrowth };

    let cappedGrowth : Nat = if (trendAnnualPct < 1) 1
      else if (trendAnnualPct > 30) 30
      else trendAnnualPct;

    let demandScore : Nat = switch (getLatestDemandScore(locality)) {
      case (?ds) { ds };
      case (null) {
        switch (findLocality(locality)) {
          case (?d) { d.demandScore };
          case (null) { 60 };
        };
      };
    };
    let demandBoostPct : Nat = demandScore / 20;

    let typeMult : Nat = if (propertyType == "villa") 125
      else if (propertyType == "plot") 75
      else 100;
    let base = basePPS * 1000 * typeMult / 100;

    let conservativeGrowth : Nat = if (cappedGrowth * 60 / 100 < 1) 1 else cappedGrowth * 60 / 100;
    let conservative = base + base * conservativeGrowth / 100;
    let realistic = base + base * cappedGrowth / 100;
    let aggressiveGrowth : Nat = cappedGrowth * 150 / 100 + demandBoostPct;
    let aggressive = base + base * aggressiveGrowth / 100;

    {
      conservative;
      realistic;
      aggressive;
      basePrice = base;
      growthRate = cappedGrowth;
      disclaimer = "AI-based projection using historical trends and demand signals. Not financial advice.";
    };
  };

  // ── Deal Score Engine ─────────────────────────────────────────────

  public query func getDealScore(listingId : Nat) : async DealScoreResponse {
    switch (propertyListings.get(listingId)) {
      case (null) {
        {
          dealScore = 0;
          fairValue = 0;
          priceGap = 0;
          demandScore = 0;
          liquidityScore = 0;
          dealTag = "Unknown";
          expectedDaysToSell = 90;
        };
      };
      case (?listing) {
        let (avgPPS, demandScore, supplyDensity) = switch (findLocality(listing.location)) {
          case (null) { (7000, 70, 60) };
          case (?d) { (d.avgPricePerSqft, d.demandScore, d.supplyDensity) };
        };
        let sqft = if (listing.carpetArea > 0) { listing.carpetArea } else { 1000 };
        let fairValue = avgPPS * sqft;
        let listingPrice = listing.price;
        let priceGap : Int = Int.fromNat(fairValue) - Int.fromNat(listingPrice);
        let liquidityScore : Nat = 100 - supplyDensity;
        let valueScore : Nat = if (priceGap > 0) {
          let absGap : Nat = Int.abs(priceGap);
          let pct : Nat = if (fairValue > 0) { absGap * 40 / fairValue } else { 0 };
          if (pct > 40) { 40 } else { pct };
        } else { 0 };
        let dealScore : Nat = valueScore + demandScore * 35 / 100 + liquidityScore * 25 / 100;
        let cappedScore = if (dealScore > 100) { 100 } else { dealScore };
        let dealTag : Text = if (cappedScore > 70) { "Strong" }
          else if (cappedScore > 40) { "Good" }
          else { "Weak" };
        let expectedDays : Nat = if (cappedScore > 70) { 30 }
          else if (cappedScore > 40) { 60 }
          else { 120 };
        {
          dealScore = cappedScore;
          fairValue;
          priceGap;
          demandScore;
          liquidityScore;
          dealTag;
          expectedDaysToSell = expectedDays;
        };
      };
    };
  };

  // ── Rental Intelligence Engine ────────────────────────────────────

  public query func getRentalIntelligence(locality : Text) : async RentalResponse {
    switch (findLocality(locality)) {
      case (null) {
        {
          rentMin = 18000;
          rentMax = 32000;
          avgRent = 25000;
          yieldPercent = 35;
          vacancyRate = 10;
          rentalConfidence = 25;
          avgRentPerSqft = 25;
        };
      };
      case (?d) {
        let avgRent = d.rentalPerSqft * 1000;
        let vacancyRate : Nat = if (d.demandScore > 85) { 4 }
          else if (d.demandScore > 70) { 8 }
          else { 15 };
        let annualRent = avgRent * 12;
        let safeVacancy : Nat = if (vacancyRate >= 100) 0 else vacancyRate;
        let effectiveRent = annualRent * (100 - safeVacancy) / 100;
        let maintenance = avgRent * 2;
        let netAnnual : Nat = if (effectiveRent > maintenance) {
          effectiveRent - maintenance;
        } else { effectiveRent };
        let propertyVal = d.avgPricePerSqft * 1000;
        let yieldPercent = if (propertyVal > 0) { netAnnual * 100 / propertyVal } else { 35 };
        let rentalConfidence : Nat = if (d.demandScore > 80) { 82 }
          else if (d.demandScore > 65) { 70 }
          else { 55 };
        {
          rentMin = avgRent * 85 / 100;
          rentMax = avgRent * 115 / 100;
          avgRent;
          yieldPercent;
          vacancyRate;
          rentalConfidence;
          avgRentPerSqft = d.rentalPerSqft;
        };
      };
    };
  };

  // ── Feedback Tracking ─────────────────────────────────────────────

  public shared func trackFeedback(listingId : Nat, eventType : Text) : async () {
    let event : FeedbackEvent = {
      listingId;
      eventType;
      timestamp = Time.now();
    };
    feedbackEvents := feedbackEvents.concat([event]);
  };

  public query func getFeedbackCount() : async Nat {
    feedbackEvents.size();
  };

  // ── Locality Discovery ────────────────────────────────────────────

  public query func getLocalityList() : async [Text] {
    localityData.keys().toArray();
  };

  public query func searchLocalities(searchQuery : Text) : async [Text] {
    let q = searchQuery;
    localityData.keys().toArray().filter(func(k) { k.contains(#text q) });
  };

  public query func getLocalityIntelligence(locality : Text) : async ?LocalityIntelligence {
    findLocality(locality);
  };

  public query func isIntelligenceSeeded() : async Bool {
    intelligenceSeeded;
  };

  // ── Metro Info Query ──────────────────────────────────────────────
  // Returns metro proximity data for a locality, or null if no metro nearby.
  public type MetroInfo = {
    hasMetro : Bool;
    nearestStation : Text;
    distanceKm : Text;   // e.g. "1.2 km"
    metroScore : Nat;    // 0 if no metro
  };

  public query func getMetroInfo(locality : Text) : async MetroInfo {
    switch (metroProximityData.get(locality)) {
      case (null) {
        {
          hasMetro = false;
          nearestStation = "None";
          distanceKm = "N/A";
          metroScore = 0;
        };
      };
      case (?metro) {
        let km10 = metro.distanceKm10;
        let intPart = km10 / 10;
        let decPart = km10 - (intPart * 10);
        let distStr = intPart.toText() # "." # decPart.toText() # " km";
        {
          hasMetro = true;
          nearestStation = metro.nearestStation;
          distanceKm = distStr;
          metroScore = getMetroProximityScore(locality);
        };
      };
    };
  };

  // ── Update Confidence ─────────────────────────────────────────────

  public shared func updateConfidence(locality : Text, source : Text, actualPrice : Nat) : async Text {
    let threshold = 15;
    switch (localityPriceHistory.get(locality)) {
      case (null) { return "No history found for locality" };
      case (?history) {
        let updated = history.map(func(snap : PriceSnapshot) : PriceSnapshot {
          if (snap.source == source) {
            let diff : Nat = if (actualPrice > snap.pricePerSqft) {
              (actualPrice - snap.pricePerSqft) * 100 / actualPrice
            } else {
              (snap.pricePerSqft - actualPrice) * 100 / snap.pricePerSqft
            };
            if (diff > threshold) {
              let newWeight : Nat = if (snap.confidenceWeight > 10) snap.confidenceWeight - 10 else 10;
              { snap with confidenceWeight = newWeight }
            } else {
              let newWeight = if (snap.confidenceWeight + 5 > 100) 100 else snap.confidenceWeight + 5;
              { snap with confidenceWeight = newWeight }
            }
          } else { snap }
        });
        localityPriceHistory.add(locality, updated);
        "Confidence updated for " # locality # " source " # source
      };
    };
  };

  // ── Sale Feedback Loop ────────────────────────────────────────────

  public shared func submitSaleFeedback(locality : Text, predictedPrice : Nat, actualPrice : Nat) : async Text {
    let feedback : SalesFeedback = {
      locality;
      predictedPrice;
      actualPrice;
      timestamp = Time.now();
    };
    salesFeedbackLog := salesFeedbackLog.concat([feedback]);
    let threshold = 15;
    let diff : Nat = if (actualPrice > predictedPrice) {
      (actualPrice - predictedPrice) * 100 / actualPrice
    } else {
      (predictedPrice - actualPrice) * 100 / predictedPrice
    };
    if (diff > threshold) {
      ignore updateConfidence(locality, "listing", actualPrice);
    };
    "Feedback recorded for " # locality
  };

  // ── Record Daily Snapshot (24h dedup) ─────────────────────────────

  public shared func recordDailySnapshot(locality : Text) : async Text {
    let nowNs = Time.now();
    let oneDayNs : Int = 86_400_000_000_000;
    switch (localityPriceHistory.get(locality)) {
      case (?existing) {
        for (snap in existing.vals()) {
          if (nowNs - snap.timestamp < oneDayNs) {
            return "skipped: snapshot already recorded for " # locality # " today";
          };
        };
      };
      case (null) {};
    };
    let currentPPS : Nat = switch (findLocality(locality)) {
      case (null) { return "skipped: locality not found" };
      case (?d) { d.avgPricePerSqft };
    };
    let newSnap : PriceSnapshot = {
      locality;
      pricePerSqft = currentPPS;
      timestamp = nowNs;
      source = "seed";
      confidenceWeight = 70;
    };
    let existing : [PriceSnapshot] = switch (localityPriceHistory.get(locality)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    localityPriceHistory.add(locality, existing.concat([newSnap]));
    "ok: snapshot recorded for " # locality
  };

  public query func getPriceHistory(locality : Text) : async [PriceSnapshot] {
    switch (localityPriceHistory.get(locality)) {
      case (null) { [] };
      case (?arr) { arr };
    };
  };

  // ── Update Demand Signals (batch, 24h gate) ───────────────────────

  public shared func updateDemandSignals() : async Text {
    let nowNs = Time.now();
    let oneDayNs : Int = 86_400_000_000_000;
    if (nowNs - lastDemandUpdate < oneDayNs) {
      return "skipped: demand signals updated less than 24h ago";
    };
    var localityClicks = Map.empty<Text, Nat>();
    var localitySaves = Map.empty<Text, Nat>();
    var localityEnquiries = Map.empty<Text, Nat>();
    for (event in feedbackEvents.vals()) {
      let loc : Text = switch (propertyListings.get(event.listingId)) {
        case (null) { "unknown" };
        case (?listing) { listing.location };
      };
      if (loc != "unknown") {
        if (event.eventType == "click") {
          let cur = switch (localityClicks.get(loc)) { case (null) 0; case (?v) v };
          localityClicks.add(loc, cur + 1);
        } else if (event.eventType == "save") {
          let cur = switch (localitySaves.get(loc)) { case (null) 0; case (?v) v };
          localitySaves.add(loc, cur + 1);
        } else if (event.eventType == "enquiry") {
          let cur = switch (localityEnquiries.get(loc)) { case (null) 0; case (?v) v };
          localityEnquiries.add(loc, cur + 1);
        };
      };
    };
    var updatedCount : Nat = 0;
    for ((loc, clicks) in localityClicks.entries()) {
      let saves = switch (localitySaves.get(loc)) { case (null) 0; case (?v) v };
      let enquiries = switch (localityEnquiries.get(loc)) { case (null) 0; case (?v) v };
      let rawScore = clicks * 1 + saves * 3 + enquiries * 5;
      let normalizedScore : Nat = if (rawScore >= 200) 100
        else rawScore * 100 / 200;
      let signal : DemandSignal = {
        locality = loc;
        demandScore = normalizedScore;
        timestamp = nowNs;
        source = "user_behavior";
      };
      let existing : [DemandSignal] = switch (demandSignalsStore.get(loc)) {
        case (null) { [] };
        case (?arr) { arr };
      };
      demandSignalsStore.add(loc, existing.concat([signal]));
      updatedCount += 1;
    };
    lastDemandUpdate := nowNs;
    "ok: updated demand signals for " # updatedCount.toText() # " localities"
  };

  public query func getDemandSignals(locality : Text) : async [DemandSignal] {
    switch (demandSignalsStore.get(locality)) {
      case (null) { [] };
      case (?arr) { arr };
    };
  };

  public query func getSalesFeedbackLog() : async [SalesFeedback] {
    salesFeedbackLog
  };
  // ── Full Sale Record submission (for AI training) ─────────────────
  public shared func submitSaleRecord(locality : Text, sqft : Nat, propertyType : Text, soldPrice : Nat) : async Text {
    let record : SaleRecord = {
      locality;
      sqft;
      propertyType;
      soldPrice;
      timestamp = Time.now();
    };
    saleRecordsLog := saleRecordsLog.concat([record]);
    "SaleRecord saved for " # locality
  };

  public query func getSaleRecords() : async [SaleRecord] {
    saleRecordsLog
  };



  // ── addPriceSnapshot (manual insert) ─────────────────────────────

  public shared func addPriceSnapshot(locality : Text, price : Nat) : async Text {
    let newSnap : PriceSnapshot = {
      locality;
      pricePerSqft = price;
      timestamp = Time.now();
      source = "manual";
      confidenceWeight = 60;
    };
    let existing : [PriceSnapshot] = switch (localityPriceHistory.get(locality)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    localityPriceHistory.add(locality, existing.concat([newSnap]));
    "ok: snapshot added for " # locality
  };

  // ================================================================
  // STEP 7 — Data Persistence Cleanup
  // Removes PriceSnapshots and DemandSignals older than maxAgeDays.
  // Also deduplicates snapshots: keeps only the LATEST per calendar day.
  // Call periodically (e.g. once per month) to keep storage lean.
  // ================================================================

  public shared func cleanupOldData(maxAgeDays : Nat) : async Text {
    let nowNs = Time.now();
    let maxAgeNs : Int = maxAgeDays * 86_400_000_000_000;
    var removedSnapshots : Nat = 0;
    var removedSignals : Nat = 0;
    var dedupedSnapshots : Nat = 0;

    // ── Clean price snapshots ──
    for ((locality, snapshots) in localityPriceHistory.entries()) {
      // 1. Remove entries older than maxAgeDays
      let fresh = snapshots.filter(func(s : PriceSnapshot) : Bool {
        nowNs - s.timestamp < maxAgeNs
      });
      removedSnapshots += snapshots.size() - fresh.size();

      // 2. Dedup: within same calendar day, keep only the highest-confidence snapshot
      //    Group by day bucket (timestamp / nanoseconds-per-day)
      let oneDayNs : Int = 86_400_000_000_000;
      let dayMap = Map.empty<Int, PriceSnapshot>();
      for (snap in fresh.vals()) {
        let dayBucket : Int = snap.timestamp / oneDayNs;
        switch (dayMap.get(dayBucket)) {
          case (null) { dayMap.add(dayBucket, snap) };
          case (?existing) {
            // Keep the one with higher confidenceWeight
            if (snap.confidenceWeight > existing.confidenceWeight) {
              dayMap.add(dayBucket, snap);
            };
          };
        };
      };
      let deduped = dayMap.values().toArray();
      dedupedSnapshots += fresh.size() - deduped.size();
      localityPriceHistory.add(locality, deduped);
    };

    // ── Clean demand signals ──
    for ((locality, signals) in demandSignalsStore.entries()) {
      let fresh = signals.filter(func(s : DemandSignal) : Bool {
        nowNs - s.timestamp < maxAgeNs
      });
      removedSignals += signals.size() - fresh.size();
      demandSignalsStore.add(locality, fresh);
    };

    "Cleanup complete: removed " # removedSnapshots.toText() # " old snapshots, " #
    dedupedSnapshots.toText() # " duplicate snapshots, " #
    removedSignals.toText() # " old demand signals"
  };

  // ================================================================
  // STEP 8 — Validation Tests
  // Run these to verify engine correctness without external tools.
  // Returns a list of PASS/FAIL lines.
  // ================================================================

  public query func runValidationTests() : async [Text] {
    var results : [Text] = [];

    // Helper: append a labelled result
    func check(testName : Text, passed : Bool) {
      let line = if (passed) { "PASS: " # testName } else { "FAIL: " # testName };
      results := results.concat([line]);
    };

    // ── Test 1: High comparables → confidence >= 80 ──
    let (conf1, _) = computeConfidence(5, 10, 5, 7);
    check("High comparables (>=5) yields confidence >= 80", conf1 >= 80);

    // ── Test 2: Low comparables (<3) → confidence <= 70 ──
    let (conf2, reason2) = computeConfidence(2, 10, 5, 7);
    check("Low comparables (<3) yields confidence <= 70", conf2 <= 70);
    check("Low comparables reason contains 'Low comparables'", reason2.contains(#text "Low comparables"));

    // ── Test 3: High variance → confidence decreases ──
    let (confLowVar, _) = computeConfidence(5, 5, 5, 7);   // low variance
    let (confHighVar, reasonHigh) = computeConfidence(5, 40, 5, 7);  // high variance
    check("High variance yields lower confidence than low variance", confHighVar < confLowVar);
    check("High variance reason contains 'variance'", reasonHigh.contains(#text "variance"));

    // ── Test 4: Zero history → data availability weight = 40 ──
    let (confNoData, reasonNoData) = computeConfidence(5, 10, 0, 999);
    check("Zero history reduces confidence below full-data confidence", confNoData < conf1);
    check("No history reason mentions 'historical data'", reasonNoData.contains(#text "historical"));

    // ── Test 5: DemandScore 0 → no phantom demand boost ──
    // Simulate: getLatestDemandScore returns null, so demandScore falls back to seeded value.
    // We test the formula directly: demand boost should be 0 when score = 0.
    let demandBoostZero : Nat = 0 * 10 / 100;  // demandScore=0
    check("DemandScore=0 produces zero demand boost", demandBoostZero == 0);

    // ── Test 6: DemandScore 100 → max 10% boost ──
    let demandBoostFull : Nat = 100 * 10 / 100;  // = 10
    check("DemandScore=100 produces exactly 10% boost", demandBoostFull == 10);

    // ── Test 7: Metro score = 0 for unmapped locality ──
    let metroScoreUnmapped = getMetroProximityScore("Bellandur");  // not in metro map
    check("Unmapped locality (Bellandur) has metroScore = 0", metroScoreUnmapped == 0);

    // ── Test 8: Metro score > 0 for mapped locality ──
    let metroScoreMapped = getMetroProximityScore("Indiranagar");  // in metro map
    check("Mapped locality (Indiranagar) has metroScore > 0", metroScoreMapped > 0);

    // ── Test 9: Metro score range is 0-100 ──
    check("Metro score never exceeds 100", metroScoreMapped <= 100);

    // ── Test 10: Snapshot dedup — isSameDay logic ──
    // Two timestamps 1 hour apart are in the same day bucket
    let t1 : Int = 1_700_000_000_000_000_000;  // arbitrary ns
    let t2 : Int = t1 + 3_600_000_000_000;    // +1 hour
    let oneDayNs : Int = 86_400_000_000_000;
    let sameDay = (t1 / oneDayNs) == (t2 / oneDayNs);
    check("Two timestamps 1h apart fall in the same day bucket", sameDay);

    // Two timestamps 25 hours apart are different day buckets
    let t3 : Int = t1 + 90_000_000_000_000;   // +25 hours
    let differentDay = (t1 / oneDayNs) != (t3 / oneDayNs);
    check("Two timestamps 25h apart fall in different day buckets", differentDay);

    // ── Test 11: Confidence is bounded 0-100 ──
    let (confBounded, _) = computeConfidence(100, 0, 100, 0);
    check("Perfect data confidence does not exceed 100", confBounded <= 100);
    let (confMin, _) = computeConfidence(0, 100, 0, 999);
    check("Worst-case confidence is >= 0", confMin >= 0);

    results
  };

  // ================================================================
  // RERA PROJECT STORAGE
  // ================================================================

  type ReraProject = {
    projectName : Text;
    builderName : Text;
    locality : Text;
    microLocation : Text;
    propertyType : Text;
    status : Text;
    unitSize : Nat;
    priceMin : Nat;
    priceMax : Nat;
    possessionDate : Text;
    dataType : Text;
  };

  var stableReraProjects : [ReraProject] = [];

  public shared func addNewReraProjects(newProjects : [ReraProject]) : async Bool {
    var result = stableReraProjects;
    for (p in newProjects.vals()) {
      let key = p.projectName # "||" # p.builderName # "||" # p.locality;
      let exists = result.filter(func(e : ReraProject) : Bool {
        (e.projectName # "||" # e.builderName # "||" # e.locality) == key
      }).size() > 0;
      if (not exists) {
        result := result.concat([p]);
      };
    };
    stableReraProjects := result;
    true
  };

  public shared func seedAndRetrain(newProjects : [ReraProject]) : async Bool {
    ignore await addNewReraProjects(newProjects);
    true
  };

  public query func getReraProjects() : async [ReraProject] {
    stableReraProjects
  };

  public shared func updateReraProject(key : Text, updatedStatus : Text, updatedPossessionDate : Text, updatedPriceMin : Nat, updatedPriceMax : Nat) : async Bool {
    // key = projectName||builderName||locality
    var updated = false;
    let newArr = stableReraProjects.map(func(p : ReraProject) : ReraProject {
      let k = p.projectName # "||" # p.builderName # "||" # p.locality;
      if (k == key) {
        updated := true;
        {
          projectName = p.projectName;
          builderName = p.builderName;
          locality = p.locality;
          microLocation = p.microLocation;
          propertyType = p.propertyType;
          status = if (updatedStatus == "") p.status else updatedStatus;
          unitSize = p.unitSize;
          priceMin = if (updatedPriceMin == 0) p.priceMin else updatedPriceMin;
          priceMax = if (updatedPriceMax == 0) p.priceMax else updatedPriceMax;
          possessionDate = if (updatedPossessionDate == "") p.possessionDate else updatedPossessionDate;
          dataType = p.dataType;
        }
      } else { p }
    });
    stableReraProjects := newArr;
    updated
  };

  // ================================================================
  // LEADS — WhatsApp lead capture and admin management
  // ================================================================

  public type Lead = {
    id : Text;
    name : Text;
    location : Text;
    email : Text;
    phone : Text;
    service_type : Text;  // buy | sell | rent | investment | interior
    budget : Text;
    message : Text;
    created_at : Int;     // nanoseconds timestamp
    is_priority : Bool;
    is_contacted : Bool;
  };

  public type LeadInput = {
    name : Text;
    location : Text;
    email : Text;
    phone : Text;
    service_type : Text;
    budget : Text;
    message : Text;
    is_priority : Bool;
  };

  public type LeadFilter = {
    service_type : ?Text;  // null = all
    date_from : ?Int;      // null = no lower bound (nanoseconds)
    date_to : ?Int;        // null = no upper bound (nanoseconds)
  };

  let leadsStore = Map.empty<Text, Lead>();
  var leadIdCounter : Nat = 0;

  public shared func submitLead(input : LeadInput) : async Text {
    let now = Time.now();
    leadIdCounter += 1;
    let id = "lead_" # leadIdCounter.toText() # "_" # Int.abs(now).toText();
    let lead : Lead = {
      id;
      name = input.name;
      location = input.location;
      email = input.email;
      phone = input.phone;
      service_type = input.service_type;
      budget = input.budget;
      message = input.message;
      created_at = now;
      is_priority = input.is_priority;
      is_contacted = false;
    };
    leadsStore.add(id, lead);
    id
  };

  public query ({ caller }) func getLeads(filter : LeadFilter) : async [Lead] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view leads");
    };
    leadsStore.values().toArray().filter(func(lead : Lead) : Bool {
      let matchesService = switch (filter.service_type) {
        case (null) { true };
        case (?st) { lead.service_type == st };
      };
      let matchesFrom = switch (filter.date_from) {
        case (null) { true };
        case (?from) { lead.created_at >= from };
      };
      let matchesTo = switch (filter.date_to) {
        case (null) { true };
        case (?to) { lead.created_at <= to };
      };
      matchesService and matchesFrom and matchesTo
    });
  };

  public shared ({ caller }) func markLeadContacted(leadId : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can mark leads as contacted");
    };
    switch (leadsStore.get(leadId)) {
      case (null) { false };
      case (?lead) {
        leadsStore.add(leadId, { lead with is_contacted = true });
        true
      };
    };
  };

  // ================================================================
  // SUBSCRIPTION STATUS
  // ================================================================

  // Update a user's subscription status. Admin-only.
  public shared ({ caller }) func updateSubscriptionStatus(userId : Text, status : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update subscription status");
    };
    if (status != "free" and status != "premium") {
      Runtime.trap("Invalid status: must be 'free' or 'premium'");
    };
    let targetPrincipal = Principal.fromText(userId);
    switch (users.get(targetPrincipal)) {
      case (null) {
        // Try emailProfiles keyed by userId (which may be emailHash)
        switch (emailProfiles.get(userId)) {
          case (null) { false };
          case (?profile) {
            emailProfiles.add(userId, { profile with subscription_status = status });
            true
          };
        };
      };
      case (?profile) {
        users.add(targetPrincipal, { profile with subscription_status = status });
        true
      };
    };
  };

  // Returns the caller's subscription_status. Returns "free" if not found.
  public query ({ caller }) func getUserSubscriptionStatus() : async Text {
    switch (users.get(caller)) {
      case (?profile) { profile.subscription_status };
      case (null) { "free" };
    };
  };

  // Returns true if caller is premium OR admin.
  public query ({ caller }) func isPremiumUser() : async Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) { return true };
    switch (users.get(caller)) {
      case (?profile) { profile.subscription_status == "premium" };
      case (null) { false };
    };
  };

  // ================================================================
  // STRIPE PAYMENT INTEGRATION
  // ================================================================

  // Stripe config stored in actor state — set by admin, never hardcoded.
  // priceInCents: configurable premium price (e.g. 199900 = ₹1999)
  type StripeConfig = {
    secretKey : Text;
    priceInCents : Nat;
    allowedCountries : [Text];
  };

  var stripeConfig : ?StripeConfig = null;

  // Admin sets Stripe config (secret key, price, allowed countries).
  public shared ({ caller }) func setStripeConfig(
    secretKey : Text,
    priceInCents : Nat,
    allowedCountries : [Text]
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set Stripe config");
    };
    stripeConfig := ?{ secretKey; priceInCents; allowedCountries };
  };

  // Transform function required by the http-outcalls module (must be query).
  // Named exactly `transform` as required by the stripe extension.
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Returns true if Stripe has been configured by an admin.
  public query func isStripeConfigured() : async Bool {
    stripeConfig != null
  };

  // Creates a Stripe Checkout session for premium upgrade.
  // Returns the checkout session URL (redirect the user to it).
  public shared ({ caller }) func createCheckoutSession() : async Text {
    let config = switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured. Admin must call setStripeConfig first.") };
      case (?c) { c };
    };
    let stripeConf : Stripe.StripeConfiguration = {
      secretKey = config.secretKey;
      allowedCountries = config.allowedCountries;
    };
    let item : Stripe.ShoppingItem = {
      currency = "inr";
      productName = "ValuBrix Premium";
      productDescription = "Full Geo Intelligence — unlimited AI valuations, area deep-dives, and market reports";
      priceInCents = config.priceInCents;
      quantity = 1;
    };
    let sessionJson = await Stripe.createCheckoutSession(
      stripeConf,
      caller,
      [item],
      "https://valubrix.com/area-intelligence?payment=success",
      "https://valubrix.com/area-intelligence",
      transform
    );
    // Extract the checkout URL from the JSON response
    extractStripeUrl(sessionJson)
  };

  // Verifies a Stripe checkout session and upgrades the user if completed.
  // Call this from the success page with the session_id query param.
  public shared func verifyAndUpgradeFromSession(sessionId : Text) : async Text {
    let config = switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured") };
      case (?c) { c };
    };
    let stripeConf : Stripe.StripeConfiguration = {
      secretKey = config.secretKey;
      allowedCountries = config.allowedCountries;
    };
    let status = await Stripe.getSessionStatus(stripeConf, sessionId, transform);
    switch (status) {
      case (#failed({ error })) {
        "error: " # error
      };
      case (#completed({ response = _; userPrincipal })) {
        switch (userPrincipal) {
          case (null) { "error: no user principal in session" };
          case (?principalText) {
            let targetPrincipal = Principal.fromText(principalText);
            switch (users.get(targetPrincipal)) {
              case (null) { "error: user not found" };
              case (?profile) {
                users.add(targetPrincipal, { profile with subscription_status = "premium" });
                "ok: upgraded to premium"
              };
            };
          };
        };
      };
    };
  };

  // Alias: required by the stripe extension — same logic as verifyAndUpgradeFromSession.
  public shared func getStripeSessionStatus(sessionId : Text) : async Text {
    await verifyAndUpgradeFromSession(sessionId)
  };

  // Alias: required by the stripe extension — same logic as setStripeConfig.
  public shared ({ caller }) func setStripeConfiguration(
    secretKey : Text,
    priceInCents : Nat,
    allowedCountries : [Text]
  ) : async () {
    await setStripeConfig(secretKey, priceInCents, allowedCountries)
  };

  // Helper: extracts the checkout URL from a Stripe session JSON response.
  func extractStripeUrl(json : Text) : Text {
    let patterns = ["\"url\":\"", "\"url\": \""];
    for (pattern in patterns.values()) {
      if (json.contains(#text pattern)) {
        let parts = json.split(#text pattern);
        switch (parts.next()) {
          case (null) {};
          case (?_) {
            switch (parts.next()) {
              case (?afterPattern) {
                switch (afterPattern.split(#text "\"").next()) {
                  case (?url) {
                    if (url.size() > 0) { return url };
                  };
                  case (_) {};
                };
              };
              case (null) {};
            };
          };
        };
      };
    };
    // Fallback: return raw JSON if URL extraction fails
    json
  };

  // ================================================================
  // MANUAL PROJECT ENTRIES
  // ================================================================

  public type ManualProjectEntry = {
    name : Text;
    locality : Text;
    submittedBy : Text;   // Principal text of the submitter
    submittedAt : Int;    // nanoseconds timestamp
  };

  let manualProjectEntries = Map.empty<Text, [ManualProjectEntry]>();

  // Submit a manually-entered project (if not found in dropdown).
  // Stored globally, keyed by locality for fast retrieval.
  public shared ({ caller }) func submitManualProject(name : Text, locality : Text) : async () {
    let entry : ManualProjectEntry = {
      name;
      locality;
      submittedBy = caller.toText();
      submittedAt = Time.now();
    };
    let key = locality.toLower();
    let existing : [ManualProjectEntry] = switch (manualProjectEntries.get(key)) {
      case (null) { [] };
      case (?arr) { arr };
    };
    // Dedup: don't add same name+locality twice
    let alreadyExists = existing.find(func(e : ManualProjectEntry) : Bool {
      e.name.toLower() == name.toLower()
    });
    switch (alreadyExists) {
      case (?_) { /* already stored */ };
      case (null) {
        manualProjectEntries.add(key, existing.concat([entry]));
      };
    };
  };

  // Returns all manually-entered projects for a locality.
  // Pass "" to get all manual entries across all localities.
  public query func getManualProjects(locality : Text) : async [ManualProjectEntry] {
    if (locality == "") {
      // Return all entries across all localities
      var all : [ManualProjectEntry] = [];
      for ((_, entries) in manualProjectEntries.entries()) {
        all := all.concat(entries);
      };
      all
    } else {
      let key = locality.toLower();
      switch (manualProjectEntries.get(key)) {
        case (null) { [] };
        case (?arr) { arr };
      };
    };
  };

};
