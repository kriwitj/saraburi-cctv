-- 01-init-db.sql
-- สคริปต์เริ่มต้นฐานข้อมูล ระบบทะเบียนกลาง CCTV สระบุรี (PostgreSQL + PostGIS)

-- เปิดใช้งาน Extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตาราง Master อำเภอ (สระบุรีรหัสขึ้นต้นด้วย 19)
CREATE TABLE districts (
    id VARCHAR(4) PRIMARY KEY,
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE INDEX districts_geom_idx ON districts USING GIST (geom);

-- 2. ตาราง Master ตำบล
CREATE TABLE subdistricts (
    id VARCHAR(6) PRIMARY KEY,
    district_id VARCHAR(4) NOT NULL REFERENCES districts(id),
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE INDEX subdistricts_geom_idx ON subdistricts USING GIST (geom);

-- 3. ตารางประเภท อปท.
CREATE TABLE local_gov_types (
    id VARCHAR(20) PRIMARY KEY, -- 'PAO', 'TOWN_MUN', 'SUBDISTRICT_MUN', 'SAO'
    name_th VARCHAR(100) NOT NULL
);

-- 4. ตารางองค์กรปกครองส่วนท้องถิ่น (อปท. 109 แห่ง)
CREATE TABLE local_governments (
    id VARCHAR(15) PRIMARY KEY,
    dla_code VARCHAR(10) UNIQUE,
    name_th VARCHAR(255) NOT NULL,
    type_id VARCHAR(20) NOT NULL REFERENCES local_gov_types(id),
    district_id VARCHAR(4) NOT NULL REFERENCES districts(id),
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX local_gov_geom_idx ON local_governments USING GIST (geom);

-- 5. ตารางผู้ใช้งานระบบ
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'SUPER_ADMIN', 'GOVERNOR_VIEWER', 'DISTRICT_ADMIN', 'LOCAL_GOV_STAFF', 'MA_TECHNICIAN', 'POLICE_VIEWER'
    district_id VARCHAR(4) REFERENCES districts(id),
    local_gov_id VARCHAR(15) REFERENCES local_governments(id),
    email VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ตารางแคตตาล็อกกล้อง
CREATE TABLE device_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE device_categories (
    id VARCHAR(30) PRIMARY KEY,
    name_th VARCHAR(100) NOT NULL
);

CREATE TABLE installation_sites (
    id VARCHAR(30) PRIMARY KEY,
    name_th VARCHAR(150) NOT NULL
);

CREATE TABLE install_point_types (
    id VARCHAR(30) PRIMARY KEY,
    name_th VARCHAR(150) NOT NULL
);

CREATE TABLE camera_function_types (
    id VARCHAR(30) PRIMARY KEY,
    name_th VARCHAR(150) NOT NULL
);

CREATE TABLE device_catalog (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES device_brands(id),
    model VARCHAR(100) NOT NULL,
    category_id VARCHAR(30) NOT NULL REFERENCES device_categories(id),
    resolution VARCHAR(50) NOT NULL,
    sensor VARCHAR(100),
    ir_distance_m INT,
    fov_horizontal DECIMAL(5,2) DEFAULT 90.00,
    optical_zoom INT DEFAULT 0,
    codecs VARCHAR(50)[],
    onvif_profiles VARCHAR(50)[],
    poe_supported BOOLEAN DEFAULT TRUE,
    ip_rating VARCHAR(10) DEFAULT 'IP66',
    ref_price DECIMAL(10,2),
    status_eol BOOLEAN DEFAULT FALSE,
    status_eos BOOLEAN DEFAULT FALSE
);

-- 7. ตารางโครงการงบประมาณจัดซื้อ
CREATE TABLE purchase_projects (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    budget_source VARCHAR(100) NOT NULL, -- 'เงินอุดหนุน', 'งบ อปท.', 'งบจังหวัด'
    budget_allocated DECIMAL(15,2) NOT NULL,
    contract_amount DECIMAL(15,2) NOT NULL,
    contract_number VARCHAR(100),
    contractor_name VARCHAR(255),
    signing_date DATE,
    delivery_date DATE,
    inspection_date DATE,
    warranty_expiry DATE,
    annual_ma_cost DECIMAL(15,2) DEFAULT 0.00,
    total_points INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ตารางระบบเครื่องบันทึก/VMS ประจำ อปท.
CREATE TABLE nvr_vms_systems (
    id SERIAL PRIMARY KEY,
    local_gov_id VARCHAR(15) NOT NULL REFERENCES local_governments(id),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    ip_address VARCHAR(45),
    channels INT DEFAULT 16,
    storage_capacity_tb DECIMAL(6,2),
    retention_days INT DEFAULT 30
);

-- 9. ตารางหลักทะเบียนกล้อง CCTV (Camera Asset)
CREATE TABLE camera_assets (
    id VARCHAR(50) PRIMARY KEY, -- SRI-<รหัสอำเภอ>-<รหัสหน่วยงาน>-<ลำดับ>
    serial_number VARCHAR(100),
    asset_registry_no VARCHAR(100), -- เลขครุภัณฑ์
    mac_address VARCHAR(17),
    private_ip VARCHAR(45),
    public_ip VARCHAR(45),
    catalog_id INT REFERENCES device_catalog(id),
    local_gov_id VARCHAR(15) NOT NULL REFERENCES local_governments(id),
    nvr_vms_id INT REFERENCES nvr_vms_systems(id),
    project_id INT REFERENCES purchase_projects(id),
    location_point GEOMETRY(Point, 4326) NOT NULL,
    elevation_m DECIMAL(5,2) DEFAULT 3.00,
    azimuth_deg DECIMAL(5,2) DEFAULT 0.00,
    view_angle_deg DECIMAL(5,2) DEFAULT 90.00,
    view_range_m DECIMAL(5,2) DEFAULT 30.00,
    address_ref TEXT NOT NULL,
    installation_site_id VARCHAR(30) REFERENCES installation_sites(id),
    install_point_type_id VARCHAR(30) REFERENCES install_point_types(id),
    camera_function_type_id VARCHAR(30) REFERENCES camera_function_types(id),
    purpose_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_INSTALL',
    install_date DATE,
    warranty_expiry DATE,
    photo_site_url VARCHAR(500),
    photo_view_url VARCHAR(500),
    stream_url VARCHAR(500),
    stream_username VARCHAR(100),
    stream_password_encrypted VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX camera_location_idx ON camera_assets USING GIST (location_point);
CREATE INDEX camera_status_idx ON camera_assets(status);
CREATE INDEX camera_local_gov_idx ON camera_assets(local_gov_id);

-- 10. ตารางระบบโครงข่ายเครือข่ายและระบบไฟ
CREATE TABLE network_infrastructure (
    camera_id VARCHAR(50) PRIMARY KEY REFERENCES camera_assets(id) ON DELETE CASCADE,
    provider VARCHAR(100),
    link_type VARCHAR(50),
    bandwidth_mbps INT,
    monthly_cost DECIMAL(10,2) DEFAULT 0.00,
    power_source VARCHAR(100) DEFAULT 'PEA',
    has_ups BOOLEAN DEFAULT FALSE,
    has_solar BOOLEAN DEFAULT FALSE
);

-- 11. บันทึกผลการทำตรวจสุขภาพ (Auto Ping/ONVIF Probe)
CREATE TABLE health_check_logs (
    id BIGSERIAL PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL REFERENCES camera_assets(id) ON DELETE CASCADE,
    check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    ping_latency_ms INT,
    stream_status VARCHAR(50),
    details TEXT
);

CREATE INDEX health_check_time_idx ON health_check_logs(camera_id, check_time DESC);

-- 12. บันทึกสถิติความพร้อมใช้งานประจำเดือน
CREATE TABLE uptime_monthly_stats (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(50) NOT NULL REFERENCES camera_assets(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL,
    uptime_seconds BIGINT NOT NULL DEFAULT 0,
    downtime_seconds BIGINT NOT NULL DEFAULT 0,
    availability_pct DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN (uptime_seconds + downtime_seconds) = 0 THEN 0.00
        ELSE ROUND((uptime_seconds::numeric / (uptime_seconds + downtime_seconds)::numeric) * 100, 2) END
    ) STORED,
    CONSTRAINT uq_camera_month UNIQUE (camera_id, year_month)
);

-- 13. ใบแจ้งงานซ่อมบำรุง
CREATE TABLE maintenance_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    camera_id VARCHAR(50) NOT NULL REFERENCES camera_assets(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reported_by VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    issue_category VARCHAR(50),
    sla_due_at TIMESTAMP,
    assigned_to INT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    resolved_at TIMESTAMP,
    resolution_details TEXT,
    cost DECIMAL(10,2) DEFAULT 0.00,
    parts_replaced TEXT,
    photo_resolved_url VARCHAR(500)
);

-- 14. คำร้องขอข้อมูลภาพและวิดีโอ (PDPA)
CREATE TABLE video_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_agency VARCHAR(255),
    case_number VARCHAR(100),
    reason TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    access_expiry_at TIMESTAMP,
    delivery_file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_request_cameras (
    request_id INT REFERENCES video_requests(id) ON DELETE CASCADE,
    camera_id VARCHAR(50) REFERENCES camera_assets(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, camera_id)
);

-- 15. ตารางประวัติ Audit Trail (Immutable)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'VIEW_LIVE', 'VIEW_PLAYBACK', 'EXPORT_VIDEO', 'IMPORT_ASSET'
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_ip VARCHAR(45) NOT NULL,
    reason TEXT
);

CREATE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;


--------------------------------------------------------------------------------
-- SEED DATA เริ่มต้น
--------------------------------------------------------------------------------

-- ประเภท อปท.
INSERT INTO local_gov_types (id, name_th) VALUES
('PAO', 'องค์การบริหารส่วนจังหวัด'),
('TOWN_MUN', 'เทศบาลเมือง'),
('SUBDISTRICT_MUN', 'เทศบาลตำบล'),
('SAO', 'องค์การบริหารส่วนตำบล');

-- อำเภอ 13 อำเภอ
INSERT INTO districts (id, name_th, name_en, geom) VALUES
('1901', 'เมืองสระบุรี', 'Mueang Saraburi', ST_GeomFromText('MULTIPOLYGON(((100.85 14.50, 100.95 14.50, 100.95 14.58, 100.85 14.58, 100.85 14.50)))', 4326)),
('1902', 'แก่งคอย', 'Kaeng Khoi', ST_GeomFromText('MULTIPOLYGON(((100.95 14.50, 101.10 14.50, 101.10 14.65, 100.95 14.65, 100.95 14.50)))', 4326)),
('1903', 'หนองแค', 'Nong Khae', ST_GeomFromText('MULTIPOLYGON(((100.75 14.28, 100.90 14.28, 100.90 14.42, 100.75 14.42, 100.75 14.28)))', 4326)),
('1904', 'วิหารแดง', 'Wihan Daeng', ST_GeomFromText('MULTIPOLYGON(((100.90 14.28, 101.05 14.28, 101.05 14.42, 100.90 14.42, 100.90 14.28)))', 4326)),
('1905', 'หนองแซง', 'Nong Saeng', ST_GeomFromText('MULTIPOLYGON(((100.75 14.42, 100.85 14.42, 100.85 14.50, 100.75 14.50, 100.75 14.42)))', 4326)),
('1906', 'บ้านหมอ', 'Ban Mo', ST_GeomFromText('MULTIPOLYGON(((100.68 14.55, 100.78 14.55, 100.78 14.65, 100.68 14.65, 100.68 14.55)))', 4326)),
('1907', 'ดอนพุด', 'Don Phut', ST_GeomFromText('MULTIPOLYGON(((100.58 14.55, 100.68 14.55, 100.68 14.65, 100.58 14.65, 100.58 14.55)))', 4326)),
('1908', 'หนองโดน', 'Nong Don', ST_GeomFromText('MULTIPOLYGON(((100.65 14.65, 100.75 14.65, 100.75 14.75, 100.65 14.75, 100.65 14.65)))', 4326)),
('1909', 'พระพุทธบาท', 'Phra Phutthabat', ST_GeomFromText('MULTIPOLYGON(((100.72 14.68, 100.85 14.68, 100.85 14.80, 100.72 14.80, 100.72 14.68)))', 4326)),
('1910', 'เสาไห้', 'Sao Hai', ST_GeomFromText('MULTIPOLYGON(((100.78 14.50, 100.88 14.50, 100.88 14.58, 100.78 14.58, 100.78 14.50)))', 4326)),
('1911', 'มวกเหล็ก', 'Muak Lek', ST_GeomFromText('MULTIPOLYGON(((101.10 14.55, 101.30 14.55, 101.30 14.80, 101.10 14.80, 101.10 14.55)))', 4326)),
('1912', 'วังม่วง', 'Wang Muang', ST_GeomFromText('MULTIPOLYGON(((101.00 14.75, 101.20 14.75, 101.20 14.90, 101.00 14.90, 101.00 14.75)))', 4326)),
('1913', 'เฉลิมพระเกียรติ', 'Chaloem Phra Kiat', ST_GeomFromText('MULTIPOLYGON(((100.88 14.58, 101.00 14.58, 101.00 14.68, 100.88 14.68, 100.88 14.58)))', 4326));

-- อบจ.สระบุรี
INSERT INTO local_governments (id, dla_code, name_th, type_id, district_id, contact_person, phone, email, geom) VALUES
('LA-190001', '02190101', 'องค์การบริหารส่วนจังหวัดสระบุรี', 'PAO', '1901', 'นายสมชาย ปลัด อบจ.', '036-211111', 'pao@saraburi.go.th', ST_GeomFromText('MULTIPOLYGON(((100.58 14.28, 101.30 14.28, 101.30 14.90, 100.58 14.90, 100.58 14.28)))', 4326));

-- เทศบาลเมืองทั้ง 4 แห่ง
INSERT INTO local_governments (id, dla_code, name_th, type_id, district_id, contact_person, phone, email, geom) VALUES
('LA-190101', '04190102', 'เทศบาลเมืองสระบุรี', 'TOWN_MUN', '1901', 'นายช่าง สุภาพ', '036-211222', 'ict@saraburi-city.go.th', ST_GeomFromText('MULTIPOLYGON(((100.88 14.51, 100.92 14.51, 100.92 14.54, 100.88 14.54, 100.88 14.51)))', 4326)),
('LA-190901', '04190901', 'เทศบาลเมืองพระพุทธบาท', 'TOWN_MUN', '1909', 'งานไอที พระพุทธบาท', '036-266111', 'cctv@phrabat.go.th', ST_GeomFromText('MULTIPOLYGON(((100.75 14.70, 100.80 14.70, 100.80 14.75, 100.75 14.75, 100.75 14.70)))', 4326)),
('LA-190201', '04190201', 'เทศบาลเมืองแก่งคอย', 'TOWN_MUN', '1902', 'นายนพเดช ผช.ไอที', '036-244111', 'it@kaengkhoi.go.th', ST_GeomFromText('MULTIPOLYGON(((100.97 14.57, 101.01 14.57, 101.01 14.61, 100.97 14.61, 100.97 14.57)))', 4326)),
('LA-190202', '04190202', 'เทศบาลเมืองทับกวาง', 'TOWN_MUN', '1902', 'ฝ่ายแผน ทับกวาง', '036-357111', 'plan@tubkwang.go.th', ST_GeomFromText('MULTIPOLYGON(((101.05 14.55, 101.12 14.55, 101.12 14.60, 101.05 14.60, 101.05 14.55)))', 4326));

-- อปท. ที่เหลืออีก 104 แห่ง (จากทั้งหมด 109 แห่ง) ตามข้อมูลตั้งต้น FON015.csv (กรมส่งเสริมการปกครองท้องถิ่น)
INSERT INTO local_governments (id, dla_code, name_th, type_id, district_id) VALUES
('LA-06191306', '06191306', 'อบต.หน้าพระลาน', 'SAO', '1913'),
('LA-05191301', '05191301', 'เทศบาลตำบลหน้าพระลาน', 'SUBDISTRICT_MUN', '1913'),
('LA-06191307', '06191307', 'อบต.ห้วยบง', 'SAO', '1913'),
('LA-06191305', '06191305', 'อบต.พุแค', 'SAO', '1913'),
('LA-06191304', '06191304', 'อบต.ผึ้งรวง', 'SAO', '1913'),
('LA-06191303', '06191303', 'อบต.บ้านแก้ง', 'SAO', '1913'),
('LA-06191302', '06191302', 'อบต.เขาดินพัฒนา', 'SAO', '1913'),
('LA-06191203', '06191203', 'อบต.วังม่วง', 'SAO', '1912'),
('LA-05191202', '05191202', 'เทศบาลตำบลคำพราน', 'SUBDISTRICT_MUN', '1912'),
('LA-05191201', '05191201', 'เทศบาลตำบลวังม่วง', 'SUBDISTRICT_MUN', '1912'),
('LA-05191204', '05191204', 'เทศบาลตำบลแสลงพัน', 'SUBDISTRICT_MUN', '1912'),
('LA-06191102', '06191102', 'อบต.ซับสนุ่น', 'SAO', '1911'),
('LA-06191105', '06191105', 'อบต.ลำพญากลาง', 'SAO', '1911'),
('LA-06191106', '06191106', 'อบต.ลำสมพุง', 'SAO', '1911'),
('LA-06191107', '06191107', 'อบต.หนองย่างเสือ', 'SAO', '1911'),
('LA-06191104', '06191104', 'อบต.มิตรภาพ', 'SAO', '1911'),
('LA-06191103', '06191103', 'อบต.มวกเหล็ก', 'SAO', '1911'),
('LA-05191101', '05191101', 'เทศบาลตำบลมวกเหล็ก', 'SUBDISTRICT_MUN', '1911'),
('LA-05191002', '05191002', 'เทศบาลตำบลสวนดอกไม้', 'SUBDISTRICT_MUN', '1910'),
('LA-05191004', '05191004', 'เทศบาลตำบลเมืองเก่า', 'SUBDISTRICT_MUN', '1910'),
('LA-06191010', '06191010', 'อบต.เริงราง', 'SAO', '1910'),
('LA-06191009', '06191009', 'อบต.ม่วงงาม', 'SAO', '1910'),
('LA-06191007', '06191007', 'อบต.ช้างไทยงาม', 'SAO', '1910'),
('LA-05191006', '05191006', 'เทศบาลตำบลต้นตาล-พระยาทด', 'SUBDISTRICT_MUN', '1910'),
('LA-05191005', '05191005', 'เทศบาลตำบลหัวปลวก', 'SUBDISTRICT_MUN', '1910'),
('LA-06191008', '06191008', 'อบต.บ้านยาง', 'SAO', '1910'),
('LA-05191001', '05191001', 'เทศบาลตำบลบ้านยาง', 'SUBDISTRICT_MUN', '1910'),
('LA-05191003', '05191003', 'เทศบาลตำบลเสาไห้', 'SUBDISTRICT_MUN', '1910'),
('LA-05190907', '05190907', 'เทศบาลตำบลหนองแก', 'SUBDISTRICT_MUN', '1909'),
('LA-05190902', '05190902', 'เทศบาลตำบลพุกร่าง', 'SUBDISTRICT_MUN', '1909'),
('LA-05190908', '05190908', 'เทศบาลตำบลห้วยป่าหวาย', 'SUBDISTRICT_MUN', '1909'),
('LA-06190903', '06190903', 'อบต.เขาวง', 'SAO', '1909'),
('LA-06190906', '06190906', 'อบต.พุคำจาน', 'SAO', '1909'),
('LA-05190905', '05190905', 'เทศบาลตำบลนายาว', 'SUBDISTRICT_MUN', '1909'),
('LA-05190904', '05190904', 'เทศบาลตำบลธารเกษม', 'SUBDISTRICT_MUN', '1909'),
('LA-06190802', '06190802', 'อบต.ดอนทอง', 'SAO', '1908'),
('LA-06190803', '06190803', 'อบต.บ้านกลับ', 'SAO', '1908'),
('LA-06190804', '06190804', 'อบต.หนองโดน', 'SAO', '1908'),
('LA-05190801', '05190801', 'เทศบาลตำบลหนองโดน', 'SUBDISTRICT_MUN', '1908'),
('LA-06190702', '06190702', 'อบต.ดงตะงาว', 'SAO', '1907'),
('LA-05190701', '05190701', 'เทศบาลตำบลดอนพุด', 'SUBDISTRICT_MUN', '1907'),
('LA-05190609', '05190609', 'เทศบาลตำบลหนองบัว', 'SUBDISTRICT_MUN', '1906'),
('LA-05190602', '05190602', 'เทศบาลตำบลท่าลาน', 'SUBDISTRICT_MUN', '1906'),
('LA-06190607', '06190607', 'อบต.ไผ่ขวาง', 'SAO', '1906'),
('LA-06190605', '06190605', 'อบต.โคกใหญ่หรเทพ', 'SAO', '1906'),
('LA-05190604', '05190604', 'เทศบาลตำบลตลาดน้อย', 'SUBDISTRICT_MUN', '1906'),
('LA-05190608', '05190608', 'เทศบาลตำบลสร่างโศก', 'SUBDISTRICT_MUN', '1906'),
('LA-05190601', '05190601', 'เทศบาลตำบลบางโขมด', 'SUBDISTRICT_MUN', '1906'),
('LA-06190606', '06190606', 'อบต.เมืองขีดขิน', 'SAO', '1906'),
('LA-05190603', '05190603', 'เทศบาลตำบลบ้านหมอ', 'SUBDISTRICT_MUN', '1906'),
('LA-06190504', '06190504', 'อบต.ม่วงหวาน', 'SAO', '1905'),
('LA-06190503', '06190503', 'อบต.โคกสะอาด', 'SAO', '1905'),
('LA-06190502', '06190502', 'อบต.ไก่เส่า', 'SAO', '1905'),
('LA-06190506', '06190506', 'อบต.หนองหัวโพ', 'SAO', '1905'),
('LA-06190505', '06190505', 'อบต.หนองกบ', 'SAO', '1905'),
('LA-05190501', '05190501', 'เทศบาลตำบลหนองแซง', 'SUBDISTRICT_MUN', '1905'),
('LA-06190404', '06190404', 'อบต.เจริญธรรม', 'SAO', '1904'),
('LA-06190407', '06190407', 'อบต.หนองสรวง', 'SAO', '1904'),
('LA-06190406', '06190406', 'อบต.วิหารแดง', 'SAO', '1904'),
('LA-05190401', '05190401', 'เทศบาลตำบลวิหารแดง', 'SUBDISTRICT_MUN', '1904'),
('LA-06190403', '06190403', 'อบต.คลองเรือ', 'SAO', '1904'),
('LA-05190405', '05190405', 'เทศบาลตำบลบ้านลำ', 'SUBDISTRICT_MUN', '1904'),
('LA-06190408', '06190408', 'อบต.หนองหมู', 'SAO', '1904'),
('LA-05190402', '05190402', 'เทศบาลตำบลหนองหมู', 'SUBDISTRICT_MUN', '1904'),
('LA-06190317', '06190317', 'อบต.หนองโรง', 'SAO', '1903'),
('LA-06190316', '06190316', 'อบต.หนองปลิง', 'SAO', '1903'),
('LA-06190315', '06190315', 'อบต.หนองปลาหมอ', 'SAO', '1903'),
('LA-06190314', '06190314', 'อบต.หนองนาก', 'SAO', '1903'),
('LA-06190312', '06190312', 'อบต.หนองจรเข้', 'SAO', '1903'),
('LA-06190313', '06190313', 'อบต.หนองจิก', 'SAO', '1903'),
('LA-06190310', '06190310', 'อบต.หนองแขม', 'SAO', '1903'),
('LA-06190311', '06190311', 'อบต.หนองไข่น้ำ', 'SAO', '1903'),
('LA-06190319', '06190319', 'อบต.ห้วยทราย', 'SAO', '1903'),
('LA-05190302', '05190302', 'เทศบาลตำบลหินกอง', 'SUBDISTRICT_MUN', '1903'),
('LA-06190318', '06190318', 'อบต.ห้วยขมิ้น', 'SAO', '1903'),
('LA-05190304', '05190304', 'เทศบาลตำบลไผ่ต่ำ', 'SUBDISTRICT_MUN', '1903'),
('LA-06190309', '06190309', 'อบต.บัวลอย', 'SAO', '1903'),
('LA-06190308', '06190308', 'อบต.โคกแย้', 'SAO', '1903'),
('LA-06190307', '06190307', 'อบต.โคกตูม-โพนทอง', 'SAO', '1903'),
('LA-06190306', '06190306', 'อบต.คชสิทธิ์', 'SAO', '1903'),
('LA-05190301', '05190301', 'เทศบาลตำบลคชสิทธิ์', 'SUBDISTRICT_MUN', '1903'),
('LA-06190305', '06190305', 'อบต.กุ่มหัก', 'SAO', '1903'),
('LA-05190303', '05190303', 'เทศบาลตำบลหนองแค', 'SUBDISTRICT_MUN', '1903'),
('LA-06190209', '06190209', 'อบต.ท่ามะปราง', 'SAO', '1902'),
('LA-06190205', '06190205', 'อบต.ชำผักแพว', 'SAO', '1902'),
('LA-06190207', '06190207', 'อบต.เตาปูน', 'SAO', '1902'),
('LA-06190211', '06190211', 'อบต.สองคอน', 'SAO', '1902'),
('LA-06190204', '06190204', 'อบต.ชะอม', 'SAO', '1902'),
('LA-06190208', '06190208', 'อบต.ท่าตูม', 'SAO', '1902'),
('LA-06190210', '06190210', 'อบต.บ้านป่า', 'SAO', '1902'),
('LA-06190213', '06190213', 'อบต.หินซ้อน', 'SAO', '1902'),
('LA-06190203', '06190203', 'อบต.ท่าคล้อ', 'SAO', '1902'),
('LA-06190212', '06190212', 'อบต.ห้วยแห้ง', 'SAO', '1902'),
('LA-06190206', '06190206', 'อบต.ตาลเดี่ยว', 'SAO', '1902'),
('LA-05190105', '05190105', 'เทศบาลตำบลตะกุด', 'SUBDISTRICT_MUN', '1901'),
('LA-06190108', '06190108', 'อบต.ตลิ่งชัน', 'SAO', '1901'),
('LA-05190104', '05190104', 'เทศบาลตำบลกุดนกเปล้า', 'SUBDISTRICT_MUN', '1901'),
('LA-06190111', '06190111', 'อบต.หนองปลาไหล', 'SAO', '1901'),
('LA-06190109', '06190109', 'อบต.ปากข้าวสาร', 'SAO', '1901'),
('LA-06190112', '06190112', 'อบต.หนองยาว', 'SAO', '1901'),
('LA-06190110', '06190110', 'อบต.หนองโน', 'SAO', '1901'),
('LA-05190103', '05190103', 'เทศบาลตำบลป๊อกแป๊ก', 'SUBDISTRICT_MUN', '1901'),
('LA-06190106', '06190106', 'อบต.โคกสว่าง', 'SAO', '1901'),
('LA-06190107', '06190107', 'อบต.ดาวเรือง', 'SAO', '1901');

-- แบรนด์อุปกรณ์เป้าหมายหลัก
INSERT INTO device_brands (name) VALUES ('Hikvision'), ('Dahua'), ('Axis'), ('Bosch'), ('Milestone');

-- ประเภท
INSERT INTO device_categories (id, name_th) VALUES
('FIXED', 'กล้องชนิดมุมคงที่ (Fixed Camera)'),
('DOME', 'กล้องทรงโดม (Dome Camera)'),
('BULLET', 'กล้องทรงกระบอก (Bullet Camera)'),
('PTZ', 'กล้องส่าย-ก้ม-เงย-ซูม (PTZ Camera)'),
('ANPR', 'กล้องอ่านป้ายทะเบียนรถ (ANPR)'),
('THERMAL', 'กล้องตรวจวัดความร้อน (Thermal)'),
('FISHEYE', 'กล้องมองภาพ 360 องศา (Fisheye)'),
('BODY_WORN', 'กล้องติดตัวเจ้าหน้าที่ (Body-worn)'),
('MOBILE', 'กล้องติดรถยนต์/เคลื่อนที่ (Mobile/Vehicle)');

-- จุดติดตั้ง
INSERT INTO installation_sites (id, name_th) VALUES
('COMMUNITY_PUBLIC', 'เขตชุมชน/พื้นที่สาธารณะ'),
('TRANSPORT_STATION', 'สถานีขนส่ง'),
('GOVERNMENT_AGENCY', 'หน่วยงานราชการ'),
('ROAD_INTERSECTION', 'ถนน/สี่แยกจราจร'),
('NATURE_OBSERVATION', 'Nature observation (ประตูน้ำ)'),
('INDUSTRIAL_ESTATE', 'นิคมอุตสาหกรรม');

-- ประเภทจุดติดตั้ง
INSERT INTO install_point_types (id, name_th) VALUES
('AREA_OVERVIEW', 'ภาพรวมพื้นที่'),
('ENTRANCE_EXIT', 'ทางเข้า-ออก'),
('PARKING', 'ที่จอดรถ'),
('LOADING_UNLOADING', 'จุดรับ-ส่งสินค้า'),
('SURVEILLANCE_ZONE', 'พื้นที่เฝ้าระวัง');

-- รายละเอียดประเภทกล้อง
INSERT INTO camera_function_types (id, name_th) VALUES
('GENERAL', 'กล้องวงจรปิดทั่วไป'),
('PUBLIC_AREA_VIEW', 'กล้องวงจรปิดมุมมองกล้องเป็นพื้นที่สาธารณะ'),
('VIDEO_ANALYTICS', 'กล้องวงจรปิด วิเคราะห์ภาพ');

-- ผู้ใช้เริ่มต้นสำหรับการจำลองระบบ (รหัสผ่านคือ password_123 เข้ารหัสผ่านแอปอีกครั้ง)
INSERT INTO users (username, password_hash, full_name, role, district_id, local_gov_id, email, phone) VALUES
('srb_super_admin', '$2b$12$Kj6gB9.53x8mG/O1Z6n3zOu9iW5hDbeMew6Uu1mG8o4xV2f1WqyfC', 'ผู้ดูแลระบบ จังหวัดสระบุรี', 'SUPER_ADMIN', NULL, NULL, 'cctv_admin@saraburi.go.th', '036-211111'),
('gov_viewer', '$2b$12$Kj6gB9.53x8mG/O1Z6n3zOu9iW5hDbeMew6Uu1mG8o4xV2f1WqyfC', 'ผู้บริหารจังหวัดสระบุรี', 'GOVERNOR_VIEWER', NULL, NULL, 'governor@saraburi.go.th', '036-211112');
