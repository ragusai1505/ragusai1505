from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from datetime import datetime, timezone
from openai import AsyncOpenAI

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

class ChatbotService:
    def __init__(self, db):
        self.db = db
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    async def process_message(self, message: str, session_id: Optional[str] = None, user: Optional[dict] = None) -> ChatResponse:
        # Create or get session
        if not session_id:
            session_id = str(uuid.uuid4())

        # Get or create chat session
        session = await self.db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
        if not session:
            session = {
                "id": session_id,
                "messages": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }

        # Build message history
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant for Cafe Ikigai, an Indian coffee shop. "
                    "You help customers with menu queries, order tracking, recommendations, "
                    "loyalty points, and general cafe information. "
                    "Be friendly, warm, and knowledgeable about coffee and Indian cafe culture. "
                    "Keep responses concise and helpful."
                )
            }
        ]

        # Add conversation history (last 10 messages)
        history = session.get("messages", [])[-10:]
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Add current user message
        messages.append({
            "role": "user",
            "content": message
        })

        # Get menu items for context if asking about menu
        menu_context = ""
        if any(word in message.lower() for word in ["menu", "coffee", "food", "drink", "price", "order", "recommend"]):
            try:
                menu_items = await self.db.menu_items.find(
                    {"is_available": True}, {"_id": 0, "name": 1, "price": 1, "category": 1, "description": 1}
                ).to_list(50)
                if menu_items:
                    menu_context = "\n\nAvailable menu items:\n"
                    for item in menu_items:
                        menu_context += f"- {item['name']} ({item['category']}): ₹{item['price']} - {item.get('description', '')}\n"
                    messages[0]["content"] += menu_context
            except Exception:
                pass

        # Call OpenAI API
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            assistant_message = response.choices[0].message.content

        except Exception as e:
            assistant_message = (
                "I'm sorry, I'm having trouble connecting right now. "
                "Please try again in a moment or contact us directly for assistance! ☕"
            )

        # Save messages to session
        session["messages"] = session.get("messages", []) + [
            {"role": "user", "content": message, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"role": "assistant", "content": assistant_message, "timestamp": datetime.now(timezone.utc).isoformat()}
        ]
        session["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Update session in DB
        await self.db.chat_sessions.update_one(
            {"id": session_id},
            {"$set": session},
            upsert=True
        )

        return ChatResponse(
            response=assistant_message,
            session_id=session_id
        )
