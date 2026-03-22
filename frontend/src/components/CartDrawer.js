import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsOpen(false);
    if (!user) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg bg-[#161412] border-l border-[#332A24] p-0" data-testid="cart-drawer">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 border-b border-[#332A24]">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-serif text-2xl text-[#FAEDE3] flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-[#D4A373]" />
                Your Cart
              </SheetTitle>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-[#A89F95] hover:text-[#D4A373] transition-colors"
                  data-testid="clear-cart-button"
                >
                  Clear all
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-16 h-16 text-[#332A24] mb-4" />
                <p className="text-[#A89F95] text-lg mb-2">Your cart is empty</p>
                <p className="text-[#A89F95] text-sm mb-6">Add some delicious coffee to get started</p>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/menu');
                  }}
                  className="btn-primary"
                  data-testid="browse-menu-button"
                >
                  Browse Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-4 p-4 bg-[#211C18] rounded-xl border border-[#332A24]"
                    data-testid={`cart-item-${item.id}`}
                  >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1553578615-ee00f2db2c5c'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#FAEDE3] truncate">{item.name}</h4>
                      <p className="text-[#D4A373] font-semibold mt-1">₹{item.price}</p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-[#332A24] flex items-center justify-center hover:bg-[#D4A373] hover:text-[#161412] transition-colors"
                          data-testid={`decrease-qty-${item.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-[#FAEDE3] font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-[#332A24] flex items-center justify-center hover:bg-[#D4A373] hover:text-[#161412] transition-colors"
                          data-testid={`increase-qty-${item.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[#A89F95] hover:text-red-400 transition-colors self-start"
                      data-testid={`remove-item-${item.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#332A24] space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-[#A89F95]">Subtotal</span>
                <span className="text-[#FAEDE3] font-semibold">₹{total.toFixed(2)}</span>
              </div>

              {/* Delivery Info */}
              <div className="flex items-center gap-2 text-sm text-[#A89F95]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Free delivery in 30 minutes
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                className="w-full btn-primary py-4 text-lg"
                data-testid="checkout-button"
              >
                Proceed to Checkout · ₹{total.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
