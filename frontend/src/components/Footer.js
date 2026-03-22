import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Instagram, Twitter, Facebook, MapPin, Phone, Mail } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#0D0B0A] border-t border-[#332A24]" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#D4A373] flex items-center justify-center">
                <Coffee className="w-5 h-5 text-[#161412]" />
              </div>
              <span className="font-serif text-2xl font-bold text-[#FAEDE3]">Cafe Ikigai</span>
            </Link>
            <p className="text-[#A89F95] text-sm leading-relaxed mb-6">
              Handcrafted specialty coffee brewed fresh and delivered to you in 30 minutes.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-full bg-[#211C18] hover:bg-[#D4A373] hover:text-[#161412] transition-colors text-[#A89F95]">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-[#211C18] hover:bg-[#D4A373] hover:text-[#161412] transition-colors text-[#A89F95]">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 rounded-full bg-[#211C18] hover:bg-[#D4A373] hover:text-[#161412] transition-colors text-[#A89F95]">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#FAEDE3] mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/menu" className="text-[#A89F95] hover:text-[#D4A373] transition-colors text-sm">
                  Our Menu
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-[#A89F95] hover:text-[#D4A373] transition-colors text-sm">
                  Track Order
                </Link>
              </li>
              <li>
                <a href="#about" className="text-[#A89F95] hover:text-[#D4A373] transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-[#A89F95] hover:text-[#D4A373] transition-colors text-sm">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#FAEDE3] mb-6">Hours</h4>
            <ul className="space-y-3 text-sm text-[#A89F95]">
              <li className="flex justify-between">
                <span>Monday - Friday</span>
                <span className="text-[#FAEDE3]">7am - 9pm</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday</span>
                <span className="text-[#FAEDE3]">8am - 10pm</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span className="text-[#FAEDE3]">8am - 10pm</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-[#FAEDE3] mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-[#A89F95]">
                <MapPin className="w-5 h-5 text-[#D4A373] flex-shrink-0 mt-0.5" />
                <span>123 Roast Lane, Coffee District, Downtown</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[#A89F95]">
                <Phone className="w-5 h-5 text-[#D4A373] flex-shrink-0" />
                <span>+1 (555) 234-5678</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[#A89F95]">
                <Mail className="w-5 h-5 text-[#D4A373] flex-shrink-0" />
                <span>hello@cafeikigai.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-[#332A24] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#A89F95] text-sm">
            © 2024 Cafe Ikigai. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-[#A89F95]">
            <a href="#" className="hover:text-[#D4A373] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#D4A373] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
