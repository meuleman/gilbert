
import { Link } from 'react-router-dom';
import GilbertLogo from '../assets/gilbert-logo.svg?react';

const LogoNav = () => {
  return (
    <div className="logo-nav">
      {/* <Link to="/"> */}
      <a href="/">
        <GilbertLogo height="50" width="auto" />
      </a>
      {/* </Link> */}
    </div>
  );
}

export default LogoNav