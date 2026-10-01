const express=require('express'),path=require('path');
const app=express(),PORT=process.env.PORT||10000;
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');next()});
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(req,res)=>res.json({ok:true}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`AI Video Editor running on ${PORT}`));
