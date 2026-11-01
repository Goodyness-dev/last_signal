import type {Battlefield} from './scene.ts';

// Local, opt in evidence only. Nothing is uploaded or sent to analytics.
export class FieldReview {
 private panel=document.createElement('dialog');
 private output=document.createElement('pre');
 private frames:number[]=[];
 private calls:number[]=[];
 private start=0;private last=0;
 private recording:MediaRecorder|null=null;
 private capture:HTMLCanvasElement|null=null;
 private chunks:BlobPart[]=[];
 private urls:string[]=[];
 private captureStart=0;
 private report:unknown=null;
 constructor(private scene:Battlefield,private mode:()=>string){
  const button=document.createElement('button');button.id='field-review';button.textContent='PERFORMANCE & CAPTURE';button.onclick=()=>this.panel.showModal();
  document.querySelector('footer')?.append(button);
  this.panel.id='review-panel';this.panel.setAttribute('aria-label','Local performance and gameplay capture');
  this.panel.innerHTML='<h2>Field review</h2><p>Measure this device during actual play. Samples exclude hidden tabs. JavaScript heap is approximate and is not total browser or GPU memory.</p><button id="review-measure">MEASURE NEXT 15 SECONDS</button><button id="review-record">RECORD 20 SECONDS</button><p id="review-note" role="status">Recordings contain the rendered battlefield and a mode label. Silent video, no microphone or desktop capture.</p><div id="review-downloads"></div><button id="review-close">CLOSE AND PLAY</button>';
  this.output.id='review-results';this.panel.append(this.output);document.body.append(this.panel);
  this.panel.querySelector<HTMLButtonElement>('#review-close')!.onclick=()=>this.panel.close();
  this.panel.querySelector<HTMLButtonElement>('#review-measure')!.onclick=()=>{this.frames=[];this.calls=[];this.start=performance.now();this.last=0;this.report=null;this.note('Measuring visible gameplay for 15 seconds.');this.panel.close();};
  this.panel.querySelector<HTMLButtonElement>('#review-record')!.onclick=()=>this.record();
  const loss=document.createElement('button');loss.textContent='TEST GRAPHICS RECOVERY';loss.onclick=()=>{this.panel.close();this.scene.renderer.forceContextLoss();};this.panel.append(loss);
 }
 private note(text:string){this.panel.querySelector('#review-note')!.textContent=text;}
 private link(blob:Blob,name:string){const a=document.createElement('a'),url=URL.createObjectURL(blob);this.urls.push(url);a.href=url;a.download=name;a.textContent='SAVE '+name;this.panel.querySelector('#review-downloads')!.append(a);}
 update(now:number){
  if(this.start&&!document.hidden){
   if(this.last){this.frames.push(now-this.last);this.calls.push(this.scene.renderer.info.render.calls);}this.last=now;
   if(now-this.start>=15000){
    const sorted=[...this.frames].sort((a,b)=>a-b),total=this.frames.reduce((a,b)=>a+b,0),info=this.scene.renderer.info;
    const memory=(performance as Performance&{memory?:{usedJSHeapSize:number;totalJSHeapSize:number}}).memory;
    const gl=this.scene.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    this.report={checkedAt:new Date().toISOString(),mode:this.mode(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],renderSize:[this.scene.renderer.domElement.width,this.scene.renderer.domElement.height],effects:this.scene.effectsEnabled,reducedMotion:this.scene.reducedMotion,seconds:total/1000,frames:sorted.length,fps:total?sorted.length*1000/total:0,p95FrameMs:sorted[Math.floor(sorted.length*.95)]??null,meanDrawCalls:this.calls.reduce((a,b)=>a+b,0)/Math.max(1,this.calls.length),geometries:info.memory.geometries,textures:info.memory.textures,usedJSHeapBytes:memory?.usedJSHeapSize??null,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),note:'Visible requestAnimationFrame cadence. Includes rendering and application work. Not GPU timing, total memory, or a benchmark of other devices.'};
    this.output.textContent=JSON.stringify(this.report,null,2);this.link(new Blob([this.output.textContent],{type:'application/json'}),'last-signal-performance.json');this.start=0;this.note('Measurement ready. Open Field review to save it.');
   }
  }else if(document.hidden)this.last=0;
  if(this.recording?.state==='recording'&&this.capture){
   const ctx=this.capture.getContext('2d')!;ctx.drawImage(this.scene.renderer.domElement,0,0,this.capture.width,this.capture.height);ctx.fillStyle='#111b19';ctx.fillRect(0,0,this.capture.width,58);ctx.fillStyle='#e6dec4';ctx.font='16px sans-serif';ctx.fillText('LAST SIGNAL | '+this.mode()+' | SILENT ACTUAL GAMEPLAY',12,23);ctx.fillText(new Date().toISOString()+' | '+Math.floor((now-this.captureStart)/1000)+' s',12,47);
   if(now-this.captureStart>=20000)this.recording.stop();
  }
 }
 private record(){
  if(this.recording?.state==='recording')return;
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream){this.note('Canvas recording is unavailable in this browser.');return;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime){this.note('No supported WebM encoder.');return;}
  try{
   this.capture=document.createElement('canvas');this.capture.width=960;this.capture.height=540;this.chunks=[];
   const stream=this.capture.captureStream(24);this.recording=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000});
   this.recording.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};
   this.recording.onstop=()=>{stream.getTracks().forEach(t=>t.stop());this.link(new Blob(this.chunks,{type:mime}),'last-signal-'+this.mode().toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.webm');this.capture=null;this.note('Actual silent canvas recording ready. Save it from Field review.');};
   this.recording.onerror=()=>{stream.getTracks().forEach(t=>t.stop());this.capture=null;this.note('Recording failed. No footage is claimed.');};
   this.captureStart=performance.now();this.recording.start(1000);this.note('Recording 20 seconds of actual gameplay.');this.panel.close();
  }catch{this.note('Recording could not start.');}
 }
 dispose(){if(this.recording?.state==='recording')this.recording.stop();this.urls.forEach(u=>URL.revokeObjectURL(u));}
}
