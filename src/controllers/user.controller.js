import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res, next) => {
    try {
        return res.status(200).json({
            message: "ok hello"
        })
    } catch(error){
        console.log('Error', error);
    }
    // const {fullName, email, username, password } = req.body
    // console.log("email: ", email);
})

export { registerUser }