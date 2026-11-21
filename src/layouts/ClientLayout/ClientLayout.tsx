import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/common/Navbar/Navbar';
import Footer from '../../components/common/Footer/Footer';
import styles from './ClientLayout.module.css';

export interface ClientLayoutProps {
  showNavbar?: boolean;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ showNavbar = true }) => {
  return (
    <div className={styles.layout}>
      {showNavbar && <Navbar />}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default ClientLayout;
