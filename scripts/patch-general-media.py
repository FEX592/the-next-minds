from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/client/src/pages/Admin.tsx')
s=p.read_text()
s=s.replace('const [generalSubject,setGeneralSubject]=useState(""); const [generalBody,setGeneralBody]=useState(""); const [selected,setSelected]=useState<string[]>([]);', 'const [generalSubject,setGeneralSubject]=useState(""); const [generalBody,setGeneralBody]=useState(""); const [generalMediaIds,setGeneralMediaIds]=useState<number[]>([]); const [selected,setSelected]=useState<string[]>([]);')
s=s.replace('if(target==="general"&&placement==="INLINE"&&result.contentId)setGeneralBody(v=>`${v}\\n[Inline image: cid:${result.contentId}]`);', 'if(target==="general"&&placement==="INLINE"&&result.contentId){setGeneralBody(v=>`${v}<p><img src="cid:${result.contentId}" alt="${result.filename}" style="display:block;max-width:100%;height:auto;margin:18px 0" /></p>`);if(result.id)setGeneralMediaIds(v=>[...v,result.id!]);}')
s=s.replace('selected={selected} setSelected={setSelected} onUpload={e=>insertMedia(e,"INLINE","general")} send={send} feedback={setFeedback}', 'selected={selected} setSelected={setSelected} mediaIds={generalMediaIds} onUpload={e=>insertMedia(e,"INLINE","general")} send={send} feedback={setFeedback}')
s=s.replace('function GeneralEmail({generalSubject,setGeneralSubject,generalBody,setGeneralBody,selected,setSelected,onUpload,send,feedback}', 'function GeneralEmail({generalSubject,setGeneralSubject,generalBody,setGeneralBody,selected,setSelected,mediaIds,onUpload,send,feedback}')
s=s.replace('selected:string[];setSelected:(x:string[])=>void;onUpload:', 'selected:string[];setSelected:(x:string[])=>void;mediaIds:number[];onUpload:')
s=s.replace('body:generalBody});feedback', 'body:generalBody,mediaIds});feedback')
p.write_text(s)

p=Path('/home/ubuntu/the-next-mind/server/db.ts')
s=p.read_text()
old='const seeded=await db.select().from(emailTemplates).where(eq(emailTemplates.category,"ACCEPTANCE")).limit(1);if(seeded[0]){'
new='const seeded=await db.select().from(emailTemplates).where(eq(emailTemplates.category,"ACCEPTANCE")).limit(1);if(seeded[0]&&!seeded[0].body)await db.update(emailTemplates).set({subject:"🎉 You\'re in — THE NEXT MIND",body:DEFAULT_BODY,htmlBody:DEFAULT_HTML(DEFAULT_BODY.replace(/\\n{2,}/g,"<br><br>").replace(/\\n/g,"<br>"),"cid:next-mind-brand"),groupLink:"https://chat.whatsapp.com/JCX4hLJol0sDbzH4PpJGms?s=cl&p=a&mlu=4&ilr=4",channelLink:"https://whatsapp.com/channel/0029VbD8HWH6mYPIo9ONqD1c"}).where(eq(emailTemplates.id,seeded[0].id));if(seeded[0]){'
s=s.replace(old,new)
p.write_text(s)
