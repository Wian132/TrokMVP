"use client";

import { Bars3Icon } from '@heroicons/react/24/outline';

interface NavbarProps {
    setSidebarOpen: (isOpen: boolean) => void;
}

const Navbar = ({ setSidebarOpen }: NavbarProps) => {
  return (
    <header className="shadow-md bg-white sticky top-0 z-10">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center h-16">
        {/* Hamburger Menu Button - visible only on mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-500 focus:outline-none md:hidden"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Centered Title - adjusted for mobile */}
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-center flex-1">
          Trucks Business
        </h1>
        
        {/* Spacer to keep title centered */}
        <div className="w-6 md:hidden"></div>
      </div>
    </header>
  );
};

export default Navbar;
