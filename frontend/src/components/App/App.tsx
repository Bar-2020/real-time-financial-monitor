import { Navigate, NavLink, Route, Routes } from 'react-router'
import { AddPage } from '../AddPage/AddPage'
import { MonitorPage } from '../MonitorPage/MonitorPage'
import './App.css'

export function App() {
  return (
    <>
      <nav className="app-nav">
        <NavLink to="/monitor">Monitor</NavLink>
        <NavLink to="/add">Simulator</NavLink>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/add" element={<AddPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="*" element={<Navigate to="/monitor" replace />} />
        </Routes>
      </main>
    </>
  )
}
