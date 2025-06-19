import React,{useEffect} from 'react'
import { useParams } from 'react-router-dom'
import { socket } from '../socket';
import WhiteBoard from '../components/Whiteboard'
//we want to show the join message to all other room members onyl

function RoomPage() {
  const {roomId}=useParams();
  useEffect(()=>{
    socket.emit("join-room",roomId);

    return ()=>{
        socket.emit("leave-room",roomId);
    }
  },[]);
  //as this component loads we want user to join the room through socket io
  return (
    <div>
        <div>welcome to room,{roomId}</div>
        <WhiteBoard/>
    </div>
  )
}

export default RoomPage