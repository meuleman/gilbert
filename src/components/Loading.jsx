import React from 'react';
import './Loading.css';

const LoadingText = ({ text, type="text" }) => {
  return (
    <div className={"loading " + type}>
      {text.split(/\c/g).map((char, index) => (
        <span key={index} style={{ display: "inline-block", animationDelay: `${index * 0.05}s` }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
};

export default LoadingText;