import { ConfigProvider } from 'antd'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
