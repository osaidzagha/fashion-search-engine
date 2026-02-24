import React from 'react';
import { Search, ShoppingBag, Menu, User } from 'lucide-react';

const Home = () => {
  // Mock data to make the suggestions look real
  const suggestedItems = [
    {
      id: 1,
      brand: "Zara",
      name: "Oversized Denim Jacket",
      price: "$69.90",
      image: "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      brand: "H&M",
      name: "Basic Cotton T-Shirt",
      price: "$14.99",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      brand: "Nike",
      name: "Air Max Sneakers",
      price: "$129.00",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      {/* 1. Navbar (Simple & Clean) */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="text-xl font-bold tracking-tight">FashionSearch.</div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium hover:text-gray-600">Brands</a>
          <a href="#" className="text-sm font-medium hover:text-gray-600">Categories</a>
          <User className="h-5 w-5 cursor-pointer hover:text-gray-600" />
          <ShoppingBag className="h-5 w-5 cursor-pointer hover:text-gray-600" />
        </div>
      </nav>

      {/* 2. Hero Section with Search Bar */}
      <div className="flex flex-col items-center justify-center pt-20 pb-16 px-4 text-center bg-gray-50">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-gray-900">
          Find it. Compare it. <span className="text-blue-600">Wear it.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl">
          Search across Zara, H&M, Pull&Bear, and more in one place.
        </p>

        {/* The Main Search Bar */}
        <div className="relative w-full max-w-2xl shadow-xl rounded-full transition-all hover:shadow-2xl">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-16 pr-6 py-5 rounded-full text-lg border-none focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search for 'black hoodie' or 'summer dress'..."
          />
          <button className="absolute right-2 top-2 bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
            Search
          </button>
        </div>
      </div>

      {/* 3. Suggested Items Section */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold mb-8">Trending This Week</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {suggestedItems.map((item) => (
            <div key={item.id} className="group cursor-pointer">
              {/* Image Container */}
              <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-[4/5] mb-4">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">
                  {item.brand}
                </div>
              </div>
              
              {/* Item Details */}
              <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors">{item.name}</h3>
              <p className="text-gray-500">{item.price}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;