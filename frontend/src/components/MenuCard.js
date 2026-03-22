import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

export const MenuCard = ({ item, index = 0 }) => {
  const { addItem } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="menu-card group"
      data-testid={`menu-card-${item.id}`}
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1553578615-ee00f2db2c5c'}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#161412] via-transparent to-transparent" />
        
        {/* Category Badge */}
        <span className="absolute top-4 left-4 px-3 py-1 text-xs font-medium uppercase tracking-wider bg-[#D4A373]/90 text-[#161412] rounded-full">
          {item.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-[#FAEDE3] mb-2 group-hover:text-[#D4A373] transition-colors">
          {item.name}
        </h3>
        <p className="text-[#A89F95] text-sm leading-relaxed mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-[#D4A373]">₹{item.price}</span>
          <Button
            onClick={() => addItem(item)}
            className="rounded-full bg-[#332A24] hover:bg-[#D4A373] hover:text-[#161412] p-3 transition-all duration-300"
            data-testid={`add-to-cart-${item.id}`}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
