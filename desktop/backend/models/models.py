from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from backend.database.database import Base
import datetime

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), index=True)
    description = Column(Text, nullable=True)
    rate_detection = Column(Integer, nullable=True)
    rate_conformation = Column(Integer, nullable=True)
    rate_pose_texte = Column(Integer, nullable=True)
    rate_chantant = Column(Integer, nullable=True)
    supplier_email = Column(String(255), nullable=True)
    target_software = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="companies")
    projects = relationship("Project", back_populates="company")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    company_name = Column(String(255), nullable=True)
    folder_path = Column(String(500), nullable=True)
    target_software = Column(String(100), nullable=True)
    project_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    total_time = Column(Integer, nullable=True)
    status = Column(String(50), default="active") # active, completed, etc.
    files_index = Column(Text, nullable=True) # JSON list of indexed project files metadata
    collaborators = Column(Text, nullable=True) # JSON list of assigned collaborators with custom tasks, dates & permissions
    project_file = Column(Text, nullable=True) # JSON metadata for designated master project file
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="projects")
    company = relationship("Company", back_populates="projects")
    scripts = relationship("Script", back_populates="project", cascade="all, delete-orphan")

class Script(Base):
    __tablename__ = "scripts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    project_id = Column(Integer, ForeignKey("projects.id"))
    format = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    project = relationship("Project", back_populates="scripts")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), index=True)
    type = Column(String(100))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="appointments")

class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    staff_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), index=True)
    email = Column(String(255), nullable=True)
    task = Column(String(255), nullable=True)
    access_level = Column(String(32), default="spectator", nullable=False)
    auto_accept_transfers = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="pending", nullable=False) # 'pending', 'accepted', 'declined'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    owner = relationship("User", foreign_keys=[user_id], back_populates="staff_members")
    staff_user = relationship("User", foreign_keys=[staff_user_id])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    type = Column(String(50), nullable=False, index=True) # 'staff_invitation', 'staff_accepted', 'staff_declined', 'system'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(Text, nullable=True) # JSON metadata
    is_read = Column(Boolean, default=False, nullable=False)
    status = Column(String(32), default="pending", nullable=False) # 'pending', 'accepted', 'declined', 'read'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    sender = relationship("User", foreign_keys=[sender_id])

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    provider = Column(String(50), index=True) # gemini, openai, groq
    key = Column(Text)
    label = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="api_keys")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(191), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True) # None for Google OAuth users without password
    phone_number = Column(String(50), nullable=True)
    job_type = Column(String(100), nullable=True)
    google_id = Column(String(191), unique=True, index=True, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    is_private = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    token_version = Column(Integer, default=1, nullable=False)
    password_changed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="user", cascade="all, delete-orphan")
    staff_members = relationship("Staff", foreign_keys="Staff.user_id", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    verifications = relationship("EmailVerification", back_populates="user", cascade="all, delete-orphan")
    schedule_tasks = relationship("ScheduleTask", back_populates="user", cascade="all, delete-orphan")

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    code_hash = Column(String(255), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    resend_available_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="verifications")

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(191), unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    day = Column(String(10), nullable=False) # 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
    start_time = Column(String(10), nullable=False) # '07:00'
    end_time = Column(String(10), nullable=False)   # '07:30'
    task_name = Column(String(255), nullable=False) # 'Pose de texte', 'Détection', etc.
    project_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    company_code = Column(String(20), nullable=True) # 'C+', 'CR', 'TF', 'DB', etc.
    room = Column(String(100), nullable=True) # 'Studio A'
    theme = Column(String(20), default="cream") # 'cream', 'yellow', 'blue', 'white'
    status_badge = Column(String(50), nullable=True) # 'En cours...', 'Terminé'
    has_join_button = Column(Boolean, default=False)
    staff_members = Column(Text, nullable=True) # JSON array of staff objects
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="schedule_tasks")



