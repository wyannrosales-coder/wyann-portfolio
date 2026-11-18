// Keep the distortion filter in this document so local fragment references work in Safari.
const optics=document.createElementNS('http://www.w3.org/2000/svg','svg');
optics.setAttribute('aria-hidden','true');
optics.style.cssText='position:absolute;width:0;height:0;pointer-events:none';
optics.innerHTML='<defs><filter id="arcade-curvature" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="curvature.png" width="100%" height="100%" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="32" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
document.body.prepend(optics);
const glass=document.querySelector('.crt-glass');
function trackingBurst(){
 if(!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  glass.style.setProperty('--band',(12+Math.random()*76)+'%');
  glass.classList.add('tracking');
  setTimeout(()=>glass.classList.remove('tracking'),140);
 }
 setTimeout(trackingBurst,4800+Math.random()*9800);
}
setTimeout(trackingBurst,3200+Math.random()*4500);
