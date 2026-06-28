import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Video } from 'lucide-react';

const Navbar = () => {
  return (
    <div className="navbar">
      <NavLink 
        to="/chat" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <MessageSquare size={20} />
        <span>Chat</span>
      </NavLink>
      <NavLink 
        to="/call" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Video size={20} />
        <span>Video Call</span>
      </NavLink>
    </div>
  );
};

export default Navbar;
