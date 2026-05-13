import { Composition, useCurrentFrame, interpolate, staticFile, Img } from 'remotion';
interface Props { appName: string; accentColor: string; darkBg: string; hook: string; body: string; cta: string; screenshotFile?: string; }
const Comp = ({ appName, accentColor, darkBg, hook, body, cta, screenshotFile }: Props) => {
  const frame = useCurrentFrame();
  const hookO = interpolate(frame,[0,15],[0,1],{extrapolateRight:'clamp'});
  const bodyO = interpolate(frame,[60,75],[0,1],{extrapolateRight:'clamp'});
  const ctaO = interpolate(frame,[150,165],[0,1],{extrapolateRight:'clamp'});
  const ctaS = interpolate(frame,[150,170],[0.8,1],{extrapolateRight:'clamp'});
  return (
    <div style={{width:'100%',height:'100%',background:darkBg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 40px',position:'relative',overflow:'hidden',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{position:'absolute',top:'-30%',left:'-20%',width:'600px',height:'600px',borderRadius:'50%',background:`radial-gradient(circle,${accentColor}20 0%,transparent 70%)`,filter:'blur(60px)'}} />
      <div style={{opacity:hookO,marginBottom:'24px'}}><h1 style={{color:'#fff',fontSize:'52px',fontWeight:800,textAlign:'center'}}>{hook}</h1></div>
      {screenshotFile && <Img src={staticFile(screenshotFile)} style={{maxWidth:'70%',maxHeight:'35%',borderRadius:'16px',marginBottom:'24px',opacity:bodyO}} />}
      <div style={{opacity:bodyO,marginBottom:'32px'}}><p style={{color:'rgba(255,255,255,0.7)',fontSize:'24px',textAlign:'center'}}>{body}</p></div>
      <div style={{opacity:ctaO,transform:`scale(${ctaS})`}}><div style={{background:accentColor,color:'#000',padding:'16px 40px',borderRadius:'14px',fontSize:'22px',fontWeight:700}}>{cta}</div></div>
      <div style={{position:'absolute',bottom:'20px',color:'rgba(255,255,255,0.4)',fontSize:'16px'}}>{appName}</div>
    </div>
  );
};
export const RemotionRoot = () => (
  <Composition id="SocialPromo" component={Comp} durationInFrames={450} fps={30} width={1080} height={1080}
    defaultProps={{appName:'Noelly',accentColor:'#F59E0B',darkBg:'#0a0f1e',hook:'Your neighbourhood has secret Christmas magic 🎄',body:'Noelly maps every holiday light display near you.',cta:'Free on App Store'}}
  />
);
