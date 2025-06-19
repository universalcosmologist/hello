import React from 'react'

function List({message_event}) {
  if(!message_event || !Array.isArray(message_event)) return;
  return (
    <>
    <h1>List of responses :</h1>
    <ul>
    {
      message_event.map((message, index) =>
        <li key={ index }>{ message }</li>
      )
    }
    </ul>
    </>
  )
}

export default List