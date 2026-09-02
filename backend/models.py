# models.py
import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DECIMAL, Date, DateTime, 
    ForeignKey, Table, Text, ARRAY, BigInteger
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from database import Base

# Association Table สำหรับ Video Request Mapped กับ Cameras (PDPA)
video_request_cameras = Table(
    "video_request_cameras",
    Base.metadata,
    Column("request_id", Integer, ForeignKey("video_requests.id", ondelete="CASCADE"), primary_key=True),
    Column("camera_id", String(50), ForeignKey("camera_assets.id", ondelete="CASCADE"), primary_key=True)
)

class District(Base):
    __tablename__ = "districts"
    id = Column(String(4), primary_key=True)
    name_th = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=False)
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))

    local_governments = relationship("LocalGovernment", back_populates="district")
    users = relationship("User", back_populates="district")

class Subdistrict(Base):
    __tablename__ = "subdistricts"
    id = Column(String(6), primary_key=True)
    district_id = Column(String(4), ForeignKey("districts.id"), nullable=False)
    name_th = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=False)
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))

class LocalGovType(Base):
    __tablename__ = "local_gov_types"
    id = Column(String(20), primary_key=True)
    name_th = Column(String(100), nullable=False)

class LocalGovernment(Base):
    __tablename__ = "local_governments"
    id = Column(String(15), primary_key=True)
    dla_code = Column(String(10), unique=True)
    name_th = Column(String(255), nullable=False)
    type_id = Column(String(20), ForeignKey("local_gov_types.id"), nullable=False)
    district_id = Column(String(4), ForeignKey("districts.id"), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(50))
    email = Column(String(100))
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="local_governments")
    users = relationship("User", back_populates="local_government")
    cameras = relationship("CameraAsset", back_populates="local_government")
    nvr_vms_systems = relationship("NvrVmsSystem", back_populates="local_government")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'SUPER_ADMIN', 'GOVERNOR_VIEWER', 'DISTRICT_ADMIN', 'LOCAL_GOV_STAFF', 'MA_TECHNICIAN', 'POLICE_VIEWER'
    district_id = Column(String(4), ForeignKey("districts.id"))
    local_gov_id = Column(String(15), ForeignKey("local_governments.id"))
    email = Column(String(100))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    district = relationship("District", back_populates="users")
    local_government = relationship("LocalGovernment", back_populates="users")
    assigned_tickets = relationship("MaintenanceTicket", back_populates="assigned_technician")
    approved_requests = relationship("VideoRequest", back_populates="approver")
    audit_logs = relationship("AuditLog", back_populates="user")

class DeviceBrand(Base):
    __tablename__ = "device_brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

class DeviceCategory(Base):
    __tablename__ = "device_categories"
    id = Column(String(30), primary_key=True)
    name_th = Column(String(100), nullable=False)

class InstallationSite(Base):
    __tablename__ = "installation_sites"
    id = Column(String(30), primary_key=True)
    name_th = Column(String(150), nullable=False)

class InstallPointType(Base):
    __tablename__ = "install_point_types"
    id = Column(String(30), primary_key=True)
    name_th = Column(String(150), nullable=False)

class CameraFunctionType(Base):
    __tablename__ = "camera_function_types"
    id = Column(String(30), primary_key=True)
    name_th = Column(String(150), nullable=False)

class DeviceCatalog(Base):
    __tablename__ = "device_catalog"
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("device_brands.id"), nullable=False)
    model = Column(String(100), nullable=False)
    category_id = Column(String(30), ForeignKey("device_categories.id"), nullable=False)
    resolution = Column(String(50), nullable=False)
    sensor = Column(String(100))
    ir_distance_m = Column(Integer)
    fov_horizontal = Column(DECIMAL(5, 2), default=90.00)
    optical_zoom = Column(Integer, default=0)
    codecs = Column(ARRAY(String(50)))
    onvif_profiles = Column(ARRAY(String(50)))
    poe_supported = Column(Boolean, default=True)
    ip_rating = Column(String(10), default="IP66")
    ref_price = Column(DECIMAL(10, 2))
    status_eol = Column(Boolean, default=False)
    status_eos = Column(Boolean, default=False)

    cameras = relationship("CameraAsset", back_populates="catalog")

class PurchaseProject(Base):
    __tablename__ = "purchase_projects"
    id = Column(Integer, primary_key=True, index=True)
    fiscal_year = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    budget_source = Column(String(100), nullable=False)
    budget_allocated = Column(DECIMAL(15, 2), nullable=False)
    contract_amount = Column(DECIMAL(15, 2), nullable=False)
    contract_number = Column(String(100))
    contractor_name = Column(String(255))
    signing_date = Column(Date)
    delivery_date = Column(Date)
    inspection_date = Column(Date)
    warranty_expiry = Column(Date)
    annual_ma_cost = Column(DECIMAL(15, 2), default=0.00)
    total_points = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    cameras = relationship("CameraAsset", back_populates="project")

class NvrVmsSystem(Base):
    __tablename__ = "nvr_vms_systems"
    id = Column(Integer, primary_key=True, index=True)
    local_gov_id = Column(String(15), ForeignKey("local_governments.id"), nullable=False)
    name = Column(String(255), nullable=False)
    brand = Column(String(100))
    model = Column(String(100))
    ip_address = Column(String(45))
    channels = Column(Integer, default=16)
    storage_capacity_tb = Column(DECIMAL(6, 2))
    retention_days = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    local_government = relationship("LocalGovernment", back_populates="nvr_vms_systems")
    cameras = relationship("CameraAsset", back_populates="nvr_vms")

class CameraAsset(Base):
    __tablename__ = "camera_assets"
    id = Column(String(50), primary_key=True)
    serial_number = Column(String(100))
    asset_registry_no = Column(String(100))
    mac_address = Column(String(17))
    private_ip = Column(String(45))
    public_ip = Column(String(45))
    catalog_id = Column(Integer, ForeignKey("device_catalog.id"))
    local_gov_id = Column(String(15), ForeignKey("local_governments.id"), nullable=False)
    nvr_vms_id = Column(Integer, ForeignKey("nvr_vms_systems.id"))
    project_id = Column(Integer, ForeignKey("purchase_projects.id"))
    location_point = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    elevation_m = Column(DECIMAL(5, 2), default=3.00)
    azimuth_deg = Column(DECIMAL(5, 2), default=0.00)
    view_angle_deg = Column(DECIMAL(5, 2), default=90.00)
    view_range_m = Column(DECIMAL(5, 2), default=30.00)
    address_ref = Column(Text, nullable=False)
    installation_site_id = Column(String(30), ForeignKey("installation_sites.id"))
    install_point_type_id = Column(String(30), ForeignKey("install_point_types.id"))
    camera_function_type_id = Column(String(30), ForeignKey("camera_function_types.id"))
    purpose_type = Column(String(50), nullable=False) # 'SAFETY', 'TRAFFIC', 'ENVIRONMENT', 'DISASTER'
    status = Column(String(20), default="PENDING_INSTALL") # 'ONLINE', 'OFFLINE', 'REMOVED', 'MAINTENANCE'
    install_date = Column(Date)
    warranty_expiry = Column(Date)
    photo_site_url = Column(String(500))
    photo_view_url = Column(String(500))
    stream_url = Column(String(500))
    stream_username = Column(String(100))
    stream_password_encrypted = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    local_government = relationship("LocalGovernment", back_populates="cameras")
    catalog = relationship("DeviceCatalog", back_populates="cameras")
    nvr_vms = relationship("NvrVmsSystem", back_populates="cameras")
    project = relationship("PurchaseProject", back_populates="cameras")
    installation_site = relationship("InstallationSite")
    install_point_type = relationship("InstallPointType")
    camera_function_type = relationship("CameraFunctionType")
    network = relationship("NetworkInfrastructure", uselist=False, back_populates="camera")
    health_logs = relationship("HealthCheckLog", back_populates="camera")
    uptime_stats = relationship("UptimeMonthlyStat", back_populates="camera")
    tickets = relationship("MaintenanceTicket", back_populates="camera")
    video_requests = relationship("VideoRequest", secondary=video_request_cameras, back_populates="cameras")

class NetworkInfrastructure(Base):
    __tablename__ = "network_infrastructure"
    camera_id = Column(String(50), ForeignKey("camera_assets.id", ondelete="CASCADE"), primary_key=True)
    provider = Column(String(100))
    link_type = Column(String(50)) # 'FTTx', 'LEASED_LINE', '4G_5G', 'WIRELESS'
    bandwidth_mbps = Column(Integer)
    monthly_cost = Column(DECIMAL(10, 2), default=0.00)
    power_source = Column(String(100), default="PEA")
    has_ups = Column(Boolean, default=False)
    has_solar = Column(Boolean, default=False)

    camera = relationship("CameraAsset", back_populates="network")

class HealthCheckLog(Base):
    __tablename__ = "health_check_logs"
    id = Column(BigInteger, primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("camera_assets.id", ondelete="CASCADE"), nullable=False)
    check_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    status = Column(String(20), nullable=False) # 'ONLINE', 'OFFLINE'
    ping_latency_ms = Column(Integer)
    stream_status = Column(String(50)) # 'NORMAL', 'DARK_IMAGE', 'BLURRY_IMAGE', 'WRONG_AZIMUTH'
    details = Column(Text)

    camera = relationship("CameraAsset", back_populates="health_logs")

class UptimeMonthlyStat(Base):
    __tablename__ = "uptime_monthly_stats"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), ForeignKey("camera_assets.id", ondelete="CASCADE"), nullable=False)
    year_month = Column(String(7), nullable=False) # 'YYYY-MM'
    uptime_seconds = Column(BigInteger, default=0, nullable=False)
    downtime_seconds = Column(BigInteger, default=0, nullable=False)
    # Note: ใน PostgreSQL เราสร้าง GENERATED ALWAYS AS column ไว้ในตาราง
    # สำหรับ SQLAlchemy เรากำหนดเป็น read-only property หรือดึงจากตารางตรงๆ
    availability_pct = Column(DECIMAL(5, 2))

    camera = relationship("CameraAsset", back_populates="uptime_stats")

class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, nullable=False)
    camera_id = Column(String(50), ForeignKey("camera_assets.id"), nullable=False)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)
    reported_by = Column(String(100), nullable=False)
    issue_description = Column(Text, nullable=False)
    issue_category = Column(String(50)) # 'POWER_FAILURE', 'NETWORK_DOWN', 'LIGHTNING', 'VANDALISM', 'WEAR_TEAR'
    sla_due_at = Column(DateTime)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="OPEN") # 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    resolved_at = Column(DateTime)
    resolution_details = Column(Text)
    cost = Column(DECIMAL(10, 2), default=0.00)
    parts_replaced = Column(Text)
    photo_resolved_url = Column(String(500))

    camera = relationship("CameraAsset", back_populates="tickets")
    assigned_technician = relationship("User", back_populates="assigned_tickets")

class VideoRequest(Base):
    __tablename__ = "video_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, nullable=False)
    requester_name = Column(String(255), nullable=False)
    requester_agency = Column(String(255))
    case_number = Column(String(100))
    reason = Column(Text, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    status = Column(String(20), default="PENDING") # 'PENDING', 'APPROVED', 'REJECTED', 'DELIVERED', 'EXPIRED'
    access_expiry_at = Column(DateTime)
    delivery_file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    approver = relationship("User", back_populates="approved_requests")
    cameras = relationship("CameraAsset", secondary=video_request_cameras, back_populates="video_requests")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(100))
    action_time = Column(DateTime, default=datetime.datetime.utcnow)
    client_ip = Column(String(45), nullable=False)
    reason = Column(Text)

    user = relationship("User", back_populates="audit_logs")
