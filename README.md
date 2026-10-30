# 🏛️ ระบบทะเบียนกลางและศูนย์บูรณาการข้อมูลกล้อง CCTV จังหวัดสระบุรี
> **Saraburi Province Central CCTV Registry & Integration Command Center**

ระบบทะเบียนกลางระดับจังหวัดสำหรับการลงทะเบียนกล้อง CCTV ของทุกหน่วยงานรัฐ ท้องถิ่น (อปท.) และเอกชนที่ยินยอมเชื่อมโยง เพื่อลดความซ้ำซ้อนในการจัดซื้อจัดจ้าง ป้องกันจุดบอดพื้นที่ และบริหารจัดการระบบประกันภัย/สัญญา MA แบบเบ็ดเสร็จผ่านภูมิสารสนเทศ (GIS Map) สอดคล้องตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)

---

## 🛠️ สแต็คเทคโนโลยีระบบ (Technology Stack)
* **หน้าบ้าน (Frontend)**: React 19 (TypeScript) + Vite + TailwindCSS v4 + Framer Motion (รองรับทั้ง Dark Mode และ Light Mode ระดับ Enterprise)
* **แผนที่หลัก (GIS)**: Leaflet Map Integration (การเรนเดอร์หมุดสถานะกล้อง และรัศมีทิศทางกล้อง View Cones)
* **หลังบ้าน (Backend)**: FastAPI (Python 3.10) + SQLAlchemy + Pydantic v2 + Bcrypt
* **ฐานข้อมูล (Database)**: PostgreSQL + PostGIS (สำหรับการจัดการและประมวลผลข้อมูลพิกัดภูมิศาสตร์ระยะไกล)
* **การติดตั้ง (Deployment)**: Docker Compose + Traefik Reverse Proxy (เชื่อมต่อ Cloudflare SSL)

---

## 💻 1. การติดตั้งและรันบนเครื่อง Local (Development)

### ความต้องการของระบบ (Prerequisites)
* ติดตั้ง [Docker Desktop](https://www.docker.com/products/docker-desktop/) และ Docker Compose บนเครื่องคอมพิวเตอร์ของคุณ

### การสั่งรันเซิร์ฟเวอร์ Local
สั่งรันระบบแบบ Multi-Containers จากโฟลเดอร์ Root ของโปรเจกต์:
```bash
docker compose up --build -d
```

เมื่อสถานะ Containers ขึ้นว่า Running ทั้งหมดแล้ว ท่านสามารถเข้าใช้งานระบบได้ที่พอร์ตต่อไปนี้:
* **ระบบหน้าบ้าน (Frontend SPA)**: [http://localhost:3000](http://localhost:3000)
* **หน้าเอกสาร API หลังบ้าน (FastAPI Swagger Docs)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **มีเดียสตรีมมิ่ง (go2rtc Web UI)**: [http://localhost:1984](http://localhost:1984)

---

## 🌐 2. ขั้นตอนการติดตั้งและ Deploy บนเซิร์ฟเวอร์จริง (Production Deployment)

การ Deploy บน Production Server จะเชื่อมต่อผ่าน **Traefik Reverse Proxy** บน Docker network ภายนอกชื่อ `proxy_net` และรองรับการจัดการ SSL Certificate ผ่าน Cloudflare / Let's Encrypt

### ข้อกำหนดก่อนเริ่ม (Production Prerequisites)
1. ติดตั้ง **Docker Engine** และ **Docker Compose v2** บนเซิร์ฟเวอร์ Linux
2. ชี้ DNS A-Record ของโดเมนมายัง IP ของเซิร์ฟเวอร์:
   * `cctv.saraburidev.org` ➡️ IP ของเซิร์ฟเวอร์ (Frontend)
   * `api-cctv.saraburidev.org` ➡️ IP ของเซิร์ฟเวอร์ (Backend API)
   * `stream-cctv.saraburidev.org` ➡️ IP ของเซิร์ฟเวอร์ (Media Server)
3. มี Traefik รันอยู่บนเซิร์ฟเวอร์ และมี Docker Network ชื่อ `proxy_net`

---

### ขั้นตอนการ Deploy ทีละสเต็ป (Step-by-Step Production Guide)

#### สเต็ปที่ 1: เตรียม Docker Network สำหรับ Traefik
ตรวจสอบว่ามีเครือข่าย `proxy_net` อยู่แล้วหรือไม่ หากยังไม่มีให้สร้าง:
```bash
docker network inspect proxy_net >/dev/null 2>&1 || docker network create proxy_net
```

#### สเต็ปที่ 2: ตั้งค่า Environment Variables (`.env`)
คัดลอกไฟล์ `.env.example` เป็น `.env` และกำหนดค่าสำหรับ Production:
```bash
cp .env.example .env
```
ตรวจสอบและแก้ไขค่าสำคัญในไฟล์ `.env`:
```ini
# --- การรักษาความปลอดภัย ---
POSTGRES_USER=srb_admin
POSTGRES_PASSWORD=ตั้งรหัสผ่านฐานข้อมูลที่รัดกุม
POSTGRES_DB=srb_cctv_registry

JWT_SECRET=ตั้งคีย์สุ่มความปลอดภัยสูง_openssl_rand_hex_32
SESSION_SECRET=ตั้งคีย์สุ่มเซสชัน_openssl_rand_hex_32
ENVIRONMENT=production

# --- โดเมนและ URL สื่อสาร ---
APP_DOMAIN=cctv.saraburidev.org
API_DOMAIN=api-cctv.saraburidev.org
STREAM_DOMAIN=stream-cctv.saraburidev.org

CORS_ORIGINS=https://cctv.saraburidev.org,https://api-cctv.saraburidev.org
FRONTEND_BASE_URL=https://cctv.saraburidev.org
BACKEND_BASE_URL=https://api-cctv.saraburidev.org

# ต้องระบุ URL ภายนอกจริงตอน build frontend bundle
VITE_API_URL=https://api-cctv.saraburidev.org/api/v1
VITE_MEDIA_URL=https://stream-cctv.saraburidev.org

# ผูกพอร์ตเฉพาะ localhost เพราะ Traefik จะคุยผ่าน proxy_net ภายใน
BIND_ADDRESS=127.0.0.1
```

#### สเต็ปที่ 3: สั่งรัน Production Containers
> [!IMPORTANT]
> **สำคัญมาก**: บน Production จะต้องแนบไฟล์ `-f docker-compose.prod.yml` เสมอ เพื่อให้ Traefik Router Labels และ Network `proxy_net` ถูกนำไปผูกกับคอนเทนเนอร์ (หากไม่ระบุจะเกิดปัญหา `404 page not found` จาก Traefik)

รันคำสั่ง:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d --build
```

#### สเต็ปที่ 4: ตรวจสอบสถานะการทำงาน (Verification)
ตรวจสอบสถานะคอนเทนเนอร์:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```
ตรวจสอบ logs ของระบบ:
```bash
# ตรวจสอบ logs หน้าบ้าน
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend

# ตรวจสอบ logs หลังบ้าน
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

---

### 🔄 ขั้นตอนการอัปเดตระบบเมื่อมีโค้ดใหม่ (Update & Redeploy)
เมื่อมีการ push โค้ดหรือแก้บั๊ก ให้รันคำสั่งต่อไปนี้บนเซิร์ฟเวอร์:
```bash
# 1. ดึงโค้ดล่าสุดจาก Git
git pull origin main

# 2. Build และรันคอนเทนเนอร์ใหม่โดยไม่ต้องหยุดระบบนาน
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d --build
```

---

### ⚠️ การแก้ไขปัญหาที่พบบ่อยบน Production (Troubleshooting)

| ปัญหา | สาเหตุ | วิธีแก้ไข |
| :--- | :--- | :--- |
| **ขึ้น `404 page not found`** | รัน `docker compose up` โดยลืมระบุ `-f docker-compose.prod.yml` ทำให้ Traefik ไม่พบ Labels โดเมน | สั่งรันใหม่โดยระบุไฟล์ override: <br>`docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d` |
| **Network `proxy_net` not found** | ยังไม่ได้สร้าง Docker Network ภายนอก | รันคำสั่ง `docker network create proxy_net` แล้วสั่ง `up -d` ใหม่อีกครั้ง |
| **CORS Policy Blocked** | ค่า `CORS_ORIGINS` ใน `.env` ไม่ตรงกับโดเมนที่เรียก | ตรวจสอบไฟล์ `.env` ว่ามี `CORS_ORIGINS=https://cctv.saraburidev.org` และ Restart backend |
| **Frontend เรียก API ไปที่ localhost** | ไม่ได้ส่ง `VITE_API_URL` ตอน build image | ตรวจสอบว่าใน `.env` มี `VITE_API_URL=https://api-cctv.saraburidev.org/api/v1` แล้วสั่ง `--build` ใหม่อีกครั้ง |

---

## 🔑 บัญชีเข้าทดสอบระบบแยกตามขอบเขตสิทธิ์ (Scoped Test Accounts)

| บัญชีเข้าใช้ | รหัสผ่าน | บทบาท (Role) | ขอบเขตข้อมูล (Data Scoping) | สิทธิ์หลักในระบบ |
| :--- | :--- | :--- | :--- | :--- |
| **`srb_super_admin`** | `password_123` | Super Admin | **ทั้งจังหวัด** | ตั้งค่าทุกอย่าง, จัดการ Master Data, สลับ checklist ใน RBAC matrix table |
| **`gov_viewer`** | `password_123` | Governor Viewer | **ทั้งจังหวัด** | ดู Dashboard + GIS + รายงาน ได้อย่างเดียว (**Read-only** - ซ่อนปุ่มแก้ไข/ลบ) |
| **`district_1901`** | `password_123` | District Admin | **เฉพาะอำเภอตน** | ดูภาพรวมและหมุดกล้องในเขตอำเภอเมืองสระบุรี, อนุมัติสิทธิ์ และดูภาพสดกล้อง |
| **`localgov_la190101`** | `password_123` | Local Gov Staff | **เฉพาะ อปท. ตน** | บันทึก/แก้ไขข้อมูลกล้องสังกัดเทศบาลเมืองสระบุรี (LA-190101), สั่งออกใบแจ้งซ่อมกล้อง |
| **`ma_tech`** | `password_123` | MA Technician | **ตามที่ได้รับมอบหมาย** | เข้าถึง MA Panel เพื่อดูตั๋วชำรุด กดรับงานซ่อม (Accept) และสั่งปิดงานแนบรูปภาพถ่ายหน้างาน |
| **`police_srb`** | `password_123` | Police Viewer | **ตามพิกัดคดีที่อนุมัติ** | ยื่นคำร้องขอดึงภาพวิดีโอย้อนหลังประกอบคดีความมั่นคง (หมดอายุตามกำหนดสิทธิ์ PDPA) |

*(หมายเหตุ: ในหน้าจอ Login มีปุ่ม Quick Select สิทธิ์ทั้ง 6 ให้คลิกเลือกและเข้าสู่ระบบได้ทันที 1-Click หรือพิมพ์ username/password ตามตาราง)*

---

## 📂 โครงสร้างการจัดแบ่งโฟลเดอร์โครงการ (Clean Architecture)
```text
saraburi-cctv-system/
├── backend/                  # ส่วนงานบริการ API หลังบ้าน (FastAPI)
│   ├── main.py               # API Endpoints (Auth, Cameras, Import/Export/Template, Projects, Tickets)
│   ├── database.py           # ตัวตั้งค่า SQLAlchemy เชื่อม PostgreSQL/PostGIS
│   ├── models.py             # โครงสร้างคลาสฐานข้อมูล (Database Models)
│   ├── schemas.py            # ชุดการกรอง Schema รับส่ง JSON (Pydantic models)
│   └── crud.py               # ฟังก์ชันการเขียนดึง/แก้ไขข้อมูลลงตาราง
├── frontend/                 # ระบบจัดการหน้าต่างการทำงานหน้าบ้าน (Vite + React 19)
│   ├── public/               # Static assets (logo.png, favicon.ico)
│   ├── Dockerfile            # ตั้งค่า Docker อิมเมจ Node.js 20-alpine
│   ├── package.json          # กำหนด Libraries พึ่งพา (React-Router, Recharts, Leaflet, Lucide)
│   └── src/
│       ├── App.tsx           # ระบบควบคุมเราติ้ง (Router), Theme Synchronization และ Layout แกนกลาง
│       ├── index.css         # คลังอ้างอิงสี Tailwind v4 และระบบ Modern Enterprise Light & Dark Mode
│       ├── components/
│       │   ├── SearchableSelect.tsx   # คอมโพเนนต์ Dropdown ค้นหา รองรับทั้งสองธีม
│       │   └── PDPAStreamPlayer.tsx   # เครื่องเล่นวิดีโอ CCTV แผนกสืบสวนระเบียบ PDPA
│       └── pages/
│           ├── Login.tsx     # หน้าเข้าสู่ระบบ (รองรับ Username/Password + Quick Switch + Keycloak)
│           ├── Dashboard.tsx # สรุป Uptime และกราฟปริมาณติดตั้งสะสมรายอำเภอ
│           ├── GisMap.tsx    # แผนที่ภูมิศาสตร์ GIS แสดงรัศมีทิศทางกล้อง (View Cones)
│           ├── Cameras.tsx   # ทะเบียนกล้อง (Auto-ID, ปุ่ม Download Template, นำเข้า Upsert)
│           ├── Maintenance.tsx # ใบสั่งแจ้งซ่อมบำรุงและอินเตอร์เฟสช่างซ่อม MA Panel
│           ├── Users.tsx     # การจัดการผู้ใช้ออนไลน์ และเมทริกซ์สลับสิทธิ์สเปก RBAC
│           ├── Reports.tsx   # ระบบวิเคราะห์งบจัดสรรโครงการจัดซื้อสะสม อปท.
│           ├── Logs.tsx      # บันทึกประวัติความมั่นคง (Security Audit trail logs)
│           ├── Settings.tsx  # หน้าระบบสำรองและกู้คืนโครงสร้าง DB (Backup/Restore)
│           └── MasterData.tsx # หน้าคลังจัดการข้อมูลหลักของระบบ 8 มิติ (Tab A ถึง H)
├── docker-compose.yml        # ตัวสั่งควบคุม Multi-Containers รันสแต็คระบบ (Development)
├── docker-compose.prod.yml   # คอนฟิกเสริมเชื่อมต่อ Traefik Reverse Proxy บน Production
├── sri_cctv_template.csv     # ไฟล์ต้นแบบ Template นำเข้าข้อมูลกล้อง
└── .gitignore                # กำหนดละเว้นไฟล์แคชประกอบการ Commit ขึ้น Git repo
```

---

## 📋 กฎการลงทะเบียนและนำเข้ากล้อง CCTV (Camera Registry Rules)
1. **การลงทะเบียนใหม่**:
   - ไม่จำเป็นต้องกรอกรหัสกล้อง (Asset ID)
   - ระบบจะรันเลขอัตโนมัติ `SRI-{district_id}-{org_code}-{sequence}` โดยอิงจากข้อมูล **หน่วยงานเจ้าของ** (`local_gov_id`)
2. **การนำเข้าผ่าน Template (CSV / Excel)**:
   - หากมีคอลัมน์ `id` (Asset ID) แล้วตรงกับรหัสเดิมในระบบ -> ระบบจะ **อัปเดตข้อมูลเดิม (Upsert)**
   - หากไม่ตรง หรือเว้นว่างไว้ -> ระบบจะ **รันรหัสใหม่ให้อัตโนมัติ**
   - คอลัมน์ **หน่วยงานเจ้าของ** (`local_gov_id` / `หน่วยงานเจ้าของ` / `อปท`) รองรับทั้งรหัส อปท. (เช่น `LA-190101`), รหัส DLA (`5190101`), และชื่อภาษาไทย (เช่น `เทศบาลเมืองสระบุรี`) โดยจะอัปเดตและบันทึกลงฐานข้อมูลถูกต้องทันที
3. **ฟิลด์ธรรมดา (ไม่ต้อง Require)**:
   - จุดติดตั้ง (`installation_site_id`), ประเภทจุดติดตั้ง (`install_point_type_id`), จุดมุ่งหมายหลัก (`purpose_type`) เป็นฟิลด์ธรรมดา ไม่บังคับกรอก
