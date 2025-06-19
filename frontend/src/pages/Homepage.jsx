import React,{useState} from 'react'
import  Display from "../components/Display";
import { useNavigate } from 'react-router-dom';

function Homepage({isConnected}) {
  const [name,setName]=useState("none");
  const navigate=useNavigate();
  const handleRoomJoin=async()=>{
    if(name=="none" || name=="") return;
    //here we need to fetch and also need backend api
    try {
       const result=await fetch(`http://localhost:8000/room/${name}`);
       if(result.ok){
      navigate(`/room/${name}`);
      }else{
      alert('room join failed');
      }
    } catch (error) {
       console.log("error occured",error); 
    }
  }

  return (
     <div>
    <Display isConnected={isConnected}/>
    <div>
      <input
        className='border-2 p-1 m-1'
        type="text"
        value={name}
        onChange={(e)=>setName(e.target.value)}
      />
      <button
        className='hover:cursor-pointer border-2 bg-blue-600 p-1 m-1'
        onClick={handleRoomJoin}
      >Join Room</button>
    </div>
    </div>
  )
}

export default Homepage