Project Vision: Smart Fleet & Logistics Hub
1. The Pitch
This application is a modern, real-time logistics hub designed for business owners who need complete visibility and control over their fleet of vehicles. The primary goal is to provide a simple, powerful tool that answers the most critical questions at a glance: "Where are my trucks, and who is driving them?".

By centralizing all operational data—trucks, drivers, and locations—onto a single interactive map, this platform eliminates the need for constant phone calls and manual tracking. It provides a clear, live overview of your entire operation, empowering you to make faster, more informed decisions, streamline assignments, and lay the foundation for future optimizations like route planning and client-facing portals.

2. Core Features (Current MVP)
The initial version focuses on establishing core visibility and data management for the administrator:

Secure Authentication: A professional login screen powered by Supabase Auth ensures that only authorized users can access the system.

Central Dashboard: After logging in, the admin is greeted with a dashboard that combines a live map with management panels.

Interactive Map View:

Displays the location of all company trucks (using blue markers).

Displays all business-owned stores/depots (using green markers).

Displays all client store locations (using yellow markers).

Admin Management Panel: A tabbed interface allows the administrator to:

View & Create Trucks: Easily add new vehicles to the fleet by providing a license plate, make, model, and year.

View Workers & Clients: See a list of all registered workers and clients in the system.

(Foundation for) Store Management: The UI is in place to manage business and client stores.

Role-Based Access: The system is built with three distinct user roles (Admin, Worker, Client), with the current MVP giving full data management capabilities to the Admin.

3. Technology Stack
This project is built using a modern, scalable, and cost-effective technology stack, chosen for rapid development and long-term reliability.

Frontend Framework: Next.js (The leading React framework)

Backend & Database: Supabase (Handles database, authentication, and real-time capabilities)

Mapping Services: Google Maps Platform (Provides the interactive map)

Styling: Tailwind CSS (For a clean, modern, and responsive user interface)

4. Environment Variables (.env.local)
To run the application, a .env.local file must be created in the project's root directory with the following keys:

# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL

# Supabase Public API Key (this one is safe to expose in a browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY

5. Next Steps
This MVP provides a solid foundation. The immediate next steps would be to:

Implement the creation forms for Workers, Clients, and Stores.

Build the functionality to assign a Worker to a Truck.

Transition from mock truck locations to real-time GPS tracking from worker