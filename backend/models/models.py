from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.database.database import Base
import datetime

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    rate_detection = Column(Integer, nullable=True)
    rate_conformation = Column(Integer, nullable=True)
    rate_pose_texte = Column(Integer, nullable=True)
    rate_chantant = Column(Integer, nullable=True)
    supplier_email = Column(String, nullable=True)
    target_software = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    projects = relationship("Project", back_populates="company")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company_name = Column(String, nullable=True)
    folder_path = Column(String, nullable=True)
    target_software = Column(String, nullable=True)
    project_type = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    total_time = Column(Integer, nullable=True)
    status = Column(String, default="active") # active, completed, etc.
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    company = relationship("Company", back_populates="projects")
    scripts = relationship("Script", back_populates="project")

class Script(Base):
    __tablename__ = "scripts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    project_id = Column(Integer, ForeignKey("projects.id"))
    format = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    project = relationship("Project", back_populates="scripts")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    type = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, nullable=True)
    task = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True) # gemini, openai, groq
    key = Column(String)
    label = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

