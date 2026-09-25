import mongoose from "mongoose";
import { Order, PowerPlant, Request, Spoc, User } from "../models/index.js";
import AppError from "../middlewares/AppError.js";

// ---------------------------------------------------------------------------
// getAllSpoc
// ---------------------------------------------------------------------------
const getAllSpoc = async (req, res, next) => {
    try {
        const allSpoc = await Spoc.find({});

        if (allSpoc.length === 0) {
            return next(new AppError("No SPOCs found", 404));
        }

        return res.status(200).json({
            success: true,
            message: "All SPOCs fetched successfully",
            spocs:   allSpoc,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// placeOrder
// ---------------------------------------------------------------------------
const placeOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const spocId = req.params.spocId;

        const [spoc, powerPlant] = await Promise.all([
            Spoc.findById(spocId),
            PowerPlant.findOne({ userId }),
        ]);

        if (!spoc) {
            return next(new AppError("SPOC does not exist", 404));
        }
        if (!powerPlant) {
            return next(new AppError("PowerPlant does not exist for this user", 404));
        }

        const { requestedParali, offeredPricePerTon, totalPrice, deliverWithin, location, message } = req.body;

        if (!requestedParali || !offeredPricePerTon || !totalPrice || !deliverWithin || !location || !message) {
            return next(new AppError("All fields are required", 400));
        }

        if (spoc.totalParaliCollected < requestedParali) {
            return next(new AppError("Insufficient quantity", 400));
        }

        const orderId = new mongoose.Types.ObjectId();

        const [newOrder, newRequest] = await Promise.all([
            Order.create({
                _id: orderId,
                powerPlantId: powerPlant._id,
                spocId,
                name: spoc.name,
                location: spoc.location,
                requestedParali,
                offeredPricePerTon,
                totalPrice,
                deliverWithin,
            }),
            Request.create({
                powerPlantId: powerPlant._id,
                spocId,
                orderId,
                name: req.user.name || powerPlant.name,
                requestedParali,
                offeredPricePerTon,
                totalPrice,
                deliverWithin,
                location,
                message,
            }),
        ]);

        const [updatedSpoc, updatedPowerPlant] = await Promise.all([
            Spoc.findByIdAndUpdate(spocId, { $push: { requests: newRequest._id } }, { new: true }),
            PowerPlant.findByIdAndUpdate(powerPlant._id, { $push: { orders: newOrder._id } }, { new: true }),
        ]);

        return res.status(200).json({
            success:          true,
            message:          "Order placed successfully",
            updatedSpoc,
            updatedPowerPlant,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// getAllOrders
// ---------------------------------------------------------------------------
const getAllOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const pp     = await PowerPlant.findOne({ userId }).populate({ path: "orders", model: "Order" });

        if (!pp) {
            return next(new AppError("Power plant not found", 404));
        }

        return res.status(200).json({
            success: true,
            message: "All orders fetched successfully",
            orders:  pp.orders,
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// getPowerPlantInfo
// ---------------------------------------------------------------------------
const getPowerPlantInfo = async (req, res, next) => {
    try {
        const userId   = req.user.id;
        const powerPlant = await User.findById(userId);

        if (!powerPlant) {
            return next(new AppError("Power plant not found", 404));
        }

        return res.status(200).json({
            success:    true,
            message:    "Power plant details fetched successfully",
            powerPlant,
        });
    } catch (error) {
        next(error);
    }
};

export { getAllSpoc, placeOrder, getAllOrders, getPowerPlantInfo };
