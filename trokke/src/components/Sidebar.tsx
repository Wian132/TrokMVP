"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { XMarkIcon } from '@heroicons/react/24/outline';

interface NavLink {
  href: string;
  label: string;
}

interface SidebarProps {
  userRole: "admin" | "client" | "worker" | string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const adminLinks: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/workers", label: "Workers" },
  { href: "/admin/trucks", label: "Trucks" },
  { href: "/admin/my-shops", label: "My Shops" },
];

const clientLinks: NavLink[] = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/client/my-shops", label: "My Shops" },
];

const workerLinks: NavLink[] = [
  { href: "/worker/dashboard", label: "Dashboard" },
  { href: "/worker/my-truck", label: "My Truck" },
];

export default function Sidebar({ userRole, isSidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  let links: NavLink[] = [];
  if (userRole === "admin") {
    links = adminLinks;
  } else if (userRole === "client") {
    links = clientLinks;
  } else if (userRole === "worker") {
    links = workerLinks;
  }

  return (
    <>
      {/* Mobile-first: Sidebar is hidden by default and slides in */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-20 transition-opacity md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-5 transform z-30 transition-transform md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold">My App</h1>
            {/* Close button for mobile */}
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1">
                <XMarkIcon className="h-6 w-6 text-white" />
            </button>
        </div>
        <nav>
          <ul>
            {links.map((link) => (
              <li key={link.href} className="mb-4">
                <Link
                  href={link.href}
                  onClick={() => setSidebarOpen(false)} // Close sidebar on link click on mobile
                  className={`block p-2 rounded hover:bg-gray-700 ${
                    pathname === link.href ? "bg-gray-900" : ""
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
