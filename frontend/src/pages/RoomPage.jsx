import React,{useEffect} from 'react'
import { useParams } from 'react-router-dom'
import { socket } from '../socket';
import Whiteboard from '../components/Whiteboard'
import {useRoom} from '../Context/RoomContext'
//we want to show the join message to all other room members onyl

function RoomPage() {
  const {joinmsg}=useRoom();
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
        {joinmsg && Array.isArray(joinmsg) && (
          <ul className='m-2'>
          {joinmsg.map((msg, index) => (
            <li  className='m-1' key={index}>{msg}</li>
          ))}
          </ul>
        )}
        <div className='m-2'>welcome to room,{roomId}</div>
        <Whiteboard roomId={roomId}/>
    </div>
  )
}

export default RoomPage