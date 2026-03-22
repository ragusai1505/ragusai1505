import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, FileText, CreditCard, ArrowLeft, Truck, Star, Gift } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loyalty, setLoyalty] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [formData, setFormData] = useState({
    delivery_address: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    const fetchLoyalty = async () => {
      try {
        const response = await axios.get(`${API}/loyalty/my-points`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLoyalty(response.data);
      } catch (error) {
        console.error('Failed to fetch loyalty:', error);
      }
    };
    if (token) fetchLoyalty();
  }, [token]);

  const maxRedeemable = loyalty ? Math.min(loyalty.points, Math.floor(total)) : 0;
  const discount = pointsToRedeem * 0.5;
  const finalTotal = Math.max(0, total - discount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        items: items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        })),
        delivery_address: formData.delivery_address,
        phone: formData.phone,
        notes: formData.notes || null,
        origin_url: window.location.origin,
        redeem_points: pointsToRedeem
      };

      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear cart before redirecting to Stripe
      clearCart();
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login?redirect=/checkout');
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#161412] pt-24 px-6" data-testid="checkout-empty">
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="font-serif text-3xl text-[#FAEDE3] mb-4">Your cart is empty</h1>
          <p className="text-[#A89F95] mb-8">Add some delicious items before checkout</p>
          <Button onClick={() => navigate('/menu')} className="btn-primary">
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161412] pt-24 pb-12" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#A89F95] hover:text-[#D4A373] transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-serif text-4xl font-bold text-[#FAEDE3] mb-2">Checkout</h1>
            <p className="text-[#A89F95] mb-8">Complete your order details</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Address */}
              <div className="space-y-2">
                <Label className="text-[#FAEDE3] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4A373]" />
                  Delivery Address
                </Label>
                <Textarea
                  placeholder="Enter your full address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  required
                  rows={3}
                  className="bg-[#211C18] border-[#332A24] text-[#FAEDE3] resize-none"
                  data-testid="address-input"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-[#FAEDE3] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#D4A373]" />
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="bg-[#211C18] border-[#332A24] text-[#FAEDE3] h-12"
                  data-testid="phone-input"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-[#FAEDE3] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4A373]" />
                  Order Notes (Optional)
                </Label>
                <Textarea
                  placeholder="Any special instructions?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="bg-[#211C18] border-[#332A24] text-[#FAEDE3] resize-none"
                  data-testid="notes-input"
                />
              </div>

              {/* Delivery Info */}
              <div className="p-4 bg-[#D4A373]/10 rounded-xl border border-[#D4A373]/30">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-[#D4A373]" />
                  <div>
                    <p className="text-[#FAEDE3] font-medium">Free Delivery</p>
                    <p className="text-[#A89F95] text-sm">Estimated delivery in 30 minutes</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2"
                data-testid="place-order-button"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₹{finalTotal.toFixed(2)}
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6 sticky top-28">
              <h2 className="font-serif text-2xl font-semibold text-[#FAEDE3] mb-6">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4" data-testid={`summary-item-${item.id}`}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1553578615-ee00f2db2c5c'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[#FAEDE3] font-medium truncate">{item.name}</h4>
                      <p className="text-[#A89F95] text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-[#D4A373] font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-[#332A24] pt-4 space-y-3">
                <div className="flex justify-between text-[#A89F95]">
                  <span>Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                {pointsToRedeem > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Points Discount ({pointsToRedeem} pts)</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#A89F95]">
                  <span>Delivery</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between text-xl font-semibold text-[#FAEDE3] pt-2 border-t border-[#332A24]">
                  <span>Total</span>
                  <span className="text-[#D4A373]">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Loyalty Points Redemption */}
              {loyalty && loyalty.points > 0 && (
                <div className="mt-6 p-4 bg-[#D4A373]/10 rounded-xl border border-[#D4A373]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-[#D4A373]" />
                    <span className="text-[#FAEDE3] font-medium">Redeem Loyalty Points</span>
                  </div>
                  <p className="text-[#A89F95] text-sm mb-3">
                    You have <span className="text-[#D4A373] font-semibold">{loyalty.points}</span> points (₹{loyalty.points_value.toFixed(2)} value)
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A89F95]">Redeem:</span>
                      <span className="text-[#FAEDE3]">{pointsToRedeem} pts = ₹{discount.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[pointsToRedeem]}
                      onValueChange={([val]) => setPointsToRedeem(val)}
                      max={maxRedeemable}
                      step={10}
                      className="py-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
