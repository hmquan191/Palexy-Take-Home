import { Navigate, Route, Routes } from 'react-router-dom'
import { SchedulePage } from './pages/SchedulePage'
import { SchedulesPage } from './pages/SchedulesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SchedulesPage />} />
      <Route path="/schedules/:id" element={<SchedulePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
