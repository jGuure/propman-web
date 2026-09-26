export type UserRole = "OWNER" | "MANAGER" | "ACCOUNTANT" | "STAFF";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type TenantStatus = "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "FAILED";

export type Permission =
  | "organization:read"
  | "organization:update"
  | "users:read"
  | "users:manage"
  | "profile:update"
  | "properties:read"
  | "properties:manage"
  | "units:status"
  | "amenities:manage";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

/** RFC 7807 Problem Details as returned by the API. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  instance?: string;
  errors?: FieldError[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TenantRef {
  id: string;
  name: string;
  slug: string;
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResponse extends TokenPair {
  tokenType: "Bearer";
  tenant: TenantRef;
  user: User;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  updatedAt: string;
}

export interface Me {
  user: User;
  organization: Organization;
  permissions: Permission[];
}

export interface TenantBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface InviteInfo {
  email: string;
  fullName: string;
  organizationName: string;
}

export interface SlugAvailability {
  slug: string;
  available: boolean;
  reason: "INVALID_FORMAT" | "RESERVED" | "TAKEN" | null;
}

export interface RegisterRequest {
  companyName: string;
  slug: string;
  companyEmail: string;
  companyPhone?: string;
  country?: string;
  city?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone?: string;
  password: string;
}

export interface RegisterResponse {
  tenant: TenantRef & { url: string };
  auth: AuthResponse;
}

export interface UpdateOrganizationRequest {
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  country: string;
  city?: string | null;
  address?: string | null;
  currency: string;
  timezone: string;
}

export interface UserListParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
  size: number;
  sort?: string;
}

export interface PlatformAdmin {
  id: string;
  fullName: string;
  email: string;
  lastLoginAt: string | null;
}

export interface PlatformAuthResponse extends TokenPair {
  tokenType: "Bearer";
  admin: PlatformAdmin;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  email: string;
  createdAt: string;
  userCount: number | null;
}

export interface TenantDetails extends TenantSummary {
  schemaName: string;
  phone: string | null;
  country: string;
  suspendedReason: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string;
  url: string;
}

export interface TenantListParams {
  search?: string;
  status?: TenantStatus;
  page: number;
  size: number;
}

// ---------------------------------------------------------------- Phase 1: properties & units

export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "MIXED";
export type PropertyStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type BuildingStatus = "ACTIVE" | "ARCHIVED";
export type UnitType =
  | "STUDIO"
  | "ONE_BEDROOM"
  | "TWO_BEDROOM"
  | "THREE_BEDROOM"
  | "FOUR_PLUS_BEDROOM"
  | "SHOP"
  | "OFFICE"
  | "WAREHOUSE"
  | "OTHER";
export type UnitStatus = "VACANT" | "RESERVED" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
export type AmenityScope = "UNIT" | "PROPERTY" | "BOTH";
export type StatusChangeSource = "MANUAL" | "SYSTEM" | "LEASE";

export interface UnitStats {
  total: number;
  vacant: number;
  reserved: number;
  occupied: number;
  maintenance: number;
  inactive: number;
  /** 0..1 */
  occupancyRate: number;
}

export interface Amenity {
  id: string;
  name: string;
  scope: AmenityScope;
  system: boolean;
  usageCount?: number | null;
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  cover: boolean;
}

export interface Building {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  floorsCount: number;
  basementFloors: number;
  hasLift: boolean;
  description: string | null;
  status: BuildingStatus;
  archivedAt: string | null;
  unitStats: UnitStats;
  /** Amenities shared by this flat. */
  amenities: Amenity[];
}

export interface BuildingRequest {
  code: string;
  name: string;
  floorsCount: number;
  basementFloors?: number;
  hasLift?: boolean;
  description?: string | null;
}

export interface PropertySummary {
  id: string;
  code: string;
  name: string;
  type: PropertyType;
  status: PropertyStatus;
  country: string;
  city: string;
  district: string | null;
  coverPhotoUrl: string | null;
  unitStats: UnitStats;
  createdAt: string;
}

export interface PropertyDetails extends Omit<PropertySummary, "coverPhotoUrl"> {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  yearBuilt: number | null;
  description: string | null;
  coverPhotoId: string | null;
  coverPhotoUrl: string | null;
  archivedAt: string | null;
  updatedAt: string;
  buildings: Building[];
  amenities: Amenity[];
  photos: Photo[];
  setup: PropertySetup;
}

export type SetupStepKey = "details" | "flats" | "apartments" | "rooms" | "amenities" | "photos";

export interface PropertySetup {
  flats: number;
  apartments: number;
  apartmentsWithRooms: number;
  rooms: number;
  amenities: number;
  photos: number;
  steps: { key: SetupStepKey; done: boolean }[];
  completedSteps: number;
}

export interface PropertyRequest {
  name: string;
  type: PropertyType;
  status?: Exclude<PropertyStatus, "ARCHIVED">;
  country?: string;
  city: string;
  district?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  yearBuilt?: number | null;
  description?: string | null;
  amenityIds?: string[];
}

export interface PropertyListParams {
  search?: string;
  type?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  page: number;
  size: number;
  sort?: string;
}

export interface UnitSummary {
  id: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  buildingId: string | null;
  buildingName: string | null;
  floor: number;
  type: UnitType;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
  furnished: boolean;
  baseRent: number;
  currency: string;
  depositAmount: number | null;
  status: UnitStatus;
  archived: boolean;
  coverPhotoUrl: string | null;
  roomCount: number;
}

export interface StatusChange {
  id: string;
  fromStatus: UnitStatus | null;
  toStatus: UnitStatus;
  reason: string | null;
  source: StatusChangeSource;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

export interface UnitDetails extends Omit<UnitSummary, "archived" | "roomCount"> {
  notes: string | null;
  coverPhotoId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  amenities: Amenity[];
  photos: Photo[];
  rooms: Room[];
  recentStatusChanges: StatusChange[];
}

export type RoomType =
  | "BEDROOM"
  | "MASTER_BEDROOM"
  | "LIVING_ROOM"
  | "DINING_ROOM"
  | "KITCHEN"
  | "BATHROOM"
  | "TOILET"
  | "STORE"
  | "BALCONY"
  | "OFFICE"
  | "OTHER";

export interface Room {
  id: string;
  unitId: string;
  name: string;
  type: RoomType;
  sizeSqm: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface RoomRequest {
  name: string;
  type: RoomType;
  sizeSqm?: number | null;
  notes?: string | null;
}

export interface StructureApartment {
  id: string;
  unitNumber: string;
  type: UnitType;
  status: UnitStatus;
  baseRent: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  rooms: { id: string; name: string; type: RoomType; sizeSqm: number | null }[];
}

export interface StructureFloor {
  floor: number;
  apartments: StructureApartment[];
}

/** The whole property as one tree. */
export interface PropertyStructure {
  propertyId: string;
  name: string;
  sharedAmenities: Amenity[];
  flats: {
    id: string;
    code: string;
    name: string;
    floorsCount: number;
    basementFloors: number;
    hasLift: boolean;
    amenities: Amenity[];
    unitStats: UnitStats;
    floors: StructureFloor[];
  }[];
  unassigned: StructureFloor[];
  totals: { flats: number; floors: number; apartments: number; rooms: number };
}

export interface UnitRequest {
  buildingId?: string | null;
  unitNumber: string;
  floor: number;
  type: UnitType;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqm?: number | null;
  furnished?: boolean;
  baseRent: number;
  currency?: string | null;
  depositAmount?: number | null;
  notes?: string | null;
  amenityIds?: string[];
}

export interface UnitListParams {
  propertyId?: string;
  buildingId?: string;
  status?: UnitStatus;
  type?: UnitType;
  bedrooms?: number;
  floor?: number;
  furnished?: boolean;
  minRent?: number;
  maxRent?: number;
  search?: string;
  archived?: boolean;
  page: number;
  size: number;
  sort?: string;
}

export interface BulkUnitsRequest {
  buildingId?: string | null;
  floorFrom: number;
  floorTo: number;
  unitsPerFloor: number;
  numberPattern: string;
  startIndex?: number;
  defaults: {
    type: UnitType;
    bedrooms?: number | null;
    bathrooms?: number | null;
    sizeSqm?: number | null;
    furnished?: boolean;
    baseRent: number;
    currency?: string | null;
    depositAmount?: number | null;
    amenityIds?: string[];
  };
}

export interface BulkPreview {
  count: number;
  units: { floor: number; unitNumber: string; conflict: boolean }[];
  conflicts: string[];
}

export interface BulkCreateResult {
  created: number;
  propertyId: string;
  buildingId: string | null;
}

export interface UnitGridTile {
  id: string;
  unitNumber: string;
  type: UnitType;
  status: UnitStatus;
  baseRent: number;
  currency: string;
}

export interface UnitGrid {
  propertyId: string;
  buildingId: string | null;
  floors: { floor: number; units: UnitGridTile[] }[];
  counts: Record<UnitStatus, number>;
}

export interface MoneyAmount {
  currency: string;
  amount: number;
}

export interface DashboardSummary {
  properties: number;
  buildings: number;
  units: number;
  unitsByStatus: Record<UnitStatus, number>;
  occupancyRate: number;
  potentialMonthlyRent: MoneyAmount[];
  vacantUnits: {
    id: string;
    unitNumber: string;
    propertyId: string;
    propertyName: string;
    buildingName: string | null;
    baseRent: number;
    currency: string;
    vacantSince: string;
    vacantDays: number;
  }[];
}

export interface Enums {
  propertyTypes: PropertyType[];
  propertyStatuses: PropertyStatus[];
  unitTypes: { value: UnitType; defaultBedrooms: number }[];
  unitStatuses: UnitStatus[];
  statusTransitions: Record<UnitStatus, UnitStatus[]>;
  myStatusTransitions: Record<UnitStatus, UnitStatus[]>;
  reasonRequiredFor: UnitStatus[];
  amenityScopes: AmenityScope[];
  maxBulkUnits: number;
  maxFileSizeBytes: number;
}
