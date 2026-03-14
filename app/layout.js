import { Toaster } from 'react-hot-toast';
export const metadata = { title:'Linzoo', description:'Linzoo — Connect and share' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <meta name="theme-color" content="#1D9BF0"/>
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html:`try{var t=localStorage.getItem('lz_theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}` }}/>
        {children}
        <Toaster position="bottom-center" toastOptions={{duration:3000,style:{fontSize:14,borderRadius:10,fontFamily:'inherit'}}}/>
      </body>
    </html>
  );
}
