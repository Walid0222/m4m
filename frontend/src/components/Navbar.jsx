import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          M4M
        </Link>
        <nav className="navbar-links">
          <NavLink to="/" end className="nav-link">Marketplace</NavLink>
          <NavLink to="/wallet" className="nav-link">Wallet</NavLink>
          <NavLink to="/orders" className="nav-link">Orders</NavLink>
          <NavLink to="/chat" className="nav-link">Chat</NavLink>
          <NavLink to="/admin" className="nav-link nav-link-admin">Admin</NavLink>
        </nav>
      </div>
    </header>
  );
}
