/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import paymentImg from "../../assets/payment.jpg";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY); // Using key from .env

const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, amount } = location.state || { amount: 1000, orderId: null };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/create-payment-intent`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount * 100 || 1000, currency: "inr" }),
            });

            const data = await response.json();

            if (!stripe || !elements) return;

            const { paymentIntent, error } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: elements.getElement(CardElement) },
            });

            if (error) {
                setError(error.message);
            } else {
                if (orderId) {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/payment/confirm-payment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId }),
                    });
                }
                setSuccess(true);
                setTimeout(() => navigate('/powerplant/my-orders'), 2000);
            }
        } catch (err) {
            setError("Something went wrong! Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="flex items-center justify-center p-20 bg-cover bg-bottom"
            style={{ backgroundImage: `url(${paymentImg})` }}
        >
            <div className="bg-white bg-opacity-90 shadow-lg rounded-lg p-6 w-full max-w-lg ">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Checkout</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="border border-gray-400 p-3 rounded-lg  ">
                        <CardElement className="outline-none focus:ring-3 focus:ring-green-500 transition" />
                    </div>

                    <button
                        type="submit"
                        disabled={!stripe || loading}
                        className="w-full py-2 text-white text-bold bg-green-600 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {loading ? "Processing..." : "Pay Now"}
                    </button>

                    {error && <p className="text-red-600 text-center">{error}</p>}
                    {success && <p className="text-green-600 text-center">Payment Successful! 🎉</p>}
                </form>
            </div>
        </div>
    );
};

const Checkout = () => (
    <Elements stripe={stripePromise}>
        <CheckoutForm />
    </Elements>
);

export default Checkout;
