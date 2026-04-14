import express from "express";
import cors from "cors";
import { MongoClient,ObjectId } from "mongodb";
import multer from "multer";

const app = express();
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: "rzp_test_SUwbJYIpjpefPG",
  key_secret: "XHO7TBEB3KnnFx12F11b6WtI",
});
app.use(cors());
app.use(express.json());
app.use("/product",express.static("product"));

const url = "mongodb+srv://yogi2006kumar_db_user:Vm1czAW7xkDlDZtR@cluster0.p0kvi7z.mongodb.net/myDatabase?retryWrites=true&w=majority";
const client = new MongoClient(url);

let db;

async function connectDB() {
  await client.connect();
  db = client.db("firstdata");
  console.log("MongoDB Connected");
}

connectDB();

app.get("/", (req, res) => {
  res.send("Server Running");
});

const storage = multer.diskStorage({
  destination:function(req,file,cb){
    cb(null,"product/");
  },
  filename:function(req,file,cb){
    cb(null,Date.now() + "-" + file.originalname);
  },
});

const product = multer({ storage:storage})


// REGISTER API
app.post("/api/reg", async (req, res) => {
  try {
    console.log("BODY:", req.body); // 🔥 debug

    const { name, email, password } = req.body;

    // ✅ validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const lowerEmail = email.toLowerCase();

    const existingUser = await db
      .collection("register")
      .findOne({ email: lowerEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const result = await db.collection("register").insertOne({
      name,
      email: lowerEmail,
      password
    });

    res.json({
      message: "Account created successfully",
      result
    });

  } catch (error) {
    console.log("🔥 ERROR:", error); // VERY IMPORTANT
    res.status(500).json({
      message: "Server error"
    });
  }
});


// LOGIN API

app.post("/api/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    const lowerEmail = email.toLowerCase();

    const user = await db.collection("register").findOne({
      email: lowerEmail
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (user.password !== password) {
      return res.status(400).json({
        message: "Wrong password"
      });
    }

    res.json({
      message: "Login successful",
      user
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error"
    });

  }

});

// profile api


app.post("/api/profile", async (req, res) => {

  const { id } = req.body;

  const user = await db.collection("register").findOne({
    _id: new ObjectId(id)
  });

  res.json(user);

});

// product api

app.post('/product', product.single('profile'), async function(req,res){

  try {

    const { name, price, category,tags,originalPrice } = req.body;

    const profile = req.file ? req.file.filename : null;

    const productadd = await db.collection("product").insertOne({
      name,
      price,
      category,
      profile,
      tags,
      originalPrice

    });

    res.json({
      message:"Product added",
      productadd
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }

})

app.get("/product",async function (req,res) {
  const productadd = await db.collection("product").find().toArray(); 

    res.json(productadd);
})
app.get('/productid/:id', async function (req, res) {

  const { id } = req.params;

  const passid = await db.collection("product").findOne({
    _id: new ObjectId(id)
  });

  res.json(passid);

});

// category api.

app.get('/product/:category',async(req,res)=>{

  const category = req.params.category;
  const categorydata = await db.collection("product")
   .find({category:category})
   .toArray();
console.log(category);
   res.json(categorydata);
})

// create api 
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (error) {
    res.status(500).json({
      message: "Order creation failed",
    });
  }
});

// verfily api 

app.post("/api/verify-payment", (req, res) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", "XHO7TBEB3KnnFx12F11b6WtI")
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});