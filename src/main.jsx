import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { StoreProvider } from './context/StoreContext.jsx'

// Eliminar StrictMode evita el error de "removeChild" con SweetAlert
ReactDOM.createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <App />
  </StoreProvider>
)