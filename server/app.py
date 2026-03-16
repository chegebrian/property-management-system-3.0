from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from config import app, db, bcrypt
from models import (
    User, Property, Tenant, RentPayment,
    get_user_property, get_user_tenant, get_user_rent_payment,
    get_user_properties_query, get_user_tenants_query, get_user_rent_payments_query,
    verify_ownership
)
from datetime import datetime


# ─────────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    try:
        # Force role to "user" for security - prevent privilege escalation
        user = User(
            username=data["username"],
            email=data["email"],
            role="user",  # Always default to user, never admin from registration
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id))
        return jsonify({"token": token, "user": user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401
    if not user.is_active:
        return jsonify({"error": "Account deactivated"}), 403
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


# ─────────────────────────────────────────────
#  PROPERTY ROUTES (User-Scoped)
# ─────────────────────────────────────────────

@app.route("/api/properties", methods=["GET"])
@jwt_required()
def get_properties():
    user_id = int(get_jwt_identity())
    filters = {
        'city': request.args.get('city'),
        'property_type': request.args.get('property_type'),
        'min_rent': request.args.get('min_rent', type=float),
        'max_rent': request.args.get('max_rent', type=float),
    }
    # Remove None values
    filters = {k: v for k, v in filters.items() if v is not None}
    
    query = get_user_properties_query(user_id, filters)
    props = query.all()
    return jsonify([p.to_dict() for p in props]), 200


@app.route("/api/properties/<int:id>", methods=["GET"])
@jwt_required()
def get_property(id):
    user_id = int(get_jwt_identity())
    prop = get_user_property(user_id, id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    return jsonify(prop.to_dict(include_payments=True, include_tenants=True)), 200


@app.route("/api/properties", methods=["POST"])
@jwt_required()
def create_property():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    try:
        prop = Property(
            name=data["name"],
            address=data["address"],
            city=data["city"],
            state=data["state"],
            property_type=data["property_type"],
            num_units=data.get("num_units", 1),
            monthly_rent=data["monthly_rent"],
            description=data.get("description", ""),
            user_id=user_id,  # Always set from JWT, never from request
        )
        db.session.add(prop)
        db.session.commit()
        return jsonify(prop.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/properties/<int:id>", methods=["PATCH"])
@jwt_required()
def update_property(id):
    user_id = int(get_jwt_identity())
    prop = get_user_property(user_id, id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    
    data = request.get_json()
    try:
        for field in ["name", "address", "city", "state", "property_type", "num_units", "monthly_rent", "description"]:
            if field in data:
                setattr(prop, field, data[field])
        db.session.commit()
        return jsonify(prop.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/properties/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_property(id):
    user_id = int(get_jwt_identity())
    prop = get_user_property(user_id, id)
    if not prop:
        return jsonify({"error": "Property not found"}), 404
    
    # Soft delete instead of hard delete
    prop.deactivate()
    db.session.commit()
    return jsonify({"message": "Property deactivated"}), 200


# ─────────────────────────────────────────────
#  TENANT ROUTES (User-Scoped)
# ─────────────────────────────────────────────

@app.route("/api/tenants", methods=["GET"])
@jwt_required()
def get_tenants():
    user_id = int(get_jwt_identity())
    filters = {
        'search': request.args.get('search'),
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    
    query = get_user_tenants_query(user_id, filters)
    tenants = query.all()
    return jsonify([t.to_dict() for t in tenants]), 200


@app.route("/api/tenants/<int:id>", methods=["GET"])
@jwt_required()
def get_tenant(id):
    user_id = int(get_jwt_identity())
    tenant = get_user_tenant(user_id, id)
    if not tenant:
        return jsonify({"error": "Tenant not found"}), 404
    return jsonify(tenant.to_dict(include_payments=True, include_properties=True)), 200


@app.route("/api/tenants", methods=["POST"])
@jwt_required()
def create_tenant():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    try:
        tenant = Tenant(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            phone=data["phone"],
            national_id=data.get("national_id"),
            emergency_contact=data.get("emergency_contact"),
            emergency_phone=data.get("emergency_phone"),
            user_id=user_id,  # Always set from JWT
        )
        db.session.add(tenant)
        db.session.commit()
        return jsonify(tenant.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/tenants/<int:id>", methods=["PATCH"])
@jwt_required()
def update_tenant(id):
    user_id = int(get_jwt_identity())
    tenant = get_user_tenant(user_id, id)
    if not tenant:
        return jsonify({"error": "Tenant not found"}), 404
    
    data = request.get_json()
    try:
        for field in ["first_name", "last_name", "email", "phone", "national_id", 
                     "emergency_contact", "emergency_phone"]:
            if field in data:
                setattr(tenant, field, data[field])
        db.session.commit()
        return jsonify(tenant.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/tenants/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_tenant(id):
    user_id = int(get_jwt_identity())
    tenant = get_user_tenant(user_id, id)
    if not tenant:
        return jsonify({"error": "Tenant not found"}), 404
    
    # Soft delete
    tenant.deactivate()
    db.session.commit()
    return jsonify({"message": "Tenant deactivated"}), 200


# ─────────────────────────────────────────────
#  RENT PAYMENT ROUTES (User-Scoped)
# ─────────────────────────────────────────────

@app.route("/api/rent-payments", methods=["GET"])
@jwt_required()
def get_rent_payments():
    user_id = int(get_jwt_identity())
    filters = {
        'status': request.args.get('status'),
        'property_id': request.args.get('property_id', type=int),
        'tenant_id': request.args.get('tenant_id', type=int),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    
    query = get_user_rent_payments_query(user_id, filters)
    payments = query.all()
    return jsonify([p.to_dict() for p in payments]), 200


@app.route("/api/rent-payments/<int:id>", methods=["GET"])
@jwt_required()
def get_rent_payment(id):
    user_id = int(get_jwt_identity())
    payment = get_user_rent_payment(user_id, id)
    if not payment:
        return jsonify({"error": "Rent payment not found"}), 404
    return jsonify(payment.to_dict(include_relations=True)), 200


@app.route("/api/rent-payments", methods=["POST"])
@jwt_required()
def create_rent_payment():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    # Verify that tenant and property belong to the current user
    success, error = verify_ownership(
        user_id,
        tenant_id=data.get("tenant_id"),
        property_id=data.get("property_id")
    )
    if not success:
        return jsonify({"error": error}), 403
    
    try:
        payment = RentPayment(
            user_id=user_id,  # Always set from JWT
            tenant_id=data["tenant_id"],
            property_id=data["property_id"],
            amount_paid=data["amount_paid"],
            payment_date=datetime.strptime(data["payment_date"], "%Y-%m-%d").date() if data.get("payment_date") else None,
            due_date=datetime.strptime(data["due_date"], "%Y-%m-%d").date(),
            status=data.get("status", "pending"),
            payment_method=data.get("payment_method", "cash"),
            notes=data.get("notes"),
        )
        db.session.add(payment)
        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/rent-payments/<int:id>", methods=["PATCH"])
@jwt_required()
def update_rent_payment(id):
    user_id = int(get_jwt_identity())
    payment = get_user_rent_payment(user_id, id)
    if not payment:
        return jsonify({"error": "Rent payment not found"}), 404
    
    data = request.get_json()
    
    # If changing tenant or property, verify ownership
    if "tenant_id" in data or "property_id" in data:
        success, error = verify_ownership(
            user_id,
            tenant_id=data.get("tenant_id", payment.tenant_id),
            property_id=data.get("property_id", payment.property_id)
        )
        if not success:
            return jsonify({"error": error}), 403
    
    try:
        for field in ["amount_paid", "status", "payment_method", "notes", "tenant_id", "property_id"]:
            if field in data:
                setattr(payment, field, data[field])
        if "payment_date" in data:
            payment.payment_date = datetime.strptime(data["payment_date"], "%Y-%m-%d").date()
        if "due_date" in data:
            payment.due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
        db.session.commit()
        return jsonify(payment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/rent-payments/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_rent_payment(id):
    user_id = int(get_jwt_identity())
    payment = get_user_rent_payment(user_id, id)
    if not payment:
        return jsonify({"error": "Rent payment not found"}), 404
    
    db.session.delete(payment)
    db.session.commit()
    return jsonify({"message": "Rent payment deleted"}), 200


@app.route("/api/rent-payments/<int:id>/mark-paid", methods=["POST"])
@jwt_required()
def mark_payment_paid(id):
    """Helper route to mark a payment as paid"""
    user_id = int(get_jwt_identity())
    payment = get_user_rent_payment(user_id, id)
    if not payment:
        return jsonify({"error": "Rent payment not found"}), 404
    
    data = request.get_json() or {}
    payment.mark_as_paid(payment_method=data.get("payment_method"))
    db.session.commit()
    return jsonify(payment.to_dict()), 200


# ─────────────────────────────────────────────
#  DASHBOARD / REPORTS (User-Scoped)
# ─────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    user_id = int(get_jwt_identity())
    
    # Get user's properties
    total_properties = Property.query.filter_by(user_id=user_id, is_active=True).count()
    
    # Get user's tenants
    total_tenants = Tenant.query.filter_by(user_id=user_id, is_active=True).count()
    
    # Get user's payments stats
    base_query = RentPayment.query.filter_by(user_id=user_id)
    total_payments = base_query.count()
    paid = base_query.filter_by(status="paid").count()
    pending = base_query.filter_by(status="pending").count()
    overdue = base_query.filter_by(status="overdue").count()
    
    # Calculate revenue from user's payments only
    total_revenue = db.session.query(
        db.func.sum(RentPayment.amount_paid)
    ).filter_by(user_id=user_id, status="paid").scalar() or 0

    # Additional user-specific metrics
    upcoming_due = base_query.filter(
        RentPayment.status == "pending",
        RentPayment.due_date >= datetime.utcnow().date()
    ).count()

    return jsonify({
        "total_properties": total_properties,
        "total_tenants": total_tenants,
        "total_payments": total_payments,
        "paid": paid,
        "pending": pending,
        "overdue": overdue,
        "upcoming_due": upcoming_due,
        "total_revenue": round(float(total_revenue), 2),
    }), 200


@app.route("/api/dashboard/recent-payments", methods=["GET"])
@jwt_required()
def recent_payments():
    """Get recent payments for the dashboard"""
    user_id = int(get_jwt_identity())
    limit = request.args.get('limit', 10, type=int)
    
    payments = RentPayment.query.filter_by(user_id=user_id)\
        .order_by(RentPayment.created_at.desc())\
        .limit(limit)\
        .all()
    
    return jsonify([p.to_dict(include_relations=True) for p in payments]), 200


@app.route("/api/dashboard/overdue-payments", methods=["GET"])
@jwt_required()
def overdue_payments():
    """Get all overdue payments for the user"""
    user_id = int(get_jwt_identity())
    
    payments = RentPayment.query.filter_by(
        user_id=user_id, 
        status="overdue"
    ).order_by(RentPayment.due_date.asc()).all()
    
    return jsonify([p.to_dict(include_relations=True) for p in payments]), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5555)