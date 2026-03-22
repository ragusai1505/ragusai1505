# Cafe Ikigai - Coffee Delivery Platform PRD

## Original Problem Statement
Build a complete Cafe Ikigai coffee delivery website clone from https://fast-brew-dash.lovable.app/ - A premium coffee shop with 30-minute delivery promise. Features include:
- Landing page with hero, menu preview, about section, contact info
- Full e-commerce with cart, checkout, order tracking
- User authentication (login/register)
- Admin dashboard to manage menu and orders
- Real-time order tracking
- Stripe payment integration

## Architecture
- **Frontend**: React 19 with TailwindCSS, Framer Motion, Shadcn/UI
- **Backend**: FastAPI (Python) with async endpoints
- **Database**: MongoDB with Motor async driver
- **Payments**: Stripe Checkout integration
- **Auth**: JWT-based authentication with bcrypt password hashing

## User Personas
1. **Coffee Lover (Customer)**: Wants quick, quality coffee delivered fast
2. **Cafe Admin**: Manages menu, processes orders, tracks revenue
3. **Delivery Customer**: Tracks order status in real-time

## Core Requirements (Static)
- 30-minute delivery promise USP
- Dark premium coffee shop aesthetic
- Mobile responsive design
- Secure payment processing
- Real-time order tracking

## What's Been Implemented (Jan 2026)
### Frontend Pages
- [x] Home page with hero, features, menu preview, contact sections
- [x] Menu page with category filtering and search
- [x] Login/Register page with toggle
- [x] Checkout page with address/phone input
- [x] Order success page with payment polling
- [x] My Orders page (order history)
- [x] Track Order page with status timeline
- [x] Admin Dashboard (Overview, Orders, Menu management)

### Backend APIs
- [x] Auth: /api/auth/register, /api/auth/login, /api/auth/me
- [x] Menu: /api/menu, /api/menu/{id}, /api/categories
- [x] Orders: /api/orders, /api/orders/{id}, /api/orders/track/{id}
- [x] Admin: /api/admin/stats, /api/admin/orders, /api/admin/orders/{id}/status
- [x] Payments: /api/payments/status/{session_id}, /api/webhook/stripe
- [x] Seed: /api/seed (12 menu items + admin user)

### Components
- [x] Header with auth state, cart icon, mobile menu
- [x] Footer with contact info, hours, social links
- [x] Cart Drawer (glassmorphic side sheet)
- [x] Menu Card with hover animations
- [x] Loading spinners and page loaders

### Design System
- Colors: Dark theme (#161412 bg, #D4A373 primary, #FAEDE3 text)
- Fonts: Playfair Display (headings), Manrope (body)
- Animations: Framer Motion for page transitions, hover effects

## Credentials
- **Admin**: admin@cafeikigai.com / admin123
- **Stripe**: Test key configured in backend .env

## P0/P1/P2 Features Remaining

### P0 (Critical) - Completed
- [x] Core ordering flow
- [x] Payment integration
- [x] Admin dashboard

### P1 (Important)
- [ ] Email notifications for orders
- [ ] SMS order updates (Twilio)
- [ ] Order cancellation feature
- [ ] Password reset flow

### P2 (Nice to Have)
- [ ] Customer reviews/ratings
- [ ] Loyalty points system
- [ ] Promo codes/discounts
- [ ] Analytics dashboard
- [ ] Multiple payment methods
- [ ] Order history export

## Next Tasks
1. Test complete checkout flow with Stripe
2. Add email notifications for order confirmation
3. Implement order cancellation feature
4. Add customer reviews for menu items
