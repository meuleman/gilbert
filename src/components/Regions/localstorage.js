const getSetList = () => {
  return JSON.parse(localStorage.getItem('setList')) || [];
 }
 const saveSetList = (list) => {
   localStorage.setItem('setList', JSON.stringify(list));
 }
 function getSet(name) {
   return JSON.parse(localStorage.getItem(name));
 }
 
 export {
  getSetList,
  saveSetList,
  getSet
}