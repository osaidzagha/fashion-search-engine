import React from "react";

const AdminDashboard = () => {
  return (
    <div className="max-w-6xl mx-auto p-8 mt-10 bg-white rounded shadow text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        ⚙️ Admin Headquarters
      </h1>
      <p className="text-gray-600">
        If you can see this, your JWT wristband says "admin"!
      </p>
    </div>
  );
};

export default AdminDashboard;
