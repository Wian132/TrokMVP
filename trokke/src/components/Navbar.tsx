// src/components/Navbar.tsx
"use client";

import { Fragment } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { ChevronDownIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/20/solid';

interface NavbarProps {
    setSidebarOpen: (isOpen: boolean) => void;
    pageTitle: string; // Add pageTitle prop
}

const Navbar = ({ setSidebarOpen, pageTitle }: NavbarProps) => {
  const { user, signOut } = useAuth();

  // Get user's first initial
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Hamburger Menu Button - visible only on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 focus:outline-none md:hidden mr-4"
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Page Title */}
            <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          </div>
          
          {/* User Menu */}
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-x-2 rounded-full p-1 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-200 hover:bg-gray-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-md font-bold">
                {userInitial}
              </div>
              <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-1" aria-hidden="true" />
            </MenuButton>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b">
                    <p className="text-sm text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                <MenuItem>
                  <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        signOut();
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Sign out
                  </a>
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;