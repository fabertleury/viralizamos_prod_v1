'use client';

import { useState } from 'react';
import InstagramPostsReelsStep2 from '@/components/checkout/InstagramPostsReelsStep2';
import InstagramPostsCurtidasStep2 from '@/components/checkout/InstagramPostsCurtidasStep2';

const CurtidasStep2Page = () => {
  const [activeTab, setActiveTab] = useState<'reels' | 'posts'>('reels');

  return (
    <div>
      <h1>Checkout de Curtidas</h1>
      <div className="flex space-x-4 mb-4">
        <button className={`px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 ease-in-out transform bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg ${activeTab === 'reels' ? 'bg-opacity-100' : 'bg-opacity-50'}`} onClick={() => setActiveTab('reels')}>Reels (12)</button>
        <button className={`px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 ease-in-out transform bg-gradient-to-r from-pink-500 to-rose-500 text-white scale-105 shadow-lg ${activeTab === 'posts' ? 'bg-opacity-100' : 'bg-opacity-50'}`} onClick={() => setActiveTab('posts')}>Posts</button>
      </div>
      {activeTab === 'reels' ? (
        <InstagramPostsReelsStep2 serviceType="curtidas" title="Comprar Curtidas para Instagram" />
      ) : (
        <InstagramPostsCurtidasStep2 />
      )}
    </div>
  );
};

export default CurtidasStep2Page;
