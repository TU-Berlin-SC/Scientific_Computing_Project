import React from 'react';
import '../styles/Header.css';
interface HeaderProps {
  useNDimensions: boolean;
}

const Header: React.FC<HeaderProps> = ({ useNDimensions }) => (
  <header className="app-header">
    <h1>Minesweeper Simulator {useNDimensions ? "(N Dimension)" : "(2D)"}</h1>
  </header>
);

export default Header;
