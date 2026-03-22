import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, Coffee, ChefHat, Truck, CheckCircle, Package } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrackOrderPage = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('order') || '';
  
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statuses = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: Coffee },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  const fetchOrder = async (id) => {
    if (!id.trim()) return;
    
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const response = await axios.get(`${API}/orders/track/${id}`);
      setOrder(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      fetchOrder(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchOrder(orderId);
  };

  const getStatusIndex = (status) => {
    return statuses.findIndex(s => s.key === status);
  };

  const currentStatusIndex = order ? getStatusIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-[#161412] pt-24 pb-12" data-testid="track-order-page">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#FAEDE3] mb-4">
            Track Your Order
          </h1>
          <p className="text-[#A89F95] text-lg">
            Enter your order ID to see real-time status
          </p>
        </motion.div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A89F95]" />
              <Input
                type="text"
                placeholder="Enter Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="pl-12 h-14 bg-[#211C18] border-[#332A24] text-[#FAEDE3] text-lg"
                data-testid="order-id-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="btn-primary h-14 px-8"
              data-testid="track-button"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Track'}
            </Button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-[#211C18] rounded-2xl border border-[#332A24]"
          >
            <Package className="w-16 h-16 text-[#332A24] mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <p className="text-[#A89F95] mt-2">Please check your order ID and try again</p>
          </motion.div>
        )}

        {/* Order Details */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#211C18] rounded-2xl border border-[#332A24] p-8"
            data-testid="order-details"
          >
            {/* Status Timeline */}
            <div className="mb-10">
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-6 right-6 h-1 bg-[#332A24] rounded-full">
                  <div
                    className="h-full bg-[#D4A373] rounded-full transition-all duration-500"
                    style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Status Steps */}
                <div className="relative flex justify-between">
                  {statuses.map((status, index) => {
                    const isActive = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const Icon = status.icon;

                    return (
                      <div key={status.key} className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                            isActive
                              ? 'bg-[#D4A373] text-[#161412]'
                              : 'bg-[#332A24] text-[#A89F95]'
                          } ${isCurrent ? 'ring-4 ring-[#D4A373]/30 animate-pulse-glow' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`mt-3 text-sm text-center ${
                            isActive ? 'text-[#FAEDE3] font-medium' : 'text-[#A89F95]'
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Estimated Delivery */}
            {order.estimated_delivery && order.status !== 'delivered' && (
              <div className="p-4 bg-[#D4A373]/10 rounded-xl border border-[#D4A373]/30 mb-8">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#D4A373]" />
                  <div>
                    <p className="text-[#FAEDE3] font-medium">Estimated Delivery</p>
                    <p className="text-[#A89F95] text-sm">
                      {new Date(order.estimated_delivery).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-[#161412] rounded-xl"
                  >
                    <div>
                      <p className="text-[#FAEDE3]">{item.name}</p>
                      <p className="text-[#A89F95] text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-[#D4A373] font-semibold">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#332A24] flex justify-between items-center">
                <span className="text-[#A89F95]">Total</span>
                <span className="text-2xl font-bold text-[#D4A373]">₹{order.total}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
