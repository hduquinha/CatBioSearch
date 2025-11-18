import React from 'react';
import AppRoutes from './routes';
import './App.css'
import LanguageSwitcher from './Components/LanguageSwitcher';

function App() {
  return(

    <div className="App">
    <LanguageSwitcher />
    <AppRoutes />
  </div>

  );
}

export default App
