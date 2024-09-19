import React from 'react';
import './Loading.css';

const LoadingText = ({ text, type="text" }) => {
  let error = false
  if(text && text?.toLowerCase().indexOf("error") > -1) {
    error = true
  }
  return (
    <div className={"loading " + type + " " + error}>
      {text.split(/\c/g).map((char, index) => (
        <span key={index} style={{ display: "inline-block", animationDelay: `${index * 0.05}s` }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
};

export default LoadingText;