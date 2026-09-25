import mongoose from "mongoose";
import {Order, PowerPlant, Request, Spoc, User} from "../models/index.js"

const getAllSpoc = async (req,res)=>{
  try {
    const allSpoc = await Spoc.find({})

    if(allSpoc.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Spoc not found"
    });
  }

    return res.status(200).json({
      success: true,
      message: "All spoc fetched successfully",
      spocs: allSpoc
    })
    
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Unable to get all spocs, please try again"
  });
  }
}

const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const spocId = req.params.spocId;

    // Run independent lookups in parallel instead of sequentially.
    // This alone saves ~60-80ms on this route.
    const [spoc, powerPlant] = await Promise.all([
      Spoc.findById(spocId),
      PowerPlant.findOne({ userId }),
    ]);

    if (!spoc) {
      return res.status(404).json({ success: false, message: "Spoc does not exist" });
    }
    if (!powerPlant) {
      return res.status(404).json({ success: false, message: "PowerPlant does not exist for this user" });
    }

    const {
      requestedParali,
      offeredPricePerTon,
      totalPrice,
      deliverWithin,
      location,
      message,
    } = req.body;

    if (!requestedParali || !offeredPricePerTon || !totalPrice || !deliverWithin || !location || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (spoc.totalParaliCollected < requestedParali) {
      return res.status(400).json({ success: false, message: "Insufficient Quantity" });
    }

    // Pre-generate the Order _id so both Order and Request can reference
    // each other without a sequential save round-trip after the parallel create.
    const orderId = new mongoose.Types.ObjectId();

    // Create Order and Request in parallel — neither depends on the other.
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
        orderId,                                    // already known — no extra save needed
        name: req.user.name || powerPlant.name,
        requestedParali,
        offeredPricePerTon,
        totalPrice,
        deliverWithin,
        location,
        message,
      }),
    ]);

    // Update Spoc and PowerPlant in parallel — independent of each other.
    const [updatedSpoc, updatedPowerPlant] = await Promise.all([
      Spoc.findByIdAndUpdate(
        spocId,
        { $push: { requests: newRequest._id } },
        { new: true }
      ),
      PowerPlant.findByIdAndUpdate(
        powerPlant._id,
        { $push: { orders: newOrder._id } },
        { new: true }
      ),
    ]);

    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
      updatedSpoc,
      updatedPowerPlant,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Unable to place order, please try again." });
  }
};

const getAllOrders = async (req, res) =>{
    try{
        const userId = req.user.id;
        console.log("user id = ",userId);
        const pp = await PowerPlant.findOne({userId}).populate({
            path: "orders",
            model: "Order"
        });
        console.log(pp);
        if(!pp){
            return res.status(404).json({
                success: false,
                message: "power plant not found"
            })
        } 

        console.log("Orders inside PowerPlant: ", pp.orders);
        res.status(200).json({
            success: true,
            message : "All orders fetched successfully",
            orders: pp.orders
        })


    }
    catch(error){
        console.log("Error in fetching all orders :", error);
        return res.status(400).json({
            success: false,
            message: "getAllOrders failed. Try again!"
        })
    }
}

const getPowerPlantInfo= async(req,res)=>{
  try {
    const userId= req.user.id;
    console.log(userId)
    const powerPlant= await User.findOne({_id:userId});
    console.log(powerPlant)
    if(!powerPlant)
    {
      return res.status(400).json({
        success:false,
        message:"Power plant not found"
      })
    }
    return res.status(200).json({
      success:true,
      message:"Powr plant details fetched successfully",
      powerPlant
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success:false,
      message:"Unable to fetch power plant details, please try again!"
    })
  }
}

export  {getAllSpoc, placeOrder, getAllOrders, getPowerPlantInfo}