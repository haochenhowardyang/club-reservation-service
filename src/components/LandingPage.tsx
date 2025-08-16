"use client";

import { signIn } from "next-auth/react";

export default function LandingPage() {
  return (
    <div className="flex flex-col h-screen w-screen relative overflow-hidden">
      {/* Mobile Video - shown on screens smaller than md (768px) */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10 block md:hidden"
      >
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Desktop Video - shown on screens md (768px) and larger */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-10 hidden md:block"
      >
        <source src="/background_pc.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      <div className="flex-1 flex flex-col justify-center items-center relative">
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold relative z-10 text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          欢迎来到微醺俱乐部
        </h1>
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold relative z-10 text-center mt-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          让波士顿生活不再无聊
        </h1>
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl mt-4 relative z-10 text-center" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
          加入Allston私人俱乐部
        </h2>
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl mt-4 relative z-10 text-center" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
          麻将，特调鸡尾酒吧，德州扑克
        </h2>
        <div className="mt-8 relative z-10">
          <button
            onClick={() => signIn("google")}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
          >
            开始预约
          </button>
        </div>
      </div>
    </div>
  );
}
