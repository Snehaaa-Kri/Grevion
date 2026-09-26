import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const validateSignupForm = ({ name, email, password, phone, location, role, otp }) => {
    const errors = {};

    if (!name.trim()) {
        errors.name = "Name is required";
    } else if (name.trim().length < 2 || name.trim().length > 50) {
        errors.name = "Name must be between 2 and 50 characters";
    }

    if (!email.trim()) {
        errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Enter a valid email address";
    }

    if (!password) {
        errors.password = "Password is required";
    } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
    }

    if (!phone.trim()) {
        errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(phone.trim())) {
        errors.phone = "Phone must be exactly 10 digits";
    }

    if (!location.trim()) {
        errors.location = "Location is required";
    }

    if (!role) {
        errors.role = "Please select a role";
    }

    if (!otp.trim()) {
        errors.otp = "OTP is required";
    } else if (!/^\d{6}$/.test(otp.trim())) {
        errors.otp = "OTP must be exactly 6 digits";
    }

    return errors;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Signup = () => {
    const [name,     setName]     = useState("");
    const [email,    setEmail]    = useState("");
    const [otp,      setOtp]      = useState("");
    const [password, setPassword] = useState("");
    const [phone,    setPhone]    = useState("");
    const [location, setLocation] = useState("");
    const [role,     setRole]     = useState("");
    const [errors,   setErrors]   = useState({});
    const navigate = useNavigate();

    // Clear individual field error on change.
    const handleField = (setter, field) => (e) => {
        setter(e.target.value);
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const sendOtp = async () => {
        // Validate email before sending OTP.
        if (!email.trim()) {
            setErrors((prev) => ({ ...prev, email: "Email is required" }));
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErrors((prev) => ({ ...prev, email: "Enter a valid email address" }));
            return;
        }

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/v1/auth/sendotp`,
                { email }
            );
            if (response.data.success) {
                toast.success("OTP sent successfully!", { autoClose: 1000 });
            } else {
                toast.error(response.data.message || "Failed to send OTP.", { autoClose: 1000 });
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error sending OTP. Please try again.",
                { autoClose: 1000 }
            );
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();

        const validationErrors = validateSignupForm({ name, email, password, phone, location, role, otp });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/v1/auth/signup`,
                { name, email, otp, password, role, phone, location }
            );

            if (response.data.success) {
                toast.success("Signup successful! Redirecting...", { autoClose: 1000 });

                const { savedUser, token, role: userRole } = response.data;
                localStorage.setItem("token",  token);
                localStorage.setItem("role",   userRole);
                localStorage.setItem("userId", savedUser._id);

                setTimeout(() => {
                    if (userRole === "spoc")          navigate("/spoc/dashboard");
                    else if (userRole === "power_plant") navigate("/powerplant/dashboard");
                    else navigate("/");
                }, 1000);
            } else {
                toast.error(response.data.message || "Signup failed.", { autoClose: 3000 });
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error during signup.",
                { autoClose: 3000 }
            );
        }
    };

    // Reusable inline error component.
    const FieldError = ({ field }) =>
        errors[field] ? (
            <p className="mt-1 text-sm text-red-500">{errors[field]}</p>
        ) : null;

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-green-100 to-blue-100">
            <ToastContainer />
            <div className="flex items-center justify-center w-full h-screen">
                <div className="flex items-center justify-center w-full h-[90%]">
                    {/* Left animation */}
                    <div className="hidden w-1/2 h-full px-10 py-2 bg-white shadow-xl rounded-l-xl lg:flex">
                        <img
                            src="./animation_signup.gif"
                            alt="Signup Animation"
                            className="object-cover w-full h-full rounded-xl"
                        />
                    </div>

                    {/* Form */}
                    <div className="flex flex-col items-center w-full h-full px-10 py-3 bg-white shadow-xl md:w-1/3 rounded-r-xl overflow-y-auto">
                        <h2 className="mb-4 text-3xl font-bold text-gray-700">Create Account</h2>

                        <form onSubmit={submitHandler} className="flex flex-col w-full gap-3" noValidate>

                            {/* Name */}
                            <div>
                                <label className="block font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={handleField(setName, "name")}
                                    className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                        errors.name ? "border-red-500" : "border-gray-300"
                                    }`}
                                />
                                <FieldError field="name" />
                            </div>

                            {/* Role & Location */}
                            <div className="flex w-full gap-2">
                                <div className="w-full">
                                    <label className="block font-medium text-gray-700">Role</label>
                                    <select
                                        value={role}
                                        onChange={handleField(setRole, "role")}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.role ? "border-red-500" : "border-gray-300"
                                        }`}
                                    >
                                        <option value="" disabled>Select Role</option>
                                        <option value="spoc">SPOC</option>
                                        <option value="power_plant">Power Plant</option>
                                    </select>
                                    <FieldError field="role" />
                                </div>
                                <div className="w-full">
                                    <label className="block font-medium text-gray-700">Location</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your location"
                                        value={location}
                                        onChange={handleField(setLocation, "location")}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.location ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    <FieldError field="location" />
                                </div>
                            </div>

                            {/* Email & Send OTP */}
                            <div>
                                <label className="block font-medium text-gray-700">Email</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={handleField(setEmail, "email")}
                                        className={`flex-1 px-4 py-2 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.email ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        className="px-3 py-2 text-white bg-blue-500 rounded-xl hover:bg-blue-600 whitespace-nowrap text-sm"
                                    >
                                        Send OTP
                                    </button>
                                </div>
                                <FieldError field="email" />
                            </div>

                            {/* OTP & Phone */}
                            <div className="flex w-full gap-2">
                                <div className="w-1/2">
                                    <label className="block font-medium text-gray-700">OTP</label>
                                    <input
                                        type="text"
                                        placeholder="Enter OTP"
                                        value={otp}
                                        onChange={handleField(setOtp, "otp")}
                                        maxLength={6}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.otp ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    <FieldError field="otp" />
                                </div>
                                <div className="w-1/2">
                                    <label className="block font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        placeholder="10-digit number"
                                        value={phone}
                                        onChange={handleField(setPhone, "phone")}
                                        maxLength={10}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.phone ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    <FieldError field="phone" />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    placeholder="Min. 6 characters"
                                    value={password}
                                    onChange={handleField(setPassword, "password")}
                                    className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                        errors.password ? "border-red-500" : "border-gray-300"
                                    }`}
                                />
                                <FieldError field="password" />
                            </div>

                            <button
                                type="submit"
                                className="w-full px-4 py-2 text-white bg-green-500 rounded-xl hover:bg-green-600"
                            >
                                Sign Up
                            </button>
                        </form>

                        <p className="mt-4 text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
