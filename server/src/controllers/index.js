
import { sendOtp,login,signUp, getUserInfo } from "./Auth.controllers.js";
import { completeProfile , getUserProfile } from "./CompleteProfile.controllers.js";

import { getAllSpoc , placeOrder, getAllOrders, getPowerPlantInfo} from "./PowerPlant.controllers.js";
import { sendFarmerOtp, verifyFarmerOtp, addFarmer, updateFarmer, getAllFarmers ,deleteFarmer,getAllRequests, acceptRequest, declineRequest,getSpocInfo} from "./Spoc.controllers.js";

export { sendOtp,login,signUp, completeProfile , getUserProfile, sendFarmerOtp, verifyFarmerOtp, addFarmer, updateFarmer, getAllFarmers, deleteFarmer, getAllSpoc, placeOrder,getAllRequests ,acceptRequest,getAllOrders, declineRequest, getUserInfo, getPowerPlantInfo,getSpocInfo}



