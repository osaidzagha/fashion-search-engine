import React, { useState } from 'react';
import { Filter, ChevronDown, Star, Heart } from 'lucide-react';

const SearchResults = () => {
  // Mock data representing a search for "Red Dress"
  const results = [
    { id: 1, brand: "Zara", name: "Satin Effect Midi Dress", price: "49.90", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
    { id: 2, brand: "H&M", name: "Ribbed Bodycon Dress", price: "19.99", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=400&q=80", rating: 4.2 },
    { id: 3, brand: "Pull&Bear", name: "Cut-out Detail Dress", price: "29.90", image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=400&q=80", rating: 4.0 },
    { id: 4, brand: "Mango", name: "Asymmetric Hem Dress", price: "59.99", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
    { id: 5, brand: "Zara", name: "Linen Blend Dress", price: "39.90", image: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=400&q=80", rating: 4.3 },
    { id: 6, brand: "Bershka", name: "Mini Dress with Straps", price: "25.99", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80", rating: 3.9 },
  ];

  // State to simulate selecting items
  const [selectedItems, setSelectedItems] = useState([1, 4]); // Pre-select two items for the screenshot

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Header / Search Bar Compact */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">FashionSearch.</div>
        <div className="flex-1 max-w-xl mx-8">
          <input 
            type="text" 
            value="Red Dress"
            readOnly
            className="w-full bg-gray-100 border-none rounded-full px-6 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
          />
        </div>
        <div className="text-sm font-medium">Hello, User</div>
      </header>

      <div className="flex max-w-7xl mx-auto pt-8 px-4 gap-8">
        
        {/* Left Sidebar Filters */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <div className="flex items-center gap-2 mb-6 text-gray-500">
            <Filter className="h-4 w-4" />
            <span className="font-semibold text-sm uppercase tracking-wide">Filters</span>
          </div>

          {/* Filter Group: Brand */}
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h3 className="font-bold mb-4 flex items-center justify-between">Brand <ChevronDown className="h-4 w-4" /></h3>
            <div className="space-y-2 text-sm text-gray-600">
              <label className="flex items-center gap-2"><input type="checkbox" checked className="rounded text-black" /> Zara (12)</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-black" /> H&M (8)</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-black" /> Mango (5)</label>
            </div>
          </div>

          {/* Filter Group: Price */}
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h3 className="font-bold mb-4">Price Range</h3>
            <div className="flex gap-2 text-sm">
              <input type="text" placeholder="Min" className="w-20 border rounded px-2 py-1" />
              <input type="text" placeholder="Max" className="w-20 border rounded px-2 py-1" />
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Results for "Red Dress"</h1>
            <span className="text-gray-500 text-sm">Showing 6 results</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {results.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl overflow-hidden border transition-all hover:shadow-lg ${selectedItems.includes(item.id) ? 'ring-2 ring-black border-transparent' : 'border-gray-100'}`}>
                {/* Image */}
                <div className="relative aspect-[3/4]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  <button className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-sm hover:text-red-500">
                    <Heart className="h-4 w-4" />
                  </button>
                  
                  {/* Compare Checkbox Overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <label className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-sm ${selectedItems.includes(item.id) ? 'bg-black text-white' : 'bg-white/90 text-gray-900 hover:bg-white'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(item.id)}
                        onChange={() => {}} // Static for screenshot
                        className="hidden" 
                      />
                      {selectedItems.includes(item.id) ? 'Selected to Compare' : 'Add to Compare'}
                    </label>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    <div className="flex items-center gap-1 text-xs font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {item.rating}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{item.brand}</p>
                  <div className="font-bold text-lg">${item.price}</div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Floating Action Bar (The "Money" Feature) */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
        <div className="flex flex-col">
          <span className="font-bold text-sm">2 Items Selected</span>
          <span className="text-xs text-gray-400">Zara vs. Mango</span>
        </div>
        <div className="h-8 w-[1px] bg-gray-700"></div>
        <button className="font-bold text-white hover:text-gray-200">
          Compare Now →
        </button>
      </div>

    </div>
  );
};

export default SearchResults;