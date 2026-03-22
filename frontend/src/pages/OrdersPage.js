import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, Truck, Coffee, ChefHat } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(response.data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'confirmed':
        return <Coffee className="w-5 h-5" />;
      case 'preparing':
        return <ChefHat className="w-5 h-5" />;
      case 'out_for_delivery':
        return <Truck className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'confirmed':
      case 'preparing':
        return 'text-blue-500 bg-blue-500/10';
      case 'out_for_delivery':
        return 'text-purple-500 bg-purple-500/10';
      case 'delivered':
        return 'text-green-500 bg-green-500/10';
      case 'cancelled':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-[#A89F95] bg-[#211C18]';
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161412] pt-24 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161412] pt-24 pb-12" data-testid="orders-page">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-4xl font-bold text-[#FAEDE3] mb-2">My Orders</h1>
          <p className="text-[#A89F95] mb-8">Track and view your order history</p>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-[#211C18] rounded-2xl border border-[#332A24]">
              <Package className="w-16 h-16 text-[#332A24] mx-auto mb-4" />
              <h2 className="text-xl text-[#FAEDE3] mb-2">No orders yet</h2>
              <p className="text-[#A89F95] mb-6">Your order history will appear here</p>
              <Link to="/menu">
                <Button className="btn-primary">Browse Menu</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6 hover:border-[#D4A373]/30 transition-colors"
                  data-testid={`order-card-${order.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[#A89F95] text-sm">Order ID</p>
                      <p className="text-[#FAEDE3] font-mono">{order.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-[#A89F95] text-sm">Date</p>
                      <p className="text-[#FAEDE3]">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#A89F95] text-sm">Total</p>
                      <p className="text-[#D4A373] font-semibold text-lg">₹{order.total}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="font-medium">{formatStatus(order.status)}</span>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#161412] rounded-full text-sm text-[#A89F95]">
                        {item.name} x{item.quantity}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link to={`/track?order=${order.id}`}>
                      <Button variant="ghost" className="text-[#D4A373] hover:bg-[#D4A373]/10">
                        Track Order
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OrdersPage;
