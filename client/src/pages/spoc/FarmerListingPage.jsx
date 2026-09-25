import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";

const FarmerListingPage = () => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalParali, setTotalParali] = useState(0);

  // State for update popup
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const fetchFarmers = async () => {
    try {
      const token = localStorage.getItem("token"); // Assuming you store JWT in localStorage
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/v1/spoc/getAllFarmers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(response.data.farmers);

      if (response.data.success) {
        setFarmers(response.data.farmers);
        calculateTotalParali(response.data.farmers); // Call to calculate total parali
      } else {
        setError("Failed to fetch farmers");
      }
    } catch (error) {
      console.error(error);
      setError("Error fetching farmers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  // Group farmers of this SPOC by their field location so that farmers with
  // fields at different locations still appear together on one page,
  // organized under each location heading.
  const groupedFarmers = farmers.reduce((groups, farmer) => {
    const location = farmer.fieldLocation || farmer.village || "Unspecified Location";
    if (!groups[location]) groups[location] = [];
    groups[location].push(farmer);
    return groups;
  }, {});

  const calculateTotalParali = (farmers) => {
    const total = farmers.reduce((sum, farmer) => sum + (farmer.totalParali || 0), 0);
    setTotalParali(total);
  };

  // Handle Update - Show Popup
  const handleUpdate = (farmer) => {
    setSelectedFarmer({ ...farmer });
    setShowPopup(true);
  };

  // Handle Update Submit
  const handleUpdateSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/v1/spoc/updateFarmer/${selectedFarmer._id}`,
        selectedFarmer,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      if (response.data.success) {
        toast.success("Farmer Updated successfully", { autoClose: 2000 });
        fetchFarmers(); // Refresh the list
        setShowPopup(false);
      } else {
        toast.error("Failed to update farmer.", { autoClose: 2000 });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating farmer.", { autoClose: 2000 });
    }
  };

  // Handle Delete
  const handleDelete = async (farmerId) => {
    if (!window.confirm("Are you sure you want to delete this farmer?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/v1/spoc/deleteFarmer/${farmerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success("Farmer deleted successfully!", { autoClose: 2000 });
        const updatedFarmers = farmers.filter((farmer) => farmer._id !== farmerId);
        setFarmers(updatedFarmers);
        calculateTotalParali(updatedFarmers);
      } else {
        toast.error("Failed to delete farmer.", { autoClose: 2000 });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting farmer.", { autoClose: 2000 });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-10 bg-gray-50">
      {/* Total Parali Collected */}
      <ToastContainer />
      <h2 className="px-6 py-3 mb-6 text-xl font-semibold text-white bg-green-800 rounded-md shadow-lg">
        Total Parali Collected: {totalParali} Kg
      </h2>

      <h2 className="mb-6 text-4xl font-extrabold text-gray-800">Farmer Listing</h2>

      {/* Farmer Cards grouped by field location */}
      <div className="w-full max-w-5xl">
        {loading ? (
          <p className="font-semibold text-center text-gray-600">Loading...</p>
        ) : error ? (
          <p className="font-semibold text-center text-red-600">{error}</p>
        ) : farmers.length > 0 ? (
          Object.entries(groupedFarmers).map(([location, locationFarmers]) => (
            <div key={location} className="w-full mb-10">
              <h3 className="mb-4 text-2xl font-bold text-left text-green-900 border-b-2 border-green-200 pb-2">
                {location}
                <span className="ml-2 text-base font-medium text-gray-500">
                  ({locationFarmers.length} farmer{locationFarmers.length > 1 ? "s" : ""})
                </span>
              </h3>
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {locationFarmers.map((farmer) => (
                  <div key={farmer._id} className="p-6 transition-transform transform bg-white shadow-lg rounded-xl hover:scale-105 hover:shadow-2xl">
                    <h3 className="text-2xl font-bold text-green-800">{farmer.name}</h3>
                    <p className="mt-2 text-gray-700">
                      <span className="font-semibold">Field Location:</span> {farmer.fieldLocation || farmer.village}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Phone:</span> {farmer.phone}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Email:</span> {farmer.email}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-blue-700">
                      Total Parali: {farmer.totalParali} Kg
                    </p>

                    {/* Buttons */}
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={() => handleUpdate(farmer)}
                        className="flex items-center gap-2 px-4 py-2 text-white transition-all duration-200 bg-yellow-500 rounded-md hover:bg-yellow-600"
                      >
                        <FaEdit /> Update
                      </button>
                      <button
                        onClick={() => handleDelete(farmer._id)}
                        className="flex items-center gap-2 px-4 py-2 text-white transition-all duration-200 bg-red-600 rounded-md hover:bg-red-700"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="w-full font-semibold text-center text-gray-600">
            No farmers available
          </p>
        )}
      </div>

      {/* Update Farmer Popup */}
      {showPopup && selectedFarmer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg w-96">
            <h2 className="mb-4 text-2xl font-bold">Update Farmer</h2>
            <input type="text" className="w-full p-2 mb-2 border rounded" value={selectedFarmer.name} onChange={(e) => setSelectedFarmer({ ...selectedFarmer, name: e.target.value })} placeholder="Name" />
            <input type="email" className="w-full p-2 mb-2 border rounded" value={selectedFarmer.email} onChange={(e) => setSelectedFarmer({ ...selectedFarmer, email: e.target.value })} placeholder="Email" />
            <input type="text" className="w-full p-2 mb-2 border rounded" value={selectedFarmer.phone} onChange={(e) => setSelectedFarmer({ ...selectedFarmer, phone: e.target.value })} placeholder="Phone" />
            <input type="number" className="w-full p-2 mb-4 border rounded" value={selectedFarmer.totalParali} onChange={(e) => setSelectedFarmer({ ...selectedFarmer, totalParali: e.target.value })} placeholder="Total Parali" />
            <button onClick={handleUpdateSubmit} className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerListingPage;
