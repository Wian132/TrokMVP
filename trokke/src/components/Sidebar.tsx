'use client';

import { useAuth } from './AuthContext';
import Link from 'next/link';
import {
  Users,
  Home,
  Truck,
  Building,
  LogOut,
  User,
  Store,
} from 'lucide-react';

interface SidebarProps {
  userRole: string;
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const getMenuItems = () => {
    // The href paths should NOT include the (shell) group folder.
    // Next.js's router ignores these folders for URL paths.
    switch (userRole) {
      case 'admin':
        return [
          { href: '/admin/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/admin/workers', icon: <Users />, label: 'Workers' },
          { href: '/admin/clients', icon: <User />, label: 'Clients' },
          { href: '/admin/trucks', icon: <Truck />, label: 'Trucks' },
          { href: '/admin/business-stores', icon: <Store />, label: 'Business Stores' },
        ];
      case 'worker':
        return [
          { href: '/worker/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/worker/my-truck', icon: <Truck />, label: 'My Truck' },
        ];
      case 'client':
        return [
          { href: '/client/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/client/my-stores', icon: <Building />, label: 'My Stores' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 text-2xl font-bold">Trokke</div>
      <nav className="flex-1 p-2">
        <ul>
          {getMenuItems().map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center p-2 rounded hover:bg-gray-700">
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 rounded hover:bg-gray-700"
        >
          <LogOut className="mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
