# crud.py
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import bcrypt
from geoalchemy2.shape import to_shape
import models
import schemas

# Password Hashing Helpers using direct bcrypt library to avoid passlib compat bugs
def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

# --- USER CRUD ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pwd = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        password_hash=hashed_pwd,
        full_name=user.full_name,
        role=user.role,
        district_id=user.district_id,
        local_gov_id=user.local_gov_id,
        email=user.email,
        phone=user.phone
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.username = user.username
        if user.password:
            db_user.password_hash = get_password_hash(user.password)
        db_user.full_name = user.full_name
        db_user.role = user.role
        db_user.district_id = user.district_id
        db_user.local_gov_id = user.local_gov_id
        db_user.email = user.email
        db_user.phone = user.phone
        db.commit()
        db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False


# --- LOCAL GOVERNMENT CRUD ---
def get_local_government(db: Session, gov_id: str):
    return db.query(models.LocalGovernment).filter(models.LocalGovernment.id == gov_id).first()

def get_local_governments(db: Session, skip: int = 0, limit: int = 500):
    return db.query(models.LocalGovernment).offset(skip).limit(limit).all()

def create_local_government(db: Session, gov: schemas.LocalGovernmentCreate):
    new_id = gov.id
    if not new_id:
        count = db.query(models.LocalGovernment).filter(models.LocalGovernment.district_id == gov.district_id).count()
        new_id = f"LA-{gov.district_id}{count+1:02d}"

    db_gov = models.LocalGovernment(
        id=new_id,
        dla_code=gov.dla_code,
        name_th=gov.name_th,
        type_id=gov.type_id,
        district_id=gov.district_id,
        contact_person=gov.contact_person,
        phone=gov.phone,
        email=gov.email
    )
    db.add(db_gov)
    db.commit()
    db.refresh(db_gov)
    return db_gov

def update_local_government(db: Session, gov_id: str, gov: schemas.LocalGovernmentCreate):
    db_gov = db.query(models.LocalGovernment).filter(models.LocalGovernment.id == gov_id).first()
    if db_gov:
        db_gov.name_th = gov.name_th
        db_gov.type_id = gov.type_id
        db_gov.district_id = gov.district_id
        db_gov.dla_code = gov.dla_code
        db_gov.contact_person = gov.contact_person
        db_gov.phone = gov.phone
        db_gov.email = gov.email
        db.commit()
        db.refresh(db_gov)
    return db_gov


# --- DISTRICT / SUBDISTRICT / LOCAL GOV TYPE CRUD (read-mostly lookups) ---
def get_districts(db: Session):
    return db.query(models.District).all()

def create_district(db: Session, district: schemas.DistrictBase):
    db_district = models.District(id=district.id, name_th=district.name_th, name_en=district.name_en)
    db.add(db_district)
    db.commit()
    db.refresh(db_district)
    return db_district

def update_district(db: Session, district_id: str, district: schemas.DistrictBase):
    db_district = db.query(models.District).filter(models.District.id == district_id).first()
    if db_district:
        db_district.name_th = district.name_th
        db_district.name_en = district.name_en
        db.commit()
        db.refresh(db_district)
    return db_district

def delete_district(db: Session, district_id: str):
    db_district = db.query(models.District).filter(models.District.id == district_id).first()
    if db_district:
        db.delete(db_district)
        db.commit()
        return True
    return False

def get_subdistricts(db: Session, district_id: str = None):
    query = db.query(models.Subdistrict)
    if district_id:
        query = query.filter(models.Subdistrict.district_id == district_id)
    return query.all()

def create_subdistrict(db: Session, sub: schemas.SubdistrictBase):
    db_sub = models.Subdistrict(id=sub.id, district_id=sub.district_id, name_th=sub.name_th, name_en=sub.name_en)
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

def delete_subdistrict(db: Session, sub_id: str):
    db_sub = db.query(models.Subdistrict).filter(models.Subdistrict.id == sub_id).first()
    if db_sub:
        db.delete(db_sub)
        db.commit()
        return True
    return False

def get_local_gov_types(db: Session):
    return db.query(models.LocalGovType).all()

def create_local_gov_type(db: Session, lgt: schemas.LocalGovTypeBase):
    db_lgt = models.LocalGovType(id=lgt.id, name_th=lgt.name_th)
    db.add(db_lgt)
    db.commit()
    db.refresh(db_lgt)
    return db_lgt

def update_local_gov_type(db: Session, lgt_id: str, lgt: schemas.LocalGovTypeBase):
    db_lgt = db.query(models.LocalGovType).filter(models.LocalGovType.id == lgt_id).first()
    if db_lgt:
        db_lgt.name_th = lgt.name_th
        db.commit()
        db.refresh(db_lgt)
    return db_lgt

def delete_local_gov_type(db: Session, lgt_id: str):
    db_lgt = db.query(models.LocalGovType).filter(models.LocalGovType.id == lgt_id).first()
    if db_lgt:
        db.delete(db_lgt)
        db.commit()
        return True
    return False

def delete_local_government(db: Session, gov_id: str):
    db_gov = db.query(models.LocalGovernment).filter(models.LocalGovernment.id == gov_id).first()
    if db_gov:
        db.delete(db_gov)
        db.commit()
        return True
    return False


# --- DEVICE BRAND / CATEGORY CRUD ---
def get_brands(db: Session):
    return db.query(models.DeviceBrand).all()

def create_brand(db: Session, brand: schemas.DeviceBrandCreate):
    db_brand = models.DeviceBrand(name=brand.name)
    db.add(db_brand)
    db.commit()
    db.refresh(db_brand)
    return db_brand

def delete_brand(db: Session, brand_id: int):
    db_brand = db.query(models.DeviceBrand).filter(models.DeviceBrand.id == brand_id).first()
    if db_brand:
        db.delete(db_brand)
        db.commit()
        return True
    return False

def get_categories(db: Session):
    return db.query(models.DeviceCategory).all()

def create_category(db: Session, category: schemas.DeviceCategoryBase):
    db_cat = models.DeviceCategory(id=category.id, name_th=category.name_th)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

def delete_category(db: Session, category_id: str):
    db_cat = db.query(models.DeviceCategory).filter(models.DeviceCategory.id == category_id).first()
    if db_cat:
        db.delete(db_cat)
        db.commit()
        return True
    return False


# --- INSTALLATION SITE CRUD (จุดติดตั้ง) ---
def get_installation_sites(db: Session):
    return db.query(models.InstallationSite).all()

def create_installation_site(db: Session, item: schemas.InstallationSiteBase):
    db_item = models.InstallationSite(id=item.id, name_th=item.name_th)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_installation_site(db: Session, item_id: str, item: schemas.InstallationSiteBase):
    db_item = db.query(models.InstallationSite).filter(models.InstallationSite.id == item_id).first()
    if db_item:
        db_item.name_th = item.name_th
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_installation_site(db: Session, item_id: str):
    db_item = db.query(models.InstallationSite).filter(models.InstallationSite.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# --- INSTALL POINT TYPE CRUD (ประเภทจุดติดตั้ง) ---
def get_install_point_types(db: Session):
    return db.query(models.InstallPointType).all()

def create_install_point_type(db: Session, item: schemas.InstallPointTypeBase):
    db_item = models.InstallPointType(id=item.id, name_th=item.name_th)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_install_point_type(db: Session, item_id: str, item: schemas.InstallPointTypeBase):
    db_item = db.query(models.InstallPointType).filter(models.InstallPointType.id == item_id).first()
    if db_item:
        db_item.name_th = item.name_th
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_install_point_type(db: Session, item_id: str):
    db_item = db.query(models.InstallPointType).filter(models.InstallPointType.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# --- CAMERA FUNCTION TYPE CRUD (รายละเอียดประเภทกล้อง) ---
def get_camera_function_types(db: Session):
    return db.query(models.CameraFunctionType).all()

def create_camera_function_type(db: Session, item: schemas.CameraFunctionTypeBase):
    db_item = models.CameraFunctionType(id=item.id, name_th=item.name_th)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_camera_function_type(db: Session, item_id: str, item: schemas.CameraFunctionTypeBase):
    db_item = db.query(models.CameraFunctionType).filter(models.CameraFunctionType.id == item_id).first()
    if db_item:
        db_item.name_th = item.name_th
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_camera_function_type(db: Session, item_id: str):
    db_item = db.query(models.CameraFunctionType).filter(models.CameraFunctionType.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False


# --- DEVICE CATALOG CRUD ---
def get_catalogs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.DeviceCatalog).offset(skip).limit(limit).all()

def create_catalog(db: Session, cat: schemas.DeviceCatalogCreate):
    db_cat = models.DeviceCatalog(
        brand_id=cat.brand_id,
        model=cat.model,
        category_id=cat.category_id,
        resolution=cat.resolution,
        sensor=cat.sensor,
        ir_distance_m=cat.ir_distance_m,
        fov_horizontal=cat.fov_horizontal,
        optical_zoom=cat.optical_zoom,
        codecs=cat.codecs,
        onvif_profiles=cat.onvif_profiles,
        poe_supported=cat.poe_supported,
        ip_rating=cat.ip_rating,
        ref_price=cat.ref_price,
        status_eol=cat.status_eol,
        status_eos=cat.status_eos
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

def update_catalog(db: Session, cat_id: int, cat: schemas.DeviceCatalogCreate):
    db_cat = db.query(models.DeviceCatalog).filter(models.DeviceCatalog.id == cat_id).first()
    if db_cat:
        db_cat.brand_id = cat.brand_id
        db_cat.model = cat.model
        db_cat.category_id = cat.category_id
        db_cat.resolution = cat.resolution
        db_cat.sensor = cat.sensor
        db_cat.ir_distance_m = cat.ir_distance_m
        db_cat.fov_horizontal = cat.fov_horizontal
        db_cat.optical_zoom = cat.optical_zoom
        db_cat.codecs = cat.codecs
        db_cat.onvif_profiles = cat.onvif_profiles
        db_cat.poe_supported = cat.poe_supported
        db_cat.ip_rating = cat.ip_rating
        db_cat.ref_price = cat.ref_price
        db_cat.status_eol = cat.status_eol
        db_cat.status_eos = cat.status_eos
        db.commit()
        db.refresh(db_cat)
    return db_cat

def delete_catalog(db: Session, cat_id: int):
    db_cat = db.query(models.DeviceCatalog).filter(models.DeviceCatalog.id == cat_id).first()
    if db_cat:
        db.delete(db_cat)
        db.commit()
        return True
    return False


# --- NVR/VMS SYSTEM CRUD ---
def get_nvr_vms_systems(db: Session, local_gov_id: str = None):
    query = db.query(models.NvrVmsSystem)
    if local_gov_id:
        query = query.filter(models.NvrVmsSystem.local_gov_id == local_gov_id)
    return query.all()

def create_nvr_vms_system(db: Session, nvr: schemas.NvrVmsSystemCreate):
    db_nvr = models.NvrVmsSystem(**nvr.model_dump())
    db.add(db_nvr)
    db.commit()
    db.refresh(db_nvr)
    return db_nvr

def update_nvr_vms_system(db: Session, nvr_id: int, nvr: schemas.NvrVmsSystemCreate):
    db_nvr = db.query(models.NvrVmsSystem).filter(models.NvrVmsSystem.id == nvr_id).first()
    if db_nvr:
        for key, value in nvr.model_dump().items():
            setattr(db_nvr, key, value)
        db.commit()
        db.refresh(db_nvr)
    return db_nvr

def delete_nvr_vms_system(db: Session, nvr_id: int):
    db_nvr = db.query(models.NvrVmsSystem).filter(models.NvrVmsSystem.id == nvr_id).first()
    if db_nvr:
        db.delete(db_nvr)
        db.commit()
        return True
    return False


# --- NETWORK INFRASTRUCTURE CRUD (1:1 with camera) ---
def get_network_infra(db: Session, camera_id: str):
    return db.query(models.NetworkInfrastructure).filter(models.NetworkInfrastructure.camera_id == camera_id).first()

def upsert_network_infra(db: Session, camera_id: str, infra: schemas.NetworkInfrastructureCreate):
    db_infra = get_network_infra(db, camera_id)
    if db_infra:
        for key, value in infra.model_dump().items():
            setattr(db_infra, key, value)
    else:
        db_infra = models.NetworkInfrastructure(camera_id=camera_id, **infra.model_dump())
        db.add(db_infra)
    db.commit()
    db.refresh(db_infra)
    return db_infra


# --- PURCHASE PROJECT CRUD ---
def get_projects(db: Session):
    return db.query(models.PurchaseProject).all()

def create_project(db: Session, project: schemas.PurchaseProjectCreate):
    db_project = models.PurchaseProject(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project: schemas.PurchaseProjectCreate):
    db_project = db.query(models.PurchaseProject).filter(models.PurchaseProject.id == project_id).first()
    if db_project:
        for key, value in project.model_dump().items():
            setattr(db_project, key, value)
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = db.query(models.PurchaseProject).filter(models.PurchaseProject.id == project_id).first()
    if db_project:
        db.delete(db_project)
        db.commit()
        return True
    return False


# --- HEALTH CHECK / UPTIME READ HELPERS ---
def get_health_checks(db: Session, camera_id: str = None, limit: int = 200):
    query = db.query(models.HealthCheckLog)
    if camera_id:
        query = query.filter(models.HealthCheckLog.camera_id == camera_id)
    return query.order_by(models.HealthCheckLog.check_time.desc()).limit(limit).all()

def get_uptime_stats(db: Session, camera_id: str = None):
    query = db.query(models.UptimeMonthlyStat)
    if camera_id:
        query = query.filter(models.UptimeMonthlyStat.camera_id == camera_id)
    return query.order_by(models.UptimeMonthlyStat.year_month.desc()).all()


# --- VIDEO REQUEST LIST / APPROVE ---
def get_video_requests(db: Session):
    return db.query(models.VideoRequest).order_by(models.VideoRequest.created_at.desc()).all()

def approve_video_request(db: Session, request_id: int, approval: schemas.VideoRequestApprove, approver_id: int):
    db_req = db.query(models.VideoRequest).filter(models.VideoRequest.id == request_id).first()
    if db_req:
        db_req.status = approval.status
        db_req.approved_by = approver_id
        db_req.approved_at = datetime.datetime.utcnow()
        db_req.access_expiry_at = approval.access_expiry_at
        db.commit()
        db.refresh(db_req)
    return db_req


# --- CAMERA ASSET CRUD ---
def get_camera(db: Session, camera_id: str):
    result = db.query(
        models.CameraAsset,
        func.ST_X(models.CameraAsset.location_point).label("lng"),
        func.ST_Y(models.CameraAsset.location_point).label("lat")
    ).filter(models.CameraAsset.id == camera_id).first()
    
    if not result:
        return None

    db_camera, lng, lat = result
    db_camera.longitude = lng
    db_camera.latitude = lat
    db_camera.district_id = db_camera.local_government.district_id if db_camera.local_government else None
    return db_camera

def get_cameras(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    district_id: str = None, 
    local_gov_id: str = None, 
    status: str = None,
    install_point_type_id: str = None
):
    query = db.query(
        models.CameraAsset,
        func.ST_X(models.CameraAsset.location_point).label("lng"),
        func.ST_Y(models.CameraAsset.location_point).label("lat")
    )

    if district_id:
        query = query.join(models.LocalGovernment).filter(models.LocalGovernment.district_id == district_id)
    if local_gov_id:
        query = query.filter(models.CameraAsset.local_gov_id == local_gov_id)
    if status:
        query = query.filter(models.CameraAsset.status == status)
    if install_point_type_id:
        query = query.filter(models.CameraAsset.install_point_type_id == install_point_type_id)
        
    results = query.offset(skip).limit(limit).all()
    
    cameras_out = []
    for db_camera, lng, lat in results:
        db_camera.longitude = lng
        db_camera.latitude = lat
        db_camera.district_id = db_camera.local_government.district_id if db_camera.local_government else None
        cameras_out.append(db_camera)

    return cameras_out

def generate_camera_id(db: Session, local_gov_id: str) -> str:
    """SRI-<รหัสอำเภอ>-<รหัสหน่วยงาน>-<เลขรัน>, e.g. SRI-1901-190101-0001."""
    gov = db.query(models.LocalGovernment).filter(models.LocalGovernment.id == local_gov_id).first()
    district_code = gov.district_id if gov else "0000"
    org_code = local_gov_id.split("-", 1)[1] if "-" in local_gov_id else local_gov_id
    count = db.query(models.CameraAsset).filter(models.CameraAsset.local_gov_id == local_gov_id).count()
    return f"SRI-{district_code}-{org_code}-{count + 1:04d}"

def create_camera(db: Session, camera: schemas.CameraAssetCreate):
    wkt_point = f"POINT({camera.longitude} {camera.latitude})"
    
    db_camera = models.CameraAsset(
        id=camera.id,
        serial_number=camera.serial_number,
        asset_registry_no=camera.asset_registry_no,
        mac_address=camera.mac_address,
        private_ip=camera.private_ip,
        public_ip=camera.public_ip,
        catalog_id=camera.catalog_id,
        local_gov_id=camera.local_gov_id,
        nvr_vms_id=camera.nvr_vms_id,
        project_id=camera.project_id,
        location_point=func.ST_GeomFromText(wkt_point, 4326),
        elevation_m=camera.elevation_m,
        azimuth_deg=camera.azimuth_deg,
        view_angle_deg=camera.view_angle_deg,
        view_range_m=camera.view_range_m,
        address_ref=camera.address_ref,
        installation_site_id=camera.installation_site_id,
        install_point_type_id=camera.install_point_type_id,
        camera_function_type_id=camera.camera_function_type_id,
        purpose_type=camera.purpose_type,
        status=camera.status,
        install_date=camera.install_date,
        warranty_expiry=camera.warranty_expiry,
        photo_site_url=camera.photo_site_url,
        photo_view_url=camera.photo_view_url,
        stream_url=camera.stream_url,
        stream_username=camera.stream_username,
        stream_password_encrypted=camera.stream_password_encrypted
    )
    
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)

    db_camera.longitude = camera.longitude
    db_camera.latitude = camera.latitude
    db_camera.district_id = db_camera.local_government.district_id if db_camera.local_government else None
    return db_camera

def update_camera(db: Session, camera_id: str, camera: schemas.CameraAssetCreate):
    db_camera = db.query(models.CameraAsset).filter(models.CameraAsset.id == camera_id).first()
    if db_camera:
        wkt_point = f"POINT({camera.longitude} {camera.latitude})"

        db_camera.serial_number = camera.serial_number
        db_camera.asset_registry_no = camera.asset_registry_no
        db_camera.mac_address = camera.mac_address
        db_camera.private_ip = camera.private_ip
        db_camera.public_ip = camera.public_ip
        db_camera.catalog_id = camera.catalog_id
        db_camera.local_gov_id = camera.local_gov_id
        db_camera.nvr_vms_id = camera.nvr_vms_id
        db_camera.project_id = camera.project_id
        db_camera.location_point = func.ST_GeomFromText(wkt_point, 4326)
        db_camera.elevation_m = camera.elevation_m
        db_camera.azimuth_deg = camera.azimuth_deg
        db_camera.view_angle_deg = camera.view_angle_deg
        db_camera.view_range_m = camera.view_range_m
        db_camera.address_ref = camera.address_ref
        db_camera.installation_site_id = camera.installation_site_id
        db_camera.install_point_type_id = camera.install_point_type_id
        db_camera.camera_function_type_id = camera.camera_function_type_id
        db_camera.purpose_type = camera.purpose_type
        db_camera.status = camera.status
        db_camera.install_date = camera.install_date
        db_camera.warranty_expiry = camera.warranty_expiry
        db_camera.photo_site_url = camera.photo_site_url
        db_camera.photo_view_url = camera.photo_view_url
        db_camera.stream_url = camera.stream_url
        db_camera.stream_username = camera.stream_username
        db_camera.stream_password_encrypted = camera.stream_password_encrypted

        db.commit()
        db.refresh(db_camera)

        db_camera.longitude = camera.longitude
        db_camera.latitude = camera.latitude
        db_camera.district_id = db_camera.local_government.district_id if db_camera.local_government else None
        return db_camera
    return None

def delete_camera(db: Session, camera_id: str):
    db_camera = db.query(models.CameraAsset).filter(models.CameraAsset.id == camera_id).first()
    if db_camera:
        db.delete(db_camera)
        db.commit()
        return True
    return False


# --- MAINTENANCE TICKET CRUD ---
def create_maintenance_ticket(db: Session, ticket: schemas.MaintenanceTicketCreate):
    date_str = datetime.date.today().strftime("%Y%m%d")
    count = db.query(models.MaintenanceTicket).filter(
        models.MaintenanceTicket.ticket_number.like(f"TKT-{date_str}-%")
    ).count()
    ticket_num = f"TKT-{date_str}-{count+1:04d}"

    db_ticket = models.MaintenanceTicket(
        ticket_number=ticket_num,
        camera_id=ticket.camera_id,
        reported_by=ticket.reported_by,
        issue_description=ticket.issue_description,
        issue_category=ticket.issue_category,
        assigned_to=ticket.assigned_to,
        status="OPEN"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

def update_maintenance_ticket(db: Session, ticket_id: int, status: str, details: str = None, cost: float = 0.0, parts: str = None):
    db_ticket = db.query(models.MaintenanceTicket).filter(models.MaintenanceTicket.id == ticket_id).first()
    if db_ticket:
        db_ticket.status = status
        if status in ["RESOLVED", "CLOSED"]:
            db_ticket.resolved_at = datetime.datetime.utcnow()
            db_ticket.resolution_details = details
            db_ticket.cost = cost
            db_ticket.parts_replaced = parts
        db.commit()
        db.refresh(db_ticket)
    return db_ticket


# --- PDPA VIDEO REQUEST CRUD ---
def create_video_request(db: Session, req: schemas.VideoRequestCreate):
    date_str = datetime.date.today().strftime("%Y%m%d")
    count = db.query(models.VideoRequest).filter(
        models.VideoRequest.request_number.like(f"REQ-{date_str}-%")
    ).count()
    req_num = f"REQ-{date_str}-{count+1:04d}"

    db_req = models.VideoRequest(
        request_number=req_num,
        requester_name=req.requester_name,
        requester_agency=req.requester_agency,
        case_number=req.case_number,
        reason=req.reason,
        start_time=req.start_time,
        end_time=req.end_time,
        status="PENDING"
    )
    db.add(db_req)
    db.commit()

    for cam_id in req.camera_ids:
        db.execute(
            models.video_request_cameras.insert().values(
                request_id=db_req.id,
                camera_id=cam_id
            )
        )
    db.commit()
    db.refresh(db_req)
    return db_req


# --- IMMUTABLE AUDIT LOG WRITER ---
def create_audit_log(db: Session, log: schemas.AuditLogCreate, username: str, user_id: int = None):
    db_log = models.AuditLog(
        user_id=user_id,
        username=username,
        action=log.action,
        target_type=log.target_type,
        target_id=log.target_id,
        client_ip=log.client_ip,
        reason=log.reason
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
