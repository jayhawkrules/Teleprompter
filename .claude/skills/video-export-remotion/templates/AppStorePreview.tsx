import { Composition, useCurrentFrame, useVideoConfig, interpolate, staticFile, Img, Audio } from 'remotion';
interface Scene { durationFrames: number; headline: string; screenshotFile?: string; }
interface Props { appName: string; accentColor: string; darkBg: string; scenes: Scene[]; voiceoverFile?: string; }
const Comp = ({ appName, accentColor, darkBg, scenes, voiceoverFile }: Props) => {
  const frame = useCurrentFrame();
  let start = 0, active = scenes[0];
  for (const s of scenes) { if (frame < start + s.durationFrames) { active = s; break; } start += s.durationFrames; }
  const sf = frame - start;
  const opacity = interpolate(sf,[0,15,active.durationFrames-15,active.durationFrames],[0,1,1,0],{extrapolateRight:'clamp'});
  const total = scenes.reduce((s,sc)=>s+sc.durationFrames,0);
  return (
    <div style={{width:'100%',height:'100%',background:darkBg,position:'relative',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>
      {voiceoverFile && <Audio src={staticFile(voiceoverFile)} />}
      <div style={{opacity,width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 40px'}}>
        {active.screenshotFile && <Img src={staticFile(active.screenshotFile)} style={{maxWidth:'80%',maxHeight:'60%',borderRadius:'20px',marginBottom:'24px'}} />}
        <h1 style={{color:'#fff',fontSize:'48px',fontWeight:800,textAlign:'center'}}>{active.headline}</h1>
        <div style={{marginTop:'16px',color:accentColor,fontSize:'22px',fontWeight:600}}>{appName}</div>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,height:'4px',width:`${(frame/total)*100}%`,background:accentColor}} />
    </div>
  );
};
export const RemotionRoot = () => (
  <Composition id="AppStorePreview" component={Comp} durationInFrames={750} fps={30} width={1080} height={1920}
    defaultProps={{appName:'Noelly',accentColor:'#F59E0B',darkBg:'#0a0f1e',scenes:[
      {durationFrames:180,headline:'Discover holiday lights near you'},
      {durationFrames:200,headline:'Thousands of displays mapped'},
      {durationFrames:200,headline:'Plan your perfect route'},
      {durationFrames:170,headline:'Free to use this season'},
    ]}}
  />
);
