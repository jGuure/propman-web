import type { ApiClient } from "./client";
import type {
  Amenity,
  AmenityScope,
  AuthResponse,
  Building,
  BuildingRequest,
  BulkCreateResult,
  BulkPreview,
  BulkUnitsRequest,
  CancelLeaseRequest,
  Charge,
  ChargeListParams,
  CollectionSummary,
  LeaseAccount,
  PayChargeRequest,
  PaymentRecord,
  PaymentRequest,
  Expense,
  ExpenseListParams,
  ExpenseRequest,
  ExpenseSummary,
  Receipt,
  CreateLeaseRequest,
  EndLeaseRequest,
  Lease,
  LeaseListParams,
  RentalMode,
  ResidentDetails,
  ResidentListParams,
  ResidentRequest,
  ResidentSummary,
  UpdateLeaseRequest,
  DashboardSummary,
  Enums,
  Photo,
  PropertyDetails,
  PropertyListParams,
  PropertyRequest,
  PropertyStructure,
  PropertySummary,
  Room,
  RoomRequest,
  StatusChange,
  UnitDetails,
  UnitGrid,
  UnitListParams,
  UnitRequest,
  UnitStatus,
  UnitSummary,
  InviteInfo,
  Me,
  Organization,
  PageResponse,
  TenantBranding,
  UpdateOrganizationRequest,
  User,
  UserListParams,
  UserRole,
  UserStatus,
} from "./types";

export type PhotoOwner = "properties" | "units";

/** Endpoints of the current tenant (the client adds X-Tenant and the access token). */
export function tenantApi(client: ApiClient) {
  return {
    branding: () => client.get<TenantBranding>("/public/tenant-info"),

    login: (email: string, password: string) =>
      client.post<AuthResponse>("/auth/login", { email, password }, { auth: false }),
    refreshWith: (refreshToken: string) =>
      client.post<AuthResponse>("/auth/refresh", { refreshToken }, { auth: false }),
    logout: (refreshToken: string) => client.post<void>("/auth/logout", { refreshToken }, { auth: false }),
    me: () => client.get<Me>("/auth/me"),
    forgotPassword: (email: string) => client.post<void>("/auth/forgot-password", { email }, { auth: false }),
    resetPassword: (token: string, newPassword: string) =>
      client.post<void>("/auth/reset-password", { token, newPassword }, { auth: false }),
    inviteInfo: (token: string) =>
      client.request<InviteInfo>(`/auth/invite/${encodeURIComponent(token)}`, { auth: false }),
    acceptInvite: (body: { token: string; password: string; fullName?: string; phone?: string }) =>
      client.post<AuthResponse>("/auth/accept-invite", body, { auth: false }),

    organization: () => client.get<Organization>("/organization"),
    updateOrganization: (body: UpdateOrganizationRequest) => client.put<Organization>("/organization", body),
    uploadLogo: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return client.post<Organization>("/organization/logo", form);
    },
    deleteLogo: () => client.delete("/organization/logo"),

    users: (params: UserListParams) => client.get<PageResponse<User>>("/users", { ...params }),
    user: (id: string) => client.get<User>(`/users/${id}`),
    inviteUser: (body: { fullName: string; email: string; phone?: string; role: UserRole }) =>
      client.post<User>("/users/invite", body),
    resendInvite: (id: string) => client.post<void>(`/users/${id}/resend-invite`),
    updateUser: (id: string, body: { fullName: string; phone?: string | null; role: UserRole }) =>
      client.put<User>(`/users/${id}`, body),
    updateUserStatus: (id: string, status: Extract<UserStatus, "ACTIVE" | "DISABLED">) =>
      client.patch<User>(`/users/${id}/status`, { status }),
    updateProfile: (body: { fullName: string; phone?: string | null }) => client.put<User>("/users/me", body),
    changePassword: (currentPassword: string, newPassword: string) =>
      client.put<void>("/users/me/password", { currentPassword, newPassword }),

    enums: () => client.get<Enums>("/meta/enums"),
    dashboard: () => client.get<DashboardSummary>("/dashboard/summary"),

    amenities: (scope?: AmenityScope) => client.get<Amenity[]>("/amenities", { scope }),
    createAmenity: (body: { name: string; scope: AmenityScope }) => client.post<Amenity>("/amenities", body),
    updateAmenity: (id: string, body: { name: string; scope: AmenityScope }) =>
      client.put<Amenity>(`/amenities/${id}`, body),
    deleteAmenity: (id: string) => client.delete(`/amenities/${id}`),

    properties: (params: PropertyListParams) =>
      client.get<PageResponse<PropertySummary>>("/properties", { ...params }),
    property: (id: string) => client.get<PropertyDetails>(`/properties/${id}`),
    createProperty: (body: PropertyRequest) => client.post<PropertyDetails>("/properties", body),
    updateProperty: (id: string, body: PropertyRequest) => client.put<PropertyDetails>(`/properties/${id}`, body),
    archiveProperty: (id: string) => client.post<PropertyDetails>(`/properties/${id}/archive`),
    restoreProperty: (id: string) => client.post<PropertyDetails>(`/properties/${id}/restore`),
    setPropertyAmenities: (id: string, amenityIds: string[]) =>
      client.put<PropertyDetails>(`/properties/${id}/amenities`, { amenityIds }),

    propertyStructure: (id: string) => client.get<PropertyStructure>(`/properties/${id}/structure`),

    buildings: (propertyId: string) => client.get<Building[]>(`/properties/${propertyId}/buildings`),
    setBuildingAmenities: (id: string, amenityIds: string[]) =>
      client.put<Building>(`/buildings/${id}/amenities`, { amenityIds }),
    createBuilding: (propertyId: string, body: BuildingRequest) =>
      client.post<Building>(`/properties/${propertyId}/buildings`, body),
    updateBuilding: (id: string, body: BuildingRequest) => client.put<Building>(`/buildings/${id}`, body),
    archiveBuilding: (id: string) => client.post<Building>(`/buildings/${id}/archive`),
    restoreBuilding: (id: string) => client.post<Building>(`/buildings/${id}/restore`),

    units: (params: UnitListParams) => client.get<PageResponse<UnitSummary>>("/units", { ...params }),
    unit: (id: string) => client.get<UnitDetails>(`/units/${id}`),
    createUnit: (propertyId: string, body: UnitRequest) =>
      client.post<UnitDetails>(`/properties/${propertyId}/units`, body),
    updateUnit: (id: string, body: UnitRequest) => client.put<UnitDetails>(`/units/${id}`, body),
    changeUnitStatus: (id: string, status: UnitStatus, reason?: string) =>
      client.patch<UnitDetails>(`/units/${id}/status`, { status, reason }),
    unitStatusHistory: (id: string, page: number, size: number) =>
      client.get<PageResponse<StatusChange>>(`/units/${id}/status-history`, { page, size }),
    archiveUnit: (id: string) => client.post<UnitDetails>(`/units/${id}/archive`),
    restoreUnit: (id: string) => client.post<UnitDetails>(`/units/${id}/restore`),
    setUnitAmenities: (id: string, amenityIds: string[]) =>
      client.put<UnitDetails>(`/units/${id}/amenities`, { amenityIds }),
    unitGrid: (propertyId: string, buildingId?: string) =>
      client.get<UnitGrid>(`/properties/${propertyId}/unit-grid`, { buildingId }),
    bulkPreview: (propertyId: string, body: BulkUnitsRequest) =>
      client.post<BulkPreview>(`/properties/${propertyId}/units/bulk/preview`, body),
    bulkCreate: (propertyId: string, body: BulkUnitsRequest) =>
      client.post<BulkCreateResult>(`/properties/${propertyId}/units/bulk`, body),

    /** `owner` is "properties" or "units". Returns every photo of the owner. */
    addPhoto: (owner: PhotoOwner, id: string, file: File, caption?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (caption) {
        form.append("caption", caption);
      }
      return client.post<Photo[]>(`/${owner}/${id}/photos`, form);
    },
    reorderPhotos: (owner: PhotoOwner, id: string, photoIds: string[]) =>
      client.patch<Photo[]>(`/${owner}/${id}/photos/order`, { photoIds }),
    setCoverPhoto: (owner: PhotoOwner, id: string, photoId: string) =>
      client.put<Photo[]>(`/${owner}/${id}/cover-photo`, { photoId }),
    deletePhoto: (photoId: string) => client.delete(`/photos/${photoId}`),

    rooms: (unitId: string) => client.get<Room[]>(`/units/${unitId}/rooms`),
    addRoom: (unitId: string, body: RoomRequest) => client.post<Room>(`/units/${unitId}/rooms`, body),
    updateRoom: (roomId: string, body: RoomRequest) => client.put<Room>(`/rooms/${roomId}`, body),
    deleteRoom: (roomId: string) => client.delete(`/rooms/${roomId}`),
    reorderRooms: (unitId: string, roomIds: string[]) => client.patch<Room[]>(`/units/${unitId}/rooms/order`, { roomIds }),
    copyRooms: (unitId: string, unitIds: string[]) =>
      client.post<{ updated: number }>(`/units/${unitId}/rooms/copy`, { unitIds }),

    residents: (params: ResidentListParams) =>
      client.get<PageResponse<ResidentSummary>>("/residents", { ...params }),
    resident: (id: string) => client.get<ResidentDetails>(`/residents/${id}`),
    createResident: (body: ResidentRequest) => client.post<ResidentDetails>("/residents", body),
    updateResident: (id: string, body: ResidentRequest) => client.put<ResidentDetails>(`/residents/${id}`, body),
    archiveResident: (id: string) => client.post<ResidentDetails>(`/residents/${id}/archive`),
    restoreResident: (id: string) => client.post<ResidentDetails>(`/residents/${id}/restore`),
    deleteResident: (id: string) => client.delete(`/residents/${id}`),

    /** `status` may be several statuses (sent comma-separated). */
    leases: (params: LeaseListParams) =>
      client.get<PageResponse<Lease>>("/leases", {
        ...params,
        status: Array.isArray(params.status) ? params.status.join(",") : params.status,
      }),
    lease: (id: string) => client.get<Lease>(`/leases/${id}`),
    createLease: (body: CreateLeaseRequest) => client.post<Lease>("/leases", body),
    updateLease: (id: string, body: UpdateLeaseRequest) => client.put<Lease>(`/leases/${id}`, body),
    endLease: (id: string, body: EndLeaseRequest) => client.post<Lease>(`/leases/${id}/end`, body),
    cancelLease: (id: string, body: CancelLeaseRequest) => client.post<Lease>(`/leases/${id}/cancel`, body),
    depositReceived: (id: string, receivedOn: string) =>
      client.post<Lease>(`/leases/${id}/deposit-received`, { receivedOn }),
    setRentalMode: (unitId: string, rentalMode: RentalMode) =>
      client.put<UnitDetails>(`/units/${unitId}/rental-mode`, { rentalMode }),

    charges: (params: ChargeListParams) =>
      client.get<PageResponse<Charge>>("/charges", {
        ...params,
        status: Array.isArray(params.status) ? params.status.join(",") : params.status,
      }),
    payCharge: (id: string, body: PayChargeRequest) => client.post<LeaseAccount>(`/charges/${id}/pay`, body),
    markUnpaid: (id: string) => client.post<Charge>(`/charges/${id}/unpaid-mark`),
    clearUnpaidMark: (id: string) => client.delete<Charge>(`/charges/${id}/unpaid-mark`),
    recordPayment: (body: PaymentRequest) => client.post<LeaseAccount>("/payments", body),
    reversePayment: (id: string, reason: string) => client.post<LeaseAccount>(`/payments/${id}/reverse`, { reason }),
    expenses: (params: ExpenseListParams) => client.get<PageResponse<Expense>>("/expenses", { ...params }),
    expenseSummary: (params: ExpenseListParams) => client.get<ExpenseSummary>("/expenses/summary", { ...params }),
    createExpense: (body: ExpenseRequest) => client.post<Expense>("/expenses", body),
    updateExpense: (id: string, body: ExpenseRequest) => client.put<Expense>(`/expenses/${id}`, body),
    deleteExpense: (id: string) => client.delete(`/expenses/${id}`),
    uploadExpenseReceipt: (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return client.post<Expense>(`/expenses/${id}/receipt`, form);
    },
    deleteExpenseReceipt: (id: string) => client.delete<Expense>(`/expenses/${id}/receipt`),
    paymentReceipt: (id: string) => client.get<Receipt>(`/payments/${id}/receipt`),
    leaseAccount: (leaseId: string) => client.get<LeaseAccount>(`/leases/${leaseId}/account`),
    collectionSummary: (period?: string, propertyId?: string) =>
      client.get<CollectionSummary>("/collections/summary", { period, propertyId }),
    payments: (params: { leaseId?: string; residentId?: string; from?: string; to?: string; page?: number; size?: number }) =>
      client.get<PageResponse<PaymentRecord>>("/payments", { ...params }),
  };
}

export type TenantApi = ReturnType<typeof tenantApi>;
