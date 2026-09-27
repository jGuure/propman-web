export type UserRole = "OWNER" | "MANAGER" | "ACCOUNTANT" | "STAFF";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type TenantStatus = "PROVISIONING" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "FAILED";
/** Who created the organization: the company on the website, or a platform admin. */
export type TenantSource = "SIGNUP" | "ADMIN";

export type Permission =
  | "organization:read"
  | "organization:update"
  | "users:read"
  | "users:manage"
  | "profile:update"
  | "properties:read"
  | "properties:manage"
  | "units:status"
  | "amenities:manage"
  | "residents:read"
  | "residents:manage"
  | "leases:read"
  | "leases:manage"
  | "payments:read"
  | "payments:manage"
  | "expenses:manage"
  | "reports:read";

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
  /** Day of the month (1-28) rent is due for every lease. */
  rentDueDay: number;
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
  /** website sign-ups always wait for a platform admin's approval (PENDING_REVIEW) */
  tenant: TenantRef & { url: string; status: TenantStatus };
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
  rentDueDay?: number;
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
  source: TenantSource;
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
  rentalMode: RentalMode;
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
  /** Upcoming and active leases: one for a whole apartment, one per rented room. */
  openLeases: Lease[];
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
  /** Bedrooms can be rented on their own in a room-by-room apartment. */
  rentable: boolean;
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
  rentalMode: RentalMode;
  /** Whole apartment: the current (else upcoming) primary resident. */
  residentName: string | null;
  rentableRooms: number;
  /** Rooms with an upcoming or active lease (room-by-room apartments). */
  takenRooms: number;
  rooms: {
    id: string;
    name: string;
    type: RoomType;
    sizeSqm: number | null;
    rentable: boolean;
    leaseStatus: LeaseStatus | null;
    residentName: string | null;
  }[];
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
  rentalModes: RentalMode[];
  leaseStatuses: LeaseStatus[];
  depositStatuses: DepositStatus[];
  depositSettlements: DepositStatus[];
  residentIdTypes: IdType[];
  rentableRoomTypes: RoomType[];
  paymentMethods: PaymentMethod[];
  chargeStatuses: ChargeStatus[];
  expenseCategories: ExpenseCategory[];
}

// ---------------------------------------------------------------- residents & leases (phase 2a)

export type RentalMode = "WHOLE" | "BY_ROOM";
export type LeaseStatus = "UPCOMING" | "ACTIVE" | "ENDED" | "CANCELLED";
export type DepositStatus = "NONE" | "PENDING" | "HELD" | "RETURNED" | "PARTLY_RETURNED" | "KEPT";
export type IdType = "NATIONAL_ID" | "PASSPORT" | "OTHER";
export type Tenancy = "CURRENT" | "FORMER" | "NONE";

export interface ResidentRequest {
  fullName: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  idType?: IdType | null;
  idNumber?: string | null;
  notes?: string | null;
}

export interface ResidentSummary {
  id: string;
  fullName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  idType: IdType | null;
  idNumber: string | null;
  archived: boolean;
  openLeases: number;
  createdAt: string;
}

export interface ResidentDetails extends Omit<ResidentSummary, "archived" | "openLeases"> {
  notes: string | null;
  archivedAt: string | null;
  updatedAt: string;
  leases: Lease[];
}

export interface ResidentListParams {
  search?: string;
  tenancy?: Tenancy;
  archived?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface Occupant {
  id?: string;
  fullName: string;
  phone?: string | null;
  relationship?: string | null;
}

export interface Lease {
  id: string;
  status: LeaseStatus;
  unit: {
    id: string;
    unitNumber: string;
    floor: number;
    propertyId: string;
    propertyName: string;
    buildingId: string | null;
    buildingName: string | null;
  };
  room: { id: string; name: string } | null;
  resident: { id: string; fullName: string; phone: string };
  startDate: string;
  endDate: string | null;
  movedOutOn: string | null;
  monthlyRent: number;
  currency: string;
  deposit: {
    amount: number;
    status: DepositStatus;
    receivedOn: string | null;
    returnedAmount: number | null;
    note: string | null;
  };
  occupants: Occupant[];
  notes: string | null;
  endReason: string | null;
  /** Active with a planned end within 30 days (or passed without a recorded move-out). */
  endingSoon: boolean;
  account: AccountSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaseRequest {
  unitId: string;
  roomId?: string | null;
  residentId?: string | null;
  newResident?: ResidentRequest | null;
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  depositAmount?: number | null;
  depositReceivedOn?: string | null;
  occupants?: Occupant[];
  notes?: string | null;
}

export interface UpdateLeaseRequest {
  startDate: string;
  endDate?: string | null;
  monthlyRent: number;
  depositAmount?: number | null;
  occupants?: Occupant[];
  notes?: string | null;
}

export interface DepositSettlement {
  outcome?: DepositStatus | null;
  returnedAmount?: number | null;
  note?: string | null;
}

export interface EndLeaseRequest {
  movedOutOn: string;
  reason?: string | null;
  deposit?: DepositSettlement | null;
}

export interface CancelLeaseRequest {
  reason?: string | null;
  deposit?: DepositSettlement | null;
}

export interface LeaseListParams {
  status?: LeaseStatus[] | string;
  propertyId?: string;
  buildingId?: string;
  unitId?: string;
  roomId?: string;
  residentId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

// ---------------------------------------------------------------- rent collection (phase 2b)

export type PaymentMethod = "EVC_PLUS" | "ZAAD" | "EDAHAB" | "CASH" | "BANK" | "OTHER";
/** DUE (not yet due), UNCONFIRMED (past due, nothing recorded, not checked), PARTLY_PAID, OVERDUE (marked not paid), PAID, VOID. */
export type ChargeStatus = "DUE" | "UNCONFIRMED" | "PARTLY_PAID" | "OVERDUE" | "PAID" | "VOID";

export interface AccountSummary {
  /** Unpaid rent that is due. */
  owed: number;
  /** Paid in advance, not used yet. */
  credit: number;
  /** Last month (1st day) covered by payments, including months the credit pays. */
  paidUntil: string | null;
}

export interface Charge {
  id: string;
  leaseId: string;
  /** First day of the month billed. */
  period: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  currency: string;
  status: ChargeStatus;
  markedUnpaidAt: string | null;
  lease: {
    id: string;
    unitId: string;
    unitNumber: string;
    propertyName: string;
    buildingName: string | null;
    roomName: string | null;
    residentId: string;
    residentName: string;
    residentPhone: string;
    monthlyRent: number;
  };
}

export interface PaymentRecord {
  id: string;
  /** e.g. "R-000123". */
  receiptNumber: string;
  leaseId: string;
  amount: number;
  currency: string;
  paidOn: string;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  receivedByName: string | null;
  createdAt: string;
  reversed: boolean;
  reversedAt: string | null;
  reversedByName: string | null;
  reverseReason: string | null;
  residentName: string;
  unitNumber: string;
  roomName: string | null;
}

export interface LeaseAccount {
  leaseId: string;
  summary: AccountSummary;
  charges: Charge[];
  payments: PaymentRecord[];
}

export interface CollectionSummary {
  period: string;
  expected: number;
  collected: number;
  outstanding: number;
  received: number;
  counts: Record<ChargeStatus, number>;
  needsCheck: number;
}

export interface ChargeListParams {
  period?: string;
  status?: ChargeStatus[] | string;
  needsCheck?: boolean;
  propertyId?: string;
  leaseId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PaymentRequest {
  leaseId: string;
  amount: number;
  paidOn?: string | null;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
}

export interface PayChargeRequest {
  paidOn?: string | null;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
}

export interface Receipt {
  payment: PaymentRecord;
  lease: Lease;
  /** Months this payment paid (payments count in the order they were made, oldest bills first). */
  covers: { period: string; amount: number; full: boolean }[];
  /** Part of the payment kept as credit for later months. */
  advance: number;
}

// ---------------------------------------------------------------- expenses

export type ExpenseCategory =
  | "REPAIR" | "PAINTING" | "CLEANING" | "ELECTRICITY" | "WATER" | "GENERATOR" | "SECURITY" | "SALARIES" | "OTHER";

export interface Expense {
  id: string;
  property: { id: string; name: string };
  building: { id: string; name: string } | null;
  /** `name` is the apartment number. */
  unit: { id: string; name: string } | null;
  spentOn: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  paidTo: string | null;
  method: PaymentMethod;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  propertyId: string;
  buildingId?: string | null;
  unitId?: string | null;
  spentOn: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  paidTo?: string | null;
  method: PaymentMethod;
}

export interface ExpenseListParams {
  /** Any day of the month to show. */
  month?: string;
  from?: string;
  to?: string;
  propertyId?: string;
  buildingId?: string;
  unitId?: string;
  category?: ExpenseCategory;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ExpenseSummary {
  from: string | null;
  to: string | null;
  total: number;
  count: number;
  byCategory: Record<ExpenseCategory, number>;
}

// ---------------------------------------------------------------- reports

export interface IncomeRow {
  /** First day of the month; null for totals. */
  month: string | null;
  billed: number;
  received: number;
  expenses: number;
  net: number;
}

export interface IncomeReport {
  from: string;
  to: string;
  months: IncomeRow[];
  totals: IncomeRow;
  byProperty: { propertyId: string; propertyName: string; billed: number; received: number; expenses: number; net: number }[];
}

export interface ArrearsRow {
  leaseId: string;
  leaseStatus: LeaseStatus;
  residentId: string;
  residentName: string;
  residentPhone: string;
  unitId: string;
  unitNumber: string;
  roomName: string | null;
  propertyName: string;
  buildingName: string | null;
  owed: number;
  unpaidMonths: number;
  oldestDueDate: string;
  daysOverdue: number;
  lastPaymentOn: string | null;
}

export interface ArrearsReport {
  asOf: string;
  total: number;
  residents: number;
  rows: ArrearsRow[];
}

export interface OccupancyRow {
  propertyId: string | null;
  propertyName: string | null;
  total: number;
  occupied: number;
  reserved: number;
  available: number;
  maintenance: number;
  inactive: number;
  occupancyRate: number;
  rentRoll: number;
  potentialRent: number;
}

export interface OccupancyReport {
  properties: OccupancyRow[];
  totals: OccupancyRow;
}
