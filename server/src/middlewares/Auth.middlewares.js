import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config();

const auth= async(req,res,next)=>{
    try {
        const token= req.cookies.token || req.body.token || req.header("Authorization")?.replace("Bearer ", "");

        if(!token)
        {
            return res.status(401).json({
                success:false,
                message:"Token Missing"
            })
        }
        try {
            const decode= jwt.verify(token,process.env.SECRET_KEY)
            console.log(decode);
            req.user=decode
        } catch (error) {
            return res.status(401).json({
                success:false,
                message:"Token is not valid"
            })
        }
        next();
    } catch (error) {
        return res.status(400).json({
            success:false,
            message:"Something went wrong while validating token "
        })
    }
}

 const isFarmer= async(req,res,next)=>{
    try {
        if(req.user.role!=="farmer")
        {
            return res.status(401).json({
                success:false,
                message:"This is a protected route for farmers"
            })
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified, Please try again"
        })
    }
}
 const isSpoc= async(req,res,next)=>{
    try {
        if(req.user.role!=="spoc")
        {
            return res.status(401).json({
                success:false,
                message:"This is a protected route for SPOCs"
            })
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified, Please try again"
        })
    }
}
 const isPowerPlant= async(req,res,next)=>{
    try {
        console.log(req.user);
        if(req.user.role!=="power_plant")
        {
            return res.status(401).json({
                success:false,
                message:"This is a protected route for power Plants"
            })
        }
        next();
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified, Please try again"
        })
    }
}

export {auth,isFarmer,isSpoc,isPowerPlant}