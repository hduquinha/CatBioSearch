import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaChartBar, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';
import logoimage from '../Components/assets/sem_hover.svg';


const Sidebar = () => {
  const { t } = useTranslation();
  return (
    <div className="sidebar">

      <div className="img">
        <img src={logoimage} alt="Logo" />
      </div>

      <div className="sidebar-content">

        <NavLink to="/" className="sidebar-link">
          <FaHome className="sidebar-icon" />
          <span className="sidebar-text">{t('sidebar.home')}</span>
        </NavLink>
        <NavLink to="/relatorio" className="sidebar-link">
          <FaChartBar className="sidebar-icon" />
          <span className="sidebar-text">{t('sidebar.reports')}</span>
        </NavLink>
        <NavLink to="/cadastro" className="sidebar-link">
          <FaUser className="sidebar-icon" />
          <span className="sidebar-text">{t('sidebar.clients')}</span>
        </NavLink>
        <NavLink to="/acesso" className="sidebar-link">
          <FaCog className="sidebar-icon" />
          <span className="sidebar-text">{t('sidebar.access')}</span>
        </NavLink>

        <div className="sidebar-footer">
        <NavLink to="/login" className="sidebar-link">
          <FaSignOutAlt className="sidebar-icon" />
          <span className="sidebar-text">{t('sidebar.logout')}</span>
        </NavLink>
      </div>
      </div>

     
    </div>
  );
};

export default Sidebar;
