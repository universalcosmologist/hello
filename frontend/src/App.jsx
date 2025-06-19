import React,{useEffect} from "react"
import {BrowserRouter as Router , Route,Routes} from 'react-router-dom'
import RoomPage from "./pages/RoomPage";
import Homepage from "./pages/Homepage";
import { socket } from "./socket";

function App() {
  const [isConnected,setConnected]=React.useState(false);
  //immediately try to connect once this app component renders and disconnect user once app unmounts

  useEffect(()=>{

    const connect_handler=()=>{
      console.log("user is connected");
      setConnected(true);
    }

    if(!socket.connected){
      socket.connect();
    }

    socket.on('connect',connect_handler);

    return ()=>{
      socket.disconnect();
      socket.off('connect',connect_handler);
      setConnected(false);
    };
  },[]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage isConnected={isConnected}/>}/>
        <Route path="/room/:roomId" element={<RoomPage/>}/>
      </Routes>
    </Router>
  )
}

export default App
