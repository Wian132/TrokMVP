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
  LayoutDashboard,
} from 'lucide-react';

// Define the props for the Sidebar component
interface SidebarProps {
  userRole: string;
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const getMenuItems = () => {
    switch (userRole) {
      case 'admin':
        return [
          { href: '/(shell)/admin/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/(shell)/admin/workers', icon: <Users />, label: 'Workers' },
          { href: '/(shell)/admin/clients', icon: <User />, label: 'Clients' },
          { href: '/(shell)/admin/trucks', icon: <Truck />, label: 'Trucks' },
          { href: '/(shell)/admin/business-stores', icon: <Store />, label: 'Business Stores' },
          { href: '/(shell)/admin/layout', icon: <LayoutDashboard />, label: 'Layout' },
        ];
      case 'worker':
        return [
          { href: '/(shell)/worker/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/(shell)/worker/my-truck', icon: <Truck />, label: 'My Truck' },
        ];
      case 'client':
        return [
          { href: '/(shell)/client/dashboard', icon: <Home />, label: 'Dashboard' },
          { href: '/(shell)/client/my-stores', icon: <Building />, label: 'My Stores' },
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
