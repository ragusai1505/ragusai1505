"""
Cafe Ikigai AI Chatbot Module
Intelligent virtual barista assistant
"""
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Chatbot system prompt
BARISTA_SYSTEM_PROMPT = """You are Ikigai, a friendly and intelligent AI barista assistant for Cafe Ikigai coffee shop. Your personality is warm, helpful, and enthusiastic about coffee.

## Your Capabilities:
1. **Menu Browsing**: Help customers explore our menu, describe items, suggest based on preferences
2. **Order Assistance**: Add items to cart, customize orders (size, milk type, sugar level)
3. **Order Tracking**: Check order status when customers provide order ID
4. **Recommendations**: Suggest popular items, combos, or personalized picks based on time of day
5. **Promotions**: Share current offers and help apply discount codes
6. **Account Support**: Help with order history, loyalty points queries

## Response Guidelines:
- Be concise and friendly, use light emojis (☕😊🎉) sparingly
- Always confirm actions: "I've added X to your cart!"
- Ask clarifying questions when needed
- For menu items, mention name, price, and brief description
- When recommending, explain why ("Perfect for a morning boost!")
- If item is unavailable, suggest alternatives
- For order tracking, ask for order ID if not provided
- End interactions with helpful follow-ups like "Anything else I can help with?"

## Time-based Greetings:
- Morning (5AM-12PM): Focus on breakfast combos, energizing drinks
- Afternoon (12PM-5PM): Suggest refreshing cold brews, light snacks
- Evening (5PM-10PM): Cozy drinks, desserts, wind-down options

## Important Rules:
- Never make up menu items or prices - use only what's provided in context
- If you can't help with something, politely redirect
- Keep responses under 150 words unless detailed explanation needed
- When showing multiple items, use a clean list format

## Function Calling:
You have access to functions to:
- get_menu: Fetch current menu items
- search_menu: Search menu by name or category
- get_cart: View customer's current cart
- add_to_cart: Add item to cart
- get_order_status: Track an order by ID
- get_recommendations: Get personalized recommendations
- get_loyalty_points: Check customer's loyalty points
- get_promotions: Get current offers

Always use these functions when customers ask about menu, cart, orders, or loyalty points.
"""

# Function definitions for the chatbot
CHATBOT_FUNCTIONS = [
    {
        "name": "get_menu",
        "description": "Get the full coffee shop menu or filter by category",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Optional category filter (e.g., 'Espresso', 'Lattes', 'Cold Brews', 'Pastries')"
                }
            }
        }
    },
    {
        "name": "search_menu",
        "description": "Search menu items by name or description keywords",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (e.g., 'vanilla', 'cold', 'chocolate')"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_item_details",
        "description": "Get detailed information about a specific menu item",
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the menu item"
                }
            },
            "required": ["item_name"]
        }
    },
    {
        "name": "add_to_cart",
        "description": "Add a menu item to the customer's cart",
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the item to add"
                },
                "quantity": {
                    "type": "integer",
                    "description": "Quantity to add (default 1)"
                },
                "customizations": {
                    "type": "string",
                    "description": "Any customizations (e.g., 'extra shot, oat milk')"
                }
            },
            "required": ["item_name"]
        }
    },
    {
        "name": "get_cart",
        "description": "Get the current items in customer's cart",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "remove_from_cart",
        "description": "Remove an item from the cart",
        "parameters": {
            "type": "object",
            "properties": {
                "item_name": {
                    "type": "string",
                    "description": "Name of the item to remove"
                }
            },
            "required": ["item_name"]
        }
    },
    {
        "name": "get_order_status",
        "description": "Track an order by order ID",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "string",
                    "description": "The order ID to track"
                }
            },
            "required": ["order_id"]
        }
    },
    {
        "name": "get_recommendations",
        "description": "Get personalized drink recommendations",
        "parameters": {
            "type": "object",
            "properties": {
                "preference": {
                    "type": "string",
                    "description": "User preference (e.g., 'hot', 'cold', 'sweet', 'strong', 'healthy')"
                },
                "time_of_day": {
                    "type": "string",
                    "description": "Time context (morning, afternoon, evening)"
                }
            }
        }
    },
    {
        "name": "get_loyalty_points",
        "description": "Check customer's loyalty points balance and tier",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_promotions",
        "description": "Get current offers and promotions",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_user_orders",
        "description": "Get customer's recent order history",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of orders to fetch (default 5)"
                }
            }
        }
    },
    {
        "name": "admin_get_sales_summary",
        "description": "Admin only: Get today's sales summary",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "admin_get_low_stock",
        "description": "Admin only: Get low stock inventory alerts",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]

# Pydantic models
class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: str = None
    function_call: Optional[Dict] = None
    function_result: Optional[Dict] = None

class ChatSession(BaseModel):
    id: str
    user_id: Optional[str] = None
    messages: List[ChatMessage] = []
    cart: List[Dict] = []
    created_at: str
    updated_at: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    cart_updated: bool = False
    cart: Optional[List[Dict]] = None
    action: Optional[Dict] = None  # For frontend actions like showing menu, opening cart

class ChatbotService:
    def __init__(self, db):
        self.db = db
        self.chat_instances = {}
    
    async def get_or_create_session(self, session_id: Optional[str], user_id: Optional[str] = None) -> ChatSession:
        """Get existing session or create new one"""
        if session_id:
            session_doc = await self.db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
            if session_doc:
                return ChatSession(**session_doc)
        
        # Create new session
        new_session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            messages=[],
            cart=[],
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat()
        )
        await self.db.chat_sessions.insert_one(new_session.model_dump())
        return new_session
    
    async def save_session(self, session: ChatSession):
        """Save session to database"""
        session.updated_at = datetime.now(timezone.utc).isoformat()
        await self.db.chat_sessions.update_one(
            {"id": session.id},
            {"$set": session.model_dump()},
            upsert=True
        )
    
    def get_time_of_day(self) -> str:
        """Get current time of day for contextual responses"""
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        else:
            return "evening"
    
    async def execute_function(self, function_name: str, params: Dict, session: ChatSession, user: Optional[Dict] = None) -> Dict:
        """Execute a chatbot function and return result"""
        
        if function_name == "get_menu":
            category = params.get("category")
            query = {"is_available": True}
            if category:
                query["category"] = {"$regex": category, "$options": "i"}
            items = await self.db.menu_items.find(query, {"_id": 0}).to_list(50)
            return {
                "success": True,
                "items": [{"name": i["name"], "price": i["price"], "category": i["category"], "description": i["description"][:100]} for i in items]
            }
        
        elif function_name == "search_menu":
            query_text = params.get("query", "")
            items = await self.db.menu_items.find({
                "is_available": True,
                "$or": [
                    {"name": {"$regex": query_text, "$options": "i"}},
                    {"description": {"$regex": query_text, "$options": "i"}},
                    {"category": {"$regex": query_text, "$options": "i"}}
                ]
            }, {"_id": 0}).to_list(20)
            return {
                "success": True,
                "items": [{"name": i["name"], "price": i["price"], "category": i["category"], "description": i["description"][:100]} for i in items]
            }
        
        elif function_name == "get_item_details":
            item_name = params.get("item_name", "")
            item = await self.db.menu_items.find_one(
                {"name": {"$regex": item_name, "$options": "i"}, "is_available": True},
                {"_id": 0}
            )
            if item:
                return {"success": True, "item": item}
            return {"success": False, "message": f"Item '{item_name}' not found"}
        
        elif function_name == "add_to_cart":
            item_name = params.get("item_name", "")
            quantity = params.get("quantity", 1)
            customizations = params.get("customizations", "")
            
            # Find the item
            item = await self.db.menu_items.find_one(
                {"name": {"$regex": item_name, "$options": "i"}, "is_available": True},
                {"_id": 0}
            )
            if not item:
                return {"success": False, "message": f"Sorry, '{item_name}' is not available"}
            
            # Add to session cart
            cart_item = {
                "id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": quantity,
                "customizations": customizations,
                "image_url": item.get("image_url")
            }
            
            # Check if item already in cart
            existing = next((i for i in session.cart if i["id"] == item["id"]), None)
            if existing:
                existing["quantity"] += quantity
            else:
                session.cart.append(cart_item)
            
            return {
                "success": True,
                "message": f"Added {quantity}x {item['name']} to your cart!",
                "cart": session.cart,
                "cart_total": sum(i["price"] * i["quantity"] for i in session.cart)
            }
        
        elif function_name == "get_cart":
            return {
                "success": True,
                "cart": session.cart,
                "total": sum(i["price"] * i["quantity"] for i in session.cart),
                "item_count": sum(i["quantity"] for i in session.cart)
            }
        
        elif function_name == "remove_from_cart":
            item_name = params.get("item_name", "")
            for i, item in enumerate(session.cart):
                if item_name.lower() in item["name"].lower():
                    removed = session.cart.pop(i)
                    return {"success": True, "message": f"Removed {removed['name']} from cart", "cart": session.cart}
            return {"success": False, "message": f"'{item_name}' not found in your cart"}
        
        elif function_name == "get_order_status":
            order_id = params.get("order_id", "")
            order = await self.db.orders.find_one({"id": {"$regex": order_id, "$options": "i"}}, {"_id": 0})
            if order:
                status_messages = {
                    "pending": "Your order is being processed",
                    "confirmed": "Order confirmed! We're preparing it now",
                    "preparing": "Your barista is crafting your drinks ☕",
                    "out_for_delivery": "Your order is on the way! 🚗",
                    "delivered": "Order delivered! Enjoy! 🎉",
                    "cancelled": "This order was cancelled"
                }
                return {
                    "success": True,
                    "order_id": order["id"][:8],
                    "status": order["status"],
                    "status_message": status_messages.get(order["status"], order["status"]),
                    "items": [{"name": i["name"], "quantity": i["quantity"]} for i in order["items"]],
                    "total": order["total"],
                    "estimated_delivery": order.get("estimated_delivery")
                }
            return {"success": False, "message": "Order not found. Please check the order ID."}
        
        elif function_name == "get_recommendations":
            preference = params.get("preference", "").lower()
            time_of_day = params.get("time_of_day", self.get_time_of_day())
            
            # Build query based on preferences
            query = {"is_available": True}
            
            if "cold" in preference or "iced" in preference:
                query["category"] = {"$regex": "cold|iced", "$options": "i"}
            elif "hot" in preference:
                query["category"] = {"$nin": ["Cold Brews"]}
            
            items = await self.db.menu_items.find(query, {"_id": 0}).to_list(20)
            
            # Sort by price for "budget" or by category match
            recommended = items[:4]
            
            context_tips = {
                "morning": "Perfect for your morning energy boost! ☀️",
                "afternoon": "Great pick-me-up for the afternoon! 🌤️",
                "evening": "Cozy choices to wind down! 🌙"
            }
            
            return {
                "success": True,
                "recommendations": [{"name": i["name"], "price": i["price"], "description": i["description"][:80]} for i in recommended],
                "tip": context_tips.get(time_of_day, "")
            }
        
        elif function_name == "get_loyalty_points":
            if not user:
                return {"success": False, "message": "Please sign in to check your loyalty points"}
            
            loyalty = await self.db.loyalty_points.find_one({"user_id": user["id"]}, {"_id": 0})
            if loyalty:
                return {
                    "success": True,
                    "points": loyalty.get("points", 0),
                    "tier": loyalty.get("tier", "bronze"),
                    "value": loyalty.get("points", 0) * 0.5
                }
            return {"success": True, "points": 0, "tier": "bronze", "value": 0}
        
        elif function_name == "get_promotions":
            # Return current promotions (could be from a promotions collection)
            return {
                "success": True,
                "promotions": [
                    {"title": "First Order Bonus", "description": "Get 50 bonus loyalty points on your first order!", "code": None},
                    {"title": "Happy Hour", "description": "20% off all cold drinks between 2-5 PM", "code": "HAPPYHOUR"},
                    {"title": "Combo Deal", "description": "Any coffee + pastry for ₹349", "code": "COMBO349"}
                ]
            }
        
        elif function_name == "get_user_orders":
            if not user:
                return {"success": False, "message": "Please sign in to view your orders"}
            
            limit = params.get("limit", 5)
            orders = await self.db.orders.find(
                {"user_id": user["id"]},
                {"_id": 0, "id": 1, "status": 1, "total": 1, "created_at": 1, "items": 1}
            ).sort("created_at", -1).limit(limit).to_list(limit)
            
            return {
                "success": True,
                "orders": [{
                    "id": o["id"][:8],
                    "status": o["status"],
                    "total": o["total"],
                    "items": [i["name"] for i in o["items"]],
                    "date": o["created_at"][:10]
                } for o in orders]
            }
        
        elif function_name == "admin_get_sales_summary":
            if not user or user.get("role") not in ["super_admin", "manager"]:
                return {"success": False, "message": "Admin access required"}
            
            today = datetime.now(timezone.utc).isoformat()[:10]
            orders = await self.db.orders.find(
                {"payment_status": "paid", "created_at": {"$regex": f"^{today}"}},
                {"_id": 0, "total": 1}
            ).to_list(1000)
            
            return {
                "success": True,
                "date": today,
                "total_orders": len(orders),
                "total_revenue": sum(o.get("total", 0) for o in orders)
            }
        
        elif function_name == "admin_get_low_stock":
            if not user or user.get("role") not in ["super_admin", "manager"]:
                return {"success": False, "message": "Admin access required"}
            
            pipeline = [{"$match": {"$expr": {"$lte": ["$quantity", "$low_stock_threshold"]}}}]
            items = await self.db.inventory.aggregate(pipeline).to_list(50)
            
            return {
                "success": True,
                "low_stock_items": [{"name": i["name"], "quantity": i["quantity"], "threshold": i["low_stock_threshold"]} for i in items]
            }
        
        return {"success": False, "message": f"Unknown function: {function_name}"}
    
    async def process_message(self, message: str, session_id: Optional[str], user: Optional[Dict] = None) -> ChatResponse:
        """Process a user message and return AI response"""
        
        # Get or create session
        user_id = user["id"] if user else None
        session = await self.get_or_create_session(session_id, user_id)
        
        # Build context from conversation history
        history_context = ""
        if session.messages:
            recent_messages = session.messages[-10:]  # Last 10 messages
            for msg in recent_messages:
                history_context += f"{msg.role}: {msg.content}\n"
        
        # Add cart context
        cart_context = ""
        if session.cart:
            cart_items = ", ".join([f"{i['name']} x{i['quantity']}" for i in session.cart])
            cart_total = sum(i["price"] * i["quantity"] for i in session.cart)
            cart_context = f"\n[Customer's current cart: {cart_items} | Total: ₹{cart_total}]"
        
        # Add user context
        user_context = ""
        if user:
            user_context = f"\n[Customer: {user['name']} | Logged in: Yes]"
        else:
            user_context = "\n[Customer: Guest | Not logged in]"
        
        # Time context
        time_context = f"\n[Current time: {self.get_time_of_day()}]"
        
        # Create chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session.id,
            system_message=BARISTA_SYSTEM_PROMPT + cart_context + user_context + time_context
        ).with_model("openai", "gpt-4o-mini")
        
        # Add conversation history to chat
        for msg in session.messages[-6:]:  # Last 6 messages for context
            if msg.role == "user":
                await chat.send_message(UserMessage(text=msg.content))
            # Note: Assistant messages are handled internally by the library
        
        # Send the new message
        user_message = UserMessage(text=message)
        
        try:
            response_text = await chat.send_message(user_message)
            
            # Check if response contains function call indicators
            cart_updated = False
            action = None
            
            # Parse for common intents and execute functions
            message_lower = message.lower()
            
            # Auto-detect intents and call functions
            function_result = None
            
            if any(word in message_lower for word in ["menu", "what do you have", "show me", "what's available"]):
                function_result = await self.execute_function("get_menu", {}, session, user)
                if function_result["success"]:
                    items_text = "\n".join([f"• {i['name']} - ₹{i['price']}" for i in function_result["items"][:8]])
                    response_text = f"Here's what we have today! ☕\n\n{items_text}\n\nWould you like to know more about any of these?"
                    action = {"type": "show_menu"}
            
            elif any(word in message_lower for word in ["cart", "my order", "what did i order"]):
                function_result = await self.execute_function("get_cart", {}, session, user)
                if function_result["success"]:
                    if function_result["cart"]:
                        items_text = "\n".join([f"• {i['name']} x{i['quantity']} - ₹{i['price'] * i['quantity']}" for i in function_result["cart"]])
                        response_text = f"Here's your cart! 🛒\n\n{items_text}\n\nTotal: ₹{function_result['total']}\n\nReady to checkout?"
                    else:
                        response_text = "Your cart is empty! Browse our menu to add some delicious drinks ☕"
                    action = {"type": "show_cart"}
            
            elif any(word in message_lower for word in ["track", "where is my order", "order status"]):
                # Look for order ID in message
                import re
                order_match = re.search(r'[a-f0-9-]{8,}', message_lower)
                if order_match:
                    function_result = await self.execute_function("get_order_status", {"order_id": order_match.group()}, session, user)
                    if function_result["success"]:
                        items_str = ', '.join([f"{i['name']} x{i['quantity']}" for i in function_result['items']])
                        response_text = f"📦 Order #{function_result['order_id']}\n\nStatus: {function_result['status_message']}\n\nItems: {items_str}\n\nTotal: ₹{function_result['total']}"
                    else:
                        response_text = function_result["message"]
                else:
                    response_text = "I'd be happy to track your order! Could you please provide your order ID? You can find it in your order confirmation or the 'My Orders' page."
            
            elif any(word in message_lower for word in ["recommend", "suggest", "what should i"]):
                preference = ""
                if "cold" in message_lower:
                    preference = "cold"
                elif "hot" in message_lower:
                    preference = "hot"
                elif "sweet" in message_lower:
                    preference = "sweet"
                
                function_result = await self.execute_function("get_recommendations", {"preference": preference}, session, user)
                if function_result["success"]:
                    items_text = "\n".join([f"• {i['name']} - ₹{i['price']}" for i in function_result["recommendations"]])
                    response_text = f"{function_result['tip']}\n\nHere are my picks for you:\n\n{items_text}\n\nWant me to add any of these to your cart?"
            
            elif any(word in message_lower for word in ["add", "i want", "i'll have", "give me", "order"]):
                # Try to find menu item mentioned
                items = await self.db.menu_items.find({"is_available": True}, {"_id": 0}).to_list(50)
                matched_item = None
                for item in items:
                    if item["name"].lower() in message_lower:
                        matched_item = item
                        break
                
                if matched_item:
                    # Parse quantity
                    import re
                    qty_match = re.search(r'(\d+)', message)
                    quantity = int(qty_match.group(1)) if qty_match else 1
                    
                    function_result = await self.execute_function("add_to_cart", {
                        "item_name": matched_item["name"],
                        "quantity": quantity
                    }, session, user)
                    
                    if function_result["success"]:
                        response_text = f"✨ {function_result['message']}\n\nYour cart total: ₹{function_result['cart_total']}\n\nWould you like anything else?"
                        cart_updated = True
                        action = {"type": "cart_updated", "cart": function_result["cart"]}
            
            elif any(word in message_lower for word in ["points", "loyalty", "rewards"]):
                function_result = await self.execute_function("get_loyalty_points", {}, session, user)
                if function_result["success"]:
                    response_text = f"🎁 Your Loyalty Status:\n\n• Points: {function_result['points']}\n• Tier: {function_result['tier'].title()}\n• Value: ₹{function_result['value']}\n\nKeep ordering to earn more rewards!"
                else:
                    response_text = function_result["message"]
            
            elif any(word in message_lower for word in ["offer", "promo", "discount", "deal"]):
                function_result = await self.execute_function("get_promotions", {}, session, user)
                if function_result["success"]:
                    promos_text = "\n".join([f"🎉 {p['title']}: {p['description']}" + (f" (Code: {p['code']})" if p['code'] else "") for p in function_result["promotions"]])
                    response_text = f"Here are our current offers! 🎊\n\n{promos_text}\n\nWant me to help you use any of these?"
            
            elif any(word in message_lower for word in ["sales", "revenue"]) and user and user.get("role") in ["super_admin", "manager"]:
                function_result = await self.execute_function("admin_get_sales_summary", {}, session, user)
                if function_result["success"]:
                    response_text = f"📊 Sales Summary for {function_result['date']}:\n\n• Total Orders: {function_result['total_orders']}\n• Revenue: ₹{function_result['total_revenue']}"
            
            elif any(word in message_lower for word in ["low stock", "inventory"]) and user and user.get("role") in ["super_admin", "manager"]:
                function_result = await self.execute_function("admin_get_low_stock", {}, session, user)
                if function_result["success"]:
                    if function_result["low_stock_items"]:
                        items_text = "\n".join([f"⚠️ {i['name']}: {i['quantity']} (threshold: {i['threshold']})" for i in function_result["low_stock_items"]])
                        response_text = f"🔔 Low Stock Alert:\n\n{items_text}"
                    else:
                        response_text = "✅ All inventory items are well stocked!"
            
            # Save messages to session
            session.messages.append(ChatMessage(
                role="user",
                content=message,
                timestamp=datetime.now(timezone.utc).isoformat()
            ))
            session.messages.append(ChatMessage(
                role="assistant",
                content=response_text,
                timestamp=datetime.now(timezone.utc).isoformat()
            ))
            
            # Save session
            await self.save_session(session)
            
            return ChatResponse(
                response=response_text,
                session_id=session.id,
                cart_updated=cart_updated,
                cart=session.cart if cart_updated else None,
                action=action
            )
        
        except Exception as e:
            print(f"Chatbot error: {e}")
            return ChatResponse(
                response="I'm having a little trouble right now. How about trying again or browsing our menu directly? ☕",
                session_id=session.id,
                cart_updated=False
            )
