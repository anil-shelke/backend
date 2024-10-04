// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken"
// import { User } from "../models/user.model.js";

// // (req, _, next) we can write instead of (req, res, next) because res is not used here.
// export const verifyJWT = asyncHandler(async(req, _, next)=>{
//     try {
//         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
//         console.log(token);

    
//         if(!token){
//             throw new ApiError(401, "Unathorized request")
//         }

    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
//         console.log(decodedToken)

    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
//          console.log(user);
    
    
//         if(!user){
//             // TODO : discuss about frontend
//             throw new ApiError(401, "Invalid Access Token")
//         }

//         req.user = user;
//         next()
    
//     } catch (error) {
//         throw new ApiError(401,error?.message || "Invalid access token")
//     }
    

// })




// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken"
// import { User } from "../models/user.model.js";

// export const verifyJWT = asyncHandler(async(req, _, next) => {
//     try {
//         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
//         console.log(token);

//         if (!token) {
//             throw new ApiError(401, "Unauthorized request")
//         }
    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
//         console.log(decodedToken);
//         console.log(typeof jwt)

    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
//         console.log(user);
    
//         if (!user) {
            
//             throw new ApiError(401, "Invalid Access Token")
//         }
    
//         req.user = user;
//         next()
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid access token")
//     }
    
// })





import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Log incoming cookies and headers for debugging
        console.log("Request Cookies:", req.cookies);
        console.log("Request Headers:", req.headers);

        // Retrieve the token
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        console.log("Token:", token); // Log the token

        // Check if token exists and is a string
        if (!token || typeof token !== 'string') {
            throw new ApiError(401, "Unauthorized request: No token provided or token is not a string");
        }

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("Decoded Token:", decodedToken);

        // Fetch user from database
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        console.log("User:", user);

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error);
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
