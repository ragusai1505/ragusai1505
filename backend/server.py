from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

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
    status: str = "pending"  # pending, confirmed, preparing, out_for_delivery, delivered, cancelled
    payment_status: str = "pending"  # pending, paid, failed
    payment_session_id: Optional[str] = None
    delivery_address: str
    phone: str
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    estimated_delivery: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[CartItem]
    delivery_address: str
    phone: str
    notes: Optional[str] = None
    origin_url: str

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, is_admin: bool) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
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
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        return user
    except:
        return None

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
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, False)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            is_admin=False,
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user.get("is_admin", False))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
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
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"]
    )

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
async def create_menu_item(item: MenuItemCreate, user: dict = Depends(get_admin_user)):
    menu_item = MenuItem(**item.model_dump())
    await db.menu_items.insert_one(menu_item.model_dump())
    return menu_item

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, updates: MenuItemUpdate, user: dict = Depends(get_admin_user)):
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
    
    # Return without _id
    result.pop("_id", None)
    return result

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, user: dict = Depends(get_admin_user)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

@api_router.get("/categories")
async def get_categories():
    categories = await db.menu_items.distinct("category")
    return categories

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Dict)
async def create_order(order_data: OrderCreate, request: Request, user: dict = Depends(get_current_user)):
    # Validate and calculate order
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
    
    # Create order
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order = Order(
        id=order_id,
        user_id=user["id"],
        user_email=user["email"],
        user_name=user["name"],
        items=order_items,
        total=round(total, 2),
        delivery_address=order_data.delivery_address,
        phone=order_data.phone,
        notes=order_data.notes,
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
    
    # Update order with session ID
    order.payment_session_id = session.session_id
    
    # Save order
    await db.orders.insert_one(order.model_dump())
    
    # Create payment transaction record
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
        "session_id": session.session_id
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
async def update_order_status(order_id: str, status: str, user: dict = Depends(get_admin_user)):
    valid_statuses = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Set estimated delivery when confirmed
    if status == "confirmed":
        from datetime import timedelta
        estimated = datetime.now(timezone.utc) + timedelta(minutes=30)
        update_data["estimated_delivery"] = estimated.isoformat()
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated", "status": status}

# ==================== ADMIN STATS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    completed_orders = await db.orders.count_documents({"status": "delivered"})
    
    # Calculate revenue from paid orders
    paid_orders = await db.orders.find({"payment_status": "paid"}, {"total": 1}).to_list(1000)
    total_revenue = sum(order.get("total", 0) for order in paid_orders)
    
    total_users = await db.users.count_documents({})
    total_menu_items = await db.menu_items.count_documents({})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_revenue": round(total_revenue, 2),
        "total_users": total_users,
        "total_menu_items": total_menu_items
    }

# ==================== PAYMENT ROUTES ====================

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction and order if paid
    if status.payment_status == "paid":
        # Check if already processed
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Update order payment status
            await db.orders.update_one(
                {"payment_session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Get order ID from metadata
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
            
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update order
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
    return {"message": "Cafe Ikigai API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.menu_items.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    menu_items = [
        {
            "id": str(uuid.uuid4()),
            "name": "Signature Espresso",
            "description": "Bold, smooth, full-bodied. Our house blend with notes of dark chocolate and caramel.",
            "price": 149.0,
            "category": "Espresso",
            "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vanilla Oat Latte",
            "description": "Creamy oat milk with real Madagascar vanilla and our signature espresso.",
            "price": 299.0,
            "category": "Lattes",
            "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cold Brew Reserve",
            "description": "24-hour slow steeped perfection. Smooth, rich, and naturally sweet.",
            "price": 269.0,
            "category": "Cold Brews",
            "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Caramel Macchiato",
            "description": "Layered espresso with buttery caramel and silky steamed milk.",
            "price": 279.0,
            "category": "Lattes",
            "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Matcha Latte",
            "description": "Ceremonial grade matcha, silky smooth with your choice of milk.",
            "price": 299.0,
            "category": "Specialty",
            "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hazelnut Mocha",
            "description": "Rich chocolate meets roasted hazelnut with our signature espresso.",
            "price": 319.0,
            "category": "Mochas",
            "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Classic Americano",
            "description": "Double shot espresso with hot water. Simple, bold, perfect.",
            "price": 129.0,
            "category": "Espresso",
            "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cappuccino",
            "description": "Perfect balance of espresso, steamed milk, and velvety foam.",
            "price": 199.0,
            "category": "Lattes",
            "image_url": "https://images.unsplash.com/photo-1705672763732-538d9a515ec1",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Iced Caramel Latte",
            "description": "Cold espresso with caramel and milk over ice. Refreshingly sweet.",
            "price": 289.0,
            "category": "Cold Brews",
            "image_url": "https://images.unsplash.com/photo-1630040995437-80b01c5dd52d",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Butter Croissant",
            "description": "Freshly baked, flaky, buttery goodness. Perfect with any coffee.",
            "price": 149.0,
            "category": "Pastries",
            "image_url": "https://images.pexels.com/photos/4828368/pexels-photo-4828368.jpeg",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Chocolate Muffin",
            "description": "Decadent chocolate muffin with chocolate chips inside.",
            "price": 129.0,
            "category": "Pastries",
            "image_url": "https://images.pexels.com/photos/4828368/pexels-photo-4828368.jpeg",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Double Chocolate Mocha",
            "description": "For serious chocolate lovers. Double chocolate with espresso.",
            "price": 349.0,
            "category": "Mochas",
            "image_url": "https://images.unsplash.com/photo-1553578615-ee00f2db2c5c",
            "is_available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.menu_items.insert_many(menu_items)
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@cafeikigai.com"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@cafeikigai.com",
            "name": "Admin",
            "password_hash": hash_password("admin123"),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    return {"message": "Data seeded successfully", "items_created": len(menu_items)}

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
