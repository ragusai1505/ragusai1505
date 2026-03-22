import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Gift, Award, TrendingUp, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const LoyaltyCard = ({ onRedeemPoints }) => {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchLoyalty = async () => {
      try {
        const response = await axios.get(`${API}/loyalty/my-points`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLoyalty(response.data);
      } catch (error) {
        console.error('Failed to fetch loyalty:', error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchLoyalty();
  }, [token]);

  if (loading) return <LoadingSpinner size="sm" />;
  if (!loyalty) return null;

  const tierColors = {
    bronze: { bg: 'bg-amber-900/20', text: 'text-amber-400', border: 'border-amber-700/50' },
    silver: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-500/50' },
    gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-600/50' },
    platinum: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/50' }
  };

  const colors = tierColors[loyalty.tier] || tierColors.bronze;
  const progressToNext = loyalty.next_tier_at?.points_needed > 0 
    ? ((loyalty.lifetime_points % (loyalty.next_tier_at.tier === 'silver' ? 1000 : loyalty.next_tier_at.tier === 'gold' ? 5000 : 10000)) / 
       (loyalty.next_tier_at.tier === 'silver' ? 1000 : loyalty.next_tier_at.tier === 'gold' ? 4000 : 5000)) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colors.bg} border ${colors.border} rounded-2xl p-6`}
      data-testid="loyalty-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Award className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#FAEDE3]">Loyalty Rewards</h3>
            <p className={`text-sm capitalize ${colors.text}`}>{loyalty.tier} Member</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#D4A373]">{loyalty.points}</p>
          <p className="text-[#A89F95] text-sm">points</p>
        </div>
      </div>

      {/* Points Value */}
      <div className="bg-[#161412]/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4A373]" />
            <span className="text-[#FAEDE3]">Points Value</span>
          </div>
          <span className="text-[#D4A373] font-semibold">₹{loyalty.points_value.toFixed(2)}</span>
        </div>
        <p className="text-[#A89F95] text-xs mt-2">1 point = ₹0.50 discount</p>
      </div>

      {/* Progress to Next Tier */}
      {loyalty.next_tier_at?.tier !== 'max' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#A89F95]">Progress to {loyalty.next_tier_at.tier}</span>
            <span className="text-[#FAEDE3]">{loyalty.next_tier_at.points_needed} pts needed</span>
          </div>
          <div className="h-2 bg-[#161412] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressToNext, 100)}%` }}
              className={`h-full ${colors.bg.replace('/20', '')} rounded-full`}
            />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {loyalty.transactions?.length > 0 && (
        <div>
          <h4 className="text-[#FAEDE3] font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {loyalty.transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm p-2 bg-[#161412]/30 rounded-lg">
                <span className="text-[#A89F95]">{tx.description}</span>
                <span className={tx.points > 0 ? 'text-green-400' : 'text-red-400'}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redeem Button */}
      {loyalty.points > 0 && onRedeemPoints && (
        <button
          onClick={() => onRedeemPoints(loyalty.points)}
          className="w-full mt-4 py-3 rounded-xl bg-[#D4A373]/20 text-[#D4A373] font-medium hover:bg-[#D4A373]/30 transition-colors flex items-center justify-center gap-2"
          data-testid="redeem-points-btn"
        >
          <Star className="w-4 h-4" />
          Redeem Points at Checkout
        </button>
      )}
    </motion.div>
  );
};

export default LoyaltyCard;
