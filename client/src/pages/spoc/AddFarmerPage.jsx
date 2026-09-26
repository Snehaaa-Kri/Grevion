import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaMobileAlt,
  FaEnvelope,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUserPlus,
} from "react-icons/fa";
import { MdSms } from "react-icons/md";

const OTP_VALIDITY_SECONDS = 60;

const CHANNELS = [
  {
    id: "sms",
    label: "SMS",
    Icon: MdSms,
    desc: "OTP will be sent to farmer's phone number",
  },
  {
    id: "email",
    label: "Email",
    Icon: FaEnvelope,
    desc: "OTP will be sent to farmer's email address",
  },
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const validateFarmerForm = ({ name, phone, email, fieldLocation, totalParali }) => {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Name is required";
  } else if (name.trim().length < 2 || name.trim().length > 50) {
    errors.name = "Name must be between 2 and 50 characters";
  }

  if (!phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^(\+91)?\d{10}$/.test(phone.trim())) {
    errors.phone = "Enter a valid 10-digit phone number";
  }

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!fieldLocation.trim()) {
    errors.fieldLocation = "Field location is required";
  }

  if (!totalParali && totalParali !== 0) {
    errors.totalParali = "Total parali is required";
  } else if (isNaN(totalParali) || Number(totalParali) < 1) {
    errors.totalParali = "Total parali must be at least 1 kg";
  }

  return errors;
};

const AddFarmerPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    totalParali: "",
    fieldLocation: "",
  });

  const [channel, setChannel]           = useState("sms");
  const [otp, setOtp]                   = useState("");
  const [otpSent, setOtpSent]           = useState(false);
  const [verified, setVerified]         = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(0);
  const [sendingOtp, setSendingOtp]     = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [deliveredVia, setDeliveredVia] = useState("");

  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState("");
  const [error, setError]         = useState("");
  const [otpMsg, setOtpMsg]       = useState("");
  const [otpErr, setOtpErr]       = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // per-field validation errors

  // ── countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!otpSent || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, secondsLeft]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error as user types.
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if ((name === "phone" || name === "email") && otpSent) resetOtpState();
  };

  const resetOtpState = () => {
    setOtp("");
    setOtpSent(false);
    setVerified(false);
    setSecondsLeft(0);
    setOtpMsg("");
    setOtpErr("");
    setDeliveredVia("");
  };

  const resetAll = () => {
    setFormData({ name: "", phone: "", email: "", totalParali: "", fieldLocation: "" });
    resetOtpState();
    setMessage("");
    setError("");
    setChannel("sms");
    setFieldErrors({});
  };

  // ── step 1 : send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!formData.phone || !formData.email) {
      setOtpErr("Enter farmer's phone and email before sending OTP.");
      return;
    }
    setSendingOtp(true);
    setOtpMsg("");
    setOtpErr("");
    setVerified(false);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/spoc/sendFarmerOtp`,
        { phone: formData.phone, email: formData.email, channel },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setOtp("");
        setOtpSent(true);
        setSecondsLeft(OTP_VALIDITY_SECONDS);
        setDeliveredVia(res.data.deliveredVia || channel);
        setOtpMsg(res.data.message);
      } else {
        setOtpErr(res.data.message || "Failed to send OTP.");
      }
    } catch (err) {
      setOtpErr(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── step 2 : verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp) { setOtpErr("Enter the OTP first."); return; }
    setVerifying(true);
    setOtpMsg("");
    setOtpErr("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/spoc/verifyFarmerOtp`,
        { phone: formData.phone, otp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.verified) {
        setVerified(true);
        setOtpMsg("Farmer verified successfully.");
        setOtpErr("");
      } else {
        setVerified(false);
        setOtpErr(res.data.message || "Incorrect OTP. Farmer not verified.");
      }
    } catch (err) {
      setVerified(false);
      setOtpErr(err.response?.data?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  // ── step 3 : submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verified) {
      setError("Farmer not verified. Please verify the OTP before adding.");
      return;
    }

    // Client-side field validation before hitting the network.
    const validationErrors = validateFarmerForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/spoc/addFarmer`,
        { ...formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage("Farmer added successfully.");
        resetAll();
      } else {
        setError(res.data.message || "Something went wrong.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add farmer.");
    } finally {
      setLoading(false);
    }
  };

  const otpExpired = otpSent && secondsLeft === 0 && !verified;
  const canResend  = !sendingOtp && (!otpSent || otpExpired);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="py-10 min-h-full flex justify-center items-start bg-[url('/src/assets/addFarmer.jpg')] bg-cover">
      <div className="bg-white p-8 rounded-lg shadow-lg w-[90%] max-w-lg bg-opacity-90">

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <FaUserPlus className="text-green-700 text-2xl" />
          <h2 className="text-3xl font-bold text-green-700">Add Farmer</h2>
        </div>

        {/* Form-level feedback */}
        {message && (
          <div className="mb-4 flex items-center gap-2 justify-center text-green-700 text-sm font-medium">
            <FaCheckCircle className="text-green-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 justify-center text-red-600 text-sm font-medium">
            <FaExclamationTriangle className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 1. Name */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Name</label>
            <input
              type="text" name="name" placeholder="Full name"
              value={formData.name} onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${fieldErrors.name ? "border-red-500" : ""}`}
              required
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
          </div>

          {/* 2. Field Location */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Field Location</label>
            <input
              type="text" name="fieldLocation" placeholder="Village / field location"
              value={formData.fieldLocation} onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${fieldErrors.fieldLocation ? "border-red-500" : ""}`}
              required
            />
            {fieldErrors.fieldLocation && <p className="mt-1 text-xs text-red-500">{fieldErrors.fieldLocation}</p>}
          </div>

          {/* 3. Total Parali */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">Total Parali (kg)</label>
            <input
              type="number" name="totalParali"
              value={formData.totalParali} onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${fieldErrors.totalParali ? "border-red-500" : ""}`}
              required
            />
            {fieldErrors.totalParali && <p className="mt-1 text-xs text-red-500">{fieldErrors.totalParali}</p>}
          </div>

          {/* 4 & 5. OTP verification — phone OR email based on channel */}
          <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 space-y-4">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaShieldAlt className="text-green-700" />
                <span className="text-gray-700 font-bold">Farmer Verification</span>
              </div>
              {verified && (
                <span className="flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 px-3 py-1 rounded-full border border-green-300">
                  <FaCheckCircle className="text-green-600" />
                  Verified
                </span>
              )}
            </div>

            {/* Channel toggle */}
            <div className="flex gap-2">
              {CHANNELS.map(({ id, label, Icon }) => (
                <button
                  key={id} type="button"
                  onClick={() => { setChannel(id); if (otpSent) resetOtpState(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-semibold transition
                    ${channel === id
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:border-green-300 bg-white"}`}
                >
                  <Icon className={channel === id ? "text-green-600" : "text-gray-400"} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Phone input row (SMS channel) ── */}
            {channel === "sms" && (
              <div className="space-y-2">
                <label className="block text-gray-600 text-sm font-semibold">Phone Number</label>

                {/* Phone + Send OTP on same row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FaMobileAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text" name="phone"
                      placeholder="10-digit or +91xxxxxxxxxx"
                      value={formData.phone} onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${fieldErrors.phone ? "border-red-500" : ""}`}
                      required
                    />
                  </div>
                  <button
                    type="button" onClick={handleSendOtp} disabled={!canResend}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                  >
                    {sendingOtp ? "Sending..." : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
                {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}

                {/* OTP entry row — appears after Send OTP */}
                {otpSent && (
                  <div className="space-y-2">
                    {/* Fallback notice */}
                    {deliveredVia === "email" && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <FaExclamationTriangle className="text-amber-500 shrink-0" />
                        <span>SMS unavailable — OTP sent to farmer's email instead.</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text" maxLength={6} placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value); setOtpErr(""); }}
                        disabled={otpExpired || verified}
                        className="flex-1 px-4 py-2 border rounded-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 text-sm"
                      />
                      {!verified && (
                        <button
                          type="button" onClick={handleVerifyOtp}
                          disabled={otpExpired || verifying || !otp}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                        >
                          {verifying ? "Checking..." : "Verify OTP"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Email input row (Email channel) ── */}
            {channel === "email" && (
              <div className="space-y-2">
                <label className="block text-gray-600 text-sm font-semibold">Email Address</label>

                {/* Email + Send OTP on same row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email" name="email"
                      placeholder="example@gmail.com"
                      value={formData.email} onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${fieldErrors.email ? "border-red-500" : ""}`}
                      required
                    />
                  </div>
                  <button
                    type="button" onClick={handleSendOtp} disabled={!canResend}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                  >
                    {sendingOtp ? "Sending..." : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}

                {/* OTP entry row — appears after Send OTP */}
                {otpSent && (
                  <div className="flex gap-2">
                    <input
                      type="text" maxLength={6} placeholder="Enter 6-char OTP"
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value); setOtpErr(""); }}
                      disabled={otpExpired || verified}
                      className="flex-1 px-4 py-2 border rounded-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 text-sm"
                    />
                    {!verified && (
                      <button
                        type="button" onClick={handleVerifyOtp}
                        disabled={otpExpired || verifying || !otp}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-semibold whitespace-nowrap"
                      >
                        {verifying ? "Checking..." : "Verify OTP"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* The "other" field — hidden in the OTP box, still in formData for submission */}
            {/* Phone is needed by backend always; email is needed for fallback */}
            {channel === "sms" && (
              <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Email <span className="text-gray-400 font-normal">(used if SMS fails)</span></label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email" name="email" placeholder="example@gmail.com"
                    value={formData.email} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
              </div>
            )}
            {channel === "email" && (
              <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Phone Number</label>
                <div className="relative">
                  <FaMobileAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" name="phone" placeholder="10-digit or +91xxxxxxxxxx"
                    value={formData.phone} onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
              </div>
            )}

            {/* OTP section feedback */}
            {otpMsg && (
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                <FaCheckCircle className="text-green-500 shrink-0" />
                <span>{otpMsg}</span>
              </div>
            )}
            {otpErr && (
              <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                <FaExclamationTriangle className="text-red-400 shrink-0" />
                <span>{otpErr}</span>
              </div>
            )}

            {/* Countdown */}
            {otpSent && !verified && (
              <p className="text-xs text-center">
                {otpExpired
                  ? <span className="text-red-500 font-semibold">OTP expired — click Resend.</span>
                  : <span className="text-gray-500">OTP valid for <span className="font-bold text-green-700">{secondsLeft}s</span></span>
                }
              </p>
            )}

          </div>

          {/* Submit */}
          <button
            type="submit" disabled={loading || !verified}
            className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition duration-300 disabled:opacity-50 font-semibold"
          >
            {loading ? "Submitting..." : "Add Farmer"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AddFarmerPage;
