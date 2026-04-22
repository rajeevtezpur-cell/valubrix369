import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ValuationRequest {
    age: bigint;
    propertyType: string;
    sqft: bigint;
    builderName?: string;
    apartmentSubType?: ApartmentSubType;
    locality: string;
    amenitiesCount: bigint;
}
export type Time = bigint;
export interface ManualProjectEntry {
    name: string;
    submittedAt: bigint;
    submittedBy: string;
    locality: string;
}
export interface ValuationResponse {
    breakdown: ValuationBreakdown;
    confidenceReason: string;
    bestPrice: bigint;
    priceMax: bigint;
    priceMin: bigint;
    confidence: bigint;
    localityFound: boolean;
}
export interface PropertyListing {
    id: bigint;
    bhk: bigint;
    floor: bigint;
    status: ListingStatus;
    totalFloors: bigint;
    title: string;
    projectName: string;
    propertyType: PropertyType;
    city: string;
    createdAt: Time;
    badges: Array<string>;
    carpetArea: bigint;
    builderName: string;
    builtUpArea: bigint;
    description: string;
    openParking: bigint;
    legalStatus: string;
    mediaBlobs: Array<ExternalBlob>;
    coveredParking: bigint;
    buildingAge: bigint;
    sellerId: Principal;
    balconies: bigint;
    price: bigint;
    facing: string;
    location: string;
    plotArea: bigint;
    reraNumber: string;
    landUse: string;
    plotUnit: string;
}
export interface LeadInput {
    service_type: string;
    is_priority: boolean;
    name: string;
    email: string;
    message: string;
    phone: string;
    budget: string;
    location: string;
}
export interface LeadFilter {
    date_to?: bigint;
    service_type?: string;
    date_from?: bigint;
}
export interface ValuationBreakdown {
    comparablesUsed: bigint;
    pricePerSqft: bigint;
    infraContribution: bigint;
    metroContribution: bigint;
    locationContribution: bigint;
    demandContribution: bigint;
    comparablesContribution: bigint;
}
export interface Lead {
    id: string;
    service_type: string;
    is_priority: boolean;
    name: string;
    created_at: bigint;
    email: string;
    message: string;
    phone: string;
    budget: string;
    location: string;
    is_contacted: boolean;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface SaleRecord {
    propertyType: string;
    sqft: bigint;
    soldPrice: bigint;
    timestamp: bigint;
    locality: string;
}
export interface PriceSnapshot {
    source: string;
    pricePerSqft: bigint;
    confidenceWeight: bigint;
    timestamp: bigint;
    locality: string;
}
export interface SalesFeedback {
    actualPrice: bigint;
    predictedPrice: bigint;
    timestamp: bigint;
    locality: string;
}
export interface LocalityIntelligence {
    amenitiesScore: bigint;
    city: string;
    name: string;
    avgPricePerSqft: bigint;
    demandScore: bigint;
    infraScore: bigint;
    locationScore: bigint;
    rentalPerSqft: bigint;
    growthRate: bigint;
    supplyDensity: bigint;
}
export interface AILearningInput {
    propertyType: string;
    area: number;
    date: string;
    soldPrice: number;
    notes: string;
    locality: string;
}
export interface DemandSignal {
    source: string;
    demandScore: bigint;
    timestamp: bigint;
    locality: string;
}
export interface ReraProject {
    status: string;
    possessionDate: string;
    projectName: string;
    propertyType: string;
    builderName: string;
    microLocation: string;
    dataType: string;
    priceMax: bigint;
    priceMin: bigint;
    locality: string;
    unitSize: bigint;
}
export interface Enquiry {
    id: bigint;
    projectName: string;
    name: string;
    createdAt: Time;
    projectId: string;
    phone: string;
}
export interface DealScoreResponse {
    fairValue: bigint;
    expectedDaysToSell: bigint;
    demandScore: bigint;
    liquidityScore: bigint;
    dealTag: string;
    priceGap: bigint;
    dealScore: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface ValuationResult {
    comparablesUsed: bigint;
    subTypeMultiplier: bigint;
    pricePerSqft: bigint;
    infraContribution: bigint;
    metroContribution: bigint;
    locationContribution: bigint;
    confidenceReason: string;
    subTypeApplied: string;
    builderApplied: string;
    demandContribution: bigint;
    bestPrice: bigint;
    comparablesContribution: bigint;
    priceMax: bigint;
    priceMin: bigint;
    confidence: bigint;
    localityFound: boolean;
    builderMultiplier: bigint;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ForecastResponse {
    conservative: bigint;
    aggressive: bigint;
    realistic: bigint;
    disclaimer: string;
    basePrice: bigint;
    growthRate: bigint;
}
export interface AILearningSubmission {
    id: bigint;
    propertyType: string;
    area: number;
    date: string;
    submittedAt: bigint;
    soldPrice: number;
    notes: string;
    locality: string;
}
export interface MetroInfo {
    nearestStation: string;
    distanceKm: string;
    hasMetro: boolean;
    metroScore: bigint;
}
export interface RentalResponse {
    avgRentPerSqft: bigint;
    yieldPercent: bigint;
    avgRent: bigint;
    rentMax: bigint;
    rentMin: bigint;
    rentalConfidence: bigint;
    vacancyRate: bigint;
}
export interface BankerApplication {
    id: bigint;
    org: string;
    status: BankerStatus;
    appliedAt: bigint;
    principal: Principal;
    city: string;
    name: string;
    reviewNote: string;
    reviewedAt?: bigint;
    email: string;
    mobile: string;
}
export interface ValuationReport {
    id: bigint;
    propertyType: PropertyType;
    userId: Principal;
    createdAt: Time;
    estimatedMax: bigint;
    estimatedMin: bigint;
    confidence: bigint;
    location: string;
}
export interface UserProfile {
    password_hash?: string;
    username: string;
    city: string;
    role: UserRole;
    fullName: string;
    auth_provider?: string;
    email: string;
    email_hash?: string;
    panNumber: string;
    subscription_status: string;
    mobile: string;
}
export enum ApartmentSubType {
    township = "township",
    gated = "gated",
    standalone = "standalone",
    unknown_ = "unknown"
}
export enum BankerStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum ListingStatus {
    published = "published",
    draft = "draft"
}
export enum PropertyType {
    villa = "villa",
    flat = "flat",
    plot = "plot"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addNewReraProjects(newProjects: Array<ReraProject>): Promise<boolean>;
    addPriceSnapshot(locality: string, price: bigint): Promise<string>;
    addValuationReport(location: string, propertyType: PropertyType, estimatedMin: bigint, estimatedMax: bigint, confidence: bigint): Promise<bigint>;
    approveBankOfficer(id: bigint, note: string): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cleanupOldData(maxAgeDays: bigint): Promise<string>;
    computeValuation(locality: string, propertyType: string, sqft: bigint, age: bigint, amenitiesCount: bigint): Promise<ValuationResponse>;
    createCheckoutSession(): Promise<string>;
    createEnquiry(projectId: string, projectName: string, name: string, phone: string): Promise<bigint>;
    createListing(title: string, propertyType: PropertyType, location: string, city: string, price: bigint, carpetArea: bigint, builtUpArea: bigint, bhk: bigint, floor: bigint, totalFloors: bigint, buildingAge: bigint, facing: string, coveredParking: bigint, openParking: bigint, balconies: bigint, builderName: string, projectName: string, reraNumber: string, legalStatus: string, landUse: string, plotArea: bigint, plotUnit: string, badges: Array<string>, mediaBlobs: Array<ExternalBlob>, description: string): Promise<bigint>;
    deleteListing(listingId: bigint): Promise<void>;
    filterListings(propertyType: PropertyType, minPrice: bigint, maxPrice: bigint, bhk: bigint): Promise<Array<PropertyListing>>;
    getAILearningSubmissions(): Promise<Array<AILearningSubmission>>;
    getAllBankerApps(): Promise<Array<BankerApplication>>;
    getAllPublishedListings(): Promise<Array<PropertyListing>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDealScore(listingId: bigint): Promise<DealScoreResponse>;
    getDemandSignals(locality: string): Promise<Array<DemandSignal>>;
    getEnquiries(): Promise<Array<Enquiry>>;
    getFeedbackCount(): Promise<bigint>;
    getForecast(locality: string, propertyType: string): Promise<ForecastResponse>;
    getLeads(filter: LeadFilter): Promise<Array<Lead>>;
    getListingById(listingId: bigint): Promise<PropertyListing | null>;
    getListingsBySeller(sellerId: Principal): Promise<Array<PropertyListing>>;
    getLocalityIntelligence(locality: string): Promise<LocalityIntelligence | null>;
    getLocalityList(): Promise<Array<string>>;
    getManualProjects(locality: string): Promise<Array<ManualProjectEntry>>;
    getMetroInfo(locality: string): Promise<MetroInfo>;
    getMyBankerStatus(): Promise<string>;
    getPendingBankers(): Promise<Array<BankerApplication>>;
    getPriceHistory(locality: string): Promise<Array<PriceSnapshot>>;
    getRentalIntelligence(locality: string): Promise<RentalResponse>;
    getReraProjects(): Promise<Array<ReraProject>>;
    getSaleRecords(): Promise<Array<SaleRecord>>;
    getSalesFeedbackLog(): Promise<Array<SalesFeedback>>;
    getSavedProperties(): Promise<Array<PropertyListing>>;
    getStripeSessionStatus(sessionId: string): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSubscriptionStatus(): Promise<string>;
    getValuationReportsForUser(userId: Principal): Promise<Array<ValuationReport>>;
    isCallerAdmin(): Promise<boolean>;
    isIntelligenceSeeded(): Promise<boolean>;
    isPremiumUser(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    loginWithEmail(emailHash: string, passwordHash: string): Promise<UserProfile | null>;
    markLeadContacted(leadId: string): Promise<boolean>;
    publishListing(listingId: bigint): Promise<void>;
    recordDailySnapshot(locality: string): Promise<string>;
    registerBankOfficer(name: string, email: string, mobile: string, org: string, city: string): Promise<bigint>;
    registerUser(username: string, fullName: string, mobile: string, email: string, city: string, panNumber: string): Promise<void>;
    registerWithEmail(emailHash: string, passwordHash: string, name: string): Promise<string>;
    rejectBankOfficer(id: bigint, note: string): Promise<boolean>;
    runValidationTests(): Promise<Array<string>>;
    saveAILearningSubmission(input: AILearningInput): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveProperty(listingId: bigint): Promise<void>;
    searchListings(location: string): Promise<Array<PropertyListing>>;
    searchLocalities(searchQuery: string): Promise<Array<string>>;
    seedAndRetrain(newProjects: Array<ReraProject>): Promise<boolean>;
    seedIntelligenceData(): Promise<void>;
    setStripeConfig(secretKey: string, priceInCents: bigint, allowedCountries: Array<string>): Promise<void>;
    setStripeConfiguration(secretKey: string, priceInCents: bigint, allowedCountries: Array<string>): Promise<void>;
    submitLead(input: LeadInput): Promise<string>;
    submitManualProject(name: string, locality: string): Promise<void>;
    submitSaleFeedback(locality: string, predictedPrice: bigint, actualPrice: bigint): Promise<string>;
    submitSaleRecord(locality: string, sqft: bigint, propertyType: string, soldPrice: bigint): Promise<string>;
    /**
     * / Extended valuation endpoint — accepts ValuationRequest, returns ValuationResult.
     * / Uses the same core engine as computeValuation but layers in:
     * /   1. Builder premium multiplier (clamped 0.90–1.40)
     * /   2. Apartment sub-type multiplier (standalone < gated < township)
     */
    submitValuation(req: ValuationRequest): Promise<ValuationResult>;
    trackFeedback(listingId: bigint, eventType: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unsaveProperty(listingId: bigint): Promise<void>;
    updateConfidence(locality: string, source: string, actualPrice: bigint): Promise<string>;
    updateDemandSignals(): Promise<string>;
    updateListing(listingId: bigint, title: string, propertyType: PropertyType, location: string, city: string, price: bigint, carpetArea: bigint, builtUpArea: bigint, bhk: bigint, floor: bigint, totalFloors: bigint, buildingAge: bigint, facing: string, coveredParking: bigint, openParking: bigint, balconies: bigint, builderName: string, projectName: string, reraNumber: string, legalStatus: string, landUse: string, plotArea: bigint, plotUnit: string, badges: Array<string>, mediaBlobs: Array<ExternalBlob>, description: string): Promise<void>;
    updateReraProject(key: string, updatedStatus: string, updatedPossessionDate: string, updatedPriceMin: bigint, updatedPriceMax: bigint): Promise<boolean>;
    updateSubscriptionStatus(userId: string, status: string): Promise<boolean>;
    updateUserRole(user: Principal, role: UserRole): Promise<void>;
    verifyAndUpgradeFromSession(sessionId: string): Promise<string>;
}
