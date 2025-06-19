const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const cors=require('cors');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{
  cors: {
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST'],
  }
});

const rooms=[];

app.use(cors({
    origin:'http://localhost:5173',
}))

app.get('/',(req,res)=>{
    return res.json({message:"hello from backend !!"});
})

app.get('/room/:roomId',(req,res)=>{
   const roomId=req.params.roomId;
   if(!rooms.includes(roomId)){
    rooms.push(roomId);
   }
   return res.status(200).json({success:"room joined"});

});

io.on('connection',(socket)=>{
    console.log("a user connected");
    socket.on("join-room",(roomId)=>{
      socket.join(roomId);
      socket.to(roomId).emit("onjoin",`socket ${socket.id} has joined the room`);
    });

    socket.on("leave-rooom",(roomId)=>{

    });
})

server.listen(8000,()=>{
    console.log('server running at port 8000');
})