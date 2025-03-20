import React from "react";
import Selector from "./Selector";



const SwapField = React.forwardRef(({ obj }, inputRef) => {
  const { id, value = "", setValue, defaultValue, setToken, ignoreValue } = obj;

  return (
    <div className="flex  items-center rounded-xl text-md  text-white">
      <input ref={inputRef} className={getInputClassName()}
        type={'number'}
        value={value}
        placeholder={"0.0"}
        onChange={e => {
          setValue(e.target.value);
        }} />
      <Selector id={id} defaultValue={defaultValue} setToken={setToken} ignoreValue={ignoreValue} />
    </div>
  )

  function getInputClassName() {
    let className = "w-full outline-none h-8 px-2 appearance-none text-xl  bg-transparent";
    return className;
  }
});

export default SwapField;
