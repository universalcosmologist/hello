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

app.use(cors({
    origin:'http://localhost:5173',
}))

app.get('/',(req,res)=>{
    return res.json({message:"hello from backend !!"});
})

app.get('/room/:roomId',(req,res)=>{
   return res.status(200).json({message:"room joined via express"});
})

io.on('connection',(socket)=>{
    console.log("a user connected");
    socket.on("join-room",(roomId)=>{
      socket.join(roomId);
      socket.to(roomId).emit("onjoin",`socket ${socket.id} has joined the room`);
    });

    socket.on("leave-rooom",(roomId)=>{
      socket.leave(roomId);
      console.log(`user left the room : ${socket.id}`);
      socket.to(roomId).emit("onjoin",`socket ${socket.id} left the room`);
    });

    socket.on("operation",({op,roomId})=>{
       if(socket.rooms.has(roomId)){
        if(op) socket.to(roomId).emit("receive_op",op);
       }
    })
})

server.listen(8000,()=>{
    console.log('server running at port 8000');
})