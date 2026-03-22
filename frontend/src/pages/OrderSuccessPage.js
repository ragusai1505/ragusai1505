import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Package, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, success, failed, expired
  const [paymentData, setPaymentData] = useState(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId || !token) {
      navigate('/');
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await axios.get(`${API}/payments/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setPaymentData(response.data);

        if (response.data.payment_status === 'paid') {
          setStatus('success');
          return true;
        } else if (response.data.status === 'expired') {
          setStatus('expired');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error checking payment:', error);
        return false;
      }
    };

    // Initial check
    pollPaymentStatus().then((done) => {
      if (!done && pollAttempts < 5) {
        // Continue polling
        const interval = setInterval(async () => {
          setPollAttempts((prev) => {
            if (prev >= 4) {
              clearInterval(interval);
              setStatus('failed');
              return prev;
            }
            return prev + 1;
          });
          
          const finished = await pollPaymentStatus();
          if (finished) {
            clearInterval(interval);
          }
        }, 2000);

        return () => clearInterval(interval);
      }
    });
  }, [sessionId, token, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#161412] flex items-center justify-center" data-testid="order-loading">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[#A89F95] text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161412] pt-24 px-6" data-testid="order-success-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        {status === 'success' ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-serif text-4xl font-bold text-[#FAEDE3] mb-4">Order Confirmed!</h1>
            <p className="text-[#A89F95] text-lg mb-8">
              Thank you for your order. Your coffee is being prepared with love and will be delivered in approximately 30 minutes.
            </p>

            {paymentData?.order_id && (
              <div className="bg-[#211C18] rounded-2xl border border-[#332A24] p-6 mb-8">
                <div className="flex items-center justify-center gap-3 text-[#D4A373] mb-4">
                  <Package className="w-5 h-5" />
                  <span className="font-medium">Order ID</span>
                </div>
                <p className="text-[#FAEDE3] font-mono text-lg">{paymentData.order_id.slice(0, 8)}...</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={paymentData?.order_id ? `/track?order=${paymentData.order_id}` : '/orders'}>
                <Button className="btn-primary flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Track Order
                </Button>
              </Link>
              <Link to="/menu">
                <Button className="btn-secondary flex items-center gap-2">
                  Order More
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="font-serif text-4xl font-bold text-[#FAEDE3] mb-4">
              {status === 'expired' ? 'Payment Expired' : 'Payment Issue'}
            </h1>
            <p className="text-[#A89F95] text-lg mb-8">
              {status === 'expired'
                ? 'Your payment session has expired. Please try placing your order again.'
                : 'We could not verify your payment. Please contact support if you were charged.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/checkout">
                <Button className="btn-primary">Try Again</Button>
              </Link>
              <Link to="/">
                <Button className="btn-secondary">Go Home</Button>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default OrderSuccessPage;
