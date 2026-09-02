# schemas.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

# User Schemas
class UserBase(BaseModel):
    username: str
    full_name: str
    role: str
    district_id: Optional[str] = None
    local_gov_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Camera Asset Schemas
class CameraAssetBase(BaseModel):
    id: str
    serial_number: Optional[str] = None
    asset_registry_no: Optional[str] = None
    mac_address: Optional[str] = None
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    catalog_id: Optional[int] = None
    local_gov_id: str
    nvr_vms_id: Optional[int] = None
    project_id: Optional[int] = None
    latitude: float = Field(..., description="Latitude WGS84 coordinate")
    longitude: float = Field(..., description="Longitude WGS84 coordinate")
    elevation_m: Optional[float] = 3.0
    azimuth_deg: Optional[float] = 0.0
    view_angle_deg: Optional[float] = 90.0
    view_range_m: Optional[float] = 30.0
    address_ref: str
    installation_site_id: Optional[str] = None
    install_point_type_id: Optional[str] = None
    camera_function_type_id: Optional[str] = None
    purpose_type: str
    status: Optional[str] = "PENDING_INSTALL"
    install_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    photo_site_url: Optional[str] = None
    photo_view_url: Optional[str] = None
    stream_url: Optional[str] = None
    stream_username: Optional[str] = None
    stream_password_encrypted: Optional[str] = None

class CameraAssetCreate(CameraAssetBase):
    pass

class CameraAssetOut(BaseModel):
    id: str
    serial_number: Optional[str] = None
    asset_registry_no: Optional[str] = None
    mac_address: Optional[str] = None
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    catalog_id: Optional[int] = None
    local_gov_id: str
    district_id: Optional[str] = None
    nvr_vms_id: Optional[int] = None
    project_id: Optional[int] = None
    latitude: float
    longitude: float
    elevation_m: float
    azimuth_deg: float
    view_angle_deg: float
    view_range_m: float
    address_ref: str
    installation_site_id: Optional[str] = None
    install_point_type_id: Optional[str] = None
    camera_function_type_id: Optional[str] = None
    purpose_type: str
    status: str
    install_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    photo_site_url: Optional[str] = None
    photo_view_url: Optional[str] = None
    stream_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# GeoJSON Wrapper Schema for GIS mapping
class CameraGeoJSONProperties(BaseModel):
    id: str
    name: str
    status: str
    installation_site_id: Optional[str] = None
    install_point_type_id: Optional[str] = None
    purpose_type: str
    local_gov_id: str
    azimuth_deg: float
    view_angle_deg: float
    view_range_m: float

class CameraGeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float] # [longitude, latitude]

class CameraGeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: CameraGeoJSONGeometry
    properties: CameraGeoJSONProperties

class CameraGeoJSONCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[CameraGeoJSONFeature]

# Maintenance Ticket Schemas
class MaintenanceTicketBase(BaseModel):
    camera_id: str
    issue_description: str
    issue_category: Optional[str] = None
    assigned_to: Optional[int] = None

class MaintenanceTicketCreate(MaintenanceTicketBase):
    reported_by: str

class MaintenanceTicketOut(MaintenanceTicketBase):
    id: int
    ticket_number: str
    reported_by: str
    reported_at: datetime
    status: str
    resolved_at: Optional[datetime] = None
    resolution_details: Optional[str] = None
    cost: float
    parts_replaced: Optional[str] = None
    photo_resolved_url: Optional[str] = None

    class Config:
        from_attributes = True

# Video Request Schemas (PDPA)
class VideoRequestBase(BaseModel):
    requester_name: str
    requester_agency: Optional[str] = None
    case_number: Optional[str] = None
    reason: str
    start_time: datetime
    end_time: datetime
    camera_ids: List[str]

class VideoRequestCreate(VideoRequestBase):
    pass

class VideoRequestOut(BaseModel):
    id: int
    request_number: str
    requester_name: str
    requester_agency: Optional[str] = None
    case_number: Optional[str] = None
    reason: str
    start_time: datetime
    end_time: datetime
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    status: str
    access_expiry_at: Optional[datetime] = None
    delivery_file_path: Optional[str] = None
    created_at: datetime
    cameras: List[CameraAssetOut] = []

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogCreate(BaseModel):
    action: str
    target_type: str
    target_id: Optional[str] = None
    client_ip: str
    reason: Optional[str] = None

class AuditLogOut(BaseModel):
    id: int
    username: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    action_time: datetime
    client_ip: str
    reason: Optional[str] = None

    class Config:
        from_attributes = True

# Import Excel Summary
class RowErrorDetail(BaseModel):
    row: int
    column: str
    error: str

class BulkImportSummary(BaseModel):
    success: bool
    total_rows: int
    imported_count: int
    failed_count: int
    errors: List[RowErrorDetail]

class LocalGovernmentBase(BaseModel):
    name_th: str
    type_id: str = "SAO"
    district_id: str
    dla_code: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class LocalGovernmentCreate(LocalGovernmentBase):
    id: Optional[str] = None

class LocalGovernmentOut(LocalGovernmentBase):
    id: str

    class Config:
        from_attributes = True

# Area / Org Master Data Schemas
class DistrictBase(BaseModel):
    id: str
    name_th: str
    name_en: str

class DistrictOut(DistrictBase):
    class Config:
        from_attributes = True

class SubdistrictBase(BaseModel):
    id: str
    district_id: str
    name_th: str
    name_en: str

class SubdistrictOut(SubdistrictBase):
    class Config:
        from_attributes = True

class LocalGovTypeBase(BaseModel):
    id: str
    name_th: str

class LocalGovTypeOut(LocalGovTypeBase):
    class Config:
        from_attributes = True

# Device Catalog Master Data Schemas
class DeviceBrandBase(BaseModel):
    name: str

class DeviceBrandCreate(DeviceBrandBase):
    pass

class DeviceBrandOut(DeviceBrandBase):
    id: int
    class Config:
        from_attributes = True

class DeviceCategoryBase(BaseModel):
    id: str
    name_th: str

class DeviceCategoryOut(DeviceCategoryBase):
    class Config:
        from_attributes = True

# Camera Installation/Function Lookup Schemas
class InstallationSiteBase(BaseModel):
    id: str
    name_th: str

class InstallationSiteOut(InstallationSiteBase):
    class Config:
        from_attributes = True

class InstallPointTypeBase(BaseModel):
    id: str
    name_th: str

class InstallPointTypeOut(InstallPointTypeBase):
    class Config:
        from_attributes = True

class CameraFunctionTypeBase(BaseModel):
    id: str
    name_th: str

class CameraFunctionTypeOut(CameraFunctionTypeBase):
    class Config:
        from_attributes = True

class DeviceCatalogBase(BaseModel):
    brand_id: int
    model: str
    category_id: str
    resolution: str
    sensor: Optional[str] = None
    ir_distance_m: Optional[int] = None
    fov_horizontal: Optional[float] = 90.0
    optical_zoom: Optional[int] = 0
    codecs: Optional[List[str]] = None
    onvif_profiles: Optional[List[str]] = None
    poe_supported: Optional[bool] = True
    ip_rating: Optional[str] = "IP66"
    ref_price: Optional[float] = None
    status_eol: Optional[bool] = False
    status_eos: Optional[bool] = False

class DeviceCatalogCreate(DeviceCatalogBase):
    pass

class DeviceCatalogOut(DeviceCatalogBase):
    id: int
    class Config:
        from_attributes = True

# NVR/VMS & Network Infrastructure Schemas
class NvrVmsSystemBase(BaseModel):
    local_gov_id: str
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    ip_address: Optional[str] = None
    channels: Optional[int] = 16
    storage_capacity_tb: Optional[float] = None
    retention_days: Optional[int] = 30

class NvrVmsSystemCreate(NvrVmsSystemBase):
    pass

class NvrVmsSystemOut(NvrVmsSystemBase):
    id: int
    class Config:
        from_attributes = True

class NetworkInfrastructureBase(BaseModel):
    provider: Optional[str] = None
    link_type: Optional[str] = None
    bandwidth_mbps: Optional[int] = None
    monthly_cost: Optional[float] = 0.0
    power_source: Optional[str] = "PEA"
    has_ups: Optional[bool] = False
    has_solar: Optional[bool] = False

class NetworkInfrastructureCreate(NetworkInfrastructureBase):
    pass

class NetworkInfrastructureOut(NetworkInfrastructureBase):
    camera_id: str
    class Config:
        from_attributes = True

# Purchase Project Schemas (full field set)
class PurchaseProjectBase(BaseModel):
    fiscal_year: int
    name: str
    budget_source: str
    budget_allocated: Optional[float] = 0.0
    contract_amount: float
    contract_number: Optional[str] = None
    contractor_name: Optional[str] = None
    signing_date: Optional[date] = None
    delivery_date: Optional[date] = None
    inspection_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    annual_ma_cost: Optional[float] = 0.0
    total_points: Optional[int] = 1

class PurchaseProjectCreate(PurchaseProjectBase):
    pass

class PurchaseProjectOut(PurchaseProjectBase):
    id: int
    class Config:
        from_attributes = True

# Health Check / Uptime Read Schemas
class HealthCheckLogOut(BaseModel):
    id: int
    camera_id: str
    check_time: datetime
    status: str
    ping_latency_ms: Optional[int] = None
    stream_status: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True

class UptimeMonthlyStatOut(BaseModel):
    id: int
    camera_id: str
    year_month: str
    uptime_seconds: int
    downtime_seconds: int
    availability_pct: Optional[float] = None

    class Config:
        from_attributes = True

# Maintenance Ticket Update Schema
class MaintenanceTicketUpdate(BaseModel):
    status: str
    resolution_details: Optional[str] = None
    cost: Optional[float] = 0.0
    parts_replaced: Optional[str] = None

# Video Request Approval Schema
class VideoRequestApprove(BaseModel):
    status: str
    access_expiry_at: Optional[datetime] = None
