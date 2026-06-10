import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registerAscendaServiceWorker } from './lib/pwa.js'

registerAscendaServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
