# 🏛️ ระบบทะเบียนกลางและศูนย์บูรณาการข้อมูลกล้อง CCTV จังหวัดสระบุรี
> **Saraburi Province Central CCTV Registry & Integration Command Center**

ระบบทะเบียนกลางระดับจังหวัดสำหรับการลงทะเบียนกล้อง CCTV ของทุกหน่วยงานรัฐ ท้องถิ่น (อปท.) และเอกชนที่ยินยอมเชื่อมโยง เพื่อลดความซ้ำซ้อนในการจัดซื้อจัดจ้าง ป้องกันจุดบอดพื้นที่ และบริหารจัดการระบบประกันภัย/สัญญา MA แบบเบ็ดเสร็จผ่านภูมิสารสนเทศ (GIS Map) สอดคล้องตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)

---

## 🛠️ สแต็คเทคโนโลยีระบบ (Technology Stack)
* **หน้าบ้าน (Frontend)**: React 19 (TypeScript) + Vite + TailwindCSS v4 + Framer Motion (แอนิเมชันระดับพรีเมียม)
* **แผนที่หลัก (GIS)**: Leaflet Map Integration (การเรนเดอร์หมุดสถานะกล้อง และรัศมีทิศทางกล้อง View Cones)
* **หลังบ้าน (Backend)**: FastAPI (Python 3.10) + SQLAlchemy + Pydantic v2
* **ฐานข้อมูล (Database)**: PostgreSQL + PostGIS (สำหรับการจัดการและประมวลผลข้อมูลพิกัดภูมิศาสตร์ระยะไกล)
* **การติดตั้ง (Deployment)**: Docker Compose (แบ่ง 4 คอนเทนเนอร์: `db`, `media`, `backend`, `frontend`)

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ความต้องการของระบบ (Prerequisites)
* ติดตั้ง [Docker Desktop](https://www.docker.com/products/docker-desktop/) และ Docker Compose บนเครื่องคอมพิวเตอร์ของคุณ

### 2. การสั่งรันเซิร์ฟเวอร์
สั่งรันระบบแบบ Multi-Containers จากโฟลเดอร์ Root ของโปรเจกต์:
```bash
docker compose up --build -d
```

เมื่อสถานะ Containers ขึ้นว่า Running ทั้งหมดแล้ว ท่านสามารถเข้าใช้งานระบบได้ที่พอร์ตต่อไปนี้:
* **ระบบหน้าบ้าน (Frontend SPA)**: [http://localhost:3000](http://localhost:3000)
* **หน้าเอกสาร API หลังบ้าน (FastAPI Swagger Docs)**: [http://localhost:8000/docs](http://localhost:8000/docs)

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

---

## 📂 โครงสร้างการจัดแบ่งโฟลเดอร์โครงการ (Clean Architecture)
```text
saraburi-cctv-system/
├── backend/                  # ส่วนงานบริการ API หลังบ้าน (FastAPI)
│   ├── main.py               # จุดเริ่มต้น API และ Endpoint เส้นทางรับส่งข้อมูล
│   ├── database.py           # ตัวตั้งค่า SQLAlchemy เชื่อม PostgreSQL/PostGIS
│   ├── models.py             # โครงสร้างคลาสฐานข้อมูล (Database Models)
│   ├── schemas.py            # ชุดการกรอง Schema รับส่ง JSON (Pydantic models)
│   └── crud.py               # ฟังก์ชันการเขียนดึง/แก้ไขข้อมูลลงตาราง
├── frontend/                 # ระบบจัดการหน้าต่างการทำงานหน้าบ้าน (Vite + React 19)
│   ├── Dockerfile            # ตั้งค่า Docker อิมเมจ Node.js 20-alpine
│   ├── package.json          # กำหนด Libraries พึ่งพา (React-Router, Recharts, Leaflet, Lucide)
│   └── src/
│       ├── App.tsx           # ระบบควบคุมเราติ้ง (Router) และ Layout แกนกลาง
│       ├── index.css         # คลังอ้างอิงสี Tailwind v4 (Royal Blue & Cyan Blue)
│       ├── components/
│       │   └── PDPAStreamPlayer.tsx   # เครื่องเล่นวิดีโอ CCTV แผนกสืบสวนระเบียบ PDPA
│       └── pages/
│           ├── Login.tsx     # หน้าเข้าสู่ระบบแบบ Glassmorphism (นำ Captcha ออกแล้ว)
│           ├── Dashboard.tsx # สรุป Uptime และกราฟปริมาณติดตั้งสะสมรายอำเภอ
│           ├── GisMap.tsx    # แผนที่ภูมิศาสตร์ GIS แสดงรัศมีทิศทางกล้อง (View Cones)
│           ├── Cameras.tsx   # หน้าตาราง CRUD ทะเบียนสินทรัพย์หลักกล้องวงจรปิด
│           ├── Maintenance.tsx # ใบสั่งแจ้งซ่อมบำรุงและอินเตอร์เฟสช่างซ่อม MA Panel
│           ├── Users.tsx     # การจัดการผู้ใช้ออนไลน์ และเมทริกซ์สลับสิทธิ์สเปก RBAC
│           ├── Reports.tsx   # ระบบวิเคราะห์งบจัดสรรโครงการจัดซื้อสะสม อปท.
│           ├── Logs.tsx      # บันทึกประวัติความมั่นคง (Security Audit trail logs)
│           ├── Settings.tsx  # หน้าระบบสำรองและกู้คืนโครงสร้าง DB (Backup/Restore)
│           └── MasterData.tsx # หน้าคลังจัดการข้อมูลหลักของระบบ 8 มิติ (Tab A ถึง H)
├── docker-compose.yml        # ตัวสั่งควบคุม Multi-Containers รันสแต็คระบบ
└── .gitignore                # กำหนดละเว้นไฟล์แคชประกอบการ Commit ขึ้น Git repo
```

---

## 🗄️ โครงสร้างข้อมูลตั้งต้นระบบ 8 มิติ (Tabs A ถึง H Master Datasets)
หน้าต่างเมนู **"ข้อมูลตั้งต้นระบบ (8 ชุด)"** รวบรวมชุดข้อมูลบูรณาการที่สำคัญที่สุดสำหรับการจัดเก็บข้อมูลกล้องของจังหวัดไว้ที่จุดเดียว:
* **Tab A: Master data พื้นที่และหน่วยงาน**: จังหวัด ➡️ อำเภอ ➡️ ตำบล และรหัสสัญญะ อปท. (อบจ., เทศบาล, อบต.) เบอร์ติดต่อผู้ประสานงานหลัก
* **Tab B: แคตตาล็อกอุปกรณ์ (Device Catalog)**: ฐานข้อมูลยี่ห้อ รุ่น ประเภท (Fixed, Bullet, PTZ, Speed Dome, ANPR อ่านทะเบียน, Thermal) และสถานะ EOL/EOS
* **Tab C: ทะเบียนกล้องหลัก (Camera Asset)**: รหัสกล้องกลางของจังหวัด (`SRI-อำเภอ-หน่วยงาน-ลำดับ`), ซีเรียล, MAC Address, ทิศหันกล้อง (Azimuth 0–360°), รัศมี View Cone, และประเภทจุดเสี่ยง (ทางแยก, จุดทิ้งขยะ, จุดเสี่ยงอาชญากรรม)
* **Tab D: โครงการจัดซื้อจัดหา / งบประมาณ**: ปีงบประมาณ, วงเงินสัญญา, ผู้รับจ้าง, ระยะประกัน, และราคาเฉลี่ยต่อจุดเพื่อเทียบความสมเหตุสมผลข้าม อปท.
* **Tab E: ระบบบันทึกภาพและโครงสร้างพื้นฐาน**: ตารางความจุ NVR Storage, ระยะเวลาเก็บบันทึกย้อนหลัง (Retention days), ลิงก์เน็ตเวิร์ก (FTTx/Leased Line) และระบบไฟสำรอง (UPS/Solar Cell)
* **Tab F: การมอนิเตอร์และสุขภาพระบบ (Health & Monitoring)**: ผลการสแกนสถานะปิง (Ping, RTSP Keep-alive), และอัตราร้อยละ Uptime รายเดือนของแต่ละเทศบาล
* **Tab G: งานซ่อมบำรุง (Ticket / Work Order)**: ตั๋วสั่งซ่อมบำรุง แสดงผู้รับงานซ่อม, สาเหตุขัดข้อง (ไฟดับ/เน็ตล่ม/ฟ้าผ่า), และค่าอะไหล่ปิดงานซ่อม
* **Tab H: คำร้องขอภาพย้อนหลัง (PDPA request logs)**: บันทึกข้อมูลคดี, ช่วงเวลาขอดึงภาพ, ผู้อนุมัติสิทธิ์ และวันหมดเขตการเข้าถึงไฟล์วิดีโอเพื่อคุ้มครองสิทธิ์ส่วนบุคคล
