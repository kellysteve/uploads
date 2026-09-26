const input=document.querySelector('#file'),btn=document.querySelector('#upload'),drop=document.querySelector('#drop'),exp=document.querySelector('#expires'),status=document.querySelector('#status'),results=document.querySelector('#results');let file=null;document.querySelector('#year').textContent=new Date().getFullYear();

function select(list){
  file=list&&list[0]?list[0]:null;
  btn.disabled=!file;
  drop.classList.toggle('has-file',!!file);
  drop.querySelector('.drop-title').textContent=file?file.name:'Choose a file';
  drop.querySelector('.drop-sub').textContent=file?formatSize(file.size)+' • Ready to upload':'or drag and drop';
  status.textContent=file?'1 file selected.':'Choose a file to begin.';
}
function formatSize(n){const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return(i?n.toFixed(n<10?1:0):n.toFixed(0))+' '+u[i]}
input.onchange=e=>select(e.target.files);
['dragenter','dragover'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.add('drag')}));
['dragleave','drop'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.remove('drag')}));
drop.addEventListener('drop',e=>select(e.dataTransfer.files));

btn.onclick=async()=>{
  if(!file)return;
  btn.disabled=true;
  results.replaceChildren();
  status.textContent='Uploading 0%…';
  const f=new FormData();
  f.append('file',file);
  f.append('expires',exp.value);
  try{
    const d=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST','/api/upload');
      xhr.responseType='text';
      xhr.upload.onprogress=e=>{
        if(e.lengthComputable){
          const percent=Math.min(100,Math.round((e.loaded/e.total)*100));
          status.textContent='Uploading '+percent+'%…';
          drop.querySelector('.drop-sub').textContent=percent+'% uploaded';
        }
      };
      xhr.onload=()=>{
        let data;
        try{data=JSON.parse(xhr.responseText||'{}')}catch{
          reject(Error(xhr.status?'Server error ('+xhr.status+'). Please try again.':'No response from server.'));
          return;
        }
        if(xhr.status<200||xhr.status>=300||!data.success){
          const detail=data.detail?' '+data.detail:'';
          reject(Error((data.error||'Upload failed ('+xhr.status+')')+detail));
          return;
        }
        resolve(data);
      };
      xhr.onerror=()=>reject(Error('Network error. Please check your connection and try again.'));
      xhr.onabort=()=>reject(Error('Upload cancelled.'));
      xhr.send(f);
    });
    const row=document.createElement('div');
    row.className='result success';
    const link=document.createElement('a');
    link.href=d.url;link.target='_blank';link.rel='noopener';link.textContent=d.url;
    const copy=document.createElement('button');
    copy.className='copy';copy.textContent='Copy';
    copy.onclick=async()=>{
      try{await navigator.clipboard.writeText(d.url);copy.textContent='Copied'}
      catch{copy.textContent='Copy link'}
      setTimeout(()=>copy.textContent='Copy',1200);
    };
    row.append(link,copy);results.append(row);
    status.textContent='File uploaded successfully.';
    drop.querySelector('.drop-sub').textContent=formatSize(file.size)+' • Uploaded';
  }catch(e){
    status.textContent=e.message;
    const row=document.createElement('div');
    row.className='result error';
    row.textContent=e.message;
    results.append(row);
    drop.querySelector('.drop-sub').textContent='Upload failed • Try again';
  }finally{
    btn.disabled=!file;
  }
};
