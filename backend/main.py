# main.py
import os
import io
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func, case

import models
import schemas
import crud
from database import get_db, engine, SessionLocal

# สร้างตาราง
models.Base.metadata.create_all(bind=engine)

# Seeding ข้อมูลลงฐานข้อมูลโดยตรงผ่านแอปพลิเคชัน (แก้ปัญหา Docker Volume ข้ามการรัน 01-init-db.sql)
db = SessionLocal()
try:
    # 1. ตรวจสอบและสร้างผู้ใช้แอดมินเริ่มต้น (อัปเดตรหัสผ่านใหม่เสมอเพื่อป้องกันค่าแฮชเดิมใน Volume ผิดพลาด)
    hashed_pwd = crud.get_password_hash("password_123")
    
    admin_user = db.query(models.User).filter(models.User.username == "srb_super_admin").first()
    if not admin_user:
        db.add(models.User(
            username="srb_super_admin",
            password_hash=hashed_pwd,
            full_name="ผู้ดูแลระบบ จังหวัดสระบุรี",
            role="SUPER_ADMIN",
            email="cctv_admin@saraburi.go.th"
        ))
    else:
        admin_user.password_hash = hashed_pwd

    gov_user = db.query(models.User).filter(models.User.username == "gov_viewer").first()
    if not gov_user:
        db.add(models.User(
            username="gov_viewer",
            password_hash=hashed_pwd,
            full_name="ผู้ว่าราชการจังหวัดสระบุรี",
            role="GOVERNOR_VIEWER",
            email="governor@saraburi.go.th"
        ))
    else:
        gov_user.password_hash = hashed_pwd
        
    db.commit()

    # 2. ตรวจสอบและสร้างประเภท อปท.
    if db.query(models.LocalGovType).count() == 0:
        db.add_all([
            models.LocalGovType(id="PAO", name_th="องค์การบริหารส่วนจังหวัด"),
            models.LocalGovType(id="TOWN_MUN", name_th="เทศบาลเมือง"),
            models.LocalGovType(id="SUBDISTRICT_MUN", name_th="เทศบาลตำบล"),
            models.LocalGovType(id="SAO", name_th="องค์การบริหารส่วนตำบล")
        ])
        db.commit()

    # 3. ตรวจสอบและสร้างอำเภอ
    if db.query(models.District).count() == 0:
        db.add_all([
            models.District(id="1901", name_th="เมืองสระบุรี", name_en="Mueang Saraburi"),
            models.District(id="1902", name_th="แก่งคอย", name_en="Kaeng Khoi"),
            models.District(id="1903", name_th="หนองแค", name_en="Nong Khae"),
            models.District(id="1909", name_th="พระพุทธบาท", name_en="Phra Phutthabat"),
            models.District(id="1910", name_th="เสาไห้", name_en="Sao Hai")
        ])
        db.commit()

    # 4. ตรวจสอบและสร้าง อปท. หลัก
    if db.query(models.LocalGovernment).count() == 0:
        db.add_all([
            models.LocalGovernment(id="LA-190001", dla_code="1190101", name_th="องค์การบริหารส่วนจังหวัดสระบุรี", type_id="PAO", district_id="1901"),
            models.LocalGovernment(id="LA-190101", dla_code="5190101", name_th="เทศบาลเมืองสระบุรี", type_id="TOWN_MUN", district_id="1901"),
            models.LocalGovernment(id="LA-190901", dla_code="5190901", name_th="เทศบาลเมืองพระพุทธบาท", type_id="TOWN_MUN", district_id="1909"),
            models.LocalGovernment(id="LA-190201", dla_code="5190201", name_th="เทศบาลเมืองแก่งคอย", type_id="TOWN_MUN", district_id="1902"),
            models.LocalGovernment(id="LA-190202", dla_code="5190202", name_th="เทศบาลเมืองทับกวาง", type_id="TOWN_MUN", district_id="1902")
        ])
        db.commit()

    # 5. ตรวจสอบและสร้างแบรนด์
    if db.query(models.DeviceBrand).count() == 0:
        db.add_all([
            models.DeviceBrand(name="Hikvision"),
            models.DeviceBrand(name="Dahua"),
            models.DeviceBrand(name="Axis"),
            models.DeviceBrand(name="Bosch")
        ])
        db.commit()

    # 6. ตรวจสอบและสร้างประเภทกล้อง
    if db.query(models.DeviceCategory).count() == 0:
        db.add_all([
            models.DeviceCategory(id="FIXED", name_th="กล้องชนิดมุมคงที่ (Fixed Camera)"),
            models.DeviceCategory(id="DOME", name_th="กล้องทรงโดม (Dome Camera)"),
            models.DeviceCategory(id="BULLET", name_th="กล้องทรงกระบอก (Bullet Camera)"),
            models.DeviceCategory(id="PTZ", name_th="กล้องส่าย-ก้ม-เงย-ซูม (PTZ Camera)"),
            models.DeviceCategory(id="ANPR", name_th="กล้องอ่านป้ายทะเบียนรถ (ANPR)")
        ])
        db.commit()

    # 6b. ตรวจสอบและสร้างจุดติดตั้ง (Installation Site)
    if db.query(models.InstallationSite).count() == 0:
        db.add_all([
            models.InstallationSite(id="COMMUNITY_PUBLIC", name_th="เขตชุมชน/พื้นที่สาธารณะ"),
            models.InstallationSite(id="TRANSPORT_STATION", name_th="สถานีขนส่ง"),
            models.InstallationSite(id="GOVERNMENT_AGENCY", name_th="หน่วยงานราชการ"),
            models.InstallationSite(id="ROAD_INTERSECTION", name_th="ถนน/สี่แยกจราจร"),
            models.InstallationSite(id="NATURE_OBSERVATION", name_th="Nature observation (ประตูน้ำ)"),
            models.InstallationSite(id="INDUSTRIAL_ESTATE", name_th="นิคมอุตสาหกรรม"),
        ])
        db.commit()

    # 6c. ตรวจสอบและสร้างประเภทจุดติดตั้ง (Install Point Type)
    if db.query(models.InstallPointType).count() == 0:
        db.add_all([
            models.InstallPointType(id="AREA_OVERVIEW", name_th="ภาพรวมพื้นที่"),
            models.InstallPointType(id="ENTRANCE_EXIT", name_th="ทางเข้า-ออก"),
            models.InstallPointType(id="PARKING", name_th="ที่จอดรถ"),
            models.InstallPointType(id="LOADING_UNLOADING", name_th="จุดรับ-ส่งสินค้า"),
            models.InstallPointType(id="SURVEILLANCE_ZONE", name_th="พื้นที่เฝ้าระวัง"),
        ])
        db.commit()

    # 6d. ตรวจสอบและสร้างรายละเอียดประเภทกล้อง (Camera Function Type)
    if db.query(models.CameraFunctionType).count() == 0:
        db.add_all([
            models.CameraFunctionType(id="GENERAL", name_th="กล้องวงจรปิดทั่วไป"),
            models.CameraFunctionType(id="PUBLIC_AREA_VIEW", name_th="กล้องวงจรปิดมุมมองกล้องเป็นพื้นที่สาธารณะ"),
            models.CameraFunctionType(id="VIDEO_ANALYTICS", name_th="กล้องวงจรปิด วิเคราะห์ภาพ"),
        ])
        db.commit()

    # 7. ตรวจสอบและสร้างโครงการจัดซื้อเริ่มต้น
    if db.query(models.PurchaseProject).count() == 0:
        db.add_all([
            models.PurchaseProject(id="PRJ-2567-001", name="โครงการจัดซื้อกล้องวงจรปิดบูรณาการ อปท. เมืองสระบุรี", fiscal_year=2567, budget_source="งบ อปท.", contract_amount=12500000.0, contractor_name="บริษัท สระบุรี ไอที จำกัด", warranty_months=36),
            models.PurchaseProject(id="PRJ-2568-002", name="โครงการติดตั้งระบบอ่านป้ายทะเบียนความมั่นคงสูง แก่งคอย", fiscal_year=2568, budget_source="งบจังหวัด", contract_amount=8200000.0, contractor_name="บริษัท ไทยคอมมูนิเคชั่น แอนด์ ซิสเต็มส์ จำกัด", warranty_months=36),
            models.PurchaseProject(id="PRJ-2569-003", name="โครงการขยายและติดตั้งกล้องวงจรปิดเพื่อความปลอดภัย หนองแค", fiscal_year=2569, budget_source="งบกลางกรมพัฒนาฯ", contract_amount=5400000.0, contractor_name="บริษัท สระบุรี เน็ตเวิร์ค แอนด์ ดาต้า จำกัด", warranty_months=24)
        ])
        db.commit()

except Exception as e:
    print(f"Error during application seed: {e}")
    db.rollback()
finally:
    db.close()

app = FastAPI(
    title="Saraburi CCTV Integration & Asset Registry API",
    description="ระบบทะเบียนกลางและศูนย์บูรณาการข้อมูลกล้อง CCTV จังหวัดสระบุรี",
    version="1.0.0"
)

# ตั้งค่า CORS (กำหนดโดเมนที่อนุญาตผ่าน CORS_ORIGINS เช่น "https://cctv.saraburi.go.th,https://admin.saraburi.go.th")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "srb_jwt_secret_key_2026_super_secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# Auth Helpers
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ไม่สามารถยืนยันตัวตนของผู้ใช้งานได้",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# Helper สำหรับจำกัดสิทธิ์เฉพาะ SUPER_ADMIN เท่านั้น
def verify_super_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="สิทธิ์การเข้าถึงสำหรับผู้ดูแลระบบส่วนกลางเท่านั้น"
        )
    return current_user

# --- AUTH ENDPOINT ---
@app.post("/api/v1/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/auth/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# --- ADMIN CRUD: USERS ---
@app.get("/api/v1/admin/users", response_model=List[schemas.UserOut])
def list_admin_users(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db), 
    admin: models.User = Depends(verify_super_admin)
):
    return crud.get_users(db, skip=skip, limit=limit)

@app.post("/api/v1/admin/users", response_model=schemas.UserOut)
def create_admin_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db), 
    admin: models.User = Depends(verify_super_admin)
):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="ชื่อผู้ใช้นี้มีในระบบแล้ว")
    return crud.create_user(db, user)

@app.put("/api/v1/admin/users/{user_id}", response_model=schemas.UserOut)
def update_admin_user(
    user_id: int, user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    db_user = crud.update_user(db, user_id, user)
    if not db_user:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสผู้ใช้งานดังกล่าว")
    return db_user

@app.delete("/api/v1/admin/users/{user_id}")
def delete_admin_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin: models.User = Depends(verify_super_admin)
):
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสผู้ใช้งานดังกล่าว")
    return {"success": True, "detail": "ลบผู้ใช้สำเร็จ"}


# --- ADMIN CRUD: LOCAL GOVERNMENTS ---
@app.get("/api/v1/admin/local-governments", response_model=List[schemas.LocalGovernmentOut])
def list_admin_local_govs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    govs = crud.get_local_governments(db)
    return [schemas.LocalGovernmentOut.model_validate(g) for g in govs]

@app.post("/api/v1/admin/local-governments", response_model=schemas.LocalGovernmentOut)
def create_admin_local_gov(
    gov_data: schemas.LocalGovernmentCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    if gov_data.dla_code and db.query(models.LocalGovernment).filter(models.LocalGovernment.dla_code == gov_data.dla_code).first():
        raise HTTPException(status_code=400, detail=f"รหัสหน่วยงาน {gov_data.dla_code} มีอยู่ในระบบแล้ว")
    gov = crud.create_local_government(db, gov_data)
    return schemas.LocalGovernmentOut.model_validate(gov)

@app.put("/api/v1/admin/local-governments/{gov_id}", response_model=schemas.LocalGovernmentOut)
def update_admin_local_gov(
    gov_id: str,
    gov_data: schemas.LocalGovernmentCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    if gov_data.dla_code and db.query(models.LocalGovernment).filter(
        models.LocalGovernment.dla_code == gov_data.dla_code, models.LocalGovernment.id != gov_id
    ).first():
        raise HTTPException(status_code=400, detail=f"รหัสหน่วยงาน {gov_data.dla_code} มีอยู่ในระบบแล้ว")
    gov = crud.update_local_government(db, gov_id, gov_data)
    if not gov:
        raise HTTPException(status_code=404, detail="ไม่พบรหัส อปท. ดังกล่าว")
    return schemas.LocalGovernmentOut.model_validate(gov)

@app.delete("/api/v1/admin/local-governments/{gov_id}")
def delete_admin_local_gov(
    gov_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    success = crud.delete_local_government(db, gov_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัส อปท. ดังกล่าว")
    return {"success": True, "detail": "ลบ อปท. สำเร็จ"}


# --- ADMIN LOOKUP: DISTRICTS / SUBDISTRICTS / LOCAL GOV TYPES ---
@app.get("/api/v1/admin/districts", response_model=List[schemas.DistrictOut])
def list_admin_districts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_districts(db)

@app.post("/api/v1/admin/districts", response_model=schemas.DistrictOut)
def create_admin_district(district: schemas.DistrictBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_district(db, district)

@app.put("/api/v1/admin/districts/{district_id}", response_model=schemas.DistrictOut)
def update_admin_district(district_id: str, district: schemas.DistrictBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_d = crud.update_district(db, district_id, district)
    if not db_d:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสอำเภอดังกล่าว")
    return db_d

@app.delete("/api/v1/admin/districts/{district_id}")
def delete_admin_district(district_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_district(db, district_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสอำเภอดังกล่าว")
    return {"success": True, "detail": "ลบอำเภอสำเร็จ"}

@app.get("/api/v1/admin/subdistricts", response_model=List[schemas.SubdistrictOut])
def list_admin_subdistricts(district_id: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_subdistricts(db, district_id)

@app.post("/api/v1/admin/subdistricts", response_model=schemas.SubdistrictOut)
def create_admin_subdistrict(sub: schemas.SubdistrictBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_subdistrict(db, sub)

@app.delete("/api/v1/admin/subdistricts/{sub_id}")
def delete_admin_subdistrict(sub_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_subdistrict(db, sub_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสตำบลดังกล่าว")
    return {"success": True, "detail": "ลบตำบลสำเร็จ"}

@app.get("/api/v1/admin/local-gov-types", response_model=List[schemas.LocalGovTypeOut])
def list_admin_local_gov_types(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_local_gov_types(db)

@app.post("/api/v1/admin/local-gov-types", response_model=schemas.LocalGovTypeOut)
def create_admin_local_gov_type(lgt: schemas.LocalGovTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_local_gov_type(db, lgt)

@app.put("/api/v1/admin/local-gov-types/{lgt_id}", response_model=schemas.LocalGovTypeOut)
def update_admin_local_gov_type(lgt_id: str, lgt: schemas.LocalGovTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_lgt = crud.update_local_gov_type(db, lgt_id, lgt)
    if not db_lgt:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสประเภท อปท. ดังกล่าว")
    return db_lgt

@app.delete("/api/v1/admin/local-gov-types/{lgt_id}")
def delete_admin_local_gov_type(lgt_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_local_gov_type(db, lgt_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสประเภท อปท. ดังกล่าว")
    return {"success": True, "detail": "ลบประเภท อปท. สำเร็จ"}


# --- ADMIN CRUD: DEVICE BRANDS / CATEGORIES ---
@app.get("/api/v1/admin/device-brands", response_model=List[schemas.DeviceBrandOut])
def list_admin_brands(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_brands(db)

@app.post("/api/v1/admin/device-brands", response_model=schemas.DeviceBrandOut)
def create_admin_brand(brand: schemas.DeviceBrandCreate, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_brand(db, brand)

@app.delete("/api/v1/admin/device-brands/{brand_id}")
def delete_admin_brand(brand_id: int, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_brand(db, brand_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสยี่ห้อดังกล่าว")
    return {"success": True, "detail": "ลบยี่ห้อสำเร็จ"}

@app.get("/api/v1/admin/device-categories", response_model=List[schemas.DeviceCategoryOut])
def list_admin_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_categories(db)

@app.post("/api/v1/admin/device-categories", response_model=schemas.DeviceCategoryOut)
def create_admin_category(category: schemas.DeviceCategoryBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_category(db, category)

@app.delete("/api/v1/admin/device-categories/{category_id}")
def delete_admin_category(category_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสประเภทกล้องดังกล่าว")
    return {"success": True, "detail": "ลบประเภทกล้องสำเร็จ"}


# --- ADMIN CRUD: INSTALLATION SITE (จุดติดตั้ง) ---
@app.get("/api/v1/admin/installation-sites", response_model=List[schemas.InstallationSiteOut])
def list_admin_installation_sites(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_installation_sites(db)

@app.post("/api/v1/admin/installation-sites", response_model=schemas.InstallationSiteOut)
def create_admin_installation_site(item: schemas.InstallationSiteBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_installation_site(db, item)

@app.put("/api/v1/admin/installation-sites/{item_id}", response_model=schemas.InstallationSiteOut)
def update_admin_installation_site(item_id: str, item: schemas.InstallationSiteBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_item = crud.update_installation_site(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสจุดติดตั้งดังกล่าว")
    return db_item

@app.delete("/api/v1/admin/installation-sites/{item_id}")
def delete_admin_installation_site(item_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_installation_site(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสจุดติดตั้งดังกล่าว")
    return {"success": True, "detail": "ลบจุดติดตั้งสำเร็จ"}


# --- ADMIN CRUD: INSTALL POINT TYPE (ประเภทจุดติดตั้ง) ---
@app.get("/api/v1/admin/install-point-types", response_model=List[schemas.InstallPointTypeOut])
def list_admin_install_point_types(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_install_point_types(db)

@app.post("/api/v1/admin/install-point-types", response_model=schemas.InstallPointTypeOut)
def create_admin_install_point_type(item: schemas.InstallPointTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_install_point_type(db, item)

@app.put("/api/v1/admin/install-point-types/{item_id}", response_model=schemas.InstallPointTypeOut)
def update_admin_install_point_type(item_id: str, item: schemas.InstallPointTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_item = crud.update_install_point_type(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสประเภทจุดติดตั้งดังกล่าว")
    return db_item

@app.delete("/api/v1/admin/install-point-types/{item_id}")
def delete_admin_install_point_type(item_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_install_point_type(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสประเภทจุดติดตั้งดังกล่าว")
    return {"success": True, "detail": "ลบประเภทจุดติดตั้งสำเร็จ"}


# --- ADMIN CRUD: CAMERA FUNCTION TYPE (รายละเอียดประเภทกล้อง) ---
@app.get("/api/v1/admin/camera-function-types", response_model=List[schemas.CameraFunctionTypeOut])
def list_admin_camera_function_types(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_camera_function_types(db)

@app.post("/api/v1/admin/camera-function-types", response_model=schemas.CameraFunctionTypeOut)
def create_admin_camera_function_type(item: schemas.CameraFunctionTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_camera_function_type(db, item)

@app.put("/api/v1/admin/camera-function-types/{item_id}", response_model=schemas.CameraFunctionTypeOut)
def update_admin_camera_function_type(item_id: str, item: schemas.CameraFunctionTypeBase, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_item = crud.update_camera_function_type(db, item_id, item)
    if not db_item:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสรายละเอียดประเภทกล้องดังกล่าว")
    return db_item

@app.delete("/api/v1/admin/camera-function-types/{item_id}")
def delete_admin_camera_function_type(item_id: str, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_camera_function_type(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสรายละเอียดประเภทกล้องดังกล่าว")
    return {"success": True, "detail": "ลบรายละเอียดประเภทกล้องสำเร็จ"}


# --- ADMIN CRUD: DEVICE CATALOG ---
@app.get("/api/v1/admin/catalogs", response_model=List[schemas.DeviceCatalogOut])
def list_admin_catalogs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_catalogs(db)

@app.post("/api/v1/admin/catalogs", response_model=schemas.DeviceCatalogOut)
def create_admin_catalog(
    cat_data: schemas.DeviceCatalogCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    return crud.create_catalog(db, cat_data)

@app.put("/api/v1/admin/catalogs/{cat_id}", response_model=schemas.DeviceCatalogOut)
def update_admin_catalog(
    cat_id: int,
    cat_data: schemas.DeviceCatalogCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    cat = crud.update_catalog(db, cat_id, cat_data)
    if not cat:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสแคตตาล็อกดังกล่าว")
    return cat

@app.delete("/api/v1/admin/catalogs/{cat_id}")
def delete_admin_catalog(
    cat_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    success = crud.delete_catalog(db, cat_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสแคตตาล็อกดังกล่าว")
    return {"success": True, "detail": "ลบแคตตาล็อกสำเร็จ"}


# --- ADMIN CRUD: NVR/VMS SYSTEMS & NETWORK INFRASTRUCTURE ---
@app.get("/api/v1/admin/nvr-vms", response_model=List[schemas.NvrVmsSystemOut])
def list_admin_nvr_vms(local_gov_id: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_nvr_vms_systems(db, local_gov_id)

@app.post("/api/v1/admin/nvr-vms", response_model=schemas.NvrVmsSystemOut)
def create_admin_nvr_vms(nvr: schemas.NvrVmsSystemCreate, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.create_nvr_vms_system(db, nvr)

@app.put("/api/v1/admin/nvr-vms/{nvr_id}", response_model=schemas.NvrVmsSystemOut)
def update_admin_nvr_vms(nvr_id: int, nvr: schemas.NvrVmsSystemCreate, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    db_nvr = crud.update_nvr_vms_system(db, nvr_id, nvr)
    if not db_nvr:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสระบบ NVR/VMS ดังกล่าว")
    return db_nvr

@app.delete("/api/v1/admin/nvr-vms/{nvr_id}")
def delete_admin_nvr_vms(nvr_id: int, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    success = crud.delete_nvr_vms_system(db, nvr_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสระบบ NVR/VMS ดังกล่าว")
    return {"success": True, "detail": "ลบระบบ NVR/VMS สำเร็จ"}

@app.get("/api/v1/admin/network-infra/{camera_id}", response_model=schemas.NetworkInfrastructureOut)
def get_admin_network_infra(camera_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    infra = crud.get_network_infra(db, camera_id)
    if not infra:
        raise HTTPException(status_code=404, detail="ยังไม่มีข้อมูลโครงสร้างเครือข่ายของกล้องนี้")
    return infra

@app.put("/api/v1/admin/network-infra/{camera_id}", response_model=schemas.NetworkInfrastructureOut)
def upsert_admin_network_infra(camera_id: str, infra: schemas.NetworkInfrastructureCreate, db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return crud.upsert_network_infra(db, camera_id, infra)


# --- ADMIN CRUD: PROJECTS ---
@app.get("/api/v1/admin/projects", response_model=List[schemas.PurchaseProjectOut])
def list_admin_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_projects(db)

@app.post("/api/v1/admin/projects", response_model=schemas.PurchaseProjectOut)
def create_admin_project(
    proj: schemas.PurchaseProjectCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    return crud.create_project(db, proj)

@app.put("/api/v1/admin/projects/{proj_id}", response_model=schemas.PurchaseProjectOut)
def update_admin_project(
    proj_id: int,
    proj_data: schemas.PurchaseProjectCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    db_proj = crud.update_project(db, proj_id, proj_data)
    if not db_proj:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสโครงการดังกล่าว")
    return db_proj

@app.delete("/api/v1/admin/projects/{proj_id}")
def delete_admin_project(
    proj_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(verify_super_admin)
):
    success = crud.delete_project(db, proj_id)
    if not success:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสโครงการดังกล่าว")
    return {"success": True, "detail": "ลบโครงการจัดซื้อสำเร็จ"}


# --- CAMERA CRUD (STANDARD & ADMIN) ---
@app.get("/api/v1/cameras", response_model=List[schemas.CameraAssetOut])
def read_cameras(
    skip: int = 0,
    limit: int = 100,
    district_id: Optional[str] = None,
    local_gov_id: Optional[str] = None,
    status: Optional[str] = None,
    install_point_type_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "LOCAL_GOV_STAFF":
        local_gov_id = current_user.local_gov_id
    elif current_user.role == "DISTRICT_ADMIN":
        district_id = current_user.district_id

    cameras = crud.get_cameras(
        db, skip=skip, limit=limit,
        district_id=district_id, local_gov_id=local_gov_id,
        status=status, install_point_type_id=install_point_type_id
    )
    return [schemas.CameraAssetOut.model_validate(c) for c in cameras]

@app.get("/api/v1/cameras/geojson", response_model=schemas.CameraGeoJSONCollection)
def read_cameras_geojson(
    district_id: Optional[str] = None,
    local_gov_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    cameras = crud.get_cameras(
        db, limit=5000, 
        district_id=district_id, local_gov_id=local_gov_id, 
        status=status
    )
    features = []
    for cam in cameras:
        feature = schemas.CameraGeoJSONFeature(
            geometry=schemas.CameraGeoJSONGeometry(coordinates=[cam.longitude, cam.latitude]),
            properties=schemas.CameraGeoJSONProperties(
                id=cam.id,
                name=cam.address_ref,
                status=cam.status,
                installation_site_id=cam.installation_site_id,
                install_point_type_id=cam.install_point_type_id,
                purpose_type=cam.purpose_type,
                local_gov_id=cam.local_gov_id,
                azimuth_deg=float(cam.azimuth_deg),
                view_angle_deg=float(cam.view_angle_deg),
                view_range_m=float(cam.view_range_m)
            )
        )
        features.append(feature)
    return schemas.CameraGeoJSONCollection(features=features)

@app.get("/api/v1/cameras/export")
def export_cameras_bulk(
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    district_id: Optional[str] = None,
    local_gov_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "LOCAL_GOV_STAFF":
        local_gov_id = current_user.local_gov_id
    elif current_user.role == "DISTRICT_ADMIN":
        district_id = current_user.district_id

    cameras = crud.get_cameras(
        db, limit=100000,
        district_id=district_id, local_gov_id=local_gov_id, status=status
    )
    brands_by_id = {b.id: b.name for b in db.query(models.DeviceBrand).all()}

    rows = []
    for cam in cameras:
        rows.append({
            "id": cam.id,
            "serial_number": cam.serial_number,
            "asset_registry_no": cam.asset_registry_no,
            "mac_address": cam.mac_address,
            "private_ip": cam.private_ip,
            "public_ip": cam.public_ip,
            "brand": brands_by_id.get(cam.catalog.brand_id) if cam.catalog else None,
            "model": cam.catalog.model if cam.catalog else None,
            "category": cam.catalog.category_id if cam.catalog else None,
            "local_gov_id": cam.local_gov_id,
            "district_id": cam.local_government.district_id if cam.local_government else None,
            "latitude": cam.latitude,
            "longitude": cam.longitude,
            "elevation_m": cam.elevation_m,
            "azimuth": cam.azimuth_deg,
            "fov_horizontal": cam.view_angle_deg,
            "view_range_m": cam.view_range_m,
            "address_ref": cam.address_ref,
            "installation_site_id": cam.installation_site_id,
            "install_point_type_id": cam.install_point_type_id,
            "camera_function_type_id": cam.camera_function_type_id,
            "purpose_type": cam.purpose_type,
            "status": cam.status,
            "nvr_name": cam.nvr_vms.name if cam.nvr_vms else None,
            "project_fiscal_year": cam.project.fiscal_year if cam.project else None,
            "project_name": cam.project.name if cam.project else None,
            "install_date": cam.install_date,
            "warranty_expiry": cam.warranty_expiry,
        })

    df = pd.DataFrame(rows)
    filename_base = "sri_cctv_cameras_export"

    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="EXPORT_ASSETS", target_type="CAMERA", target_id="-", client_ip="127.0.0.1", reason=f"ส่งออกข้อมูลกล้องแบบชุด {len(rows)} รายการ"),
        username=current_user.username, user_id=current_user.id
    )

    if format == "csv":
        buf = io.StringIO()
        df.to_csv(buf, index=False, encoding="utf-8-sig")
        content = buf.getvalue().encode("utf-8-sig")
        media_type = "text/csv"
        filename = f"{filename_base}.csv"
    else:
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Cameras")
        content = buf.getvalue()
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{filename_base}.xlsx"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/v1/cameras/{camera_id}", response_model=schemas.CameraAssetOut)
def read_camera_detail(camera_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    camera = crud.get_camera(db, camera_id=camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลกล้องวงจรปิดดังกล่าว")
    
    if current_user.role == "LOCAL_GOV_STAFF" and camera.local_gov_id != current_user.local_gov_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงข้อมูลของหน่วยงานอื่น")
    return schemas.CameraAssetOut.model_validate(camera)

@app.post("/api/v1/cameras", response_model=schemas.CameraAssetOut)
def register_new_camera(camera: schemas.CameraAssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["SUPER_ADMIN", "LOCAL_GOV_STAFF"]:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลงทะเบียนกล้อง")
    if current_user.role == "LOCAL_GOV_STAFF":
        camera.local_gov_id = current_user.local_gov_id

    db_cam = crud.create_camera(db, camera)
    crud.create_audit_log(
        db, 
        schemas.AuditLogCreate(action="CREATE_CAMERA", target_type="CAMERA", target_id=camera.id, client_ip="127.0.0.1", reason="ลงทะเบียนกล้อง"),
        username=current_user.username, user_id=current_user.id
    )
    return schemas.CameraAssetOut.model_validate(db_cam)

@app.put("/api/v1/cameras/{camera_id}", response_model=schemas.CameraAssetOut)
def modify_camera(camera_id: str, camera: schemas.CameraAssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cam = crud.get_camera(db, camera_id)
    if not db_cam:
        raise HTTPException(status_code=404, detail="ไม่พบกล้องดังกล่าว")
    
    # Check permissions
    if current_user.role == "LOCAL_GOV_STAFF" and db_cam.local_gov_id != current_user.local_gov_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์แก้ไขกล้องของหน่วยงานอื่น")
    if current_user.role not in ["SUPER_ADMIN", "LOCAL_GOV_STAFF"]:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์แก้ไขกล้อง")

    updated_cam = crud.update_camera(db, camera_id, camera)
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="UPDATE_CAMERA", target_type="CAMERA", target_id=camera_id, client_ip="127.0.0.1", reason="อัปเดตข้อมูลกล้อง"),
        username=current_user.username, user_id=current_user.id
    )
    return schemas.CameraAssetOut.model_validate(updated_cam)

@app.delete("/api/v1/cameras/{camera_id}")
def remove_camera(camera_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_cam = crud.get_camera(db, camera_id)
    if not db_cam:
        raise HTTPException(status_code=404, detail="ไม่พบกล้องดังกล่าว")
    
    if current_user.role == "LOCAL_GOV_STAFF" and db_cam.local_gov_id != current_user.local_gov_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบกล้องของหน่วยงานอื่น")
    if current_user.role not in ["SUPER_ADMIN", "LOCAL_GOV_STAFF"]:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบกล้อง")

    crud.delete_camera(db, camera_id)
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="DELETE_CAMERA", target_type="CAMERA", target_id=camera_id, client_ip="127.0.0.1", reason="ลบกล้องออกจากระบบทะเบียนกลาง"),
        username=current_user.username, user_id=current_user.id
    )
    return {"success": True, "detail": "ลบกล้องสำเร็จ"}


# --- BULK IMPORT ---
@app.post("/api/v1/cameras/import", response_model=schemas.BulkImportSummary)
def import_cameras_bulk(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["SUPER_ADMIN", "LOCAL_GOV_STAFF"]:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ในการนำเข้าข้อมูลแบบชุด")

    contents = file.file.read()
    df = None
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ไม่สามารถเปิดอ่านไฟล์ได้: {str(e)}")

    def cell(row, col, default=""):
        """pandas leaves empty cells as NaN; row.get(col, default) only falls back to
        default when the column is missing entirely, not when its value is NaN — so a
        plain str(row.get(...)) turns a blank cell into the literal text "nan"."""
        val = row.get(col)
        return default if pd.isna(val) else str(val).strip()

    errors = []
    imported_count = 0
    total_rows = len(df)

    for idx, row in df.iterrows():
        row_num = idx + 2
        serial = cell(row, "serial_number")
        brand_name = cell(row, "brand")
        category = cell(row, "category")
        raw_id = row.get("id")
        requested_id = str(raw_id).strip() if not pd.isna(raw_id) and str(raw_id).strip() else None
        existing_cam = db.query(models.CameraAsset).filter(models.CameraAsset.id == requested_id).first() if requested_id else None

        if existing_cam and current_user.role == "LOCAL_GOV_STAFF" and existing_cam.local_gov_id != current_user.local_gov_id:
            errors.append(schemas.RowErrorDetail(row=row_num, column="id", error=f"ไม่มีสิทธิ์แก้ไขกล้องรหัส {requested_id} ของหน่วยงานอื่น"))
            continue

        if pd.isna(serial) or serial.strip() == "":
            errors.append(schemas.RowErrorDetail(row=row_num, column="serial_number", error="หมายเลขซีเรียลห้ามเป็นค่าว่าง"))
            continue

        try:
            lat = float(row.get("latitude"))
        except (TypeError, ValueError):
            errors.append(schemas.RowErrorDetail(row=row_num, column="latitude", error="พิกัดละติจูดต้องเป็นตัวเลข"))
            continue
        if not (14.20 <= lat <= 15.10):
            errors.append(schemas.RowErrorDetail(row=row_num, column="latitude", error="พิกัดละติจูดต้องอยู่ภายในขอบเขตสระบุรี"))
            continue

        try:
            lng = float(row.get("longitude"))
        except (TypeError, ValueError):
            errors.append(schemas.RowErrorDetail(row=row_num, column="longitude", error="พิกัดลองจิจูดต้องเป็นตัวเลข"))
            continue
        if not (100.50 <= lng <= 101.60):
            errors.append(schemas.RowErrorDetail(row=row_num, column="longitude", error="พิกัดลองจิจูดต้องอยู่ภายในขอบเขตสระบุรี"))
            continue

        db_brand = db.query(models.DeviceBrand).filter(models.DeviceBrand.name.ilike(brand_name)).first()
        if not db_brand:
            db_brand = models.DeviceBrand(name=brand_name)
            db.add(db_brand)
            db.commit()
            db.refresh(db_brand)

        model_name = cell(row, "model", "DefaultModel")
        db_cat = db.query(models.DeviceCatalog).filter(
            models.DeviceCatalog.brand_id == db_brand.id,
            models.DeviceCatalog.model == model_name
        ).first()

        if not db_cat:
            db_cat = models.DeviceCatalog(
                brand_id=db_brand.id,
                model=model_name,
                category_id=category if category in ["FIXED", "PTZ", "ANPR", "DOME", "BULLET"] else "FIXED",
                resolution="4MP"
            )
            db.add(db_cat)
            db.commit()
            db.refresh(db_cat)

        if existing_cam:
            cam_id = existing_cam.id
            local_gov_id = existing_cam.local_gov_id
        else:
            local_gov_id = current_user.local_gov_id if current_user.local_gov_id else "LA-190101"
            cam_id = crud.generate_camera_id(db, local_gov_id)

        status_val = cell(row, "status", "ONLINE").upper() or "ONLINE"

        try:
            payload = schemas.CameraAssetCreate(
                id=cam_id,
                serial_number=serial,
                asset_registry_no=cell(row, "asset_registry_no", None),
                mac_address=cell(row, "mac_address", None),
                private_ip=cell(row, "private_ip", None),
                public_ip=cell(row, "public_ip", None),
                catalog_id=db_cat.id,
                local_gov_id=local_gov_id,
                latitude=lat,
                longitude=lng,
                elevation_m=float(row.get("elevation_m", 3.0)) if not pd.isna(row.get("elevation_m")) else 3.0,
                azimuth_deg=float(row.get("azimuth", 0.0)) if not pd.isna(row.get("azimuth")) else 0.0,
                address_ref=cell(row, "address_ref", "ไม่ระบุที่อยู่"),
                installation_site_id=cell(row, "installation_site_id", None),
                install_point_type_id=cell(row, "install_point_type_id", None),
                camera_function_type_id=cell(row, "camera_function_type_id", None),
                purpose_type=cell(row, "purpose_type", "SAFETY"),
                status=status_val
            )
            if existing_cam:
                crud.update_camera(db, cam_id, payload)
            else:
                crud.create_camera(db, payload)
            imported_count += 1
        except Exception as ex:
            errors.append(schemas.RowErrorDetail(row=row_num, column="DB_Error", error=f"ไม่สามารถบันทึกลงฐานข้อมูลได้: {str(ex)}"))
            db.rollback()

    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="IMPORT_ASSETS", target_type="CAMERA", target_id=file.filename, client_ip="127.0.0.1", reason=f"นำเข้าข้อมูลกล้องแบบชุด {imported_count} ตัวสำเร็จ"),
        username=current_user.username,
        user_id=current_user.id
    )

    return schemas.BulkImportSummary(
        success=len(errors) == 0,
        total_rows=total_rows,
        imported_count=imported_count,
        failed_count=len(errors),
        errors=errors
    )


# --- STREAMING ---
@app.get("/api/v1/cameras/{camera_id}/stream")
def get_camera_stream_url(
    camera_id: str, 
    reason: str = Query(..., min_length=5),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    camera = crud.get_camera(db, camera_id=camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสกล้องดังกล่าว")
    
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="VIEW_LIVE", target_type="CAMERA", target_id=camera_id, client_ip="127.0.0.1", reason=reason),
        username=current_user.username, user_id=current_user.id
    )

    stream_token = jwt.encode({"sub": current_user.username, "camera_id": camera_id, "exp": datetime.utcnow() + timedelta(minutes=30)}, SECRET_KEY, algorithm=ALGORITHM)
    media_url = os.getenv("MEDIA_SERVER_API", "http://localhost:1984")
    
    return {
        "camera_id": camera_id,
        "name": camera.address_ref,
        "stream_protocol": "webrtc",
        "stream_url": f"ws://{media_url.split('://')[1]}/api/ws?src={camera_id}&token={stream_token}"
    }


# --- MAINTENANCE TICKETS ---
@app.post("/api/v1/tickets", response_model=schemas.MaintenanceTicketOut)
def report_camera_issue(ticket: schemas.MaintenanceTicketCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ticket.reported_by = current_user.full_name
    db_ticket = crud.create_maintenance_ticket(db, ticket)
    
    db_camera = db.query(models.CameraAsset).filter(models.CameraAsset.id == ticket.camera_id).first()
    if db_camera:
        db_camera.status = "MAINTENANCE"
        db.commit()
    return db_ticket

@app.get("/api/v1/tickets", response_model=List[schemas.MaintenanceTicketOut])
def read_maintenance_tickets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.MaintenanceTicket).order_by(models.MaintenanceTicket.reported_at.desc()).all()

@app.put("/api/v1/tickets/{ticket_id}", response_model=schemas.MaintenanceTicketOut)
def update_maintenance_ticket_status(
    ticket_id: int,
    update: schemas.MaintenanceTicketUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_ticket = crud.update_maintenance_ticket(
        db, ticket_id, status=update.status, details=update.resolution_details,
        cost=update.cost, parts=update.parts_replaced
    )
    if not db_ticket:
        raise HTTPException(status_code=404, detail="ไม่พบตั๋วแจ้งซ่อมดังกล่าว")
    if update.status in ["RESOLVED", "CLOSED"]:
        db_camera = db.query(models.CameraAsset).filter(models.CameraAsset.id == db_ticket.camera_id).first()
        if db_camera and db_camera.status == "MAINTENANCE":
            db_camera.status = "ONLINE"
            db.commit()
    return db_ticket


# --- PDPA PLAYBACK ---
@app.post("/api/v1/video-requests", response_model=schemas.VideoRequestOut)
def request_video_retrieval(req: schemas.VideoRequestCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_req = crud.create_video_request(db, req)
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action="REQUEST_PLAYBACK", target_type="VIDEO_REQUEST", target_id=db_req.request_number, client_ip="127.0.0.1", reason=f"ยื่นคำร้องย้อนหลังเพื่อจุดประสงค์: {req.reason}"),
        username=current_user.username, user_id=current_user.id
    )
    return db_req

@app.get("/api/v1/video-requests", response_model=List[schemas.VideoRequestOut])
def list_video_requests(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_video_requests(db)

@app.put("/api/v1/video-requests/{request_id}/approve", response_model=schemas.VideoRequestOut)
def approve_video_request_endpoint(
    request_id: int,
    approval: schemas.VideoRequestApprove,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["SUPER_ADMIN", "DISTRICT_ADMIN"]:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์อนุมัติคำร้องขอภาพ")
    db_req = crud.approve_video_request(db, request_id, approval, current_user.id)
    if not db_req:
        raise HTTPException(status_code=404, detail="ไม่พบคำร้องขอภาพดังกล่าว")
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(action=f"{approval.status}_VIDEO_REQUEST", target_type="VIDEO_REQUEST", target_id=db_req.request_number, client_ip="127.0.0.1", reason="พิจารณาคำร้องขอภาพย้อนหลัง"),
        username=current_user.username, user_id=current_user.id
    )
    return db_req


# --- HEALTH & UPTIME MONITORING (READ-ONLY) ---
@app.get("/api/v1/health-checks", response_model=List[schemas.HealthCheckLogOut])
def list_health_checks(camera_id: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_health_checks(db, camera_id)

@app.get("/api/v1/uptime-stats", response_model=List[schemas.UptimeMonthlyStatOut])
def list_uptime_stats(camera_id: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_uptime_stats(db, camera_id)


# --- EXECUTIVE DASHBOARD ---
@app.get("/api/v1/dashboard/province")
def get_province_dashboard_summary(
    local_gov_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    district_id = None
    if current_user.role == "LOCAL_GOV_STAFF":
        local_gov_id = current_user.local_gov_id
    elif current_user.role == "DISTRICT_ADMIN":
        district_id = current_user.district_id

    cam_query = db.query(models.CameraAsset)
    if district_id:
        cam_query = cam_query.join(models.LocalGovernment, models.CameraAsset.local_gov_id == models.LocalGovernment.id).filter(models.LocalGovernment.district_id == district_id)
    if local_gov_id:
        cam_query = cam_query.filter(models.CameraAsset.local_gov_id == local_gov_id)

    total_cams = cam_query.count()
    online_cams = cam_query.filter(models.CameraAsset.status == "ONLINE").count()
    offline_cams = cam_query.filter(models.CameraAsset.status == "OFFLINE").count()
    maint_cams = cam_query.filter(models.CameraAsset.status == "MAINTENANCE").count()

    if district_id or local_gov_id:
        scoped_project_ids = cam_query.filter(models.CameraAsset.project_id.isnot(None)).with_entities(models.CameraAsset.project_id).distinct()
        total_budget = db.query(func.sum(models.PurchaseProject.contract_amount)).filter(models.PurchaseProject.id.in_(scoped_project_ids)).scalar() or 0.0
    else:
        total_budget = db.query(func.sum(models.PurchaseProject.contract_amount)).scalar() or 0.0

    camera_categories = cam_query.join(models.DeviceCatalog, models.CameraAsset.catalog_id == models.DeviceCatalog.id).with_entities(
        models.DeviceCatalog.category_id,
        func.count(models.CameraAsset.id)
    ).group_by(models.DeviceCatalog.category_id).all()

    cat_summary = {cat[0]: cat[1] for cat in camera_categories}

    install_year = func.extract('year', models.CameraAsset.install_date)
    yearly_rows = cam_query.filter(models.CameraAsset.install_date.isnot(None)).with_entities(
        install_year.label("year"),
        func.count(models.CameraAsset.id).label("installed"),
        func.sum(case((models.CameraAsset.status == "ONLINE", 1), else_=0)).label("online")
    ).group_by(install_year).order_by(install_year).all()

    cumulative_total = 0
    cumulative_online = 0
    yearly_trend = []
    for row in yearly_rows:
        cumulative_total += row.installed
        cumulative_online += row.online
        yearly_trend.append({
            "year": int(row.year),
            "cameras": cumulative_total,
            "online": cumulative_online
        })

    return {
        "total_cameras": total_cams,
        "online_cameras": online_cams,
        "offline_cameras": offline_cams,
        "maintenance_cameras": maint_cams,
        "uptime_percentage": round((online_cams / total_cams * 100), 2) if total_cams > 0 else 100.0,
        "accumulated_budget_thb": float(total_budget),
        "camera_categories": cat_summary,
        "yearly_trend": yearly_trend
    }

# --- AUDIT LOGS FOR ADMIN ---
@app.get("/api/v1/admin/audit-logs", response_model=List[schemas.AuditLogOut])
def get_admin_audit_logs(db: Session = Depends(get_db), admin: models.User = Depends(verify_super_admin)):
    return db.query(models.AuditLog).order_by(models.AuditLog.action_time.desc()).limit(100).all()
