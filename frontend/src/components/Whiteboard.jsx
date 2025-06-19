import rough from 'roughjs/bundled/rough.esm';
import React,{useState,useEffect, useRef} from 'react';

function Whiteboard() {
  const contextRef=useRef(null);
  const canvasRef=useRef(null);
  const undo=useRef([]);
  const roughCanvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    contextRef.current=canvas.getContext("2d");
    contextRef.current.font="48px serif";
    roughCanvasRef.current=rough.canvas(canvas);
  },[]);
  //this ref.current is nothing but ctx
  //const rough_canvas=rough.canvas(canvas);
  const gen=rough.generator();

  const [path,setPath]=useState([]);
  const [points,setPoints]=useState([]);
  const [eraser,setEraser]=useState(false);
  const [drawing,setDrawing]=useState("");
  const [elements,setElements]=useState([]);
  const [shape,setShape]=useState("");//this is also to be set outside

  let [action,setAction]=useState("");//set by some button outside canvas 

  const find_mid_point=(p1,p2)=>{
     return { 
        x:p1.clientX+(p2.clientX-p1.clientX)/2,
        y:p1.clientY+(p2.clientY-p1.clientY)/2,
     }; 
  }

  const distance=(startx,starty,endx,endy)=>{
        const dx=endx-startx;
        const dy=endy-starty;
        return Math.sqrt(dx * dx + dy * dy);
  }

  const create_element=(shape="line",startx,starty,endx,endy)=>{
      //now it can be any shape so we have to make if else ellipse is tough
      const line_width=contextRef.current.lineWidth;
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

  useEffect(()=>{
    const temp=contextRef.current.lineWidth;
    const drawPath=()=>{
        path.forEach((line)=>{
            //draw this line here
            contextRef.current.beginPath();
            let start=line[0];
            line.forEach((point)=>{
                let res=find_mid_point(start,point);
                contextRef.current.lineWidth=point.line_width;
                contextRef.current.quadraticCurveTo(
                  res.x,
                   res.y,
                   point.clientX,
                    point.clientY,
                );
                contextRef.current.lineTo(point.clientX,point.clientY);
                start=point;
                contextRef.current.stroke();
            });
            contextRef.current.closePath();
            contextRef.current.save();
        });
    }

    if(path!=undefined && path.length>0) drawPath();
    elements.forEach((element)=>{
        contextRef.current.lineWidth=element.line_width;
        roughCanvasRef.current.draw(element.ele);
    })

    contextRef.current.lineWidth=temp;

    return ()=>{
        contextRef.current.clearRect(0,0,500,300);
    }

  },[path,elements]);

  const getMousePos = (event) => {
  const rect = canvasRef.current.getBoundingClientRect(); // get canvas position

  return {
    clientX: event.clientX - rect.left,
    clientY: event.clientY - rect.top
  };
};


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


  const check_for_erase=({clientX,clientY})=>{
    const x=clientX;
    const y=clientY;
    const tolerance=3;
    const new_elements=elements.filter((element)=>{
        const {shape,startx,starty,endx,endy}=element;
        if(shape=="line"){
            return check_line(startx,starty,endx,endy,x,y);
        }else if(shape=="rectangle"){
            return check_rectangle(startx,starty,endx,endy,x,y);
        }else if(shape=="circle"){
            //check from center distance
            return check_circle(startx,starty,endx,endy,x,y);
        }
    });
    const new_path = path.filter((list) => {
       const hit=list.some((point,i)=>{
          //if any pont found near do not take this list
           if (i === list.length - 1) return false;
           const next = list[i + 1];
           return pointToSegmentDistance(x, y, point.clientX, point.clientY, next.clientX, next.clientY) < tolerance;
       });
       return !hit;
    });
    setElements(new_elements);
    setPath(new_path);
  }

  const handleMouseDown=(e)=>{
    const {clientX,clientY}=getMousePos(e);
    const line_width=contextRef.current.lineWidth;
    if(action=="freehand"){
     setPoints([{clientX,clientY,line_width}]);
     setDrawing("freehand");
     contextRef.current.moveTo(clientX,clientY);
     contextRef.current.beginPath();
    }else if(action=="shape_drawing"){
        const element=create_element(shape,clientX,clientY,clientX,clientY);
        setDrawing("shape");
        setElements((prev)=>[...prev,element]);//first point of the shape is set now
    }else if(action=="erase"){
        //eraser on
        //for every point check for erase and change both arrays as per demand
        setEraser(true);
        check_for_erase({clientX,clientY});
    }
  }

  const handleMouseMove=(e)=>{
    const {clientX,clientY}=getMousePos(e);
    const line_width=(contextRef==null) ? 1 : contextRef.current.lineWidth;
    if(action=="freehand"){
        if(drawing!="freehand") return;
        const new_element={clientX,clientY,line_width};
        const len=points.length; 
        //give me the previous guys
        const point=points[len-1];
        let res=find_mid_point(point,new_element);
        setPoints((previous)=>[...previous,new_element]);
        contextRef.current.quadraticCurveTo(res.x,res.y,clientX,clientY);
        contextRef.current.lineTo(clientX,clientY);//here we need to do smoothening
        contextRef.current.stroke();
    }else if(action=="shape_drawing"){
        //change the last guy of the elements
        if(drawing!="shape") return;
        let len=elements.length-1;
        const new_elements=[...elements];
        const {startx,starty}=elements[len]; 
        new_elements[len]=create_element(shape,startx,starty,clientX,clientY);//shpae,previous element,new end points
        setElements(new_elements);
    }else if(action=="erase"){
        if(eraser!=true) return;
       // console.log("hello in mouse move");
        check_for_erase({clientX,clientY});
    }
  }

  const handleMouseUp=(e)=>{
    if(action=="freehand"){
        setDrawing("");
        contextRef.current.closePath();
        undo.current.push("path");
        setPath((previous)=>[...previous,points]);
        setPoints([]);//as we have done drawing
    }else if(action=="shape_drawing"){
        //here add later correction ie adjust for consistency
        undo.current.push("elements");
        setDrawing("");
    }else if(action=="erase"){
        setEraser(false);
    }
  }

  const handleReverse=()=>{
    //this takes us one step back and remvoes the most current drawn figure from canvas
    //push in stack and as we remove from stack(pop) delete either from path or from element
    if(undo.current.length>0){
       const temp=undo.current[undo.current.length-1];
       undo.current.pop();
      if(temp=="path"){
        const new_path=[...path];
        new_path.pop();
        setPath(new_path);
      }else if(temp=="elements"){
        const _elements=[...elements]; 
        _elements.pop();
        setElements(_elements);
      }
    }
  }

  const handleDownload=()=>{
    const canvas=canvasRef.current;
    const url=canvas.toDataURL('image/png');
    const element=document.createElement('a');
    element.href=url;
    element.download='canvas_snapshot.png';
    element.click();
  }

  return (
   <>
     <div className='m-0 p-0'>
         <canvas
      id="canvas"
      ref={canvasRef}
      width={500}
      height={300}
      style={{ border: '1px solid #000', margin: '0px' , padding: '0px'}}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
        Canvas
    </canvas>
     </div>
        <div style={{ marginTop: '10px' }}>
  <p>Choose a shape:</p>
  <button onClick={() => {
    setShape('line');
    setAction('shape_drawing');
  }}>
    Line
  </button>

  <button onClick={() => {
    setShape('circle');
    setAction('shape_drawing');
  }}>
    Circle
  </button>

  <button onClick={() => {
    setShape('rectangle');
    setAction('shape_drawing');
  }}>
    Rectangle
  </button>

  <button onClick={() => setAction('freehand')}>Freehand</button>
  <button onClick={() => setAction('erase')}>Erase</button>

  <p>Current shape: {shape || 'None'} | Mode: {action || "None"}</p>
</div>
<div>
    <button
     onClick={()=>{
        //increase the stroke width here
        const temp=contextRef.current.lineWidth;
        if(temp==100) return;
        contextRef.current.lineWidth=temp+1;
        console.log(contextRef.current.lineWidth);
     }}
    >
        increase stroke width
    </button>
    <button 
      onClick={()=>{ 
        //decrease the stroke width here
        const temp=contextRef.current.lineWidth;
        if(temp==1) return;
        contextRef.current.lineWidth=temp-1;
        console.log(contextRef.current.lineWidth)
     }}
    >
        decrease stroke width
    </button>
</div>
   <div style={{marginTop:'15px'}}>
    <button
    onClick={()=>{
      setElements([]);
      setPoints([]);
      setPath([]);
      undo.current=[];
    }}>
      Refresh
    </button>
    <button
    onClick={handleReverse}>
      Back
    </button>
    <button
    onClick={handleDownload}>
      Download
    </button>
   </div>
   </>
  )
}

export default Whiteboard
