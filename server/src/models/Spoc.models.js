import mongoose from "mongoose"

const spocSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true   // speeds up every findOne({ userId }) call
  },
  farmers:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer"
    }
  ],
  totalParaliCollected: {
    type: Number,
    // required: true,
    min: 0
  },
  requests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "PowerPlant"
  }],
  pricePerTon: {
    type: Number,
    // required: true,
    min: 0
  },
  location:{
    type:String,
    required:true,
  },
  availableForSale: {
    type: Boolean,
    default: true
  }
},{timestamps:true})

export const Spoc = mongoose.model("Spoc",spocSchema)