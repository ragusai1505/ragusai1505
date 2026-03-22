import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Coffee, ShoppingBag, Users, DollarSign, 
  TrendingUp, Clock, CheckCircle, Package, ChefHat, Truck,
  Plus, Edit, Trash2, Eye
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '', description: '', price: '', category: '', image_url: '', is_available: true
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking admin status
    if (authLoading) return;
    
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes, menuRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/menu/all`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...menuForm,
        price: parseFloat(menuForm.price)
      };

      if (editingItem) {
        await axios.put(`${API}/menu/${editingItem.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Menu item updated');
      } else {
        await axios.post(`${API}/menu`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Menu item created');
      }
      setMenuDialogOpen(false);
      resetMenuForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save menu item');
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${API}/menu/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menu item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || '',
      is_available: item.is_available
    });
    setMenuDialogOpen(true);
  };

  const resetMenuForm = () => {
    setEditingItem(null);
    setMenuForm({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-500 bg-yellow-500/10',
      confirmed: 'text-blue-500 bg-blue-500/10',
      preparing: 'text-purple-500 bg-purple-500/10',
      out_for_delivery: 'text-indigo-500 bg-indigo-500/10',
      delivered: 'text-green-500 bg-green-500/10',
      cancelled: 'text-red-500 bg-red-500/10'
    };
    return colors[status] || 'text-[#A89F95] bg-[#211C18]';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#161412] pt-24 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: Coffee },
  ];

  return (
    <div className="min-h-screen bg-[#161412] pt-24 pb-12" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-64 flex-shrink-0">
            <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-4 sticky top-28">
              <h2 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-6 px-2">Admin Panel</h2>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#D4A373] text-[#161412]'
                        : 'text-[#A89F95] hover:bg-[#332A24] hover:text-[#FAEDE3]'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-serif text-3xl font-bold text-[#FAEDE3] mb-8">Dashboard Overview</h1>
                
                {/* Stats Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#D4A373]" />
                      </div>
                      <div>
                        <p className="text-[#A89F95] text-sm">Total Orders</p>
                        <p className="text-2xl font-bold text-[#FAEDE3]">{stats.total_orders}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-[#A89F95] text-sm">Revenue</p>
                        <p className="text-2xl font-bold text-[#FAEDE3]">₹{stats.total_revenue}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-[#A89F95] text-sm">Pending</p>
                        <p className="text-2xl font-bold text-[#FAEDE3]">{stats.pending_orders}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Coffee className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[#A89F95] text-sm">Menu Items</p>
                        <p className="text-2xl font-bold text-[#FAEDE3]">{stats.total_menu_items}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                  <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-4">Recent Orders</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-[#161412] rounded-xl">
                        <div>
                          <p className="text-[#FAEDE3] font-medium">{order.user_name}</p>
                          <p className="text-[#A89F95] text-sm">{order.items.length} items · ₹{order.total}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-serif text-3xl font-bold text-[#FAEDE3] mb-8">Manage Orders</h1>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6" data-testid={`admin-order-${order.id}`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                        <div>
                          <p className="text-[#A89F95] text-sm">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-[#FAEDE3] font-medium">{order.user_name} · {order.user_email}</p>
                          <p className="text-[#A89F95] text-sm">{order.delivery_address}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#D4A373] font-bold text-xl">₹{order.total}</span>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-44 bg-[#161412] border-[#332A24]" data-testid={`status-select-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#211C18] border-[#332A24]">
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="px-3 py-1 bg-[#161412] rounded-full text-sm text-[#A89F95]">
                            {item.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Menu Tab */}
            {activeTab === 'menu' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Manage Menu</h1>
                  <Dialog open={menuDialogOpen} onOpenChange={(open) => { setMenuDialogOpen(open); if (!open) resetMenuForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="btn-primary flex items-center gap-2" data-testid="add-menu-item-btn">
                        <Plus className="w-4 h-4" /> Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#211C18] border-[#332A24] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl text-[#FAEDE3]">
                          {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleMenuSubmit} className="space-y-4 mt-4">
                        <div>
                          <Label className="text-[#FAEDE3]">Name</Label>
                          <Input
                            value={menuForm.name}
                            onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                            required
                            className="bg-[#161412] border-[#332A24] text-[#FAEDE3]"
                            data-testid="menu-name-input"
                          />
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Description</Label>
                          <Textarea
                            value={menuForm.description}
                            onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                            required
                            className="bg-[#161412] border-[#332A24] text-[#FAEDE3]"
                            data-testid="menu-desc-input"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Price (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={menuForm.price}
                              onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                              required
                              className="bg-[#161412] border-[#332A24] text-[#FAEDE3]"
                              data-testid="menu-price-input"
                            />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Category</Label>
                            <Input
                              value={menuForm.category}
                              onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                              required
                              placeholder="e.g. Lattes"
                              className="bg-[#161412] border-[#332A24] text-[#FAEDE3]"
                              data-testid="menu-category-input"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Image URL</Label>
                          <Input
                            value={menuForm.image_url}
                            onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                            placeholder="https://..."
                            className="bg-[#161412] border-[#332A24] text-[#FAEDE3]"
                            data-testid="menu-image-input"
                          />
                        </div>
                        <Button type="submit" className="w-full btn-primary" data-testid="save-menu-item-btn">
                          {editingItem ? 'Update Item' : 'Add Item'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-[#211C18] rounded-2xl border border-[#332A24] overflow-hidden" data-testid={`admin-menu-${item.id}`}>
                      <div className="h-32 overflow-hidden">
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1553578615-ee00f2db2c5c'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-[#FAEDE3]">{item.name}</h3>
                          <span className="text-[#D4A373] font-semibold">₹{item.price}</span>
                        </div>
                        <p className="text-[#A89F95] text-sm mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded text-xs ${item.is_available ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditDialog(item)}
                              className="p-2 hover:bg-[#332A24] rounded-lg transition-colors text-[#A89F95] hover:text-[#D4A373]"
                              data-testid={`edit-menu-${item.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteMenuItem(item.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#A89F95] hover:text-red-500"
                              data-testid={`delete-menu-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
