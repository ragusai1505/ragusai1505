import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Coffee, Star, Truck, ChevronRight, MapPin, Phone, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { MenuCard } from '@/components/MenuCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await axios.get(`${API}/menu`);
        setFeaturedItems(response.data.slice(0, 6));
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      }
    };
    fetchMenu();
  }, []);

  const features = [
    {
      icon: Clock,
      title: 'Order in Seconds',
      description: 'Pick your favorite brew from our menu and place your order online.',
    },
    {
      icon: Coffee,
      title: 'Brewed & Dispatched',
      description: "We start crafting your coffee the moment your order lands. Fresh, always.",
    },
    {
      icon: Truck,
      title: 'At Your Door in 30 Min',
      description: 'Our riders guarantee delivery within 30 minutes — hot and perfect.',
    },
    {
      icon: Star,
      title: 'Freshness Guaranteed',
      description: "If it's not fresh, it's on us. That's our promise, no questions asked.",
    },
  ];

  return (
    <div className="bg-[#161412] noise-overlay" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/1235706/pexels-photo-1235706.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            alt="Coffee being poured"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#161412] via-[#161412]/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4A373]/10 border border-[#D4A373]/30 mb-8">
              <Clock className="w-4 h-4 text-[#D4A373]" />
              <span className="text-sm font-medium text-[#D4A373]">30-Minute Delivery Promise</span>
            </div>

            {/* Heading */}
            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tighter text-[#FAEDE3] leading-[1.1] mb-6">
              Your Perfect Cup,<br />
              <span className="text-[#D4A373]">At Your Door</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-[#A89F95] leading-relaxed mb-10 max-w-lg">
              Handcrafted specialty coffee brewed fresh and delivered to you in 30 minutes — or enjoy it in our cozy shop. No compromises.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link to="/menu" data-testid="order-delivery-btn">
                <Button className="btn-primary text-lg px-10 py-4 flex items-center gap-2">
                  Order Delivery
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/menu" data-testid="view-menu-btn">
                <Button className="btn-secondary text-lg px-10 py-4">
                  View Menu
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-10 mt-14">
              <div>
                <p className="text-3xl font-bold text-[#D4A373]">30</p>
                <p className="text-sm text-[#A89F95]">Minutes</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#D4A373]">100%</p>
                <p className="text-sm text-[#A89F95]">Fresh</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#D4A373]">5★</p>
                <p className="text-sm text-[#A89F95]">Rated</p>
              </div>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-[#D4A373]/20 rounded-3xl blur-3xl" />
              <img
                src="https://images.unsplash.com/photo-1634709170162-23a76022e9c9"
                alt="Coffee machine brewing"
                className="relative rounded-3xl shadow-2xl border border-[#332A24]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs uppercase tracking-[0.2em] text-[#D4A373] font-bold">Our Promise</span>
            <h2 className="font-serif text-4xl md:text-5xl font-semibold text-[#FAEDE3] mt-4">
              Fresh Coffee in 30 Minutes
            </h2>
            <p className="text-[#A89F95] text-lg mt-4 max-w-2xl mx-auto">
              We don't just deliver coffee — we deliver an experience, fast.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-[#211C18] rounded-2xl border border-[#332A24] hover:border-[#D4A373]/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#D4A373]/10 flex items-center justify-center mb-6 group-hover:bg-[#D4A373]/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-[#D4A373]" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-3">{feature.title}</h3>
                <p className="text-[#A89F95] text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Preview Section */}
      <section className="py-24 px-6 bg-[#0D0B0A]" data-testid="menu-preview-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16"
          >
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#D4A373] font-bold">Our Menu</span>
              <h2 className="font-serif text-4xl md:text-5xl font-semibold text-[#FAEDE3] mt-4">
                Crafted With Care
              </h2>
              <p className="text-[#A89F95] text-lg mt-4 max-w-lg">
                Every cup tells a story. Here are a few favorites our regulars can't live without.
              </p>
            </div>
            <Link to="/menu" className="mt-6 md:mt-0" data-testid="see-full-menu-btn">
              <Button className="btn-secondary flex items-center gap-2">
                See Full Menu
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredItems.map((item, index) => (
              <MenuCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Visit Us Section */}
      <section id="contact" className="py-24 px-6" data-testid="visit-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-xs uppercase tracking-[0.2em] text-[#D4A373] font-bold">Visit Us</span>
              <h2 className="font-serif text-4xl md:text-5xl font-semibold text-[#FAEDE3] mt-4 mb-6">
                A Space to Slow Down
              </h2>
              <p className="text-[#A89F95] text-lg leading-relaxed mb-10">
                Whether it's a quick espresso or a lazy afternoon — our shop is your third place. Warm light, great tunes, better coffee.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#D4A373]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#FAEDE3] mb-1">Location</h4>
                    <p className="text-[#A89F95]">123 Roast Lane, Coffee District, Downtown</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-[#D4A373]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#FAEDE3] mb-1">Hours</h4>
                    <p className="text-[#A89F95]">Mon – Fri: 7am – 9pm · Sat – Sun: 8am – 10pm</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-[#D4A373]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#FAEDE3] mb-1">Call Us</h4>
                    <p className="text-[#A89F95]">+1 (555) 234-5678</p>
                  </div>
                </div>
              </div>

              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-10"
              >
                <Button className="btn-primary flex items-center gap-2">
                  Get Directions
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-[#D4A373]/10 rounded-3xl blur-2xl" />
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800"
                alt="Coffee shop interior"
                className="relative rounded-3xl shadow-2xl border border-[#332A24] w-full"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
