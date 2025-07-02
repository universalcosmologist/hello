import React,{createContext,useContext,useEffect,useState} from 'react';
import { socket } from '../socket';

const RoomContext = createContext();
//three types of things we need in room to be stored one is join second is voice message and third is drawing stroke

export const RoomProvider = ({ children }) => {
  const [joinmsg,setJoinMsg]=useState([]);
  const [voicemsg,setVoiceMsg]=useState([]);
  const [drawstroke,setDrawStroke]=useState([]);
  useEffect(()=>{
    const join_handler=(msg)=>{
     setJoinMsg((prev)=>[...prev,msg]);
    }

    const handle_voice_msg=(msg)=>{
     setVoiceMsg((prev)=>[...prev,msg]);
    }

    const handler_stroke=(msg)=>{
     setDrawStroke((prev)=>[...prev,msg]);
    }

    socket.on("onjoin",join_handler);
    socket.on("onmsg",handle_voice_msg);
    socket.on("ondraw",handler_stroke);

    return ()=>{
       socket.off("onjoin",join_handler);
       socket.off("onmsg",handle_voice_msg);
       socket.off("ondraw",handler_stroke);
    }
  },[]);

  return (
    <RoomContext.Provider value={{ joinmsg,voicemsg,drawstroke }}>
      {children}
    </RoomContext.Provider>
  );
};


export const useRoom = () => useContext(RoomContext);