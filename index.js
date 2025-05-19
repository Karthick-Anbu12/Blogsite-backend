const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const { MongoClient, ObjectId } = require("mongodb")
const dotenv = require("dotenv")
dotenv.config()
const app = express()
app.use(cors({
    origin: 'https://delightful-squirrel-a83013.netlify.app'
}))
const secretkey = process.env.SECRETKEY
const url = process.env.URL
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
    createdAt: String
})
const blogschema = new mongoose.Schema({
    title: String,
    category: String, // e.g., "Career", "Finance", "Travel"
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // populated from user data
    content: String,
    image: String, // optional URL
    userId: ObjectId, // references User
    createdAt: String,
    updatedAt: String

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
const Blogs = mongoose.model("Blogs", blogschema, 'Blogs')

//user data
app.get("/auth/user", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("User");
        const result = await collection.findOne({ _id: new ObjectId(req.userid) });
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
        res.json({ message: token, user })

    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})
//Signup
app.post("/auth/signup", async (req, res) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(req.body.password, salt)
    req.body.password = hash;
    const date = new Date();
    const dd = date.getDate()
    const mm = months[date.getMonth()]
    const yy = date.getFullYear()
    req.body.createdAt = mm + ' ' + dd + ',' + yy
    let data = new User(req.body);
    const result = await data.save();
    res.send(result)
    res.status(201);
})
//Post blog
app.post("/blogs", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        await client.connect();
        const collection = client.db().collection("Blogs");
        const userId = new ObjectId(`${req.userid}`)
        const date = new Date();
        const dd = date.getDate()
        const mm = months[date.getMonth()]
        const yy = date.getFullYear()
        req.body.userId = userId;
        req.body.author = userId;
        req.body.createdAt = mm + ' ' + dd + ',' + yy;
        const blog = await collection.insertOne(req.body)
        if (blog) {
            res.json(blog);
            res.status(201).json({ message: "Blog added" })
        }


    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})
//Get blogs
app.get("/blogs", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("Blogs");
        const result = await Blogs.find({}).populate("author", "name")
        res.json(result)
    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        await client.close();
    }
})
//Delete Blogs
app.delete("/blogs/:id", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("Blogs");
        const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) })
        res.status(204)
        res.json({ message: "Blog deleted" })
    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})
//Update blog
app.put("/blogs/:id", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("Blogs");
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const date = new Date();
        const dd = date.getDate()
        const mm = months[date.getMonth()]
        const yy = date.getFullYear()
        req.body.updatedAt = mm + ' ' + dd + ',' + yy;
        const { _id, ...updateFields } = req.body
        await collection.findOneAndUpdate({ _id: new ObjectId(`${req.params.id}`) }, { $set: updateFields })
        res.status(204).json({ message: "Blog Updated" })

    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})
//Get single blog
app.get("/blogs/:id", authenticate, async (req, res) => {
    const client = new MongoClient(url);
    try {
        await client.connect();
        const collection = client.db().collection("Blogs");
        const result = await collection.findOne({ _id: new ObjectId(req.params.id) })
        if (result) {
            res.json(result)
        }
    } catch (error) {
        console.error("Error fetching data: ", error);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
})

