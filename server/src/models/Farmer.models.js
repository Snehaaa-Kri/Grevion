import mongoose from "mongoose"

const farmerSchema = new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
  },
  phone: {
    type: String,
    required: true
  },
  village: {
    type: String,
    required: true
  },
  fieldLocation: {
    type: String,
    required: true
  },
  totalParali: {
    type: Number,
    required: true,
    min: 0
  },
  spocId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Spoc'
  },
},{timestamps: true})

export const Farmer = mongoose.model("Farmer",farmerSchema)