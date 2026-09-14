import { useEffect, useState } from 'react';
import { LoginPage } from '../auth/LoginPage.jsx';
import { ExcelPage } from './ExcelPage.jsx';
import { excelApi } from '../../services/dashboardApi.js';
export function ExcelApp() {
  const [session,setSession] = useState({loading:true,authenticated:false});
  useEffect(() => {
    let active=true;
    excelApi.current().then(() => {if(active)setSession({loading:false,authenticated:true});})
      .catch(() => {if(active)setSession({loading:false,authenticated:false});});
    return () => {active=false;};
  },[]);
  if(session.loading)return <div className="loading-screen">Loading…</div>;
  if(!session.authenticated)return <LoginPage title="Excel" initialUsername="" login={excelApi.login} onLogin={() => setSession({loading:false,authenticated:true})} />;
  return <ExcelPage onLogout={() => setSession({loading:false,authenticated:false})} />;
}
