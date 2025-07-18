"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Define an explicit type for the navigation links
interface NavLink {
  href: string;
  label: string;
}

// Define the props for the Sidebar component
interface SidebarProps {
  userRole: "admin" | "client" | "worker" | string;
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

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Determine which links to display based on the userRole prop
  let links: NavLink[] = [];
  if (userRole === "admin") {
    links = adminLinks;
  } else if (userRole === "client") {
    links = clientLinks;
  } else if (userRole === "worker") {
    links = workerLinks;
  }

  return (
    <div className="w-64 bg-gray-800 text-white p-5">
      <h1 className="text-2xl font-bold mb-10">My App</h1>
      <nav>
        <ul>
          {links.map((link) => (
            <li key={link.href} className="mb-4">
              <Link
                href={link.href}
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
  );
}
