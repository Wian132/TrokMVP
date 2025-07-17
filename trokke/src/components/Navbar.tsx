"use client";

const Navbar = () => {
  return (
    <header className="shadow-md" style={{ backgroundColor: "var(--color-navbar-background)" }}>
      <div className="container mx-auto px-4 py-2 flex justify-center items-center h-16 relative">
        {/* Centered Title */}
        <h1 className="text-2xl font-bold text-gray-800">
          Trucks Business
        </h1>
        {/* You can add other elements to the right if needed, e.g., user profile */}
        <div className="absolute right-4">
          {/* Future content can go here */}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
