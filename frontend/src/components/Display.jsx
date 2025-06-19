function Display({isConnected}) {
  return (
    <div className='text-white'>Client Connection State: {isConnected==true ? "connected" : "not-connected"}</div>
  )
}

export default Display