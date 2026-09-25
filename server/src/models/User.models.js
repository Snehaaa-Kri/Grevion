import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  image:{
    type:String,
  },
  email:{
    type: String,
    required: true,
    unique: true,   // unique already creates an index
    lowercase: true
  },
  password:{
    type: String,
    required: true
  },
  phone:{
    type: String,
    required: true,
    match : [/^\d{10}$/, "Phone number must contain exactly 10 digits!" ]
  },
  location:{
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['farmer','spoc','power_plant'],
    required: true
  },
  additionalDeatils: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'role'
  }

},{timestamps: true})

export const User = mongoose.model("User",userSchema)
