import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../afdp'

class ErrorBoundary extends React.Component<{children:React.ReactNode},{err:any}> {
  constructor(p:any){super(p);this.state={err:null};}
  static getDerivedStateFromError(e:any){return {err:e};}
  componentDidCatch(err:any){
    try{
      var msg=String(err?.message||err||"");

      // Recover once from an obsolete cached production bundle.
      // Current source defines darkMode, so this error means the browser
      // is executing an older cached JS bundle.
      if(msg.includes("darkMode") && !sessionStorage.getItem("fdp_stale_bundle_recovery")){
        sessionStorage.setItem("fdp_stale_bundle_recovery","1");

        var u=new URL(window.location.href);
        u.searchParams.set("_fdp_refresh",Date.now().toString());

        window.location.replace(u.toString());
      }
    }catch(e){}
  }
  render(){
    if(this.state.err){
      return React.createElement('div',{style:{padding:24,fontFamily:'monospace',background:'#1a1a2e',color:'#f87171',minHeight:'100vh'}},
        React.createElement('h2',{style:{color:'#f1c40f',marginBottom:16}},'App Error (send screenshot to dev)'),
        React.createElement('pre',{style:{whiteSpace:'pre-wrap',fontSize:13}},String(this.state.err?.message||this.state.err)),
        React.createElement('pre',{style:{whiteSpace:'pre-wrap',fontSize:11,color:'#9ca3af',marginTop:12}},String(this.state.err?.stack||''))
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  React.createElement(ErrorBoundary,null,React.createElement(App,null))
)
