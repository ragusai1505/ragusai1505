import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Coffee, ShoppingBag, Package, DollarSign, 
  TrendingUp, Clock, CheckCircle, Users, Database, FileText,
  Plus, Edit, Trash2, AlertTriangle, BarChart3, PieChart,
  Download, RefreshCw, Search, Filter, ChevronDown
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salesReport, setSalesReport] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dbTables, setDbTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
  const [inventoryForm, setInventoryForm] = useState({ name: '', sku: '', category: '', supplier_name: '', cost_price: '', selling_price: '0', quantity: '', low_stock_threshold: '10', unit: 'pieces' });
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '', date: '', vendor: '', payment_method: '' });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  
  // Report filters
  const [reportPeriod, setReportPeriod] = useState('weekly');

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, ordersRes, menuRes, invRes, expRes, lowStockRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/orders`, { headers }),
        axios.get(`${API}/menu/all`, { headers }),
        axios.get(`${API}/inventory`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/expenses`, { headers }).catch(() => ({ data: { expenses: [] } })),
        axios.get(`${API}/inventory/low-stock`, { headers }).catch(() => ({ data: { items: [] } }))
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
      setInventory(invRes.data);
      setExpenses(expRes.data.expenses || []);
      setLowStockItems(lowStockRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [salesRes, finRes] = await Promise.all([
        axios.get(`${API}/admin/reports/sales?period=${reportPeriod}`, { headers }),
        axios.get(`${API}/admin/reports/financial`, { headers })
      ]);
      setSalesReport(salesRes.data);
      setFinancialReport(finRes.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API}/admin/staff`, { headers: { Authorization: `Bearer ${token}` } });
      setStaff(res.data);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API}/admin/audit-logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      setAuditLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const fetchDbTables = async () => {
    try {
      const res = await axios.get(`${API}/admin/database/tables`, { headers: { Authorization: `Bearer ${token}` } });
      setDbTables(res.data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && !salesReport) fetchReports();
    if (activeTab === 'staff' && staff.length === 0) fetchStaff();
    if (activeTab === 'audit' && auditLogs.length === 0) fetchAuditLogs();
    if (activeTab === 'database' && dbTables.length === 0) fetchDbTables();
  }, [activeTab]);

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

  // Menu handlers
  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...menuForm, price: parseFloat(menuForm.price) };
      if (editingItem) {
        await axios.put(`${API}/menu/${editingItem.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Menu item updated');
      } else {
        await axios.post(`${API}/menu`, data, { headers: { Authorization: `Bearer ${token}` } });
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
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${API}/menu/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Menu item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const resetMenuForm = () => {
    setEditingItem(null);
    setMenuForm({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
  };

  // Inventory handlers
  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...inventoryForm,
        cost_price: parseFloat(inventoryForm.cost_price),
        selling_price: parseFloat(inventoryForm.selling_price || 0),
        quantity: parseInt(inventoryForm.quantity),
        low_stock_threshold: parseInt(inventoryForm.low_stock_threshold)
      };
      if (editingItem) {
        await axios.put(`${API}/inventory/${editingItem.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Inventory item updated');
      } else {
        await axios.post(`${API}/inventory`, data, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Inventory item created');
      }
      setInventoryDialogOpen(false);
      resetInventoryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save inventory item');
    }
  };

  const adjustStock = async (itemId, type, qty) => {
    const reason = prompt(`Reason for ${type}:`);
    if (!reason) return;
    try {
      await axios.post(`${API}/inventory/adjust`, {
        inventory_id: itemId,
        adjustment_type: type,
        quantity: qty,
        reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Stock adjusted');
      fetchData();
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  const resetInventoryForm = () => {
    setEditingItem(null);
    setInventoryForm({ name: '', sku: '', category: '', supplier_name: '', cost_price: '', selling_price: '0', quantity: '', low_stock_threshold: '10', unit: 'pieces' });
  };

  // Expense handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...expenseForm, amount: parseFloat(expenseForm.amount) };
      if (editingItem) {
        await axios.put(`${API}/expenses/${editingItem.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Expense updated');
      } else {
        await axios.post(`${API}/expenses`, data, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Expense recorded');
      }
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API}/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetExpenseForm = () => {
    setEditingItem(null);
    setExpenseForm({ category: '', description: '', amount: '', date: '', vendor: '', payment_method: '' });
  };

  // Staff handlers
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/staff`, staffForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Staff member created');
      setStaffDialogOpen(false);
      setStaffForm({ name: '', email: '', password: '', role: 'staff' });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create staff');
    }
  };

  const deleteStaff = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      await axios.delete(`${API}/admin/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Staff deleted');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete staff');
    }
  };

  const createBackup = async () => {
    try {
      await axios.post(`${API}/admin/database/backup`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error('Failed to create backup');
    }
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
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'database', label: 'Database', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#161412] pt-24 pb-12" data-testid="admin-dashboard">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-4 sticky top-28">
              <h2 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-6 px-2">Admin Panel</h2>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#D4A373] text-[#161412]'
                        : 'text-[#A89F95] hover:bg-[#332A24] hover:text-[#FAEDE3]'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="w-4 h-4" />
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
                  <StatCard icon={ShoppingBag} label="Total Orders" value={stats.total_orders} color="#D4A373" />
                  <StatCard icon={DollarSign} label="Revenue" value={`₹${stats.total_revenue.toLocaleString()}`} color="#22c55e" />
                  <StatCard icon={Clock} label="Pending" value={stats.pending_orders} color="#eab308" />
                  <StatCard icon={AlertTriangle} label="Low Stock" value={stats.low_stock_count} color="#ef4444" />
                </div>

                {/* Low Stock Alert */}
                {lowStockItems.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-8">
                    <div className="flex items-center gap-2 text-red-400 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">Low Stock Alert</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.map(item => (
                        <span key={item.id} className="px-3 py-1 bg-red-500/20 rounded-full text-sm text-red-300">
                          {item.name}: {item.quantity} {item.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
                          <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                            <SelectTrigger className="w-44 bg-[#161412] border-[#332A24]">
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
                          <Input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Description</Label>
                          <Textarea value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Price (₹)</Label>
                            <Input type="number" step="0.01" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Category</Label>
                            <Input value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Image URL</Label>
                          <Input value={menuForm.image_url} onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })} className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <Button type="submit" className="w-full btn-primary">{editingItem ? 'Update' : 'Add'} Item</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-[#211C18] rounded-2xl border border-[#332A24] overflow-hidden">
                      <div className="h-32 overflow-hidden">
                        <img src={item.image_url || 'https://images.unsplash.com/photo-1553578615-ee00f2db2c5c'} alt={item.name} className="w-full h-full object-cover" />
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
                            <button onClick={() => { setEditingItem(item); setMenuForm(item); setMenuDialogOpen(true); }} className="p-2 hover:bg-[#332A24] rounded-lg text-[#A89F95] hover:text-[#D4A373]">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteMenuItem(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-[#A89F95] hover:text-red-500">
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

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Inventory Management</h1>
                  <Dialog open={inventoryDialogOpen} onOpenChange={(open) => { setInventoryDialogOpen(open); if (!open) resetInventoryForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="btn-primary flex items-center gap-2" data-testid="add-inventory-btn">
                        <Plus className="w-4 h-4" /> Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#211C18] border-[#332A24] max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl text-[#FAEDE3]">
                          {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleInventorySubmit} className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Name</Label>
                            <Input value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">SKU</Label>
                            <Input value={inventoryForm.sku} onChange={(e) => setInventoryForm({ ...inventoryForm, sku: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Category</Label>
                            <Select value={inventoryForm.category} onValueChange={(v) => setInventoryForm({ ...inventoryForm, category: v })}>
                              <SelectTrigger className="bg-[#161412] border-[#332A24]"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent className="bg-[#211C18] border-[#332A24]">
                                <SelectItem value="raw_materials">Raw Materials</SelectItem>
                                <SelectItem value="packaging">Packaging</SelectItem>
                                <SelectItem value="equipment">Equipment</SelectItem>
                                <SelectItem value="supplies">Supplies</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Supplier</Label>
                            <Input value={inventoryForm.supplier_name} onChange={(e) => setInventoryForm({ ...inventoryForm, supplier_name: e.target.value })} className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Cost Price</Label>
                            <Input type="number" step="0.01" value={inventoryForm.cost_price} onChange={(e) => setInventoryForm({ ...inventoryForm, cost_price: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Quantity</Label>
                            <Input type="number" value={inventoryForm.quantity} onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Unit</Label>
                            <Select value={inventoryForm.unit} onValueChange={(v) => setInventoryForm({ ...inventoryForm, unit: v })}>
                              <SelectTrigger className="bg-[#161412] border-[#332A24]"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#211C18] border-[#332A24]">
                                <SelectItem value="pieces">Pieces</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="liters">Liters</SelectItem>
                                <SelectItem value="bottles">Bottles</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Low Stock Threshold</Label>
                          <Input type="number" value={inventoryForm.low_stock_threshold} onChange={(e) => setInventoryForm({ ...inventoryForm, low_stock_threshold: e.target.value })} className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <Button type="submit" className="w-full btn-primary">{editingItem ? 'Update' : 'Add'} Item</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Inventory Table */}
                <div className="bg-[#211C18] rounded-2xl border border-[#332A24] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#161412]">
                      <tr>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Item</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">SKU</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Category</th>
                        <th className="text-right p-4 text-[#A89F95] text-sm font-medium">Cost</th>
                        <th className="text-right p-4 text-[#A89F95] text-sm font-medium">Quantity</th>
                        <th className="text-center p-4 text-[#A89F95] text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-[#A89F95] text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-t border-[#332A24]">
                          <td className="p-4 text-[#FAEDE3]">{item.name}</td>
                          <td className="p-4 text-[#A89F95] font-mono text-sm">{item.sku}</td>
                          <td className="p-4 text-[#A89F95] capitalize">{item.category.replace('_', ' ')}</td>
                          <td className="p-4 text-right text-[#FAEDE3]">₹{item.cost_price}</td>
                          <td className="p-4 text-right text-[#FAEDE3]">{item.quantity} {item.unit}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${item.quantity <= item.low_stock_threshold ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                              {item.quantity <= item.low_stock_threshold ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => adjustStock(item.id, 'restock', parseInt(prompt('Quantity to add:') || 0))} className="p-2 hover:bg-green-500/10 rounded text-[#A89F95] hover:text-green-400 text-xs">+Stock</button>
                              <button onClick={() => adjustStock(item.id, 'wastage', -parseInt(prompt('Quantity to remove:') || 0))} className="p-2 hover:bg-red-500/10 rounded text-[#A89F95] hover:text-red-400 text-xs">-Stock</button>
                              <button onClick={() => { setEditingItem(item); setInventoryForm({ ...item, cost_price: item.cost_price.toString(), quantity: item.quantity.toString(), low_stock_threshold: item.low_stock_threshold.toString() }); setInventoryDialogOpen(true); }} className="p-2 hover:bg-[#332A24] rounded text-[#A89F95] hover:text-[#D4A373]">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Expense Management</h1>
                  <Dialog open={expenseDialogOpen} onOpenChange={(open) => { setExpenseDialogOpen(open); if (!open) resetExpenseForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#211C18] border-[#332A24] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl text-[#FAEDE3]">Record Expense</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleExpenseSubmit} className="space-y-4 mt-4">
                        <div>
                          <Label className="text-[#FAEDE3]">Category</Label>
                          <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                            <SelectTrigger className="bg-[#161412] border-[#332A24]"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#211C18] border-[#332A24]">
                              <SelectItem value="inventory_purchase">Inventory Purchase</SelectItem>
                              <SelectItem value="rent">Rent</SelectItem>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="salaries">Salaries</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Description</Label>
                          <Textarea value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[#FAEDE3]">Amount (₹)</Label>
                            <Input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                          <div>
                            <Label className="text-[#FAEDE3]">Date</Label>
                            <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Vendor</Label>
                          <Input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <Button type="submit" className="w-full btn-primary">Record Expense</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Expense Summary */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <p className="text-[#A89F95] text-sm">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400">₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <p className="text-[#A89F95] text-sm">This Month</p>
                    <p className="text-2xl font-bold text-[#FAEDE3]">₹{expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                    <p className="text-[#A89F95] text-sm">Records</p>
                    <p className="text-2xl font-bold text-[#FAEDE3]">{expenses.length}</p>
                  </div>
                </div>

                {/* Expense List */}
                <div className="bg-[#211C18] rounded-2xl border border-[#332A24] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#161412]">
                      <tr>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Date</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Category</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Description</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Vendor</th>
                        <th className="text-right p-4 text-[#A89F95] text-sm font-medium">Amount</th>
                        <th className="text-right p-4 text-[#A89F95] text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="border-t border-[#332A24]">
                          <td className="p-4 text-[#FAEDE3]">{expense.date}</td>
                          <td className="p-4 text-[#A89F95] capitalize">{expense.category.replace('_', ' ')}</td>
                          <td className="p-4 text-[#FAEDE3]">{expense.description}</td>
                          <td className="p-4 text-[#A89F95]">{expense.vendor || '-'}</td>
                          <td className="p-4 text-right text-red-400 font-semibold">₹{expense.amount.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => deleteExpense(expense.id)} className="p-2 hover:bg-red-500/10 rounded text-[#A89F95] hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Reports & Analytics</h1>
                  <div className="flex gap-2">
                    <Select value={reportPeriod} onValueChange={(v) => { setReportPeriod(v); }}>
                      <SelectTrigger className="w-32 bg-[#211C18] border-[#332A24]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#211C18] border-[#332A24]">
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchReports} variant="outline" className="border-[#332A24]">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {salesReport && financialReport && (
                  <div className="space-y-8">
                    {/* Key Metrics */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard icon={DollarSign} label="Revenue" value={`₹${salesReport.total_revenue.toLocaleString()}`} color="#22c55e" />
                      <StatCard icon={ShoppingBag} label="Orders" value={salesReport.total_orders} color="#D4A373" />
                      <StatCard icon={TrendingUp} label="Avg Order" value={`₹${salesReport.average_order_value.toLocaleString()}`} color="#3b82f6" />
                      <StatCard icon={PieChart} label="Net Profit" value={`₹${financialReport.net_profit.toLocaleString()}`} color={financialReport.net_profit >= 0 ? '#22c55e' : '#ef4444'} />
                    </div>

                    {/* Financial Summary */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                        <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-4">Financial Summary</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-[#A89F95]">Revenue</span>
                            <span className="text-green-400 font-semibold">₹{financialReport.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A89F95]">Expenses</span>
                            <span className="text-red-400 font-semibold">₹{financialReport.expenses.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-[#332A24] pt-4 flex justify-between">
                            <span className="text-[#FAEDE3] font-semibold">Net Profit</span>
                            <span className={`font-bold text-xl ${financialReport.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ₹{financialReport.net_profit.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A89F95]">Profit Margin</span>
                            <span className="text-[#FAEDE3]">{financialReport.profit_margin}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                        <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-4">Expense Breakdown</h3>
                        <div className="space-y-3">
                          {financialReport.expense_breakdown.map((item) => (
                            <div key={item.category} className="flex items-center justify-between">
                              <span className="text-[#A89F95] capitalize">{item.category.replace('_', ' ')}</span>
                              <span className="text-[#FAEDE3]">₹{item.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Top Products */}
                    <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                      <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-4">Top Selling Products</h3>
                      <div className="space-y-3">
                        {salesReport.top_products.map((product, idx) => (
                          <div key={product.name} className="flex items-center justify-between p-3 bg-[#161412] rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-[#D4A373]/20 flex items-center justify-center text-[#D4A373] font-bold text-sm">
                                {idx + 1}
                              </span>
                              <span className="text-[#FAEDE3]">{product.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-[#D4A373] font-semibold">₹{product.revenue.toLocaleString()}</p>
                              <p className="text-[#A89F95] text-sm">{product.quantity} sold</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Staff Management</h1>
                  <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Staff
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#211C18] border-[#332A24] max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-serif text-2xl text-[#FAEDE3]">Add Staff Member</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleStaffSubmit} className="space-y-4 mt-4">
                        <div>
                          <Label className="text-[#FAEDE3]">Name</Label>
                          <Input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Email</Label>
                          <Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Password</Label>
                          <Input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required className="bg-[#161412] border-[#332A24] text-[#FAEDE3]" />
                        </div>
                        <div>
                          <Label className="text-[#FAEDE3]">Role</Label>
                          <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}>
                            <SelectTrigger className="bg-[#161412] border-[#332A24]"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#211C18] border-[#332A24]">
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full btn-primary">Add Staff</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((member) => (
                    <div key={member.id} className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-[#FAEDE3]">{member.name}</h3>
                          <p className="text-[#A89F95] text-sm">{member.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs capitalize ${member.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' : member.role === 'manager' ? 'bg-blue-500/10 text-blue-400' : 'bg-[#D4A373]/10 text-[#D4A373]'}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className={member.is_active ? 'text-green-400' : 'text-red-400'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {member.role !== 'super_admin' && (
                          <button onClick={() => deleteStaff(member.id)} className="text-red-400 hover:text-red-300">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-serif text-3xl font-bold text-[#FAEDE3] mb-8">Audit Logs</h1>
                <div className="bg-[#211C18] rounded-2xl border border-[#332A24] overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#161412]">
                      <tr>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Time</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">User</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Action</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Resource</th>
                        <th className="text-left p-4 text-[#A89F95] text-sm font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-[#332A24]">
                          <td className="p-4 text-[#A89F95] text-sm">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="p-4 text-[#FAEDE3]">{log.user_name}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${log.action === 'create' ? 'bg-green-500/10 text-green-400' : log.action === 'delete' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-[#A89F95] capitalize">{log.resource_type}</td>
                          <td className="p-4 text-[#A89F95] text-sm">{log.details ? JSON.stringify(log.details).slice(0, 50) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Database Tab */}
            {activeTab === 'database' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                  <h1 className="font-serif text-3xl font-bold text-[#FAEDE3]">Database Access</h1>
                  <Button onClick={createBackup} className="btn-primary flex items-center gap-2">
                    <Download className="w-4 h-4" /> Create Backup
                  </Button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dbTables.map((table) => (
                    <div key={table.name} className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="w-5 h-5 text-[#D4A373]" />
                        <h3 className="font-semibold text-[#FAEDE3]">{table.name}</h3>
                      </div>
                      <p className="text-[#A89F95]">{table.count.toLocaleString()} records</p>
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

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-[#A89F95] text-sm">{label}</p>
        <p className="text-2xl font-bold text-[#FAEDE3]">{value}</p>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
