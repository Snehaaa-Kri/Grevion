import mongoose from "mongoose"

const powerPlantSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
  },
  email:{
    type:String,
    required:true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true   // speeds up every findOne({ userId }) call on this model
  },
  location:{
    type: String,
    required: true
  },
  phone:{
    type: String,
    // required: true
  },
  requestedParali: {
    type: Number,
    // required: true
    min: 0 
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    }
  ]
},{timestamps: true})


export const PowerPlant = mongoose.model("PowerPlant",powerPlantSchema)