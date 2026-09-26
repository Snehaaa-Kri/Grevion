import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const validateLoginForm = ({ email, password }) => {
    const errors = {};

    if (!email.trim()) {
        errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Enter a valid email address";
    }

    if (!password) {
        errors.password = "Password is required";
    }

    return errors;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Login = () => {
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [errors,   setErrors]   = useState({});  // field-level errors
    const navigate = useNavigate();

    // Clear the error for a field as soon as the user starts typing.
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
    };
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        // Client-side validation before hitting the network.
        const validationErrors = validateLoginForm({ email, password });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/v1/auth/login`,
                { email, password }
            );

            const { token, role, user } = response.data;
            localStorage.setItem("token",  token);
            localStorage.setItem("role",   role);
            localStorage.setItem("userId", user._id);

            toast.success("Login successful!", {
                position: "top-right", autoClose: 1000, theme: "colored",
            });

            setTimeout(() => {
                if (role === "spoc")         navigate("/spoc/dashboard");
                else if (role === "power_plant") navigate("/powerplant/dashboard");
                else navigate("/");
            }, 1000);

        } catch (err) {
            const msg = err.response?.data?.message || "Login failed, try again.";
            toast.error(msg, {
                position: "top-right", autoClose: 3000, theme: "colored",
            });
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="flex flex-col min-h-screen bg-gradient-to-r from-green-100 to-blue-100">
                <div className="flex items-center justify-center w-full h-screen">
                    <div className="h-[80%] flex w-full justify-center items-center">
                        <div className="items-center justify-center hidden w-1/3 h-full px-10 py-2 bg-white shadow-xl rounded-l-xl lg:flex">
                            <img src="./download.gif" alt="" className="object-cover w-full h-full rounded-xl" />
                        </div>

                        <div className="flex flex-col items-center w-full h-full p-10 bg-white shadow-r-xl md:w-1/3 rounded-r-xl">
                            <h2 className="mb-4 text-3xl font-bold text-gray-700">Welcome Back</h2>
                            <p className="mb-6 text-gray-500">Please login to continue</p>

                            <form onSubmit={handleLogin} className="flex flex-col w-full gap-4" noValidate>

                                {/* Email */}
                                <div className="w-full">
                                    <label className="block text-lg font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.email ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="w-full">
                                    <label className="block text-lg font-medium text-gray-700">Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        className={`w-full px-4 py-2 mt-1 border outline-none rounded-xl focus:ring-2 focus:ring-green-400 ${
                                            errors.password ? "border-red-500" : "border-gray-300"
                                        }`}
                                    />
                                    {errors.password && (
                                        <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 text-lg font-semibold text-white transition duration-300 bg-green-500 rounded-xl hover:bg-green-600"
                                >
                                    Login
                                </button>
                            </form>

                            <p className="mt-4 text-sm text-gray-500">
                                Don't have an account?{" "}
                                <Link to="/signup" className="text-blue-600 hover:underline">Sign Up</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
