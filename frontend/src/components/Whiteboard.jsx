import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import { socket } from '../socket';
//for shapes it is easy and also for the clear for the undo we have to think 
//how do we add clear functionality and for undo we need to keep ops history and undo can also add back the stroke
const gen = rough.generator();

const Whiteboard = ({roomId}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const [drawing, setDrawing] = useState("");
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [erase,setErase]=useState(false);
  const [action,setAction]=useState("");
  const [shape,setShape]=useState("");
  let opsHistory=useRef([]);
  const pendingOpsRef = useRef(new Map());
  const prev_key=useRef(null);
  const [op_map,setMap]=useState(new Map());
 //id to what it is 
  //here we identify every stroke with the help of its id
  const prev=useRef(null);
  const create_element=(shape="line",startx,starty,endx,endy)=>{
      //now it can be any shape so we have to make if else ellipse is tough
      const line_width=ctxRef.current.lineWidth;
      if(shape=="circle"){
         //center x y then diameter
         const dx=endx-startx;
         const dy=endy-starty;
         let val=Math.sqrt(dx * dx + dy * dy).toFixed(2);
         const ele= gen.circle(startx,starty,2*val);
         return {shape,startx,starty,endx,endy,ele,line_width};
      }else if(shape=="rectangle"){
         //wdith,height
         const width=endx-startx;
         const height=endy-starty;
         const ele= gen.rectangle(startx,starty,width,height);
         return {shape,startx,starty,endx,endy,ele,line_width};
      }else if(shape=="line"){
         const ele= gen.line(startx,starty,endx,endy);
         return {shape,startx,starty,endx,endy,ele,line_width};
      }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    console.log(canvasRef.current);
    canvas.width = 300;
    canvas.height = 300;

    ctxRef.current = canvas.getContext('2d');
    roughCanvasRef.current = rough.canvas(canvas);
    setIsCanvasReady(true);
    const _handler=(op)=>{
      applyop(op);
    }
    socket.on("receive_op",_handler);
    return ()=>{
      socket.off("receive_op",_handler);
    }
  }, []);

  useEffect(()=>{
    //draw the canvas from map here
    if(isCanvasReady && roughCanvasRef && roughCanvasRef.current){
      const canvas=canvasRef.current;
      ctxRef.current.clearRect(0,0,canvas.width,canvas.height);
      for (const [key, value] of op_map) {
      const {points,shape,type}=value;
      if(type=="shape"){
        const res=create_element(shape,points[0][0],points[0][1],points[1][0],points[1][1]);
        roughCanvasRef.current.draw(res.ele);
      }else if(type=="freehand"){
        //run for loop to print the line using moveTo and lineTo
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(points[0][0],points[0][1]);
        points.forEach((point)=>{
          ctxRef.current.lineTo(point[0],point[1]);
          ctxRef.current.stroke();
        })
      }
      }
    }
    
  },[op_map,isCanvasReady]);

  
  const applyop = (op) => {
  setMap(prevMap => {
    let newMap = new Map(prevMap);

      if (op.type === "freehand" || op.type === "shape") {
      newMap.set(op.strokeId, op);
      opsHistory.current.push(op.strokeId);

      const pending = pendingOpsRef.current.get(op.strokeId);
      if (pending && pending.timeStamps >= op.timeStamps) {
        newMap.delete(op.strokeId);
        opsHistory.current=opsHistory.current.filter((t)=>t!=op.strokeId);
        pendingOpsRef.current.delete(op.strokeId);
        }
      } 
      else if (op.type === "erase") {
      if (newMap.has(op.targetId)) {
        const target=newMap.get(op.targetId);
        if(op.timeStamps>=target.timeStamps){
          newMap.delete(op.targetId);
          opsHistory.current=opsHistory.current.filter((t)=>t!=op.targetId);
        }
      } 
     
      else {
        pendingOpsRef.current.set(op.targetId, op);
      }
      }
      else if(op.type=== "erase_all"){
        const temp_map=new Map();
        pendingOpsRef.current.clear();
        newMap=temp_map;
      }
      else if(op.type=="undo"){
        //remove from opsHistory and from the the map also
        if(newMap.has(op.targetId)){
          newMap.delete(op.targetId);
        }
        if(opsHistory.current.includes(op.targetId)){
          opsHistory.current=opsHistory.current.filter((t)=>t!=op.targetId);
        }
      }
      return newMap;
    });
  };


  const getMousePos = (event) => {
    const rect = canvasRef.current.getBoundingClientRect(); // get canvas position

    return {
      clientX: event.clientX - rect.left,
      clientY: event.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const { clientX, clientY } = getMousePos(e);
    if(action=="shape_drawing"){
      const strokeId=`${socket.id}-${Date.now()}`;
      const op={
        type:"shape",
        strokeId,
        userId:socket.id,
        shape,
        timeStamps:Date.now(),
        points:[[clientX,clientY],[clientX,clientY]],
      }
      prev.current=strokeId;
      applyop(op);
      socket.emit("operation",{op,roomId});
      setDrawing("shape");
    }else if(action=="erase"){
      setErase(true);
    }else if(action=="freehand"){
      const strokeId=`${socket.id}-${Date.now()}`;
      const op={
        type:"freehand",
        strokeId,
        timeStamps:Date.now(),
        points:[[clientX,clientY]],
        userId:socket.id,
      }
      applyop(op);
      socket.emit("operation",{op,roomId});
      prev_key.current=strokeId;
      setDrawing("freehand");
    }
  };

   const distance=(startx,starty,endx,endy)=>{
        const dx=endx-startx;
        const dy=endy-starty;
        return Math.sqrt(dx * dx + dy * dy);
  }


  const check_line=(startx,starty,endx,endy,x,y)=>{
    const tolerance=1e-2;
    const dist1=distance(startx,starty,x,y);
    const dist2=distance(endx,endy,x,y);
    const total_dist=distance(startx,starty,endx,endy);
    if(Math.abs(dist1+dist2-total_dist)<tolerance) return false;
    return true; 
  }

  const check_rectangle=(startx,starty,endx,endy,x,y)=>{
     if((x>=startx && x<=endx) && (y>=starty && y<=endy)) return false;
     return true;
  }

  const check_circle=(startx,starty,endx,endy,x,y)=>{
    const radius=distance(startx,starty,endx,endy);
    const point_distance=distance(startx,starty,x,y);
    
    const tolerance=3;
    return point_distance>radius+tolerance;
  }

  const pointToSegmentDistance=(px, py, x1, y1, x2, y2)=> {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}


  const check_erase=(x,y)=>{
    //here check from map if found ie erase needs to be done then apply op and emit
    //now this needs to accomodate for all 4 type of guys 
     let is_updated=false;
     let element_to_be_deleted=null;
     for (const [key, value] of op_map) {
      const {points,type}=value;
      let res=true;
      if(type==="shape"){
        if(value.shape==="line"){
          res=check_line(points[0][0],points[0][1],points[1][0],points[1][1],x,y);
           if(!res){
            is_updated=true;
            element_to_be_deleted={key,value};
            break;
           }
        }else if(value.shape==="rectangle"){
          res=check_rectangle(points[0][0],points[0][1],points[1][0],points[1][1],x,y);
               if(!res){
                 is_updated=true;
                 element_to_be_deleted={key,value};
                 break;
               }
        }else if(value.shape==="circle"){
           res=check_circle(points[0][0],points[0][1],points[1][0],points[1][1],x,y);
               if(!res){
                 is_updated=true;
                 element_to_be_deleted={key,value};
                 break;
               }
        }
      }else if(type==="freehand"){
          const tolerance=3;
          const hit=points.some((point,i)=>{
          //if any pont found near do not take this list
           if (i === points.length - 1) return false;
           const next = points[i + 1];
           return pointToSegmentDistance(x, y, point[0], point[1], next[0], next[1]) < tolerance;
          });
          if(hit){
            is_updated=true;
            element_to_be_deleted={key,value};
            break;
          }
      }
     }
     if(is_updated){
      let new_op={
        type:"erase",
        targetId:element_to_be_deleted.key,
        timeStamps:Date.now(),
        userId:socket.id,
      }
      applyop(new_op);
       socket.emit("operation",{
        op:new_op,
        roomId,
      });
     }
  }

  const draw = (e) => {
    const { clientX, clientY } = getMousePos(e);
    if (action=="shape_drawing"){
    if(drawing!="shape") return;
    const {points}=op_map.get(prev.current);
    let x1=points[0][0],y1=points[0][1];
    let op={
      type:"erase",
      targetId:prev.current,
      timeStamps:Date.now(),
      userId:socket.id,
    }
    applyop(op);
    socket.emit("operation",{op,roomId});
    const strokeId=`${socket.id}-${Date.now()}`;
    let new_op={
      type:"shape",
      strokeId,
      shape,
      timeStamps:Date.now(),
      userId:socket.id,
      points:[[x1,y1],[clientX,clientY]]
    }
    applyop(new_op);
     socket.emit("operation",{
        op:new_op,
        roomId,
      });
    prev.current=strokeId;

    }else if(action=="erase"){
      if(!erase) return;
      check_erase(clientX,clientY);
    }else if(action=="freehand"){
      if(drawing!="freehand") return;
      const {points}=op_map.get(prev_key.current);
      const new_points=[...points,[clientX,clientY]];
      const op={
        type:"erase",
        targetId:prev_key.current,
        timeStamps:Date.now(),
        userId:socket.id,
      }
      applyop(op);
      socket.emit("operation",{op,roomId});
      const strokeId=`${socket.id}-${Date.now()}`;
      const new_op={
        type:"freehand",
        strokeId,
        userId:socket.id,
        points:new_points,
        timeStamps:Date.now(),
      }
      applyop(new_op);
      socket.emit("operation",{
        op:new_op,
        roomId,
      });
      prev_key.current=strokeId;
    }
  };

  const finishDrawing = () => {
    if(action=="shape_drawing") setDrawing("");
    else if(action=="erase") setErase(false);
    else if(action=="freehand") setDrawing("");
  };

  const erase_handler=()=>{
    let temp_op={
      type:"erase_all",
      userId:socket.id,
      timeStamps:Date.now(),
    }
    applyop(temp_op);
    socket.emit("operation",{
      op:temp_op,
      roomId,
    });
  }

  const reverse_handler=()=>{
    if(opsHistory.current.length>0){
      const len=opsHistory.current.length;
      const op={
        type:"undo",
        targetId:opsHistory.current[len-1],
        timeStamps:Date.now(),
        userId:socket.id,
      }
      applyop(op);
      socket.emit("operation",{op,roomId});
    }
  }

  return (
  <>
      <canvas
      ref={canvasRef}
      style={{ border: '1px solid black' }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={finishDrawing}
    >
      Canvas not supported
    </canvas>
    <button
     onClick={()=>setAction("erase")}
    >Eraser</button>
    <button
    onClick={()=>{
      setAction("shape_drawing")
      setShape("line")
    }}>
      Line
    </button>
    <button
    onClick={()=>{
      setAction("freehand");
    }}
    >
     Freehand
    </button>
    <button
    onClick={()=>{
      setAction("shape_drawing");
      setShape("rectangle");
    }}
    >
     Rectangle
    </button>
    <button
    onClick={()=>{
      setAction("shape_drawing");
      setShape("circle");
    }}
    >
     Circle
    </button>
    <button 
    onClick={erase_handler}
    >
      clear canvas
    </button>
    <button
    onClick={reverse_handler}>
      Reverse
    </button>
  </>
  );
};

export default Whiteboard;
 