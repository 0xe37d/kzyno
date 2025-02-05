'use client'

import React, { useState } from 'react';
import { daydream, hyperlegible } from '../fonts';

interface AirdropSignupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  email: string;
  walletAddress: string;
  twitter: string;
  discord: string;
}

const INITIAL_FORM_DATA: FormData = {
  email: '',
  walletAddress: '',
  twitter: '',
  discord: ''
};

export default function AirdropSignup({ isOpen, onClose }: AirdropSignupProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/submit-airdrop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit entry');
      }
      
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        setFormData(INITIAL_FORM_DATA);
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#2a0a1f] border-2 border-[#ff69b4] rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(255,20,147,0.3)]">
        <h2 className={`text-2xl text-white mb-6 text-center ${daydream.className}`}>Sign Up for Airdrop</h2>
        
        <form onSubmit={handleSubmit} className={`space-y-4 ${hyperlegible.className}`}>
          <div>
            <label htmlFor="email" className={`block text-pink-200 mb-1 ${daydream.className}`}>Email</label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-2 rounded-lg bg-[#3a0d2a] border border-[#ff69b4] text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div>
            <label htmlFor="wallet" className={`block text-pink-200 mb-1 ${daydream.className}`}>Wallet Address</label>
            <input
              type="text"
              id="wallet"
              required
              className="w-full px-4 py-2 rounded-lg bg-[#3a0d2a] border border-[#ff69b4] text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
              value={formData.walletAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
            />
          </div>
          
          <div>
            <label htmlFor="twitter" className={`block text-pink-200 mb-1 ${daydream.className}`}>Twitter Handle (optional)</label>
            <input
              type="text"
              id="twitter"
              className="w-full px-4 py-2 rounded-lg bg-[#3a0d2a] border border-[#ff69b4] text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
              value={formData.twitter}
              onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
            />
          </div>
          
          <div>
            <label htmlFor="discord" className={`block text-pink-200 mb-1 ${daydream.className}`}>Discord Username (optional)</label>
            <input
              type="text"
              id="discord"
              className="w-full px-4 py-2 rounded-lg bg-[#3a0d2a] border border-[#ff69b4] text-white focus:outline-none focus:ring-2 focus:ring-[#ff1493]"
              value={formData.discord}
              onChange={(e) => setFormData(prev => ({ ...prev, discord: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border border-[#ff69b4] text-pink-200 hover:bg-[#ff69b4] hover:text-white transition-colors ${daydream.className}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg bg-[#ff69b4] text-white hover:bg-[#ff1493] transition-colors disabled:opacity-50 ${daydream.className}`}
            >
              {isSubmitting ? 'Submitting...' : 'Sign Up'}
            </button>
          </div>
        </form>

        {submitStatus === 'success' && (
          <div className={`mt-4 p-2 bg-green-500 bg-opacity-20 border border-green-500 rounded text-green-300 text-center ${hyperlegible.className}`}>
            Successfully signed up for the airdrop!
          </div>
        )}
        
        {submitStatus === 'error' && (
          <div className={`mt-4 p-2 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-300 text-center ${hyperlegible.className}`}>
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
} 