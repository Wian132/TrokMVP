// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  XMarkIcon, 
  ArrowRightOnRectangleIcon,
  ChartPieIcon,
  UserGroupIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  LinkIcon as LinkIconSolid,
  WrenchScrewdriverIcon,
  TableCellsIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  BeakerIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  userRole: string;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

// --- Link Definitions ---
const accountLink: NavLink = { href: "/account", label: "My Account", icon: UserCircleIcon };

const adminActiveLinks: NavLink[] = [
  { href: "/admin/trucks", label: "Fleet Overview", icon: ChartPieIcon },
  { href: "/admin/diesel", label: "Diesel Tank", icon: BeakerIcon },
  { href: "/admin/manage-roles", label: "Manage Roles", icon: ShieldCheckIcon },
  { href: "/admin/link-workers", label: "Link Workers", icon: LinkIconSolid },
];

const adminAnalyticsLinks: NavLink[] = [
  { href: "/admin/fleet-analytics", label: "Fleet Analytics", icon: TableCellsIcon },
  { href: "/admin/worker-analytics", label: "Worker Analytics", icon: ChartBarIcon },
];

const adminListsLinks: NavLink[] = [
    { href: "/admin/services", label: "Service Records", icon: WrenchScrewdriverIcon },
    { href: "/admin/trips", label: "Refuels", icon: MapPinIcon },
    { href: "/admin/workers", label: "Workers", icon: UsersIcon },
];

const adminWorkerPagesLinks: NavLink[] = [
  { href: "/refueler/refuels", label: "Log Refuel", icon: BeakerIcon },
  { href: "/checker/pre-trip-check", label: "Pre-Trip Check", icon: WrenchScrewdriverIcon },
];

const adminFutureLinks: NavLink[] = [
    { href: "/admin/clients", label: "Clients", icon: UserGroupIcon },
    { href: "/admin/my-shops", label: "My Shops", icon: BuildingStorefrontIcon },
];

const clientLinks: NavLink[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/client/my-shops", label: "My Shops", icon: BuildingStorefrontIcon },
  accountLink,
];

const workerLinks: NavLink[] = [
  { href: "/worker/dashboard", label: "Dashboard", icon: ChartPieIcon },
  accountLink,
];

const refuelerLinks: NavLink[] = [
  { href: "/refueler/dashboard", label: "Dashboard", icon: ChartPieIcon },
  { href: "/refueler/refuels", label: "Log Refuel", icon: BeakerIcon },
  accountLink,
];

const checkerLinks: NavLink[] = [
    { href: "/checker/dashboard", label: "Dashboard", icon: ChartPieIcon },
    { href: "/checker/pre-trip-check", label: "Pre-Trip Check", icon: WrenchScrewdriverIcon },
    accountLink,
];

const floorManagerLinks: NavLink[] = [
    { href: "/floor-manager/dashboard", label: "Dashboard", icon: ChartPieIcon },
    { href: "/floor-manager/refuels", label: "Log Refuel", icon: BeakerIcon },
    { href: "/floor-manager/pre-trip-check", label: "Pre-Trip Check", icon: WrenchScrewdriverIcon },
    accountLink,
];

interface CollapsibleSidebarSectionProps {
  title: string;
  icon: React.ElementType;
  links: NavLink[];
  renderLink: (link: NavLink) => React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSidebarSection = ({ title, icon: Icon, links, renderLink, defaultOpen = false }: CollapsibleSidebarSectionProps) => (
    <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="w-full group">
            <h3 className="flex w-full items-center justify-between rounded-md bg-green-800 p-2 text-sm font-bold uppercase tracking-wider text-white">
                <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-2" />
                    {title}
                </div>
                <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </h3>
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2">
            <div className="space-y-1">
                {links.map(renderLink)}
            </div>
        </CollapsibleContent>
    </Collapsible>
);


export default function Sidebar({ userRole, isSidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  let links: NavLink[] = [];
  
  if (userRole === "client") links = clientLinks;
  else if (userRole === "worker") links = workerLinks;
  else if (userRole === "refueler") links = refuelerLinks;
  else if (userRole === "checker") links = checkerLinks;
  else if (userRole === "floormanager") links = floorManagerLinks;
  
  const renderLink = (link: NavLink) => (
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
  );

  const sidebarContent = (
    <>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
                 <Image src="/logo/logo.png" alt="JLL Fresh Produce" width={40} height={40} />
                 <span className="ml-3 text-xl font-semibold text-white">JLL Fresh Produce</span>
                 <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto p-1">
                   <XMarkIcon className="h-6 w-6 text-white" />
                 </button>
            </div>
            
            <div className="mt-8 flex-1 px-2 space-y-4">
                {userRole === "SuperAdmin" || userRole === "admin" ? (
                    <>
                        <CollapsibleSidebarSection title="Active" icon={ClipboardDocumentListIcon} links={adminActiveLinks} renderLink={renderLink} defaultOpen />
                        <CollapsibleSidebarSection title="Analytics" icon={ChartBarIcon} links={adminAnalyticsLinks} renderLink={renderLink} defaultOpen />
                        <CollapsibleSidebarSection title="Lists" icon={UsersIcon} links={adminListsLinks} renderLink={renderLink} />
                        <CollapsibleSidebarSection title="Worker Pages" icon={UsersIcon} links={adminWorkerPagesLinks} renderLink={renderLink} />
                        <CollapsibleSidebarSection title="Account" icon={UserCircleIcon} links={[accountLink]} renderLink={renderLink} />
                    </>
                ) : (
                    <nav className="space-y-1">
                        {links.map(renderLink)}
                    </nav>
                )}
            </div>

            { (userRole === "SuperAdmin" || userRole === "admin") && adminFutureLinks.length > 0 && (
                <div className="px-2 mt-auto">
                    <CollapsibleSidebarSection title="Future Features" icon={ArchiveBoxIcon} links={adminFutureLinks} renderLink={renderLink} />
                </div>
            )}
        </div>

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