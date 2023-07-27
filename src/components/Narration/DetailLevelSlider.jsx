// slider used to control the detail level of narrations

const SelectDetailLevel = ({
  detailLevel = 1,
  maxDetailLevel = null,
  setDetailLevel,
} = {}) => {
  const handleChange = (value) => {
    setDetailLevel(value)
  }

  if(maxDetailLevel) {
    return (
      <div className='detail-parent'>
        <div className='detail-level'>Detail Level: {detailLevel}</div>
        <input 
        className='detail-slider'
        type="range" 
        id="detailRange"
        min="1" 
        max={maxDetailLevel}
        step="1"
        value={detailLevel}
        onChange={() => handleChange(document.getElementById("detailRange").value)}
        />
      </div>
    )
  } else {
    return (
      <div />
    )
  }
}
export default SelectDetailLevel