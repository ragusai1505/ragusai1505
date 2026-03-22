from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'cafe-ikigai-secret-key')
JWT_ALGORITHM = "HS256"

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Create the main app
app = FastAPI(title="Cafe Ikigai API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ROLE DEFINITIONS ====================
ROLES = {
    "super_admin": {
        "level": 100,
        "permissions": ["all"]
    },
    "manager": {
        "level": 50,
        "permissions": ["view_orders", "manage_orders", "view_inventory", "manage_inventory", 
                       "view_reports", "view_expenses", "manage_expenses", "view_users"]
    },
    "staff": {
        "level": 10,
        "permissions": ["view_orders", "manage_orders", "view_inventory"]
    }
}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "customer"
    is_admin: bool = False
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    is_available: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    is_available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None

# Inventory Models
class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sku: str
    category: str  # raw_materials, packaging, equipment, etc.
    supplier_name: Optional[str] = None
    cost_price: float
    selling_price: float
    quantity: int
    low_stock_threshold: int = 10
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None
    unit: str = "pieces"  # pieces, kg, liters, etc.
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InventoryItemCreate(BaseModel):
    name: str
    sku: str
    category: str
    supplier_name: Optional[str] = None
    cost_price: float
    selling_price: float
    quantity: int
    low_stock_threshold: int = 10
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None
    unit: str = "pieces"

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    expiry_date: Optional[str] = None
    image_url: Optional[str] = None
    unit: Optional[str] = None

class StockAdjustment(BaseModel):
    inventory_id: str
    adjustment_type: str  # restock, damage, wastage, sale, manual
    quantity: int  # positive for add, negative for reduce
    reason: Optional[str] = None

class InventoryLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inventory_id: str
    inventory_name: str
    adjustment_type: str
    quantity_change: int
    previous_quantity: int
    new_quantity: int
    reason: Optional[str] = None
    user_id: str
    user_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Expense Models
class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # inventory_purchase, rent, utilities, salaries, miscellaneous
    description: str
    amount: float
    date: str
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    date: str
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None

# Audit Log Model
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    action: str  # create, update, delete, view
    resource_type: str  # inventory, expense, order, user, menu
    resource_id: Optional[str] = None
    details: Optional[Dict] = None
    ip_address: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Review Model
class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    user_id: str
    user_name: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    menu_item_id: str
    rating: int
    comment: Optional[str] = None

# Loyalty Points Model
class LoyaltyPoints(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    points: int = 0
    lifetime_points: int = 0
    tier: str = "bronze"  # bronze, silver, gold, platinum
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoyaltyTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    points: int
    transaction_type: str  # earned, redeemed, expired
    order_id: Optional[str] = None
    description: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Staff Management Model
class StaffMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    is_active: bool = True
    created_at: str
    last_login: Optional[str] = None

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # manager, staff

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class CartItem(BaseModel):
    menu_item_id: str
    quantity: int

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    items: List[OrderItem]
    total: float
    status: str = "pending"
    payment_status: str = "pending"
    payment_session_id: Optional[str] = None
    delivery_address: str
    phone: str
    notes: Optional[str] = None
    points_earned: int = 0
    points_redeemed: int = 0
    discount_applied: float = 0
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    estimated_delivery: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[CartItem]
    delivery_address: str
    phone: str
    notes: Optional[str] = None
    origin_url: str
    redeem_points: int = 0

class OrderCancel(BaseModel):
    reason: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    order_id: str
    user_id: str
    user_email: str
    amount: float
    currency: str = "inr"
    payment_status: str = "initiated"
    payment_method: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, is_admin: bool, role: str = "customer") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if not user.get("is_admin") and user.get("role") not in ["super_admin", "manager", "staff"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_manager_user(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    return user

async def get_super_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

def check_permission(user: dict, permission: str) -> bool:
    role = user.get("role", "customer")
    if role == "super_admin":
        return True
    role_perms = ROLES.get(role, {}).get("permissions", [])
    return "all" in role_perms or permission in role_perms

async def log_audit(user: dict, action: str, resource_type: str, resource_id: str = None, details: dict = None, request: Request = None):
    audit = AuditLog(
        user_id=user.get("id"),
        user_name=user.get("name"),
        user_role=user.get("role", "customer"),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=request.client.host if request else None
    )
    await db.audit_logs.insert_one(audit.model_dump())

# ==================== LOYALTY HELPERS ====================

def calculate_tier(lifetime_points: int) -> str:
    if lifetime_points >= 10000:
        return "platinum"
    elif lifetime_points >= 5000:
        return "gold"
    elif lifetime_points >= 1000:
        return "silver"
    return "bronze"

def get_points_multiplier(tier: str) -> float:
    multipliers = {"bronze": 1.0, "silver": 1.25, "gold": 1.5, "platinum": 2.0}
    return multipliers.get(tier, 1.0)

async def add_loyalty_points(user_id: str, order_total: float, order_id: str):
    # Get user's loyalty record
    loyalty = await db.loyalty_points.find_one({"user_id": user_id})
    
    if not loyalty:
        loyalty = {"user_id": user_id, "points": 0, "lifetime_points": 0, "tier": "bronze"}
    
    # Calculate points: 1 point per ₹10 spent, multiplied by tier
    multiplier = get_points_multiplier(loyalty.get("tier", "bronze"))
    points_earned = int((order_total / 10) * multiplier)
    
    new_points = loyalty.get("points", 0) + points_earned
    new_lifetime = loyalty.get("lifetime_points", 0) + points_earned
    new_tier = calculate_tier(new_lifetime)
    
    await db.loyalty_points.update_one(
        {"user_id": user_id},
        {"$set": {
            "points": new_points,
            "lifetime_points": new_lifetime,
            "tier": new_tier,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Log transaction
    transaction = LoyaltyTransaction(
        user_id=user_id,
        points=points_earned,
        transaction_type="earned",
        order_id=order_id,
        description=f"Earned {points_earned} points from order"
    )
    await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    return points_earned

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "role": "customer",
        "is_admin": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Initialize loyalty points
    await db.loyalty_points.insert_one({
        "user_id": user_id,
        "points": 0,
        "lifetime_points": 0,
        "tier": "bronze",
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    token = create_token(user_id, user_data.email, False, "customer")
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role="customer",
            is_admin=False,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user["id"], user["email"], user.get("is_admin", False), user.get("role", "customer"))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user.get("role", "customer"),
            is_admin=user.get("is_admin", False),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user.get("role", "customer"),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"]
    )

# ==================== LOYALTY ROUTES ====================

@api_router.get("/loyalty/my-points")
async def get_my_loyalty(user: dict = Depends(get_current_user)):
    loyalty = await db.loyalty_points.find_one({"user_id": user["id"]}, {"_id": 0})
    if not loyalty:
        loyalty = {"user_id": user["id"], "points": 0, "lifetime_points": 0, "tier": "bronze"}
    
    # Get recent transactions
    transactions = await db.loyalty_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "points": loyalty.get("points", 0),
        "lifetime_points": loyalty.get("lifetime_points", 0),
        "tier": loyalty.get("tier", "bronze"),
        "points_value": loyalty.get("points", 0) * 0.5,  # 1 point = ₹0.50
        "next_tier_at": get_next_tier_threshold(loyalty.get("lifetime_points", 0)),
        "transactions": transactions
    }

def get_next_tier_threshold(lifetime_points: int) -> dict:
    if lifetime_points < 1000:
        return {"tier": "silver", "points_needed": 1000 - lifetime_points}
    elif lifetime_points < 5000:
        return {"tier": "gold", "points_needed": 5000 - lifetime_points}
    elif lifetime_points < 10000:
        return {"tier": "platinum", "points_needed": 10000 - lifetime_points}
    return {"tier": "max", "points_needed": 0}

# ==================== MENU ROUTES ====================

@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu(category: Optional[str] = None):
    query = {"is_available": True}
    if category:
        query["category"] = category
    items = await db.menu_items.find(query, {"_id": 0}).to_list(100)
    return items

@api_router.get("/menu/all", response_model=List[MenuItem])
async def get_all_menu(user: dict = Depends(get_admin_user)):
    items = await db.menu_items.find({}, {"_id": 0}).to_list(100)
    return items

@api_router.get("/menu/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, request: Request, user: dict = Depends(get_admin_user)):
    menu_item = MenuItem(**item.model_dump())
    await db.menu_items.insert_one(menu_item.model_dump())
    await log_audit(user, "create", "menu", menu_item.id, {"name": item.name}, request)
    return menu_item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, updates: MenuItemUpdate, request: Request, user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.menu_items.find_one_and_update(
        {"id": item_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await log_audit(user, "update", "menu", item_id, update_data, request)
    result.pop("_id", None)
    return result

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, request: Request, user: dict = Depends(get_admin_user)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await log_audit(user, "delete", "menu", item_id, None, request)
    return {"message": "Menu item deleted"}

@api_router.get("/categories")
async def get_categories():
    categories = await db.menu_items.distinct("category")
    return categories

# ==================== REVIEWS ROUTES ====================

@api_router.get("/menu/{item_id}/reviews")
async def get_item_reviews(item_id: str):
    reviews = await db.reviews.find({"menu_item_id": item_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    avg_rating = 0
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    return {"reviews": reviews, "average_rating": round(avg_rating, 1), "total_reviews": len(reviews)}

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if user has ordered this item
    order_with_item = await db.orders.find_one({
        "user_id": user["id"],
        "items.menu_item_id": review_data.menu_item_id,
        "status": "delivered"
    })
    if not order_with_item:
        raise HTTPException(status_code=400, detail="You can only review items you've ordered")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "user_id": user["id"],
        "menu_item_id": review_data.menu_item_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You've already reviewed this item")
    
    review = Review(
        menu_item_id=review_data.menu_item_id,
        user_id=user["id"],
        user_name=user["name"],
        rating=max(1, min(5, review_data.rating)),
        comment=review_data.comment
    )
    await db.reviews.insert_one(review.model_dump())
    return {"message": "Review submitted", "review": review.model_dump()}

# ==================== INVENTORY ROUTES ====================

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    user: dict = Depends(get_admin_user)
):
    if not check_permission(user, "view_inventory"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = {}
    if category:
        query["category"] = category
    
    items = await db.inventory.find(query, {"_id": 0}).to_list(500)
    
    if low_stock_only:
        items = [i for i in items if i["quantity"] <= i["low_stock_threshold"]]
    
    return items

@api_router.get("/inventory/categories")
async def get_inventory_categories(user: dict = Depends(get_admin_user)):
    categories = await db.inventory.distinct("category")
    return categories

@api_router.get("/inventory/low-stock")
async def get_low_stock_items(user: dict = Depends(get_admin_user)):
    pipeline = [
        {"$match": {"$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}},
        {"$project": {"_id": 0}}
    ]
    items = await db.inventory.aggregate(pipeline).to_list(100)
    return {"count": len(items), "items": items}

@api_router.get("/inventory/{item_id}")
async def get_inventory_item(item_id: str, user: dict = Depends(get_admin_user)):
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item

@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item: InventoryItemCreate, request: Request, user: dict = Depends(get_manager_user)):
    # Check for duplicate SKU
    existing = await db.inventory.find_one({"sku": item.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    inventory_item = InventoryItem(**item.model_dump())
    await db.inventory.insert_one(inventory_item.model_dump())
    
    # Log the creation
    log = InventoryLog(
        inventory_id=inventory_item.id,
        inventory_name=inventory_item.name,
        adjustment_type="initial",
        quantity_change=item.quantity,
        previous_quantity=0,
        new_quantity=item.quantity,
        reason="Initial stock",
        user_id=user["id"],
        user_name=user["name"]
    )
    await db.inventory_logs.insert_one(log.model_dump())
    await log_audit(user, "create", "inventory", inventory_item.id, {"name": item.name, "quantity": item.quantity}, request)
    
    return inventory_item

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, updates: InventoryItemUpdate, request: Request, user: dict = Depends(get_manager_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.inventory.find_one_and_update(
        {"id": item_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    await log_audit(user, "update", "inventory", item_id, update_data, request)
    result.pop("_id", None)
    return result

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, request: Request, user: dict = Depends(get_manager_user)):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await log_audit(user, "delete", "inventory", item_id, None, request)
    return {"message": "Inventory item deleted"}

@api_router.post("/inventory/adjust")
async def adjust_stock(adjustment: StockAdjustment, request: Request, user: dict = Depends(get_admin_user)):
    item = await db.inventory.find_one({"id": adjustment.inventory_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    new_quantity = item["quantity"] + adjustment.quantity
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Cannot reduce stock below 0")
    
    await db.inventory.update_one(
        {"id": adjustment.inventory_id},
        {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log the adjustment
    log = InventoryLog(
        inventory_id=adjustment.inventory_id,
        inventory_name=item["name"],
        adjustment_type=adjustment.adjustment_type,
        quantity_change=adjustment.quantity,
        previous_quantity=item["quantity"],
        new_quantity=new_quantity,
        reason=adjustment.reason,
        user_id=user["id"],
        user_name=user["name"]
    )
    await db.inventory_logs.insert_one(log.model_dump())
    await log_audit(user, "adjust", "inventory", adjustment.inventory_id, 
                   {"type": adjustment.adjustment_type, "change": adjustment.quantity}, request)
    
    return {"message": "Stock adjusted", "previous": item["quantity"], "new": new_quantity}

@api_router.get("/inventory/{item_id}/history")
async def get_inventory_history(item_id: str, user: dict = Depends(get_admin_user)):
    logs = await db.inventory_logs.find({"inventory_id": item_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs

# ==================== EXPENSE ROUTES ====================

@api_router.get("/expenses")
async def get_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_manager_user)
):
    if not check_permission(user, "view_expenses"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    query = {}
    if category:
        query["category"] = category
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    total = sum(e.get("amount", 0) for e in expenses)
    
    return {"expenses": expenses, "total": round(total, 2), "count": len(expenses)}

@api_router.get("/expenses/categories")
async def get_expense_categories(user: dict = Depends(get_manager_user)):
    return ["inventory_purchase", "rent", "utilities", "salaries", "equipment", "marketing", "miscellaneous"]

@api_router.get("/expenses/{expense_id}")
async def get_expense(expense_id: str, user: dict = Depends(get_manager_user)):
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@api_router.post("/expenses")
async def create_expense(expense_data: ExpenseCreate, request: Request, user: dict = Depends(get_manager_user)):
    if not check_permission(user, "manage_expenses"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    expense = Expense(
        **expense_data.model_dump(),
        created_by=user["id"],
        created_by_name=user["name"]
    )
    await db.expenses.insert_one(expense.model_dump())
    await log_audit(user, "create", "expense", expense.id, {"amount": expense_data.amount, "category": expense_data.category}, request)
    
    return {"message": "Expense recorded", "expense": expense.model_dump()}

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, updates: ExpenseUpdate, request: Request, user: dict = Depends(get_manager_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.expenses.find_one_and_update(
        {"id": expense_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    await log_audit(user, "update", "expense", expense_id, update_data, request)
    result.pop("_id", None)
    return result

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request, user: dict = Depends(get_manager_user)):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    await log_audit(user, "delete", "expense", expense_id, None, request)
    return {"message": "Expense deleted"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Dict)
async def create_order(order_data: OrderCreate, request: Request, user: dict = Depends(get_current_user)):
    order_items = []
    total = 0.0
    
    for cart_item in order_data.items:
        menu_item = await db.menu_items.find_one({"id": cart_item.menu_item_id, "is_available": True}, {"_id": 0})
        if not menu_item:
            raise HTTPException(status_code=400, detail=f"Menu item {cart_item.menu_item_id} not available")
        
        item_total = menu_item["price"] * cart_item.quantity
        total += item_total
        order_items.append(OrderItem(
            menu_item_id=cart_item.menu_item_id,
            name=menu_item["name"],
            price=menu_item["price"],
            quantity=cart_item.quantity
        ))
    
    # Handle points redemption
    discount = 0.0
    points_to_redeem = min(order_data.redeem_points, 0)  # Default to 0
    if order_data.redeem_points > 0:
        loyalty = await db.loyalty_points.find_one({"user_id": user["id"]})
        if loyalty and loyalty.get("points", 0) >= order_data.redeem_points:
            discount = order_data.redeem_points * 0.5  # 1 point = ₹0.50
            discount = min(discount, total * 0.5)  # Max 50% discount
            points_to_redeem = int(discount / 0.5)
    
    final_total = max(0, total - discount)
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order = Order(
        id=order_id,
        user_id=user["id"],
        user_email=user["email"],
        user_name=user["name"],
        items=order_items,
        total=round(final_total, 2),
        delivery_address=order_data.delivery_address,
        phone=order_data.phone,
        notes=order_data.notes,
        points_redeemed=points_to_redeem,
        discount_applied=round(discount, 2),
        created_at=now,
        updated_at=now
    )
    
    # Create Stripe checkout session
    origin_url = order_data.origin_url.rstrip('/')
    success_url = f"{origin_url}/order-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/checkout"
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order.total),
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": order_id,
            "user_id": user["id"],
            "user_email": user["email"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    order.payment_session_id = session.session_id
    
    await db.orders.insert_one(order.model_dump())
    
    # Deduct redeemed points
    if points_to_redeem > 0:
        await db.loyalty_points.update_one(
            {"user_id": user["id"]},
            {"$inc": {"points": -points_to_redeem}}
        )
        transaction = LoyaltyTransaction(
            user_id=user["id"],
            points=-points_to_redeem,
            transaction_type="redeemed",
            order_id=order_id,
            description=f"Redeemed {points_to_redeem} points for ₹{discount:.2f} discount"
        )
        await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    payment_tx = PaymentTransaction(
        session_id=session.session_id,
        order_id=order_id,
        user_id=user["id"],
        user_email=user["email"],
        amount=order.total,
        currency="inr",
        payment_status="initiated"
    )
    await db.payment_transactions.insert_one(payment_tx.model_dump())
    
    return {
        "order_id": order_id,
        "checkout_url": session.url,
        "session_id": session.session_id,
        "discount_applied": discount,
        "points_redeemed": points_to_redeem
    }

@api_router.get("/orders", response_model=List[Order])
async def get_user_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return order

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, cancel_data: OrderCancel, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Can only cancel pending orders
    if order["status"] not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel order in current status")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "cancelled",
            "cancellation_reason": cancel_data.reason,
            "cancelled_at": now,
            "updated_at": now
        }}
    )
    
    # Refund redeemed points
    if order.get("points_redeemed", 0) > 0:
        await db.loyalty_points.update_one(
            {"user_id": order["user_id"]},
            {"$inc": {"points": order["points_redeemed"]}}
        )
        transaction = LoyaltyTransaction(
            user_id=order["user_id"],
            points=order["points_redeemed"],
            transaction_type="refunded",
            order_id=order_id,
            description=f"Refunded {order['points_redeemed']} points due to order cancellation"
        )
        await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    return {"message": "Order cancelled", "refund_points": order.get("points_redeemed", 0)}

@api_router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0, "user_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "id": order["id"],
        "status": order["status"],
        "payment_status": order["payment_status"],
        "items": order["items"],
        "total": order["total"],
        "estimated_delivery": order.get("estimated_delivery"),
        "created_at": order["created_at"]
    }

# ==================== ADMIN ORDER ROUTES ====================

@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(status: Optional[str] = None, user: dict = Depends(get_admin_user)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, request: Request, user: dict = Depends(get_admin_user)):
    valid_statuses = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "confirmed":
        estimated = datetime.now(timezone.utc) + timedelta(minutes=30)
        update_data["estimated_delivery"] = estimated.isoformat()
    
    # Award loyalty points when delivered
    if status == "delivered" and order["status"] != "delivered":
        points_earned = await add_loyalty_points(order["user_id"], order["total"], order_id)
        update_data["points_earned"] = points_earned
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    await log_audit(user, "update_status", "order", order_id, {"status": status}, request)
    
    return {"message": "Order status updated", "status": status}

# ==================== ADMIN STATS & REPORTS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    completed_orders = await db.orders.count_documents({"status": "delivered"})
    
    paid_orders = await db.orders.find({"payment_status": "paid"}, {"total": 1}).to_list(1000)
    total_revenue = sum(order.get("total", 0) for order in paid_orders)
    
    total_users = await db.users.count_documents({"role": "customer"})
    total_menu_items = await db.menu_items.count_documents({})
    
    # Low stock items count
    pipeline = [{"$match": {"$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}}]
    low_stock = await db.inventory.aggregate(pipeline).to_list(100)
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_revenue": round(total_revenue, 2),
        "total_users": total_users,
        "total_menu_items": total_menu_items,
        "low_stock_count": len(low_stock)
    }

@api_router.get("/admin/reports/sales")
async def get_sales_report(
    period: str = "daily",  # daily, weekly, monthly, custom
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_manager_user)
):
    if not check_permission(user, "view_reports"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    now = datetime.now(timezone.utc)
    
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start = now - timedelta(days=7)
    elif period == "monthly":
        start = now - timedelta(days=30)
    elif period == "custom" and start_date:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    else:
        start = now - timedelta(days=1)
    
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now
    
    # Get orders in date range
    orders = await db.orders.find({
        "payment_status": "paid",
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Top selling products
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            name = item.get("name")
            if name in product_sales:
                product_sales[name]["quantity"] += item.get("quantity", 0)
                product_sales[name]["revenue"] += item.get("price", 0) * item.get("quantity", 0)
            else:
                product_sales[name] = {
                    "name": name,
                    "quantity": item.get("quantity", 0),
                    "revenue": item.get("price", 0) * item.get("quantity", 0)
                }
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    # Daily breakdown
    daily_sales = {}
    for order in orders:
        date = order["created_at"][:10]
        if date in daily_sales:
            daily_sales[date]["orders"] += 1
            daily_sales[date]["revenue"] += order.get("total", 0)
        else:
            daily_sales[date] = {"date": date, "orders": 1, "revenue": order.get("total", 0)}
    
    # Peak hours
    hour_sales = {}
    for order in orders:
        hour = order["created_at"][11:13]
        if hour in hour_sales:
            hour_sales[hour] += 1
        else:
            hour_sales[hour] = 1
    
    peak_hours = sorted(hour_sales.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": round(avg_order_value, 2),
        "top_products": top_products,
        "daily_breakdown": sorted(daily_sales.values(), key=lambda x: x["date"]),
        "peak_hours": [{"hour": h, "orders": c} for h, c in peak_hours]
    }

@api_router.get("/admin/reports/financial")
async def get_financial_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_manager_user)
):
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else now - timedelta(days=30)
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now
    
    # Revenue
    orders = await db.orders.find({
        "payment_status": "paid",
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0, "total": 1}).to_list(10000)
    total_revenue = sum(o.get("total", 0) for o in orders)
    
    # Expenses
    expenses = await db.expenses.find({
        "date": {"$gte": start.isoformat()[:10], "$lte": end.isoformat()[:10]}
    }, {"_id": 0}).to_list(10000)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    
    # Expense breakdown by category
    expense_by_category = {}
    for e in expenses:
        cat = e.get("category", "miscellaneous")
        if cat in expense_by_category:
            expense_by_category[cat] += e.get("amount", 0)
        else:
            expense_by_category[cat] = e.get("amount", 0)
    
    net_profit = total_revenue - total_expenses
    profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "revenue": round(total_revenue, 2),
        "expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "profit_margin": round(profit_margin, 1),
        "expense_breakdown": [{"category": k, "amount": round(v, 2)} for k, v in expense_by_category.items()],
        "is_profitable": net_profit > 0
    }

# ==================== STAFF MANAGEMENT ====================

@api_router.get("/admin/staff", response_model=List[StaffMember])
async def get_staff(user: dict = Depends(get_super_admin)):
    staff = await db.users.find(
        {"role": {"$in": ["super_admin", "manager", "staff"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return staff

@api_router.post("/admin/staff")
async def create_staff(staff_data: StaffCreate, request: Request, user: dict = Depends(get_super_admin)):
    if staff_data.role not in ["manager", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    existing = await db.users.find_one({"email": staff_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    staff_id = str(uuid.uuid4())
    staff_doc = {
        "id": staff_id,
        "email": staff_data.email,
        "name": staff_data.name,
        "password_hash": hash_password(staff_data.password),
        "role": staff_data.role,
        "is_admin": True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(staff_doc)
    await log_audit(user, "create", "staff", staff_id, {"email": staff_data.email, "role": staff_data.role}, request)
    
    return {"message": "Staff member created", "id": staff_id}

@api_router.put("/admin/staff/{staff_id}")
async def update_staff(staff_id: str, updates: StaffUpdate, request: Request, user: dict = Depends(get_super_admin)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    if "role" in update_data and update_data["role"] not in ["manager", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": staff_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    await log_audit(user, "update", "staff", staff_id, update_data, request)
    return {"message": "Staff updated"}

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(staff_id: str, request: Request, user: dict = Depends(get_super_admin)):
    # Can't delete yourself
    if staff_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": staff_id, "role": {"$in": ["manager", "staff"]}})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    await log_audit(user, "delete", "staff", staff_id, None, request)
    return {"message": "Staff deleted"}

# ==================== AUDIT LOGS ====================

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_super_admin)
):
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

# ==================== DATABASE ACCESS ====================

@api_router.get("/admin/database/tables")
async def get_database_tables(user: dict = Depends(get_super_admin)):
    collections = await db.list_collection_names()
    table_stats = []
    for coll in collections:
        count = await db[coll].count_documents({})
        table_stats.append({"name": coll, "count": count})
    return table_stats

@api_router.get("/admin/database/{table_name}")
async def get_table_data(
    table_name: str,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    user: dict = Depends(get_super_admin)
):
    if table_name not in await db.list_collection_names():
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Don't expose password hashes
    projection = {"_id": 0}
    if table_name == "users":
        projection["password_hash"] = 0
    
    query = {}
    if search:
        # Simple text search on common fields
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"id": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db[table_name].count_documents(query)
    data = await db[table_name].find(query, projection).skip(skip).limit(limit).to_list(limit)
    
    return {
        "table": table_name,
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": data
    }

@api_router.post("/admin/database/backup")
async def create_backup(request: Request, user: dict = Depends(get_super_admin)):
    collections = await db.list_collection_names()
    backup_data = {}
    
    for coll in collections:
        data = await db[coll].find({}, {"_id": 0}).to_list(10000)
        backup_data[coll] = data
    
    backup_id = str(uuid.uuid4())
    backup_doc = {
        "id": backup_id,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "collections": list(collections),
        "data": backup_data
    }
    
    await db.backups.insert_one(backup_doc)
    await log_audit(user, "backup", "database", backup_id, {"collections": list(collections)}, request)
    
    return {"message": "Backup created", "backup_id": backup_id}

@api_router.get("/admin/database/backups")
async def list_backups(user: dict = Depends(get_super_admin)):
    backups = await db.backups.find({}, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(20)
    return backups

# ==================== PAYMENT ROUTES ====================

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            await db.orders.update_one(
                {"payment_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    order_id = status.metadata.get("order_id") if status.metadata else None
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "order_id": order_id
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            order_id = webhook_response.metadata.get("order_id") if webhook_response.metadata else None
            if order_id:
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

# ==================== ROOT & HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "Cafe Ikigai API", "status": "running", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    existing = await db.menu_items.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    menu_items = [
        {"id": str(uuid.uuid4()), "name": "Signature Espresso", "description": "Bold, smooth, full-bodied. Our house blend with notes of dark chocolate and caramel.", "price": 149.0, "category": "Espresso", "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Vanilla Oat Latte", "description": "Creamy oat milk with real Madagascar vanilla and our signature espresso.", "price": 299.0, "category": "Lattes", "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Cold Brew Reserve", "description": "24-hour slow steeped perfection. Smooth, rich, and naturally sweet.", "price": 269.0, "category": "Cold Brews", "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Caramel Macchiato", "description": "Layered espresso with buttery caramel and silky steamed milk.", "price": 279.0, "category": "Lattes", "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Matcha Latte", "description": "Ceremonial grade matcha, silky smooth with your choice of milk.", "price": 299.0, "category": "Specialty", "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Hazelnut Mocha", "description": "Rich chocolate meets roasted hazelnut with our signature espresso.", "price": 319.0, "category": "Mochas", "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Classic Americano", "description": "Double shot espresso with hot water. Simple, bold, perfect.", "price": 129.0, "category": "Espresso", "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Cappuccino", "description": "Perfect balance of espresso, steamed milk, and velvety foam.", "price": 199.0, "category": "Lattes", "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Iced Caramel Latte", "description": "Cold espresso with caramel and milk over ice. Refreshingly sweet.", "price": 289.0, "category": "Cold Brews", "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Butter Croissant", "description": "Freshly baked, flaky, buttery goodness. Perfect with any coffee.", "price": 149.0, "category": "Pastries", "image_url": "https://images.pexels.com/photos/4828368/pexels-photo-4828368.jpeg", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Chocolate Muffin", "description": "Decadent chocolate muffin with chocolate chips inside.", "price": 129.0, "category": "Pastries", "image_url": "https://images.pexels.com/photos/4828368/pexels-photo-4828368.jpeg", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Double Chocolate Mocha", "description": "For serious chocolate lovers. Double chocolate with espresso.", "price": 349.0, "category": "Mochas", "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c", "is_available": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.menu_items.insert_many(menu_items)
    
    # Create super admin
    admin_exists = await db.users.find_one({"email": "admin@cafeikigai.com"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@cafeikigai.com",
            "name": "Super Admin",
            "password_hash": hash_password("admin123"),
            "role": "super_admin",
            "is_admin": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    # Seed inventory items
    inventory_items = [
        {"id": str(uuid.uuid4()), "name": "Arabica Coffee Beans", "sku": "INV-001", "category": "raw_materials", "supplier_name": "Premium Beans Co", "cost_price": 500.0, "selling_price": 0, "quantity": 50, "low_stock_threshold": 10, "unit": "kg", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Oat Milk", "sku": "INV-002", "category": "raw_materials", "supplier_name": "Dairy Alternatives Ltd", "cost_price": 120.0, "selling_price": 0, "quantity": 100, "low_stock_threshold": 20, "unit": "liters", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Paper Cups (12oz)", "sku": "INV-003", "category": "packaging", "supplier_name": "EcoPack", "cost_price": 2.0, "selling_price": 0, "quantity": 500, "low_stock_threshold": 100, "unit": "pieces", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Vanilla Syrup", "sku": "INV-004", "category": "raw_materials", "supplier_name": "Flavor House", "cost_price": 350.0, "selling_price": 0, "quantity": 15, "low_stock_threshold": 5, "unit": "bottles", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Caramel Syrup", "sku": "INV-005", "category": "raw_materials", "supplier_name": "Flavor House", "cost_price": 350.0, "selling_price": 0, "quantity": 12, "low_stock_threshold": 5, "unit": "bottles", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.inventory.insert_many(inventory_items)
    
    # Seed some expenses
    expenses = [
        {"id": str(uuid.uuid4()), "category": "rent", "description": "Monthly shop rent", "amount": 50000.0, "date": datetime.now(timezone.utc).isoformat()[:10], "vendor": "Property Management", "created_by": "system", "created_by_name": "System", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category": "utilities", "description": "Electricity bill", "amount": 8500.0, "date": datetime.now(timezone.utc).isoformat()[:10], "vendor": "Power Corp", "created_by": "system", "created_by_name": "System", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category": "inventory_purchase", "description": "Coffee beans restock", "amount": 25000.0, "date": datetime.now(timezone.utc).isoformat()[:10], "vendor": "Premium Beans Co", "created_by": "system", "created_by_name": "System", "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.expenses.insert_many(expenses)
    
    return {"message": "Data seeded successfully", "items_created": len(menu_items), "inventory_items": len(inventory_items)}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
