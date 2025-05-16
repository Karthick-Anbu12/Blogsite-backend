const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const { MongoClient, ObjectId } = require("mongodb")
const dotenv = require("dotenv")
const app = express()
app.use(cors({
  origin: '*'
}))
const secretkey = "jhwgdqg2yt1771t827y891hbdjshbjdhskn"
const url = "mongodb+srv://karthickleo2121:uidb1nE49Iy0VlnS@blogsite.hl5qnhz.mongodb.net/blogdb?retryWrites=true&w=majority&appName=blogsite"
mongoose.connect(url).then(() => {
    console.log("Database connected successfully.");
    app.listen(3000, () => {
        console.log("Server is running on port 3000 ")
    })
})
app.use(express.json())
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    createdAt: Date,
    blog: [],

})
const blogschema = new mongoose.Schema({
    title: String,
    category: String, // e.g., "Career", "Finance", "Travel"
    author: String, // populated from user data
    content: String,
    image: String, // optional URL
    userId: ObjectId, // references User
    createdAt: Date,
    updatedAt: Date

})
//Json Web Token
let authenticate = (req, res, next) => {
    if (!req.headers.authorization) {
        res.status(401).json({ message: "unauthorized user" })
    }
    else {
        jwt.verify(req.headers.authorization, secretkey, (error, data) => {
            if (error) {
                res.status(401).json({ message: "unauthorized" })
            }
            req.userid = data.id
            next();
        })
    }
}
const User = mongoose.model("User", userSchema, 'User')
//user data
app.get("/auth/user", async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("User");
        const result = await collection.findOne({});
        res.json(result)
    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        await client.close();
    }
})
//
app.post("/auth/login", async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("User");
        const user = await collection.findOne({ email: req.body.email })
        if (!user) {
            return res.status(404).json({ message: "Invalid credentials" })
        }

        const passwordcorrect = await bcrypt.compare(req.body.password, user.password)
        if (!passwordcorrect) {
            return res.status(401).json({ message: "Invalid credentials " })
        }
        const token = jwt.sign({ id: user._id }, secretkey)
        res.json({ message: token })
    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})
//Signup
app.post("/auth/signup", async (req, res) => {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(req.body.password, salt)
    req.body.password = hash;
    let data = new User(req.body);
    const result = await data.save();
    res.send(result).status(201);
})
