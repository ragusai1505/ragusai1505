# Cafe Ikigai - Coffee Delivery Platform PRD

## Original Problem Statement
Build a complete Cafe Ikigai coffee delivery website clone with:
- Landing page, full e-commerce with cart/checkout/order tracking
- User authentication, Admin dashboard, Stripe payment integration
- **Enhancement**: Complete Admin Management System with inventory tracking, sales analytics, financial reporting, RBAC, audit logs, loyalty points

## Architecture
- **Frontend**: React 19 + TailwindCSS + Framer Motion + Shadcn/UI
- **Backend**: FastAPI (Python) with async endpoints
- **Database**: MongoDB with Motor async driver
- **Payments**: Stripe Checkout integration
- **Auth**: JWT-based with RBAC (super_admin, manager, staff, customer)

## User Personas
1. **Coffee Lover (Customer)**: Orders coffee, earns loyalty points, tracks orders
2. **Super Admin**: Full access to all features, staff management, database access
3. **Manager**: Manages inventory, expenses, views reports
4. **Staff**: Processes orders, views inventory

## What's Been Implemented (Jan 2026)

### Core Features
- [x] Landing page with hero, features, menu preview, contact
- [x] Full menu with category filtering and search
- [x] Shopping cart with glassmorphic drawer
- [x] User authentication (register/login)
- [x] Checkout with Stripe payment
- [x] Order tracking with status timeline
- [x] Order cancellation with reason

### Admin Management System
- [x] **Dashboard Overview**: Total orders, revenue, pending orders, low stock alerts
- [x] **Orders Management**: View all orders, update status (pending→confirmed→preparing→out_for_delivery→delivered)
- [x] **Menu Management**: Add/edit/delete menu items with images
- [x] **Inventory Management**: 
  - SKU tracking, categories (raw_materials, packaging, equipment)
  - Supplier information, cost prices
  - Stock quantity with units (kg, liters, pieces, bottles)
  - Low stock threshold and alerts
  - Stock adjustment (+Stock/-Stock) with reason logging
- [x] **Expense Management**:
  - Categories: rent, utilities, salaries, inventory_purchase, equipment, marketing, miscellaneous
  - Vendor tracking, date, amount
  - Total expense calculation
- [x] **Reports & Analytics**:
  - Daily/Weekly/Monthly sales reports
  - Revenue, orders count, average order value
  - Top selling products
  - Peak order hours
  - Financial summary: Revenue vs Expenses = Net Profit
  - Profit margin calculation
  - Expense breakdown by category
- [x] **Staff Management**: Add/edit/delete staff with roles (manager, staff)
- [x] **Audit Logs**: Track all admin actions (who, what, when)
- [x] **Database Access**: View tables, record counts, create backups

### Loyalty System
- [x] Points earning: 1 point per ₹10 spent (with tier multipliers)
- [x] Tiers: Bronze → Silver (1000 pts) → Gold (5000 pts) → Platinum (10000 pts)
- [x] Points redemption at checkout (1 point = ₹0.50, max 50% discount)
- [x] Transaction history, progress to next tier

### Role-Based Access Control (RBAC)
- **Super Admin**: All permissions
- **Manager**: view_orders, manage_orders, view_inventory, manage_inventory, view_reports, view_expenses, manage_expenses, view_users
- **Staff**: view_orders, manage_orders, view_inventory

## API Endpoints

### Auth
- POST /api/auth/register, /api/auth/login
- GET /api/auth/me

### Menu
- GET /api/menu, /api/menu/all, /api/menu/{id}
- POST /api/menu, PUT /api/menu/{id}, DELETE /api/menu/{id}
- GET /api/categories

### Orders
- POST /api/orders, GET /api/orders, /api/orders/{id}
- POST /api/orders/{id}/cancel
- GET /api/orders/track/{id}

### Admin
- GET /api/admin/stats, /api/admin/orders
- PUT /api/admin/orders/{id}/status
- GET /api/admin/reports/sales, /api/admin/reports/financial
- GET /api/admin/staff, POST /api/admin/staff
- GET /api/admin/audit-logs
- GET /api/admin/database/tables, /api/admin/database/{table}
- POST /api/admin/database/backup

### Inventory
- GET /api/inventory, /api/inventory/{id}, /api/inventory/low-stock
- POST /api/inventory, PUT /api/inventory/{id}, DELETE /api/inventory/{id}
- POST /api/inventory/adjust

### Expenses
- GET /api/expenses, /api/expenses/{id}
- POST /api/expenses, PUT /api/expenses/{id}, DELETE /api/expenses/{id}

### Loyalty
- GET /api/loyalty/my-points

### Reviews
- GET /api/menu/{id}/reviews
- POST /api/reviews

## Credentials
- **Super Admin**: admin@cafeikigai.com / admin123

## P1 Features Remaining
- [ ] Email notifications for orders (SendGrid/Resend)
- [ ] SMS order updates (Twilio)
- [ ] Export reports as PDF/CSV
- [ ] Multi-location support
- [ ] Promo codes/discounts system

## P2 Features Remaining
- [ ] AI insights for restocking predictions
- [ ] Auto-generated invoices
- [ ] Customer reviews display
- [ ] Analytics charts (Chart.js)
- [ ] Mobile-optimized admin dashboard

## Tech Stack
- React 19, TailwindCSS, Framer Motion, Lucide Icons
- FastAPI, Motor, PyJWT, bcrypt
- MongoDB, Stripe
