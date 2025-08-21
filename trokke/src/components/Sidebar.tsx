// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { 
  XMarkIcon, 
  ArrowRightOnRectangleIcon,
  ChartPieIcon,
  UserGroupIcon,
  UsersIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  LinkIcon as LinkIconSolid,
  WrenchScrewdriverIcon,
  TableCellsIcon, // Import the new icon
  ArchiveBoxIcon // Icon for the future section
} from '@heroicons/react/24/solid';

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  userRole: "admin" | "client" | "worker" | string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

// --- UPDATED: New link structure for admin ---
const adminCoreLinks: NavLink[] = [
  { href: "/admin/trucks", label: "Fleet Overview", icon: ChartPieIcon },
  { href: "/admin/fleet-analytics", label: "Fleet Analytics", icon: TableCellsIcon },
  { href: "/admin/workers", label: "Workers", icon: UsersIcon },
  { href: "/admin/trips", label: "Trips", icon: MapPinIcon },
  { href: "/admin/link-workers", label: "Link Workers", icon: LinkIconSolid },
];

const adminFutureLinks: NavLink[] = [
    { href: "/admin/clients", label: "Clients", icon: UserGroupIcon },
    { href: "/admin/my-shops", label: "My Shops", icon: BuildingStorefrontIcon },
];

// --- Other roles remain the same ---
const clientLinks: NavLink[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/client/my-shops", label: "My Shops", icon: BuildingStorefrontIcon },
];

const workerLinks: NavLink[] = [
  { href: "/worker/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/worker/my-truck", label: "My Truck", icon: TruckIcon },
  { href: "/worker/pre-trip-check", label: "Pre-Trip Check", icon: WrenchScrewdriverIcon },
];

export default function Sidebar({ userRole, isSidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  // Determine which links to show based on role
  let coreLinks: NavLink[] = [];
  let futureLinks: NavLink[] = [];

  if (userRole === "admin") {
    coreLinks = adminCoreLinks;
    futureLinks = adminFutureLinks;
  } else if (userRole === "client") {
    coreLinks = clientLinks;
  } else if (userRole === "worker") {
    coreLinks = workerLinks;
  }

  const sidebarContent = (
    <>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Logo and Title */}
            <div className="flex items-center flex-shrink-0 px-4">
                 <Image src="/favicon.ico" alt="JLL Fresh Produce" width={40} height={40} />
                 <span className="ml-3 text-xl font-semibold text-white">JLL Fresh Produce</span>
                 <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto p-1">
                    <XMarkIcon className="h-6 w-6 text-white" />
                </button>
            </div>
            
            {/* Core Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-2">
                {coreLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname.startsWith(link.href) ? "bg-green-800 text-white" : "text-green-100 hover:bg-green-600 hover:text-white"
                        }`}
                    >
                        <link.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* Future Features Section */}
            {futureLinks.length > 0 && (
                <div className="px-2 mt-6">
                    <h3 className="px-2 text-xs font-semibold text-green-200 uppercase tracking-wider flex items-center">
                        <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                        Future Features
                    </h3>
                    <div className="mt-2 space-y-2">
                        {futureLinks.map((link) => (
                             <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname.startsWith(link.href) ? "bg-green-800 text-white" : "text-green-100 hover:bg-green-600 hover:text-white"
                                }`}
                            >
                                <link.icon className="mr-3 flex-shrink-0 h-6 w-6" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* User Info & Sign Out Button */}
        <div className="flex-shrink-0 flex flex-col border-t border-green-800 p-2">
            <div className="px-2 py-3">
                 <div className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-800 text-white text-md font-bold ring-2 ring-green-500">
                        {userInitial}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                    </div>
                </div>
            </div>
            <button
                onClick={() => signOut()}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-green-100 hover:bg-green-600 hover:text-white"
            >
                <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6" />
                Sign Out
            </button>
        </div>
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-75 z-20 transition-opacity md:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-green-700 flex flex-col z-30 transition-transform transform md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
