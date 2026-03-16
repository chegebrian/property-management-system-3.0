from config import db, bcrypt
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates
from datetime import datetime
import re


class User(db.Model, SerializerMixin):
    __tablename__ = "users"

    serialize_rules = ("-password_hash", "-properties.user", "-properties.tenants", 
                      "-properties.rent_payments", "-tenants.user", "-rent_payments.user")

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default="user")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # One-to-many: User has many Properties
    properties = db.relationship("Property", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")
    # One-to-many: User has many Tenants (global tenant list for the user)
    tenants = db.relationship("Tenant", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")
    # One-to-many: User has many RentPayments
    rent_payments = db.relationship("RentPayment", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")

    @validates("email")
    def validate_email(self, key, value):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid email address format.")
        return value.lower()

    @validates("username")
    def validate_username(self, key, value):
        if len(value) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise ValueError("Username can only contain letters, numbers, and underscores.")
        return value

    @validates("role")
    def validate_role(self, key, value):
        allowed_roles = {"user", "admin", "manager"}
        if value not in allowed_roles:
            raise ValueError(f"Role must be one of: {allowed_roles}")
        return value

    def set_password(self, password):
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", password):
            raise ValueError("Password must contain at least one digit.")
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def deactivate(self):
        self.is_active = False

    def get_property(self, property_id):
        """Get a specific property belonging to this user"""
        return self.properties.filter_by(id=property_id, is_active=True).first()

    def get_tenant(self, tenant_id):
        """Get a specific tenant belonging to this user"""
        return self.tenants.filter_by(id=tenant_id, is_active=True).first()

    def get_rent_payment(self, payment_id):
        """Get a specific rent payment belonging to this user"""
        return self.rent_payments.filter_by(id=payment_id).first()

    def __repr__(self):
        return f"<User {self.username}>"


class Property(db.Model, SerializerMixin):
    __tablename__ = "properties"

    serialize_rules = ("-user.properties", "-user.tenants", "-user.rent_payments",
                      "-rent_payments.property", "-rent_payments.user",
                      "-tenants.properties", "-tenants.user")

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(80), nullable=False, index=True)
    state = db.Column(db.String(80), nullable=False, index=True)
    property_type = db.Column(db.String(50), nullable=False)
    num_units = db.Column(db.Integer, default=1)
    monthly_rent = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # FK to User - every property belongs to a specific user
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Relationships
    user = db.relationship("User", back_populates="properties")
    rent_payments = db.relationship(
        "RentPayment", back_populates="property", cascade="all, delete-orphan", lazy="dynamic"
    )
    tenants = db.relationship(
        "Tenant", secondary="rent_payments", viewonly=True, lazy="dynamic"
    )

    @validates("property_type")
    def validate_property_type(self, key, value):
        allowed_types = {"apartment", "house", "commercial", "land", "condo", "townhouse"}
        if value not in allowed_types:
            raise ValueError(f"Property type must be one of: {allowed_types}")
        return value

    @validates("monthly_rent")
    def validate_rent(self, key, value):
        if float(value) <= 0:
            raise ValueError("Monthly rent must be a positive number.")
        if float(value) > 999999.99:
            raise ValueError("Monthly rent exceeds maximum allowed value.")
        return float(value)

    @validates("num_units")
    def validate_units(self, key, value):
        if int(value) < 1:
            raise ValueError("Number of units must be at least 1.")
        if int(value) > 10000:
            raise ValueError("Number of units exceeds maximum allowed value.")
        return int(value)

    def deactivate(self):
        self.is_active = False

    def get_rent_payment(self, payment_id):
        """Get a specific rent payment for this property"""
        return self.rent_payments.filter_by(id=payment_id).first()

    def __repr__(self):
        return f"<Property {self.name}>"

    def to_dict(self, include_payments=False, include_tenants=False):
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "property_type": self.property_type,
            "num_units": self.num_units,
            "monthly_rent": self.monthly_rent,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_id": self.user_id,
        }
        if include_tenants:
            data["tenants"] = [t.to_dict() for t in self.tenants]
        if include_payments:
            data["rent_payments"] = [r.to_dict() for r in self.rent_payments]
        else:
            data["tenant_count"] = self.tenants.count()
            data["rent_payment_count"] = self.rent_payments.count()
        return data


class Tenant(db.Model, SerializerMixin):
    __tablename__ = "tenants"

    serialize_rules = ("-user.properties", "-user.tenants", "-user.rent_payments",
                      "-rent_payments.tenant", "-rent_payments.user", "-rent_payments.property",
                      "-properties.tenants", "-properties.user", "-properties.rent_payments")

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    national_id = db.Column(db.String(50), index=True)
    emergency_contact = db.Column(db.String(120))
    emergency_phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # FK to User - every tenant belongs to a specific user
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # relationships
    user = db.relationship("User", back_populates="tenants")
    rent_payments = db.relationship(
        "RentPayment",
        back_populates="tenant",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    properties = db.relationship(
        "Property",
        secondary="rent_payments",
        viewonly=True,
        lazy="dynamic"
    )

    # Unique constraint: email must be unique per user (not globally)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'email', name='unique_tenant_email_per_user'),
    )

    @validates("first_name", "last_name")
    def validate_name(self, key, value):
        if len(value) < 1:
            raise ValueError(f"{key} cannot be empty.")
        if not re.match(r"^[a-zA-Z\s\-']+$", value):
            raise ValueError(f"{key} contains invalid characters.")
        return value.strip().title()

    @validates("email")
    def validate_email(self, key, value):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid email address format.")
        return value.lower()

    @validates("phone")
    def validate_phone(self, key, value):
        cleaned = re.sub(r'[\s\-\(\)\.]', '', value)
        if not re.match(r'^\+?[1-9]\d{7,14}$', cleaned):
            raise ValueError("Invalid phone number format.")
        return cleaned

    @validates("national_id")
    def validate_national_id(self, key, value):
        if value and len(value) < 5:
            raise ValueError("National ID must be at least 5 characters.")
        return value.upper() if value else value

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def deactivate(self):
        self.is_active = False

    def get_rent_payment(self, payment_id):
        """Get a specific rent payment for this tenant"""
        return self.rent_payments.filter_by(id=payment_id).first()

    def __repr__(self):
        return f"<Tenant {self.full_name}>"

    def to_dict(self, include_payments=False, include_properties=False):
        data = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "national_id": self.national_id,
            "emergency_contact": self.emergency_contact,
            "emergency_phone": self.emergency_phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_id": self.user_id,
        }
        if include_properties:
            data["properties"] = [p.to_dict() for p in self.properties]
        if include_payments:
            data["rent_payments"] = [r.to_dict() for r in self.rent_payments]
        else:
            data["property_count"] = self.properties.count()
            data["rent_payment_count"] = self.rent_payments.count()
        return data


class RentPayment(db.Model, SerializerMixin):
    __tablename__ = "rent_payments"

    serialize_rules = ("-user.properties", "-user.tenants", "-user.rent_payments",
                      "-tenant.rent_payments", "-tenant.user", "-tenant.properties",
                      "-property.rent_payments", "-property.user", "-property.tenants")

    id = db.Column(db.Integer, primary_key=True)
    amount_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    due_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), default="pending", index=True)
    payment_method = db.Column(db.String(50), default="cash")
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # FK to User - every payment belongs to a specific user
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # FK to Tenant - payment is for a specific tenant (owned by same user)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    # FK to Property - payment is for a specific property (owned by same user)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False, index=True)

    # Unique constraint: prevent duplicate payments for same tenant/property/due_date per user
    __table_args__ = (
        db.UniqueConstraint('user_id', 'tenant_id', 'property_id', 'due_date', 
                           name='unique_rent_payment_per_period_per_user'),
        db.Index('idx_payment_user_status', 'user_id', 'status'),
        db.Index('idx_payment_dates', 'payment_date', 'due_date'),
    )

    # Relationships
    user = db.relationship("User", back_populates="rent_payments")
    tenant = db.relationship("Tenant", back_populates="rent_payments")
    property = db.relationship("Property", back_populates="rent_payments")

    @validates("status")
    def validate_status(self, key, value):
        allowed_statuses = {"pending", "paid", "overdue", "cancelled", "partial"}
        if value not in allowed_statuses:
            raise ValueError(f"Status must be one of: {allowed_statuses}")
        return value

    @validates("payment_method")
    def validate_payment_method(self, key, value):
        allowed_methods = {"cash", "bank_transfer", "credit_card", "debit_card", 
                          "check", "mobile_money", "other"}
        if value not in allowed_methods:
            raise ValueError(f"Payment method must be one of: {allowed_methods}")
        return value

    @validates("amount_paid")
    def validate_amount(self, key, value):
        if float(value) < 0:
            raise ValueError("Amount paid cannot be negative.")
        if float(value) > 999999.99:
            raise ValueError("Amount paid exceeds maximum allowed value.")
        return float(value)

    def mark_as_paid(self, payment_method=None):
        self.status = "paid"
        if payment_method:
            self.payment_method = payment_method
        if not self.payment_date:
            self.payment_date = datetime.utcnow().date()

    def mark_as_overdue(self):
        if self.status == "pending" and self.due_date < datetime.utcnow().date():
            self.status = "overdue"

    def __repr__(self):
        return f"<RentPayment {self.id}>"

    def to_dict(self, include_relations=False):
        data = {
            "id": self.id,
            "amount_paid": self.amount_paid,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "payment_method": self.payment_method,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user_id": self.user_id,
            "tenant_id": self.tenant_id,
            "property_id": self.property_id,
        }
        if include_relations:
            data["tenant"] = self.tenant.to_dict() if self.tenant else None
            data["property"] = self.property.to_dict() if self.property else None
        else:
            data["tenant_name"] = self.tenant.full_name if self.tenant else None
            data["property_name"] = self.property.name if self.property else None
        return data


# Utility functions for user-scoped queries
def get_user_property(user_id, property_id):
    """Get a property ensuring it belongs to the specified user"""
    return Property.query.filter_by(id=property_id, user_id=user_id, is_active=True).first()


def get_user_tenant(user_id, tenant_id):
    """Get a tenant ensuring it belongs to the specified user"""
    return Tenant.query.filter_by(id=tenant_id, user_id=user_id, is_active=True).first()


def get_user_rent_payment(user_id, payment_id):
    """Get a rent payment ensuring it belongs to the specified user"""
    return RentPayment.query.filter_by(id=payment_id, user_id=user_id).first()


def get_user_properties_query(user_id, filters=None):
    """Get query for user's properties with optional filters"""
    query = Property.query.filter_by(user_id=user_id, is_active=True)
    if filters:
        if filters.get('city'):
            query = query.filter_by(city=filters['city'])
        if filters.get('property_type'):
            query = query.filter_by(property_type=filters['property_type'])
        if filters.get('min_rent'):
            query = query.filter(Property.monthly_rent >= filters['min_rent'])
        if filters.get('max_rent'):
            query = query.filter(Property.monthly_rent <= filters['max_rent'])
    return query


def get_user_tenants_query(user_id, filters=None):
    """Get query for user's tenants with optional filters"""
    query = Tenant.query.filter_by(user_id=user_id, is_active=True)
    if filters:
        if filters.get('search'):
            search = f"%{filters['search']}%"
            query = query.filter(
                db.or_(
                    Tenant.first_name.ilike(search),
                    Tenant.last_name.ilike(search),
                    Tenant.email.ilike(search)
                )
            )
    return query


def get_user_rent_payments_query(user_id, filters=None):
    """Get query for user's rent payments with optional filters"""
    query = RentPayment.query.filter_by(user_id=user_id)
    if filters:
        if filters.get('status'):
            query = query.filter_by(status=filters['status'])
        if filters.get('property_id'):
            query = query.filter_by(property_id=filters['property_id'])
        if filters.get('tenant_id'):
            query = query.filter_by(tenant_id=filters['tenant_id'])
        if filters.get('start_date'):
            query = query.filter(RentPayment.due_date >= filters['start_date'])
        if filters.get('end_date'):
            query = query.filter(RentPayment.due_date <= filters['end_date'])
    return query.order_by(RentPayment.due_date.desc())


def verify_ownership(user_id, tenant_id=None, property_id=None, payment_id=None):
    """
    Verify that the specified resources belong to the user.
    Returns tuple (success: bool, error_message: str or None)
    """
    if property_id:
        prop = Property.query.filter_by(id=property_id, user_id=user_id).first()
        if not prop:
            return False, "Property not found or access denied"
    
    if tenant_id:
        tenant = Tenant.query.filter_by(id=tenant_id, user_id=user_id).first()
        if not tenant:
            return False, "Tenant not found or access denied"
    
    if payment_id:
        payment = RentPayment.query.filter_by(id=payment_id, user_id=user_id).first()
        if not payment:
            return False, "Rent payment not found or access denied"
    
    return True, None