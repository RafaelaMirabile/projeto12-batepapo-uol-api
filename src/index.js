import express, { application } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { MongoClient} from 'mongodb'
import {validateParticipant} from "./validation/validateParticipant.js"
import {validateMessage} from "./validation/validateMessage.js"
import dayjs from 'dayjs'

dotenv.config();

const server = express();
server.use(express.json());
server.use(cors());

let db;
const  mongoClient = new MongoClient(process.env.MONGO_URI);

mongoClient.connect().then(()=>{
    db = mongoClient.db('bate_papo_oul');
});

server.get('/participants', async (req,res)=>{
    
    try{
        const response = await db.collection('participantes').find().toArray();
        res.send(response);
    } catch(error){
        res.status(500).send(error.message);
    }
});

server.post('/participants', async (req,res)=>{
    
    const {name} = req.body;
    const participant = {name};
    
    const participantValidated = validateParticipant(participant);
    const repeatedUserName = await db.collection('participantes').findOne({name});

    try{
        if(repeatedUserName){
            res.status(409).send("User already exists!");
            return;
        }
        if(participantValidated){
            res.status(422).send(participantValidated.error.message);
            return;
        }

        const newMessage = {
            from : name,
             to: 'Todos', 
             text: 'entra na sala...', 
             type: 'status', 
             time: dayjs().format('HH:MM:SS')
        }

        const newParticipant = {
            name,
            lastStatus :Date.now()
        };

        await db.collection('participantes').insertOne(newParticipant);
        await db.collection('mensagens').insertOne(newMessage);
        
        res.sendStatus(201);

    }catch(error){
        res.status(500).send(error.message)}
});

server.post('/messages', async (req,res)=>{
    
    const {to,text,type} = req.body;
    const message = {to,text,type};
    const {user} = req.headers;

    const messageValidated = validateMessage(message);

    const allowMessage = await db.collection('participantes').findOne({name : user});

    try{
        if(messageValidated){
            const error = messageValidated.error.details.map(detail => detail.message);
            res.status(422).send(error);
            return;
        }
        if(!allowMessage){
            res.status(422).send('User doesnt exist');
            return;
        }

        const newMessage ={
            from: user, 
            to: to, 
            text: 'entra na sala...', 
            type: type, 
            time: dayjs().format('HH:MM:SS')
        }

        await db.collection('mensagens').insertOne(newMessage);
        res.sendStatus(201);

    }catch(error){
        console.error(error);
    }
});

server.get('/messages', async (req,res)=>{

    const limit = parseInt(req.query.limit);
    const {user} = req.headers;

      try{
          const messages = await db.collection('mensagens').find().toArray();
          
          const allowedMessage = await messages.filter(message =>{
                const privateMessageToUser = message.type === "private_message" && message.to === user;
                const privateMessageFromUser  = message.type === "private_message" && message.from === user;
                const messageFromAll = message.to === "Todos";
                
                return(privateMessageFromUser || privateMessageToUser || messageFromAll);
          });         
          
          if(limit){
            const limitMessages = await allowedMessage.slice(-limit);
            res.send(limitMessages);
          }
          res.send(allowedMessage);
      }
      
      catch(error){
          res.status(500).send(error.message);
      }

});

server.post('/status', async (req,res)=>{
    
    const {user} = req.headers;

    try{
        const foundUser = await db.collection('participantes').findOne({name : user});      
        
        if(!foundUser){
            res.sendStatus(404);
        }
        
        await db.collection('participantes').updateOne({name : user},{$set:{lastStatus: Date.now()}});
       
        res.sendStatus(200);
    }

    catch(error){
        res.status(500).send(error.message);
    }
});

setInterval(async ()=>{
    try{

        const participants = await  db.collection('participantes').find().toArray();       
        const time = Date.now();
        
        for(let i = 0; i < participants.length ;i++){
            
            const participant = participants[i];
            
            if(time - participant.lastStatus > 10000){
                
                const newMessage = {
                    from : participant.name,
                    to: "Todos",
                    text:"sai da sala...",
                    type:"status",
                    time: dayjs().format("HH:mm:ss")
                };
                
                await db.collection('participantes').deleteOne({name : participant.name});
                await db.collection('mensagens').insertOne(newMessage);
           }
        }
    }
    catch(error){
        console.error(error);
    }

}, 15000);

server.listen(5000, ()=>
console.log('Listening on port 5000'));