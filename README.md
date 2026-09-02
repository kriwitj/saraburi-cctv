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

## 🚀 วิธี Deploy ขึ้น Production

### 1. เตรียมเซิร์ฟเวอร์
* ติดตั้ง [Docker Engine](https://docs.docker.com/engine/install/) และ Docker Compose plugin บนเซิร์ฟเวอร์ (แนะนำ Ubuntu 22.04+)
* เปิดพอร์ตที่จำเป็นบน Firewall: `80`/`443` (reverse proxy), `8554` (RTSP), `8555/tcp+udp` (WebRTC) — **ไม่ต้อง**เปิด `5432`, `8000`, `1984`, `3000` ออกสู่อินเทอร์เน็ตโดยตรง ให้เข้าผ่าน reverse proxy เท่านั้น

### 2. Clone โปรเจกต์และตั้งค่า Environment
```bash
git clone <URL ของ repository นี้>
cd saraburi-cctv-system

# คัดลอกไฟล์ .env ตัวอย่างทั้งหมดในระบบ แล้วแก้ไขค่าจริงก่อน deploy
cp .env.example .env
cp frontend/.env.example frontend/.env
```
จากนั้นเปิดไฟล์ `.env` (root) แล้วแก้ไขค่าต่อไปนี้ให้เป็นค่าจริงของหน่วยงาน **ห้ามใช้ค่า default ที่มากับตัวอย่างเด็ดขาด**:
* `POSTGRES_PASSWORD` — ตั้งรหัสผ่านฐานข้อมูลใหม่ที่คาดเดายาก
* `JWT_SECRET` — สร้างค่าใหม่ด้วยคำสั่ง `openssl rand -hex 32`
* `CORS_ORIGINS` — ระบุโดเมนจริงของหน้าบ้านที่จะอนุญาตให้เรียก API (คั่นด้วย `,` ถ้ามีหลายโดเมน)
* `VITE_API_URL`, `VITE_MEDIA_URL` — ระบุ URL จริงที่ผู้ใช้ปลายทางเข้าถึงได้ (ผ่านโดเมน/HTTPS ไม่ใช่ `localhost`)
* `ENVIRONMENT=production`
* `APP_DOMAIN`, `API_DOMAIN`, `STREAM_DOMAIN` — โดเมน/ซับโดเมนจริงที่ตั้ง DNS ชี้มาเซิร์ฟเวอร์นี้แล้ว (ใช้เมื่อ deploy ผ่าน Traefik ตามข้อ 4)
* `BIND_ADDRESS` — ตั้งเป็น `127.0.0.1` เมื่อ deploy ผ่าน Traefik (ค่า default `0.0.0.0` มีไว้สำหรับกรณีไม่ใช้ reverse proxy)

> ⚠️ ไฟล์ `frontend/.env` ใช้สำหรับกรณีรัน `npm run dev`/`build` นอก Docker เท่านั้น เมื่อรันผ่าน `docker compose` ค่า `VITE_API_URL`/`VITE_MEDIA_URL` จะถูกอ่านจาก root `.env` ไปฝังตอน build อิมเมจ frontend แทน (ดูหัวข้อถัดไป)

นอกจากนี้ให้แก้ไขไฟล์ `media-config/go2rtc.yaml`:
* เปลี่ยน `rtsp.username` / `rtsp.password` เป็นค่าใหม่ที่ไม่ใช่ค่า default
* เพิ่ม IP สาธารณะจริงของเซิร์ฟเวอร์ในส่วน `webrtc.candidates` (ปลดคอมเมนต์บรรทัด `# - 10.0.0.100` แล้วใส่ IP จริง)
* ปรับ/ลบรายการใน `streams:` ให้เหลือเฉพาะกล้องจริงที่จะเชื่อมต่อ (ลบ `srb_test_stream_1` ตัวอย่างออก)

### 3. ตั้งค่า Reverse Proxy + HTTPS ด้วย Traefik (แนะนำ)
โปรเจกต์นี้มีไฟล์ `docker-compose.prod.yml` เตรียมไว้สำหรับเชื่อมต่อกับ **Traefik ตัวหลักที่รันอยู่แล้วบนเซิร์ฟเวอร์** (ใช้ pattern เดียวกับแอปอื่น ๆ ที่ใช้ network `proxy_net` ร่วมกัน) โดยไม่ต้องรัน Traefik ซ้ำอีกชุด

ข้อกำหนดก่อนใช้:
* มี Traefik หลักรันอยู่แล้ว พร้อม external network ชื่อ `proxy_net` และ certresolver ชื่อ `letsencrypt` (ถ้ายังไม่มี network นี้ ให้สร้างก่อนด้วย `docker network create proxy_net`)
* ตั้งค่า DNS ของ `APP_DOMAIN`, `API_DOMAIN`, `STREAM_DOMAIN` ใน `.env` ให้ชี้มาที่ IP เซิร์ฟเวอร์นี้แล้ว
* ตั้ง `BIND_ADDRESS=127.0.0.1` ใน `.env` เพื่อไม่ให้พอร์ตของแต่ละ container หลุดออกอินเทอร์เน็ตตรง ๆ (Traefik เข้าถึง container ผ่าน `proxy_net` โดยไม่ต้องพึ่งพอร์ตที่ publish บนโฮสต์)
* `VITE_API_URL=https://${API_DOMAIN}/api/v1` และ `VITE_MEDIA_URL=https://${STREAM_DOMAIN}` ต้องตรงกับโดเมนที่ตั้งไว้จริง

Build และรันด้วยไฟล์ compose ทั้งสองรวมกัน:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d
```
> เหตุผลที่ต้องระบุ `--no-cache` ตอน build ครั้งแรกหลังแก้ `.env`: ค่า `VITE_API_URL`/`VITE_MEDIA_URL` ถูกส่งเป็น Docker build args และฝังลงใน JS bundle ตอน build เท่านั้น ถ้าแก้ `.env` แล้วต้อง build ใหม่ทุกครั้งเพื่อให้ค่าอัปเดต (แก้ค่าตอน runtime ภายหลังจะไม่มีผล)

`docker-compose.prod.yml` จะเพิ่ม Traefik labels ให้ 3 service:
* `frontend` → `https://${APP_DOMAIN}` (และ redirect จาก `www.` เข้าโดเมนหลัก)
* `backend` (API) → `https://${API_DOMAIN}`
* `media` (go2rtc Web API เท่านั้น) → `https://${STREAM_DOMAIN}`

⚠️ RTSP (`8554`) และ WebRTC (`8555/tcp+udp`) เป็นโปรโตคอลที่ไม่ใช่ HTTP Traefik proxy ให้ไม่ได้ จึงยังคงต้องเปิดพอร์ตเหล่านี้ตรงบน Firewall ของเซิร์ฟเวอร์เสมอ (จำกัดเฉพาะ IP ที่จำเป็นถ้าทำได้)

> **ไม่ต้องการใช้ Traefik?** รันเฉพาะ `docker-compose.yml` ไฟล์เดียวตามข้อ 2 ได้เลย แล้ววาง Nginx/Caddy หรือ reverse proxy อื่นไว้หน้าระบบแทน พร้อมตั้ง `BIND_ADDRESS=127.0.0.1` เช่นกัน

ตรวจสอบว่าทุก container สถานะ `Up` แล้ว:
```bash
docker compose ps
docker compose logs -f backend
```

### 4. หลัง Deploy ครั้งแรก
* เปลี่ยนรหัสผ่านบัญชีทดสอบทั้งหมด (ดูตารางด้านล่าง) หรือปิดการใช้งานบัญชีที่ไม่จำเป็นก่อนเปิดใช้งานจริง
* ตั้งค่าสำรองข้อมูลฐานข้อมูล (`pgdata` volume) เป็นประจำ เช่น `pg_dump` ผ่าน cron job บนโฮสต์
* ตรวจสอบ retention period การเก็บวิดีโอ (Tab E) ให้สอดคล้องกับ พ.ร.บ. PDPA

### คำสั่งที่ใช้บ่อย
```bash
# อัปเดตโค้ดและ rebuild เฉพาะ service ที่แก้ไข
git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d --build backend

# ดู log แบบ real-time
docker compose logs -f

# หยุดระบบทั้งหมด (ข้อมูลใน volume ยังอยู่)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# สำรองฐานข้อมูล
docker compose exec db pg_dump -U srb_admin srb_cctv_registry > backup_$(date +%F).sql
```

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
