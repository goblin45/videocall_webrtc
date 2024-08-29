import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Videocall from './components/Videocall'

function App() {

	return (
		<Router>
			<Routes> 
				<Route path='/' element={<Videocall/>} />
			</Routes>
		</Router>
	)
}

export default App
