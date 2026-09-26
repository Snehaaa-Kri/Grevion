import React, { useEffect, useState } from "react";
import axios from "axios";
import spocListingImg from "../../assets/spocListing.png";
import { FiSearch } from "react-icons/fi";


const SpocListingPage = () => {
  const [spocs, setSpocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderStatus, setOrderStatus] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    requestedParali: "",
    offeredPricePerTon: "",
    totalPrice: "",
    deliverWithin: "",
    location: "",
    message: "",
  });
  const [selectedSpocId, setSelectedSpocId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderErrors, setOrderErrors] = useState({});

  useEffect(() => {
    const fetchSpocs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/v1/powerplant/getAllSpoc`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.data.success) {
          setSpocs(response.data.spocs);
        } else {
          setError("Failed to fetch spocs");
        }
      } catch (error) {
        console.error(error);
        setError("Error fetching spocs");
      } finally {
        setLoading(false);
      }
    };
    fetchSpocs();
  }, []);

  const handleOrderClick = (spocId) => {
    setSelectedSpocId(spocId);
    setShowModal(true);
  };

  const firstCharacterUpperCase = (word) => {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validate place-order form fields.
  const validateOrderForm = (data) => {
    const errs = {};
    if (!data.requestedParali || isNaN(data.requestedParali) || Number(data.requestedParali) < 1)
      errs.requestedParali = "Enter a valid quantity (min 1 kg)";
    if (!data.offeredPricePerTon || isNaN(data.offeredPricePerTon) || Number(data.offeredPricePerTon) <= 0)
      errs.offeredPricePerTon = "Enter a valid price per ton";
    if (!data.totalPrice || isNaN(data.totalPrice) || Number(data.totalPrice) <= 0)
      errs.totalPrice = "Enter a valid total price";
    if (!data.deliverWithin || isNaN(data.deliverWithin) || Number(data.deliverWithin) < 1)
      errs.deliverWithin = "Enter delivery days (min 1)";
    if (!data.location.trim())
      errs.location = "Location is required";
    if (!data.message.trim())
      errs.message = "Message is required";
    else if (data.message.trim().length > 500)
      errs.message = "Message cannot exceed 500 characters";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validateOrderForm(formData);
    if (Object.keys(errs).length > 0) {
      setOrderErrors(errs);
      return;
    }
    setOrderErrors({});
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/powerplant/placeOrder/${selectedSpocId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrderStatus((prevStatus) => ({
        ...prevStatus,
        [selectedSpocId]: "Order Placed",
      }));
      setShowModal(false);
    } catch (error) {
      console.error("Error placing order", error);
    }
  };

  // Filter SPOCs by location
  const filteredSpocs = spocs.filter((spoc) =>
    spoc.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex flex-col items-center min-h-screen bg-gray-100">
      <div className="relative w-full">
        <img
          src={spocListingImg}
          className="w-full h-60 sm:h-72 md:h-80 brightness-50 object-cover"
          alt=""
        />
        <h2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white uppercase text-center">
          Spoc Listing
        </h2>
      </div>

      <div className="w-full max-w-6xl p-10">
        <div className="mb-6 flex items-center shadow-md shadow-gray-200 rounded-md px-2 w-full sm:w-80 bg-white outline-none border-none">
          <FiSearch className="text-gray-500 text-xl mr-2" />
          <input
            type="text"
            placeholder="Search by location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 outline-none"
          />
        </div>


        {loading ? (
          <p className="text-lg font-semibold text-center text-gray-600">
            Loading...
          </p>
        ) : error ? (
          <p className="text-lg font-semibold text-center text-red-600">
            {error}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSpocs.map((spoc) => (
              <div
                key={spoc._id}
                className="relative w-80 transform transition duration-300 hover:scale-105"
              >
                <div
                  className="relative flex flex-col gap-1 justify-center bg-white rounded-xl p-6 w-72 h-48 sm:w-80 sm:h-48 "
                  style={{
                    clipPath:
                      "polygon(100% 0, 100% 83%, 70% 83%, 63% 100%, 0 98%, 0 0)",
                  }}
                >
                  <h3 className="text-2xl font-semibold text-gray-800">
                    {firstCharacterUpperCase(spoc.name)}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Location: {firstCharacterUpperCase(spoc.location)}
                  </p>
                  <p className="text-gray-600 text-lg">
                    Total Parali: {spoc.totalParaliCollected} kg
                  </p>
                  <p
                    className={`font-semibold text-xl ${
                      spoc.availableForSale ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {spoc.availableForSale ? "Available" : "Not Available"}
                  </p>
                </div>

                {spoc.availableForSale && (
                  <button
                    onClick={() => handleOrderClick(spoc._id)}
                    className={`text-white rounded-xl p-1 w-[5.5rem] sm:w-[6.5rem] absolute -bottom-0 right-8 sm:-bottom-1 sm:-right-1 shadow-lg text-sm sm:text-md ${
                      orderStatus[spoc._id]
                        ? "bg-green-800 text-white cursor-not-allowed"
                        : "bg-amber-600 text-white"
                    }`}
                    disabled={orderStatus[spoc._id]}
                  >
                    {orderStatus[spoc._id] || "Place Order"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold">Place Order</h2>

            <div className="mb-2">
              <input type="number" name="requestedParali" placeholder="Requested Parali (kg)"
                className={`w-full p-2 border rounded ${orderErrors.requestedParali ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.requestedParali && <p className="text-red-500 text-xs mt-1">{orderErrors.requestedParali}</p>}
            </div>

            <div className="mb-2">
              <input type="number" name="offeredPricePerTon" placeholder="Offered Price per Ton"
                className={`w-full p-2 border rounded ${orderErrors.offeredPricePerTon ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.offeredPricePerTon && <p className="text-red-500 text-xs mt-1">{orderErrors.offeredPricePerTon}</p>}
            </div>

            <div className="mb-2">
              <input type="number" name="totalPrice" placeholder="Total Price"
                className={`w-full p-2 border rounded ${orderErrors.totalPrice ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.totalPrice && <p className="text-red-500 text-xs mt-1">{orderErrors.totalPrice}</p>}
            </div>

            <div className="mb-2">
              <input type="number" name="deliverWithin" placeholder="Deliver Within (days)"
                className={`w-full p-2 border rounded ${orderErrors.deliverWithin ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.deliverWithin && <p className="text-red-500 text-xs mt-1">{orderErrors.deliverWithin}</p>}
            </div>

            <div className="mb-2">
              <input type="text" name="location" placeholder="Location"
                className={`w-full p-2 border rounded ${orderErrors.location ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.location && <p className="text-red-500 text-xs mt-1">{orderErrors.location}</p>}
            </div>

            <div className="mb-2">
              <textarea name="message" placeholder="Message (max 500 chars)"
                className={`w-full p-2 border rounded ${orderErrors.message ? "border-red-500" : ""}`}
                onChange={handleChange} />
              {orderErrors.message && <p className="text-red-500 text-xs mt-1">{orderErrors.message}</p>}
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 mr-2 text-white bg-gray-400 rounded"
                onClick={() => { setShowModal(false); setOrderErrors({}); }}>
                Cancel
              </button>
              <button className="px-4 py-2 text-white bg-green-800 rounded" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpocListingPage;
