import express from "express";
import {
    sendFarmerOtp, verifyFarmerOtp, addFarmer,
    updateFarmer, getAllFarmers, deleteFarmer,
    getAllRequests, acceptRequest, declineRequest, getSpocInfo,
} from "../controllers/index.js";
import { auth, isSpoc } from "../middlewares/index.js";
import validate from "../middlewares/validate.middleware.js";
import {
    sendFarmerOtpValidators,
    verifyFarmerOtpValidators,
    addFarmerValidators,
    updateFarmerValidators,
    deleteFarmerValidators,
} from "../validators/spoc.validators.js";

const spocRouter = express.Router();

spocRouter.post("/sendFarmerOtp",   auth, isSpoc, sendFarmerOtpValidators,   validate, sendFarmerOtp);
spocRouter.post("/verifyFarmerOtp", auth, isSpoc, verifyFarmerOtpValidators, validate, verifyFarmerOtp);
spocRouter.post("/addFarmer",       auth, isSpoc, addFarmerValidators,       validate, addFarmer);
spocRouter.get("/getAllFarmers",     auth, isSpoc, getAllFarmers);
spocRouter.delete("/deleteFarmer/:farmerId", auth, isSpoc, deleteFarmerValidators, validate, deleteFarmer);
spocRouter.put("/updateFarmer/:farmerId",    auth, isSpoc, updateFarmerValidators,  validate, updateFarmer);
spocRouter.get("/getAllRequests",    auth, isSpoc, getAllRequests);
spocRouter.post("/acceptRequest/:reqid",  auth, isSpoc, acceptRequest);
spocRouter.post("/declineRequest/:reqid", auth, isSpoc, declineRequest);
spocRouter.get("/getSpocInfo", auth, getSpocInfo);

export default spocRouter;
