import React from 'react';
import { Mail, Lock } from 'lucide-react';

const Login = () => {
  return (
    // The Card: White background, shadow, rounded corners
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-2">Sign in to access the Fashion Engine</p>
        </div>

        {/* Input Form */}
        <form className="space-y-6">
          
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="email" 
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                placeholder="student@university.edu"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="password" 
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Remember Me / Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-black border-gray-300 rounded cursor-pointer" />
              <label className="ml-2 text-gray-600">Remember me</label>
            </div>
            <a href="#" className="text-blue-600 hover:underline font-medium">Forgot password?</a>
          </div>

          {/* Sign In Button */}
          <button 
            type="button"
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-md active:scale-95 duration-200"
          >
            Sign In
          </button>
        </form>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="#" className="font-semibold text-black hover:underline">
            Create account
          </a>
        </p>
    </div>
  );
};

export default Login;