/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import paymentImg from "../../assets/payment.jpg";

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Checkout = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, amount } = location.state || { amount: 1000, orderId: null };

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
            setError("Razorpay SDK failed to load. Please check your network connection.");
            setLoading(false);
            return;
        }

        try {
            // 1. Create Razorpay order on server
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/create-razorpay-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount || 1000, currency: "INR", orderId }),
            });

            const orderData = await response.json();
            if (!response.ok) {
                throw new Error(orderData.error || "Failed to create payment order");
            }

            // 2. Launch Razorpay Checkout Modal
            const options = {
                key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Grevion Energy",
                description: orderId ? `Order #${orderId.toString().slice(-6)} Payment` : "Parali Purchase Payment",
                ...(orderData.isMock ? {} : { order_id: orderData.id }),
                handler: async (paymentResponse) => {
                    setLoading(true);
                    try {
                        const rzpOrderId = paymentResponse.razorpay_order_id || orderData.id;
                        const rzpSig = paymentResponse.razorpay_signature || "simulated_test_signature";

                        // 3. Verify signature on backend
                        const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/verify-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: rzpOrderId,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: rzpSig,
                                orderId,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            setSuccess(true);
                            setTimeout(() => navigate('/powerplant/my-orders'), 2000);
                        } else {
                            setError(verifyData.error || "Payment verification failed");
                        }
                    } catch (err) {
                        setError("Error verifying payment signature");
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: "Power Plant Admin",
                    email: "admin@powerplant.com",
                    contact: "9999999999",
                },
                theme: {
                    color: "#16a34a",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                setError(resp.error?.description || "Payment Failed");
            });
            rzp.open();
        } catch (err) {
            setError(err.message || "Something went wrong! Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSimulatedTestPayment = async () => {
        setLoading(true);
        setError(null);
        try {
            const mockOrderId = "order_simulated_" + Math.random().toString(36).substring(2, 9);
            const mockPaymentId = "pay_simulated_" + Math.random().toString(36).substring(2, 9);

            const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    razorpay_order_id: mockOrderId,
                    razorpay_payment_id: mockPaymentId,
                    razorpay_signature: "simulated_test_signature",
                    orderId,
                }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
                setSuccess(true);
                setTimeout(() => navigate('/powerplant/my-orders'), 2000);
            } else {
                setError(verifyData.error || "Simulated payment failed");
            }
        } catch (err) {
            setError("Error processing simulated test payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="flex items-center justify-center p-10 md:p-20 bg-cover bg-bottom min-h-[80vh]"
            style={{ backgroundImage: `url(${paymentImg})` }}
        >
            <div className="bg-white bg-opacity-95 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-lg border border-gray-100">
                <div className="text-center mb-6">
                    <div className="inline-block p-3 bg-green-100 rounded-full mb-3 text-green-600 font-bold text-xl">
                        💳 Razorpay
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800">Checkout</h2>
                    <p className="text-gray-500 text-sm mt-1">Complete your order payment securely</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-2">
                    {orderId && (
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Order Reference:</span>
                            <span className="font-mono font-semibold text-gray-800">#{orderId.toString().slice(-8)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-semibold text-gray-800">
                        <span>Total Payable Amount:</span>
                        <span className="text-green-600 text-lg">₹{amount ? Number(amount).toLocaleString('en-IN') : '1,000'}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={loading || success}
                        className="w-full py-3.5 px-4 text-white font-bold bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 disabled:bg-gray-400 cursor-pointer"
                    >
                        {loading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <span>Pay with Razorpay</span>
                                <span>→</span>
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center space-y-3">
                            <p className="font-medium">⚠️ {error}</p>
                            <button
                                type="button"
                                onClick={handleSimulatedTestPayment}
                                className="w-full py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-xs shadow transition cursor-pointer"
                            >
                                🧪 Complete Test Payment (Local Dev Mode)
                            </button>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center font-semibold">
                            🎉 Payment Successful! Redirecting to orders...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Checkout;
