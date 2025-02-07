import React from 'react';

const MenuIcon: React.FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      className="text-gray-800" // Adjust color as needed
    >
      <rect width="24" height="2" rx="1" />
      <rect y="11" width="24" height="2" rx="1" />
      <rect y="22" width="24" height="2" rx="1" />
    </svg>
  );
};

export default MenuIcon;