# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://srb_admin:srb_secure_password_2569@localhost:5432/srb_cctv_registry"
)

# สำหรับ PostGIS เราใช้ standard engine ของ SQLAlchemy
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency สำหรับการดึง DB Session ในแต่ละ Request ของ FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
