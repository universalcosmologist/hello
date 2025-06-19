import React from 'react'
import { socket } from '../socket';

function Form({place_holder="",button_text="SEND",callback_function=(a)=>{}}) {
  const [msg,setMsg]=React.useState("");
  const onSubmit=(event)=>{
    event.preventDefault();
    if(msg==""){
      console.log("cannot send empty message to server");
      return;
    }
    callback_function(msg);
  }
  return (
    <div>
        <form onSubmit={onSubmit}>
            <input 
            className='border-2 border-b-white text-white m-2 p-2'
            type='text' 
            value={msg}
            onChange={(e)=>setMsg(e.target.value)}
            placeholder={place_holder}
            />
            <button type='submit' className='text-white border-2 border-solid bg-amber-600 hover: cursor-pointer p-2 m-2'>
                {button_text}
            </button>
        </form>
    </div>
  )
}

export default Form