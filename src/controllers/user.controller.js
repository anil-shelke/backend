import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

// asyncHandler is not used because in this method we are not handing any web request
const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req, res, next) => {
    // try {
    //     return await res.status(200).json({
    //         message: "ok hello"
    //     })
    // } catch(error){
    //     console.log('Error', error);
    // }
    // const {email } = req.body
    // console.log("email: ", email)



    // get user details from frontend 
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creatoin 
    // return res
    


    const {fullname, email, username, password} = req.body;
    
    console.log("fullname:",fullname,"email:",email, username, password);
    console.log(req.body);

    // if(password == ""){
    //     throw new ApiError(400, "fullname is required");
    // }


    // The some() method returns true (and stops) if the function returns true for one of the array elements.
    if(
        [fullname, email, username, password].some((field) =>
        field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }


    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    console.log(existedUser)

    if(existedUser){
        throw new ApiError(409, "User with email or username is already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;
    console.log(avatarLocalPath);
    console.log(req.files);

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
    

})



const loginUser = asyncHandler(async (req, res,next) =>{
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie


    // accessing data from the frontend
    const {email, username, password} = req.body;
    console.log(email, username, password);


    //checking that at least username or email is required
    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }


    // User.findOne({username})     // using this we only comparing the username
    //finding the entered username or email in the database using $or mongodb operator
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist")
    }

    // user access the isPasswordCorrect() generateAccessToken() these functions from the user.model.
    // The User is a Object of mongoose access the mongodb functions like findOne(), updateOne(). 
    
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404,"Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user:loggedInUser, accessToken,
                refreshToken
            },
            "User  logged In Successfully"
        )
    )

})



// const logoutUser =  asyncHandler(async(req, res) =>{
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $unset:{
//                 refreshToken: 1  // this removes the field from document
//             }
//         },
//         {
//             new:true
//         }
//     )

//     const options = {
//         httpOnly:true,
//         secure:true
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged Out"))
// })

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : null
             } 
             
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})



const refreshAccessToken = asyncHandler(async (req, res, next) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    // console.log(incomingRefreshToken);

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }
    
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
        // console.log(decodedRefreshToken);
    
        const user =await User.findById(decodedToken?._id)
        console.log(user.refreshToken)
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})



const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body;
    console.log(oldPassword, newPassword);

    const user = await User.findById(req.user._id);
    // console.log(user);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);    

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    console.log("Password changed Successfully")
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully"))
    
})



const getCurrentUser = asyncHandler(async(req, res) =>{
    const user = req.user;
    console.log(user);

    if(!user){
        throw new ApiError(400, "currently user is not present")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched"))
})



const updateAccountDetails = asyncHandler(async(req, res) =>{
   const {fullname, email} = req.body;
   console.log(fullname,email)

   if(!(fullname || email)){
    throw new ApiError(400, "Invalid fullname and email");
   }

   const user = User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            fullname,
            email:email
        }
    },
    { new:true}
    ).select("-password")

   console.log(user);

   console.log("account details changed successfully")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "username and email changed successfully"))
})



const updateUserAvatar = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing")
    }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
        throw new ApiError(400, "Error while uploading an avatar")
   }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar file updated successfully"))
})


const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse(200,
        user,
        "CoverImage updated successfully"
    ))

})


export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 } 