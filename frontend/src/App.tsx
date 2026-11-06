import { Navigate, NavLink, Route, Routes } from 'react-router'
import { AddPage } from './AddPage'
import { MonitorPage } from './MonitorPage'

export function App() {
  return (
    <>
      <nav>
        <NavLink to="/monitor">Monitor</NavLink>
        <NavLink to="/add">Simulator</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/add" element={<AddPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="*" element={<Navigate to="/monitor" replace />} />
        </Routes>
      </main>
    </>
  )
}
