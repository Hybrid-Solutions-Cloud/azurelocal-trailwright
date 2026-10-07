import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
class ErrorBoundary extends React.Component<React.PropsWithChildren,{error:string}>{state={error:''};static getDerivedStateFromError(error:Error){return {error:error.message}}render(){return this.state.error?<main><h1>Unable to display the design</h1><p>{this.state.error}</p><p>Your saved draft remains in this browser. Reload to recover it.</p><button onClick={()=>location.reload()}>Reload application</button></main>:this.props.children}}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>)
