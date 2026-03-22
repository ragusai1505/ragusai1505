import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Coffee, ShoppingBag, Gift, 
  MapPin, Star, Sparkles, Bot, User, Loader2, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Quick reply buttons
const QUICK_REPLIES = [
  { text: "View Menu", icon: Coffee, action: "Show me the menu" },
  { text: "Track Order", icon: MapPin, action: "Track my order" },
  { text: "Recommend", icon: Sparkles, action: "What do you recommend?" },
  { text: "My Cart", icon: ShoppingBag, action: "Show my cart" },
  { text: "Offers", icon: Gift, action: "What offers do you have?" },
  { text: "My Points", icon: Star, action: "Check my loyalty points" },
];

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi there! ☕ I'm Ikigai, your virtual barista. How can I help you today? Browse our menu, track an order, or let me recommend something delicious!",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const { user, token } = useAuth();
  const { addItem, setIsOpen: setCartOpen } = useCart();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickReplies(false);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API}/chat`, {
        message: messageText,
        session_id: sessionId
      }, { headers });

      const { response: botResponse, session_id, cart_updated, cart, action } = response.data;

      if (!sessionId) {
        setSessionId(session_id);
      }

      // Handle cart updates
      if (cart_updated && cart) {
        // Sync with cart context
        cart.forEach(item => {
          addItem({
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image_url
          }, item.quantity);
        });
      }

      // Handle actions
      if (action?.type === 'show_cart') {
        // Could open cart drawer
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: botResponse,
        timestamp: new Date().toISOString(),
        action
      }]);

      // Show quick replies after bot response
      setTimeout(() => setShowQuickReplies(true), 500);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops! I'm having trouble connecting right now. Please try again in a moment. ☕",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (reply) => {
    sendMessage(reply.action);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Hi there! ☕ I'm Ikigai, your virtual barista. How can I help you today?",
      timestamp: new Date().toISOString()
    }]);
    setSessionId(null);
    setShowQuickReplies(true);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-24 w-14 h-14 rounded-full bg-[#D4A373] text-[#161412] shadow-lg flex items-center justify-center z-50 hover:bg-[#E5B887] transition-colors"
            data-testid="chat-toggle-btn"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#161412] animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-[#161412] rounded-2xl shadow-2xl border border-[#332A24] flex flex-col z-50 overflow-hidden"
            data-testid="chat-window"
          >
            {/* Header */}
            <div className="bg-[#211C18] px-4 py-3 flex items-center justify-between border-b border-[#332A24]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D4A373] flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-[#161412]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#FAEDE3]">Ikigai Assistant</h3>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg hover:bg-[#332A24] text-[#A89F95] hover:text-[#FAEDE3] transition-colors"
                  title="Clear chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#332A24] text-[#A89F95] hover:text-[#FAEDE3] transition-colors"
                  data-testid="chat-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-[#D4A373] text-[#161412]' 
                        : 'bg-[#332A24] text-[#D4A373]'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#D4A373] text-[#161412] rounded-tr-none'
                        : 'bg-[#211C18] text-[#FAEDE3] rounded-tl-none border border-[#332A24]'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-[#161412]/60' : 'text-[#A89F95]'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-[#332A24] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-[#D4A373]" />
                  </div>
                  <div className="bg-[#211C18] border border-[#332A24] rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            <AnimatePresence>
              {showQuickReplies && !loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-2"
                >
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.text}
                        onClick={() => handleQuickReply(reply)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#211C18] border border-[#332A24] text-[#A89F95] text-xs hover:border-[#D4A373] hover:text-[#D4A373] transition-colors"
                      >
                        <reply.icon className="w-3 h-3" />
                        {reply.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-[#332A24] bg-[#211C18]">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={loading}
                  className="flex-1 bg-[#161412] border border-[#332A24] rounded-full px-4 py-2.5 text-sm text-[#FAEDE3] placeholder-[#A89F95] focus:outline-none focus:border-[#D4A373] disabled:opacity-50"
                  data-testid="chat-input"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full bg-[#D4A373] text-[#161412] hover:bg-[#E5B887] disabled:opacity-50 flex items-center justify-center p-0"
                  data-testid="chat-send-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
