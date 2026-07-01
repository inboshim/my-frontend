import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { 
  ModuleRegistry, 
  ClientSideRowModelModule, 
  ValidationModule,
  PaginationModule,  
  TextFilterModule,
  CellStyleModule,
  RowSelectionModule, 
  LocaleModule,
  RowApiModule 
} from 'ag-grid-community';

// 🌟 모든 부품을 누락 없이 엔진 레지스트리에 완벽하게 등록합니다.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,   
  ValidationModule,
  PaginationModule,  
  TextFilterModule,
  CellStyleModule,
  RowSelectionModule, 
  LocaleModule,
  RowApiModule
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />  /* 👈 엄격 모드 태그를 완전히 제거하고 App만 둡니다 */
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
