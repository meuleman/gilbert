
import { Link } from 'react-router-dom';
import GilbertLogo from '../assets/gilbert-logo.svg?react';

const LogoNav = () => {
  return (
    <div className="logo-nav">
      <Link to="/">
        <GilbertLogo height="50" width="auto" />
      </Link>
    </div>
  );
}

export default LogoNav