const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

const redisClient = redis.createClient(REDIS_PORT);

const instance  =axios.create();
instance.interceptors.request.use((config) => {
    config.headers['request-startTime'] = process.hrtime()
    return config
})
instance.interceptors.response.use((response) => {
    const start = response.config.headers['request-startTime']
    const end = process.hrtime(start)
    const milliseconds = Math.round((end[0] * 1000) + (end[1] / 1000000))
    response.headers['request-duration'] = milliseconds
    return response
})

function ResponseHandler(id,price){
    return `<h2>Product ${id} it's price is ${price}</h2>`
}

async function getProducts(req,res,next) {
    const {id}  = req.params;
    try {
        console.log("Fetching Data....")
        const result =  await instance.get(`https://fakestoreapi.com/products/${id}`)
        console.log(result.headers['request-duration'])
        const data= await result.data;
        const {price} = data;
        // using redis to save data 
        redisClient.SETEX(id , 3600, price)
        res.status(200).send(ResponseHandler(id, price))
    } catch (error) {
        console.log(error)
    }
}

//Cashe Middleware

async function casheMW (req,res,next) {
    
        const {id} = req.params
        redisClient.get(id  , (err, data) => {
            if(err) throw err;
            if(data){
                res.send(ResponseHandler(id, data));
            }else{
                next();
            }
        });

    }
app.get('/products/:id' ,casheMW, getProducts)

app.listen(PORT, ()=>{
    console.log(`App Listening to ${PORT}`)
})
